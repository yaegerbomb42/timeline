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

  const prompt = `You are an expert emotional intelligence analyst and psychologist with deep understanding of human consciousness, emotion, and behavior. You provide extremely precise mood ratings and thoughtful, rich summaries for personal journal entries.

For each entry, analyze thoroughly:

1. **Emotional Landscape**: Primary and secondary emotions, emotional intensity, emotional contradictions
2. **Language Analysis**: Word choice, sentence structure, punctuation patterns, use of capitalization, exclamation marks
3. **Context & Subtext**: What is said explicitly vs. what is implied; sarcasm detection; emotional masking
4. **Self-Awareness**: How conscious is the writer of their own emotional state?
5. **Cognitive Patterns**: Rumination, catastrophizing, growth thinking, acceptance, avoidance
6. **Life Context**: Events, relationships, goals, challenges, victories mentioned or implied

Consciousness Indicators (select the most fitting):
  * "observant text" - detailed external observations, noticing surroundings
  * "self discovery" - introspective insights, personal revelations
  * "overthinking reality" - philosophical rumination, analysis paralysis
  * "social connection" - relationship/connection focused
  * "pessimistic" - negative outlook, cynicism, hopelessness
  * "hopeful" - optimistic, forward-thinking, excited about future
  * "emotional processing" - actively working through feelings
  * "creative expression" - artistic, imaginative, abstract thinking
  * "grounded presence" - mindful, present-moment awareness, calm
  * "growth mindset" - learning from experience, building resilience

Respond with a JSON array of exactly ${body.entries.length} objects, one for each entry in order:
{
  "rating": <integer 1-100, be precise and nuanced>,
  "mood": "<positive|negative|neutral>",
  "description": "<a punchy, complete sentence capturing the emotional essence - NOT just adjectives>",
  "emoji": "<single most appropriate emoji>",
  "rationale": "<3-4 sentence summary: state the dominant emotion, explain key emotional drivers from the text, note any emotional complexity or contradictions, and give your overall impression>",
  "geminiRationale": "<5-8 sentence deep analysis (~500 tokens): analyze the emotional arc of the entry, discuss what the writer may not be saying explicitly, identify patterns of thought or behavior, assess their self-awareness level, note the consciousness type and why, and provide a compassionate psychological perspective>",
  "consciousness": "<one of the consciousness indicators above>",
  "score": <number -15 to +15, maps to raw sentiment intensity>
}

RATING GUIDELINES (be precise - use the full range with intention):
- 95-100: Life-changing joy, peak experiences, profound gratitude/love
- 85-94: Very happy, significant achievement, deep contentment  
- 75-84: Clearly happy, good day, meaningful positive experiences
- 65-74: Mildly positive, productive, things going well
- 55-64: Slightly positive, routine but okay, mild optimism
- 45-54: Truly neutral, factual recording, mixed feelings that cancel out
- 35-44: Mildly negative, minor frustrations, slight worry or boredom
- 25-34: Clearly unhappy, notable stress, disappointment, or sadness
- 15-24: Quite distressed, significant anxiety, anger, or grief
- 5-14: Severe distress, crisis, devastating events
- 1-4: Absolute rock bottom, emergency-level emotional pain

CALIBRATION EXAMPLES:
- Confused/Ambiguous (~49/100): "User appears confused about where to go next in life, expressing uncertainty about career direction."
- Deeply Sad (~8/100): "Claims they feel bluer than the sky, expressing profound emotional pain and hopelessness."
- High Positive (~84/100): "Played with dogs and had a good time fishing with friends at the lake."

CRITICAL RULES:
- Be PRECISE. A "pretty good day" is 65-72, not 85. "Feeling okay" is 50-55, not 70.
- Most routine journal entries naturally fall between 40-65.
- Only give 80+ for genuinely strong positive content with clear emotional evidence.
- Only give below 25 for genuinely severe negative content.
- NEVER be fooled by the literary FORM of writing. Poetry, songs, and creative writing can express DEVASTATING sadness. A poem about a pet dying, a loved one being lost, or grief is EXTREMELY NEGATIVE (5-20 range) regardless of beautiful language. Analyze the CONTENT and MEANING, not the writing style.
- Death, loss, dying, grief, bereavement, terminal illness — these are ALWAYS strong negative indicators (rating 5-25) regardless of how artfully expressed.
- Sarcasm, irony, and dark humor that masks pain should be rated based on the UNDERLYING emotion, not the surface tone.
- The "description" field should be a COMPLETE SENTENCE, not just adjectives. Example: "Played with dogs and had a good time fishing." NOT "happy and content".
- The "rationale" should reference SPECIFIC words, phrases, or themes from the entry.
- The "geminiRationale" should provide genuine psychological insight (~500 tokens), not just restate the entry. This is the detailed analysis that shows your expertise.

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
