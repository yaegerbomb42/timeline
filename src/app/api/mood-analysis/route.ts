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
  consciousness: string;
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

  const prompt = `You are an expert emotional intelligence and consciousness analyst. Analyze the following journal entries with deep comprehension-based judging.

For each entry, provide:
1. A sophisticated mood rating based on understanding context, subtext, and emotional nuance
2. Detailed rationale explaining your reasoning (3-4 sentences minimum)
3. A consciousness-level assessment with abbreviated summary

Consider:
- Emotional tone, sentiment, and underlying feelings
- Language patterns, word choice, and intensity
- Self-awareness, introspection, and depth of thought
- Context: life events, relationships, personal growth
- Consciousness indicators:
  * "observant text" - detailed external observations
  * "self discovery" - introspective insights
  * "overthinking reality" - philosophical rumination
  * "social connection" - relationship/connection experiences
  * "pessimistic" - negative outlook
  * "hopeful" - optimistic forward-thinking
  * "emotional processing" - working through feelings
  * "creative expression" - artistic/creative thinking

Respond with a JSON array containing exactly ${body.entries.length} objects, one for each entry in order:
{
  "rating": <number 1-100>,
  "mood": "<positive|negative|neutral>",
  "description": "<sophisticated mood description>",
  "emoji": "<appropriate emoji>",
  "rationale": "<3-4 sentence detailed explanation of mood reasoning>",
  "geminiRationale": "<comprehensive analysis: explain emotional patterns, consciousness level, underlying themes, and contextual understanding - 4-5 sentences>",
  "consciousness": "<abbreviated summary, e.g. 'observant text', 'self discovery', 'overthinking reality again', 'social connection', 'pessimistic', 'hopeful'>",
  "score": <number -15 to +15>
}

Rating scale (based on comprehensive understanding):
- 90-100: Ecstatic, thrilled, highly optimistic, peak consciousness
- 75-89: Happy, content, positive, good self-awareness
- 60-74: Upbeat, hopeful, mildly positive, reflective
- 50-59: Neutral, balanced, contemplative
- 40-49: Slightly down, contemplative, introspective
- 25-39: Stressed, anxious, disappointed, struggling
- 10-24: Sad, depressed, emotionally burdened
- 1-9: Devastated, heartbroken, severe distress

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
      // Extract JSON from response (might have markdown code blocks)
      const jsonMatch = text.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/) || text.match(/(\[[\s\S]*\])/);
      const jsonText = jsonMatch ? jsonMatch[1] : text;
      analysisResults = JSON.parse(jsonText);
    } catch (parseError) {
      console.error("Failed to parse AI response:", text);
      return NextResponse.json(
        { error: "Failed to parse AI response as JSON.", details: text.slice(0, 500) },
        { status: 502 }
      );
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
      description: result.description || "neutral",
      emoji: result.emoji || "😐",
      rationale: result.rationale || "No analysis available",
      geminiRationale: result.geminiRationale || result.rationale || "No detailed analysis available",
      consciousness: result.consciousness || "neutral observation",
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
