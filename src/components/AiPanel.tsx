"use client";

import { AnimatePresence, motion } from "framer-motion";
import { KeyRound, LibraryBig, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import { buildTimelineContext } from "@/lib/ai/context";
import type { MonthIndex } from "@/lib/ai/monthIndex";
import { useMonthIndex } from "@/lib/ai/monthIndex";
import { useAiKey } from "@/lib/ai/useAiKey";
import type { Chat } from "@/lib/chats";
import { cn } from "@/lib/utils";

function deriveMonthsFromChats(chats: Chat[]): MonthIndex[] {
  const byMonth = new Map<string, { count: number; samples: string[] }>();
  for (const c of chats) {
    const monthKey = c.dayKey.slice(0, 7);
    const b = byMonth.get(monthKey) ?? { count: 0, samples: [] };
    b.count += 1;
    if (b.samples.length < 6) b.samples.push(c.excerpt);
    byMonth.set(monthKey, b);
  }
  const out: MonthIndex[] = [...byMonth.entries()].map(([monthKey, v]) => ({
    monthKey,
    count: v.count,
    samples: v.samples,
  }));
  out.sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  return out;
}

export function AiPanel({
  uid,
  identity,
  chats,
}: {
  uid: string;
  identity: string;
  chats: Chat[];
}) {
  const { months } = useMonthIndex(uid);
  const monthIndex = useMemo(
    () => (months.length > 0 ? months : deriveMonthsFromChats(chats)),
    [months, chats],
  );

  const { aiKey, hydrated, hasKey, setAiKey, clearAiKey, useDefaultKey } = useAiKey(identity);

  const [query, setQuery] = useState("");
  const [keyDraft, setKeyDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsKey, setNeedsKey] = useState(false);

  const ready = hydrated && hasKey && !needsKey;

  async function ask() {
    const q = query.trim();
    if (!q) return;
    setError(null);
    setAnswer(null);
    setBusy(true);
    try {
      const context = buildTimelineContext({ months: monthIndex, chats });
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-timeline-ai-key": aiKey,
        },
        body: JSON.stringify({ query: q, context }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        const msg = String(payload?.details || payload?.error || `AI request failed (${res.status}).`);
        if (res.status === 401 || res.status === 403) {
          clearAiKey();
          setNeedsKey(true);
          setError("Your AI key was rejected. Re-enter it and try again.");
          return;
        }
        setError(msg);
        return;
      }
      const data = (await res.json()) as { text?: string };
      setAnswer(data.text?.trim() || "(No response)");
    } catch (err: any) {
      setError(err?.message ?? "AI request failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-3xl border border-[var(--line)] bg-white/50 backdrop-blur-sm shadow-[0_14px_50px_var(--shadow)] overflow-hidden">
      <div className="px-6 pt-6 pb-4 border-b border-[var(--line)]">
        <div className="flex items-center gap-2">
          <LibraryBig className="h-4 w-4 text-[color:var(--brass-2)]" />
          <div className="font-sans text-sm text-[color:var(--ink)]">Ask the librarian</div>
        </div>
        <div className="mt-1 text-xs text-[color:var(--muted)]">
          Summaries like “Tell me about July.” (AI is for synthesis, not simple find.)
        </div>
      </div>

      <div className="px-6 py-5">
        {!hydrated ? (
          <div className="text-sm text-[color:var(--muted)]">Loading…</div>
        ) : null}

        {hydrated && (!hasKey || needsKey) ? (
          <div className="space-y-3">
            <div className="text-sm text-[color:var(--ink-2)]">
              Enter your Gemini API key once for <span className="font-mono">{identity}</span>. If it ever stops working, you’ll see this again—nothing breaks.
            </div>

            <label className="block">
              <span className="mb-1.5 inline-flex items-center gap-2 font-sans text-xs text-[color:var(--muted)]">
                <KeyRound className="h-3.5 w-3.5" /> AI Key
              </span>
              <input
                value={keyDraft}
                onChange={(e) => setKeyDraft(e.target.value)}
                type="password"
                placeholder="AIza…"
                className="w-full rounded-2xl border border-[var(--line)] bg-white/60 px-4 py-3 font-mono text-sm text-[color:var(--ink)] outline-none focus:ring-4 focus:ring-[var(--ring)]"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                disabled={busy}
                onClick={() => {
                  setNeedsKey(false);
                  setError(null);
                  setAiKey(keyDraft);
                  setKeyDraft("");
                }}
                className={cn(
                  "rounded-2xl px-4 py-2.5 font-sans text-sm text-[color:var(--paper)]",
                  "bg-[linear-gradient(135deg,var(--brass),var(--brass-2))]",
                  "shadow-[0_10px_30px_rgba(176,141,87,0.20)] hover:shadow-[0_14px_40px_rgba(176,141,87,0.24)] transition-shadow",
                )}
              >
                Save key
              </button>
              <button
                disabled={busy}
                onClick={() => {
                  setNeedsKey(false);
                  setError(null);
                  useDefaultKey();
                }}
                className="rounded-2xl border border-[var(--line)] bg-white/60 px-4 py-2.5 font-sans text-sm text-[color:var(--ink)] hover:bg-white/80 transition-colors"
              >
                <span className="inline-flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[color:var(--brass-2)]" />
                  Use included key
                </span>
              </button>
            </div>
          </div>
        ) : null}

        {hydrated && ready ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-[color:var(--muted)]">
                Context: monthly index + recent entries (kept bounded as you grow).
              </div>
              <button
                onClick={() => {
                  clearAiKey();
                  setNeedsKey(true);
                }}
                className="text-xs font-sans text-[color:var(--muted)] underline underline-offset-4 hover:text-[color:var(--ink)] transition-colors"
              >
                Change key
              </button>
            </div>

            <div className="flex gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void ask();
                }}
                placeholder='e.g. "Tell me about my July."'
                className="flex-1 rounded-2xl border border-[var(--line)] bg-white/60 px-4 py-3 font-serif text-[15px] text-[color:var(--ink)] outline-none focus:ring-4 focus:ring-[var(--ring)]"
              />
              <button
                onClick={() => void ask()}
                disabled={busy || !query.trim()}
                className={cn(
                  "rounded-2xl px-4 py-3 font-sans text-sm text-[color:var(--paper)]",
                  "bg-[linear-gradient(135deg,var(--brass),var(--brass-2))]",
                  "shadow-[0_10px_30px_rgba(176,141,87,0.20)] hover:shadow-[0_14px_40px_rgba(176,141,87,0.24)] transition-shadow",
                  "disabled:opacity-60 disabled:cursor-not-allowed",
                )}
              >
                {busy ? "Thinking…" : "Ask"}
              </button>
            </div>

            <AnimatePresence>
              {error ? (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="rounded-2xl border border-[rgba(140,60,40,0.25)] bg-[rgba(140,60,40,0.06)] px-4 py-3 text-sm text-[color:var(--ink)]"
                >
                  {error}
                </motion.div>
              ) : null}
            </AnimatePresence>

            <AnimatePresence>
              {answer ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="rounded-2xl border border-[var(--line)] bg-white/60 px-4 py-4 text-[15px] leading-7 text-[color:var(--ink)]"
                >
                  {answer}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        ) : null}
      </div>
    </div>
  );
}


