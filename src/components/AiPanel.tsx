"use client";

import { AnimatePresence, motion } from "framer-motion";
import { KeyRound, LibraryBig, Sparkles, Zap, Brain, Cpu, Cloud } from "lucide-react";
import { useMemo, useState } from "react";

import { buildTimelineContext } from "@/lib/ai/context";
import type { MonthIndex } from "@/lib/ai/monthIndex";
import { useMonthIndex } from "@/lib/ai/monthIndex";
import { useAiKey } from "@/lib/ai/useAiKey";
import { generateWithWebLLM, isWebGPUAvailable } from "@/lib/ai/webllm";
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

// Holographic text effect
function HolographicText({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      className={cn("relative", className)}
      animate={{
        backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
      }}
      transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
      style={{
        background: "linear-gradient(90deg, var(--neon-cyan), var(--neon-purple), var(--neon-pink), var(--neon-cyan))",
        backgroundSize: "200% 100%",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
      }}
    >
      {children}
    </motion.div>
  );
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

  const { aiKey, hydrated, hasKey, setAiKey, clearAiKey } = useAiKey(identity);

  const [query, setQuery] = useState("");
  const [keyDraft, setKeyDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsKey, setNeedsKey] = useState(false);
  const [aiMode, setAiMode] = useState<"local" | "pro">("local");
  const [webllmProgress, setWebllmProgress] = useState<string | null>(null);

  // Check if WebGPU is available for WebLLM
  const webGPUAvailable = useMemo(() => isWebGPUAvailable(), []);

  // Default to Pro mode if no WebGPU and user has a key
  const effectiveMode = !webGPUAvailable && hasKey ? "pro" : aiMode;
  const ready = hydrated && (effectiveMode === "local" ? webGPUAvailable : hasKey) && !needsKey;

  async function ask() {
    const q = query.trim();
    if (!q) return;
    setError(null);
    setAnswer(null);
    setBusy(true);
    setWebllmProgress(null);
    
    try {
      const context = buildTimelineContext({ months: monthIndex, chats });
      
      if (effectiveMode === "local") {
        // Use WebLLM local model
        const response = await generateWithWebLLM(q, context, (progress) => {
          setWebllmProgress(progress.text);
        });
        setAnswer(response);
        setWebllmProgress(null);
      } else {
        // Use Gemini Pro API
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
      }
    } catch (err: any) {
      setError(err?.message ?? "AI request failed.");
    } finally {
      setBusy(false);
    }
  }
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
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="rounded-3xl border border-[var(--line)] bg-[var(--bg-elevated)]/70 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden"
      style={{
        boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(131,56,236,0.2) inset",
      }}
    >
      {/* Holographic background effect */}
      <motion.div
        className="absolute inset-0 -z-10 opacity-15"
        animate={{
          background: [
            "radial-gradient(circle at 0% 0%, var(--glow-cyan), transparent)",
            "radial-gradient(circle at 100% 100%, var(--glow-purple), transparent)",
            "radial-gradient(circle at 50% 50%, var(--glow-pink), transparent)",
            "radial-gradient(circle at 0% 0%, var(--glow-cyan), transparent)",
          ],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative px-6 pt-6 pb-4 border-b border-[var(--line)]">
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <LibraryBig className="h-5 w-5 text-[var(--neon-cyan)]" />
          </motion.div>
          <HolographicText className="font-sans text-base font-bold">
            Ask about your timeline
          </HolographicText>
        </div>
        <div className="mt-2 text-sm text-[var(--text-secondary)] flex items-center gap-2">
          <Brain className="h-3.5 w-3.5 text-[var(--neon-purple)]" />
          Summaries like &ldquo;Tell me about July.&rdquo; (AI is for synthesis, not simple find.)
        </div>
      </div>

      <div className="px-6 py-6">
        {!hydrated ? (
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-sm text-[var(--neon-cyan)] flex items-center gap-3"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Zap className="h-4 w-4" />
            </motion.div>
            Loading…
          </motion.div>
        ) : null}

        {hydrated && (!hasKey || needsKey) && effectiveMode === "pro" ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="text-sm text-[var(--text-primary)] leading-6">
              Enter your Gemini API key for <span className="font-mono text-[var(--neon-cyan)]">{identity}</span> to use Pro mode.
              Or switch to Local mode to use WebLLM (no API key needed).
            </div>

            <label className="block">
              <span className="mb-2 inline-flex items-center gap-2 font-sans text-xs text-[var(--text-secondary)]">
                <KeyRound className="h-4 w-4 text-[var(--neon-purple)]" /> Gemini API Key
              </span>
              <motion.input
                value={keyDraft}
                onChange={(e) => setKeyDraft(e.target.value)}
                type="password"
                placeholder="AIza…"
                whileFocus={{ scale: 1.02 }}
                className="w-full rounded-2xl border border-[var(--line)] bg-[var(--bg-surface)]/60 backdrop-blur-xl px-4 py-3 font-mono text-sm text-[var(--text-primary)] outline-none focus:ring-4 focus:ring-[var(--glow-cyan)] transition-all"
                style={{
                  boxShadow: "0 0 20px rgba(0,0,0,0.3)",
                }}
              />
            </label>

            <motion.button
              disabled={busy}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setNeedsKey(false);
                setError(null);
                setAiKey(keyDraft);
                setKeyDraft("");
              }}
              className={cn(
                "rounded-2xl px-5 py-3 font-sans text-sm font-bold text-[var(--bg-deep)]",
                "bg-gradient-to-r from-[var(--neon-cyan)] via-[var(--neon-purple)] to-[var(--neon-pink)]",
                "shadow-[0_10px_40px_rgba(131,56,236,0.4)]",
                "hover:shadow-[0_15px_50px_rgba(131,56,236,0.5)] transition-all",
              )}
            >
              Save key
            </motion.button>
          </motion.div>
        ) : null}

        {hydrated && ready ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Mode Selection */}
            <div className="flex items-center gap-3">
              <div className="text-xs text-[var(--text-secondary)] font-sans">AI Mode:</div>
              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setAiMode("local")}
                  disabled={!webGPUAvailable}
                  className={cn(
                    "rounded-xl px-4 py-2 text-xs font-sans border transition-all duration-200 flex items-center gap-2",
                    aiMode === "local" && webGPUAvailable
                      ? "border-[var(--neon-cyan)] bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-[0_0_20px_var(--glow-cyan)]"
                      : "border-[var(--line)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--neon-cyan)]",
                    !webGPUAvailable && "opacity-50 cursor-not-allowed"
                  )}
                  title={!webGPUAvailable ? "WebGPU not available in your browser" : "Free local AI using WebLLM"}
                >
                  <Cpu className="h-3.5 w-3.5" />
                  Local (WebLLM)
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setAiMode("pro")}
                  className={cn(
                    "rounded-xl px-4 py-2 text-xs font-sans border transition-all duration-200 flex items-center gap-2",
                    aiMode === "pro"
                      ? "border-[var(--neon-purple)] bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-[0_0_20px_var(--glow-purple)]"
                      : "border-[var(--line)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--neon-purple)]",
                  )}
                  title="Pro AI using Gemini (requires API key)"
                >
                  <Cloud className="h-3.5 w-3.5" />
                  Pro (Gemini)
                </motion.button>
              </div>
              {aiMode === "pro" && hasKey && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    clearAiKey();
                    setNeedsKey(true);
                  }}
                  className="text-xs font-sans text-[var(--text-secondary)] underline underline-offset-4 hover:text-[var(--neon-cyan)] transition-colors"
                >
                  Change key
                </motion.button>
              )}
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-[var(--text-secondary)] flex items-center gap-2">
                <Brain className="h-3.5 w-3.5 text-[var(--neon-cyan)]" />
                Context: monthly index + recent entries
              </div>
            </div>

            <div className="flex gap-3">
              <motion.input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void ask();
                }}
                placeholder='e.g. "Tell me about my July."'
                whileFocus={{ scale: 1.02 }}
                className="flex-1 rounded-2xl border border-[var(--line)] bg-[var(--bg-surface)]/60 backdrop-blur-xl px-4 py-3 font-sans text-[15px] text-[var(--text-primary)] outline-none focus:ring-4 focus:ring-[var(--glow-cyan)] transition-all"
                style={{
                  boxShadow: "0 0 20px rgba(0,0,0,0.3)",
                }}
              />
              <motion.button
                onClick={() => void ask()}
                disabled={busy || !query.trim()}
                whileHover={!busy && query.trim() ? { scale: 1.08, y: -2 } : {}}
                whileTap={!busy && query.trim() ? { scale: 0.95 } : {}}
                className={cn(
                  "rounded-2xl px-5 py-3 font-sans text-sm font-bold text-[var(--bg-deep)]",
                  "bg-gradient-to-r from-[var(--neon-cyan)] via-[var(--neon-purple)] to-[var(--neon-pink)]",
                  "shadow-[0_10px_40px_rgba(131,56,236,0.4)]",
                  "hover:shadow-[0_15px_50px_rgba(131,56,236,0.5)] transition-all",
                  "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
                )}
              >
                {busy ? (
                  <span className="flex items-center gap-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Sparkles className="h-4 w-4" />
                    </motion.div>
                    Thinking…
                  </span>
                ) : (
                  "Ask"
                )}
              </motion.button>
            </div>

            <AnimatePresence>
              {webllmProgress && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.95 }}
                  className="rounded-2xl border border-[var(--neon-cyan)]/50 bg-[var(--bg-surface)]/80 px-4 py-3 text-sm text-[var(--text-primary)] flex items-center gap-3"
                  style={{
                    boxShadow: "0 0 20px rgba(0,245,255,0.3)",
                  }}
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Cpu className="h-4 w-4 text-[var(--neon-cyan)]" />
                  </motion.div>
                  {webllmProgress}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {error ? (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.95 }}
                  className="rounded-2xl border border-[var(--neon-pink)]/50 bg-[var(--bg-surface)]/80 px-4 py-3 text-sm text-[var(--text-primary)]"
                  style={{
                    boxShadow: "0 0 20px rgba(255,0,110,0.3)",
                  }}
                >
                  {error}
                </motion.div>
              ) : null}
            </AnimatePresence>

            <AnimatePresence>
              {answer ? (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="rounded-2xl border border-[var(--line)] bg-[var(--bg-surface)]/60 backdrop-blur-xl px-5 py-4 text-[15px] leading-7 text-[var(--text-primary)]"
                  style={{
                    boxShadow: "0 0 30px rgba(0,245,255,0.2)",
                  }}
                >
                  {answer}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        ) : null}
      </div>
    </motion.div>
  );
}
