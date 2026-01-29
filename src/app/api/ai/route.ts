import { NextResponse } from "next/server";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";

import { GEMINI_MODEL } from "@/lib/ai/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  query?: string;
  context?: string;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const q = String(body.query ?? "").trim();
  const ctx = String(body.context ?? "").trim();
  if (!q) return NextResponse.json({ error: "Missing query." }, { status: 400 });

  const headerKey = req.headers.get("x-timeline-ai-key")?.trim();
  // Filter out empty string, "null", and "undefined" string values
  const validHeaderKey = headerKey && headerKey !== "null" && headerKey !== "undefined" ? headerKey : null;
  const apiKey = validHeaderKey || process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Missing AI key." }, { status: 400 });

  const prompt = `${ctx}\n\nUSER QUESTION: ${q}\n\nAnswer:`;

  try {
    const ai = new GoogleGenAI({
      apiKey,
    });

    const config = {
      thinkingConfig: {
        thinkingLevel: ThinkingLevel.HIGH,
      },
      temperature: 0.35,
      topK: 24,
      topP: 0.85,
      maxOutputTokens: 8192,
    };

    const contents = [
      {
        role: "user",
        parts: [
          {
            text: prompt,
          },
        ],
      },
    ];

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      config,
      contents,
    });

    // Check if the prompt was blocked
    if (response.promptFeedback?.blockReason) {
      const reason = response.promptFeedback.blockReason;
      const message = response.promptFeedback.blockReasonMessage || `Content blocked: ${reason}`;
      return NextResponse.json(
        { error: "Content blocked by safety filters.", details: message },
        { status: 400 }
      );
    }

    // Check if there are no candidates
    if (!response.candidates || response.candidates.length === 0) {
      return NextResponse.json(
        { error: "No response candidates generated.", details: "The model did not generate any candidates." },
        { status: 502 }
      );
    }

    // Check finish reason before extracting text
    const firstCandidate = response.candidates[0];
    if (firstCandidate?.finishReason === "SAFETY") {
      return NextResponse.json(
        {
          error: "Response blocked by safety filters.",
          details: "The model generated content that was filtered by safety systems.",
        },
        { status: 400 }
      );
    }

    const text = response.text?.trim() || "";
    if (!text) {
      // If we have a candidate but no text, check the finish reason
      if (firstCandidate?.finishReason) {
        const finishReason = firstCandidate.finishReason;
        if (finishReason === "MAX_TOKENS") {
          // Reasoning exhausted the token limit before generating text
          return NextResponse.json(
            {
              error: "Token limit exceeded.",
              details: "The model's reasoning process exhausted the token limit before generating a response. Please try a simpler or shorter question.",
            },
            { status: 502 }
          );
        }
        if (finishReason === "STOP") {
          // Normal finish but we still got empty text - unusual
          return NextResponse.json(
            {
              error: "Empty AI response.",
              details: `The model finished with reason '${finishReason}' but returned no text. This may indicate an API issue.`,
            },
            { status: 502 }
          );
        }
        return NextResponse.json(
          {
            error: "Response incomplete or stopped unexpectedly.",
            details: `Finish reason: ${finishReason}`,
          },
          { status: 502 }
        );
      }
      return NextResponse.json(
        {
          error: "Empty AI response.",
          details: "The model returned an empty text response. This may indicate an API issue or model configuration problem.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ text });
  } catch (error: any) {
    // Log error for debugging (server-side only)
    console.error("[AI Route Error]:", {
      message: error?.message,
      name: error?.name,
      status: error?.status,
      code: error?.code,
      stack: error?.stack?.split("\n").slice(0, 5).join("\n"),
    });

    const errorMessage = error?.message || String(error);
    const errorCode = error?.code || error?.status;
    const errorDetails = errorMessage.slice(0, 1800);
    
    // Check for specific API errors
    if (errorCode === 404 || errorMessage?.includes("not found")) {
      return NextResponse.json(
        { error: "Model not found.", details: `The model '${GEMINI_MODEL}' may not be available. ${errorDetails}` },
        { status: 404 }
      );
    }
    if (errorCode === 401 || errorCode === 403 || errorMessage?.includes("API key") || errorMessage?.includes("authentication")) {
      return NextResponse.json(
        { error: "Authentication failed.", details: "Invalid API key or authentication error." },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: "AI request failed.", details: errorDetails },
      { status: 500 },
    );
  }
}

