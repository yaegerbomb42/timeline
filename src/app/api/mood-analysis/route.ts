import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { GEMINI_MODEL } from "@/lib/ai/config";
import { raceProviders, getProviders } from "@/lib/ai/swarm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BatchEntry = {
  id: string;
  text: string;
  date: string;
};

type MoodResult = {
  id: string;
  rating: number;
  mood: "positive" | "negative" | "neutral";
  description: string;
  emoji: string;
  rationale: string;
  score: number;
  geminiRationale: string;
};

type Body = {
  entries: BatchEntry[];
};

/** Extract and parse a JSON array from raw AI text */
function parseJsonArray(text: string, expectedLength: number): unknown[] {
  let jsonText = text;
  const codeBlockMatch = text.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1];
  } else {
    const arrayMatch = text.match(/(\[[\s\S]*\])/);
    if (arrayMatch) {
      jsonText = arrayMatch[1];
    }
  }
  // Strip trailing commas before closing brackets (common AI formatting issue)
  jsonText = jsonText.replace(/,\s*([}\]])/g, "$1");

  let results = JSON.parse(jsonText) as unknown[];
  if (Array.isArray(results) && results.length === expectedLength) return results;

  // Attempt to salvage individual JSON objects
  const objectMatches = [...text.matchAll(/\{[^{}]*"rating"\s*:\s*\d+[^{}]*\}/g)];
  if (objectMatches.length === expectedLength) {
    results = objectMatches.map((m) =>
      JSON.parse(m[0].replace(/,\s*([}\]])/g, "$1")),
    );
    return results;
  }

  throw new Error(
    `Expected ${expectedLength} results, got ${Array.isArray(results) ? results.length : "non-array"}`,
  );
}

function buildPrompt(entries: BatchEntry[]): string {
  const entriesText = entries
    .map((e, idx) => `Entry ${idx + 1} (${e.date}):\n${e.text}`)
    .join("\n\n---\n\n");

  return `Analyze each of the following journal entries. For each entry, consider its mood, content, and theme to produce a general rating out of 100 (where 1 is extremely negative and 100 is extremely positive).

For each entry, first write a paragraph of your thoughts about what you found noteworthy in the text and how it informed the rating you will give. Then write a single sentence summarizing why you gave that score. Then give the score.

Respond with a JSON array of exactly ${entries.length} objects, one for each entry in order:
{
  "rating": <integer 1-100>,
  "mood": "<positive|negative|neutral>",
  "description": "<a single sentence explaining why you gave this score, e.g. 'User debated whether umbrellas were real meaning they are quite confused thus very low score'>",
  "emoji": "<single most appropriate emoji>",
  "geminiRationale": "<a paragraph of your thoughts about what you found noteworthy in this text and how it informed the rating>",
  "score": <number -15 to +15, raw sentiment intensity>
}

ENTRIES:

${entriesText}

Respond ONLY with the JSON array, no other text.`;
}

function mapResults(
  analysisResults: unknown[],
  entries: BatchEntry[],
): MoodResult[] {
  return (analysisResults as Record<string, unknown>[]).map((result, idx) => ({
    id: entries[idx]!.id,
    rating: Math.max(
      1,
      Math.min(100, Math.round((result.rating as number) || 50)),
    ),
    mood: ((result.mood as string) || "neutral") as "positive" | "negative" | "neutral",
    description:
      (result.description as string) || "No description available",
    emoji: (result.emoji as string) || "😐",
    rationale:
      (result.description as string) || "No analysis available",
    geminiRationale:
      (result.geminiRationale as string) || "No detailed analysis available",
    score: Math.max(
      -15,
      Math.min(15, (result.score as number) || 0),
    ),
  }));
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.entries || !Array.isArray(body.entries) || body.entries.length === 0) {
    return NextResponse.json({ error: "Missing or invalid entries array." }, { status: 400 });
  }

  if (body.entries.length > 15) {
    return NextResponse.json({ error: "Maximum 15 entries per batch for quality analysis." }, { status: 400 });
  }

  const prompt = buildPrompt(body.entries);

  // ── Strategy 1: Swarm – race all fast providers in parallel ───────────
  const swarmProviders = getProviders();
  if (swarmProviders.length > 0) {
    try {
      const { text, provider } = await raceProviders(prompt, {
        temperature: 0.3,
        maxTokens: 8192,
      });

      console.log(`[Mood Analysis] Swarm winner: ${provider}`);

      const analysisResults = parseJsonArray(text, body.entries.length);
      const results = mapResults(analysisResults, body.entries);
      return NextResponse.json({ results, provider });
    } catch (swarmError) {
      console.warn("[Mood Analysis] All swarm providers failed, falling back to Gemini:", swarmError);
    }
  }

  // ── Strategy 2: Gemini fallback ───────────────────────────────────────
  const headerKey = req.headers.get("x-timeline-ai-key")?.trim();
  const validHeaderKey = headerKey && headerKey !== "null" && headerKey !== "undefined" ? headerKey : null;
  const apiKey = validHeaderKey || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "No AI providers available (swarm keys and Gemini key all missing)." },
      { status: 400 },
    );
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const config = {
      temperature: 0.3,
      topK: 20,
      topP: 0.8,
      maxOutputTokens: 8192,
    };
    const contents = [{ role: "user" as const, parts: [{ text: prompt }] }];

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      config,
      contents,
    });

    if (response.promptFeedback?.blockReason) {
      return NextResponse.json(
        { error: "Content blocked by safety filters." },
        { status: 400 },
      );
    }

    if (!response.candidates || response.candidates.length === 0) {
      return NextResponse.json(
        { error: "No response candidates generated." },
        { status: 502 },
      );
    }

    const text = response.text?.trim() || "";
    if (!text) {
      return NextResponse.json({ error: "Empty AI response." }, { status: 502 });
    }

    const analysisResults = parseJsonArray(text, body.entries.length);
    const results = mapResults(analysisResults, body.entries);

    return NextResponse.json({ results, provider: "gemini" });
  } catch (error: unknown) {
    console.error("[Mood Analysis Error]:", error);

    const err = error as { message?: string; code?: string | number; status?: number };
    const errorMessage = err?.message || String(error);

    if (err?.code === 429 || errorMessage?.includes("quota") || errorMessage?.includes("rate limit")) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 },
      );
    }

    return NextResponse.json(
      { error: "Mood analysis failed.", details: errorMessage.slice(0, 500) },
      { status: 500 },
    );
  }
}
