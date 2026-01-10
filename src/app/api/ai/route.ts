import { NextResponse } from "next/server";

import { DEFAULT_GEMINI_API_KEY, GEMINI_MODEL, GEMINI_URL } from "@/lib/ai/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  query?: string;
  context?: string;
};

function pickText(data: any) {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts.map((p: any) => String(p?.text ?? "")).join("");
}

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

  // Use v1 API with gemini-3-pro-preview, matching the Python example structure
  const res = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.35,
        topK: 24,
        topP: 0.85,
        maxOutputTokens: 700,
      },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json(
      { error: "AI request failed.", status: res.status, details: text.slice(0, 1800) },
      { status: res.status },
    );
  }

  const data = await res.json().catch(() => ({}));
  const text = pickText(data).trim();
  if (!text) {
    return NextResponse.json({ error: "Empty AI response." }, { status: 502 });
  }

  return NextResponse.json({ text });
}


