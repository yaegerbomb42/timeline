import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { GEMINI_MODEL } from "@/lib/ai/config";

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

  // Limit batch size to 15 entries for optimal quality and context
  // This ensures maximum context and quality over speed
  if (body.entries.length > 15) {
    return NextResponse.json({ error: "Maximum 15 entries per batch for quality analysis." }, { status: 400 });
  }

  const headerKey = req.headers.get("x-timeline-ai-key")?.trim();
  const validHeaderKey = headerKey && headerKey !== "null" && headerKey !== "undefined" ? headerKey : null;
  const apiKey = validHeaderKey || process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json({ error: "Missing AI key." }, { status: 400 });
  }

  // Create the prompt for batch mood analysis
  const entriesText = body.entries
    .map((e, idx) => `Entry ${idx + 1} (${e.date}):\n${e.text}`)
    .join("\n\n---\n\n");

  const prompt = `Analyze each of the following journal entries. For each entry, consider its mood, content, and theme to produce a general rating out of 100 (where 1 is extremely negative and 100 is extremely positive).

For each entry, first write a paragraph of your thoughts about what you found noteworthy in the text and how it informed the rating you will give. Then write a single sentence summarizing why you gave that score. Then give the score.

Respond with a JSON array of exactly ${body.entries.length} objects, one for each entry in order:
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

  try {
    const ai = new GoogleGenAI({ apiKey });

    // Temperature 0.3: Provides consistent mood ratings while maintaining contextual understanding
    // Lower values (0.1-0.2) would be too rigid, higher (0.5+) too variable for mood consistency
    const config = {
      temperature: 0.3,
      topK: 20,
      topP: 0.8,
      maxOutputTokens: 8192,
    };

    const contents = [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ];

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      config,
      contents,
    });

    if (response.promptFeedback?.blockReason) {
      return NextResponse.json(
        { error: "Content blocked by safety filters." },
        { status: 400 }
      );
    }

    if (!response.candidates || response.candidates.length === 0) {
      return NextResponse.json(
        { error: "No response candidates generated." },
        { status: 502 }
      );
    }

    const text = response.text?.trim() || "";
    if (!text) {
      return NextResponse.json(
        { error: "Empty AI response." },
        { status: 502 }
      );
    }

    // Parse JSON response
    let analysisResults: any[];
    try {
      // Extract JSON from response (might have markdown code blocks or extra text)
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
      // Strip any trailing commas before closing brackets (common AI formatting issue)
      jsonText = jsonText.replace(/,\s*([}\]])/g, '$1');
      analysisResults = JSON.parse(jsonText);
    } catch {
      console.error("Failed to parse AI response:", text.slice(0, 200));

      // Attempt to salvage partial results by extracting individual JSON objects
      try {
        const objectMatches = [...text.matchAll(/\{[^{}]*"rating"\s*:\s*\d+[^{}]*\}/g)];
        if (objectMatches.length === body.entries.length) {
          analysisResults = objectMatches.map(m => JSON.parse(m[0].replace(/,\s*([}\]])/g, '$1')));
        } else {
          return NextResponse.json(
            { error: "Failed to parse AI response as JSON.", details: text.slice(0, 500) },
            { status: 502 }
          );
        }
      } catch {
        return NextResponse.json(
          { error: "Failed to parse AI response as JSON.", details: text.slice(0, 500) },
          { status: 502 }
        );
      }
    }

    // Validate and map results to entries
    if (!Array.isArray(analysisResults) || analysisResults.length !== body.entries.length) {
      return NextResponse.json(
        { error: `Expected ${body.entries.length} results, got ${analysisResults.length}` },
        { status: 502 }
      );
    }

    const results: MoodResult[] = analysisResults.map((result, idx) => ({
      id: body.entries[idx]!.id,
      rating: Math.max(1, Math.min(100, Math.round(result.rating || 50))),
      mood: result.mood || "neutral",
      description: result.description || "No description available",
      emoji: result.emoji || "😐",
      rationale: result.description || "No analysis available",
      geminiRationale: result.geminiRationale || "No detailed analysis available",
      score: Math.max(-15, Math.min(15, result.score || 0)),
    }));

    return NextResponse.json({ results });
  } catch (error: unknown) {
    console.error("[Mood Analysis Error]:", error);
    
    const err = error as { message?: string; code?: string | number; status?: number };
    const errorMessage = err?.message || String(error);
    
    if (err?.code === 429 || errorMessage?.includes("quota") || errorMessage?.includes("rate limit")) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { error: "Mood analysis failed.", details: errorMessage.slice(0, 500) },
      { status: 500 }
    );
  }
}
