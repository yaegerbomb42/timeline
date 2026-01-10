import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

import { DEFAULT_GEMINI_API_KEY, GEMINI_MODEL } from "@/lib/ai/config";

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
  const apiKey = headerKey || process.env.GEMINI_API_KEY || DEFAULT_GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Missing AI key." }, { status: 400 });

  const prompt = `${ctx}\n\nUSER QUESTION: ${q}\n\nAnswer:`;

  try {
    const ai = new GoogleGenAI({
      apiKey,
    });

    const config = {
      thinkingConfig: {
        thinkingLevel: "HIGH",
      },
      generationConfig: {
        temperature: 0.35,
        topK: 24,
        topP: 0.85,
        maxOutputTokens: 700,
      },
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

    const text = response.text?.trim() || "";
    if (!text) {
      return NextResponse.json({ error: "Empty AI response." }, { status: 502 });
    }

    return NextResponse.json({ text });
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    const errorDetails = errorMessage.slice(0, 1800);
    return NextResponse.json(
      { error: "AI request failed.", details: errorDetails },
      { status: 500 },
    );
  }
}


