"use client";

import { AnimatePresence, motion } from "framer-motion";
import { KeyRound, LibraryBig, Sparkles, Zap, Brain, Cpu, Cloud, ArrowLeft } from "lucide-react";
import { useMemo, useState, useRef, useEffect } from "react";

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
  chats,
}: {
  uid: string;
  chats: Chat[];
}) {
  const { months } = useMonthIndex(uid);
  const monthIndex = useMemo(
    () => (months.length > 0 ? months : deriveMonthsFromChats(chats)),
    [months, chats],
  );

  const { aiKey, hydrated, hasKey, loading, setAiKey, clearAiKey } = useAiKey(uid);

  const [query, setQuery] = useState("");
  const [keyDraft, setKeyDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsKey, setNeedsKey] = useState(false);
  const [keyEntryDismissed, setKeyEntryDismissed] = useState(false);
  const [aiMode, setAiMode] = useState<"local" | "pro">("local");
  const [webllmProgress, setWebllmProgress] = useState<string | null>(null);
  
  // Chat history
  type ChatMessage = {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: number;
  };
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when chat history updates
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, busy]);

  // Check if WebGPU is available for WebLLM
  const webGPUAvailable = useMemo(() => isWebGPUAvailable(), []);

  // Automatically switch to Pro mode if WebGPU is not available
  useEffect(() => {
    if (!webGPUAvailable && aiMode === "local") {
      setAiMode("pro");
    }
  }, [webGPUAvailable, aiMode]);

  // Determine effective mode and ready state
  const effectiveMode = aiMode;
  const ready = hydrated && (effectiveMode === "local" ? webGPUAvailable : hasKey) && !needsKey;
  const shouldShowKeyEntry =
    hydrated && effectiveMode === "pro" && (!hasKey || needsKey) && !keyEntryDismissed;
  const shouldShowKeyHint =
    hydrated && effectiveMode === "pro" && (!hasKey || needsKey) && keyEntryDismissed;

  async function ask() {
    const q = query.trim();
    if (!q) return;
    
    // Add user message to history
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: q,
      timestamp: Date.now(),
    };
    setChatHistory(prev => [...prev, userMessage]);
    setQuery(""); // Clear input immediately
    
    setError(null);
    setBusy(true);
    setWebllmProgress(null);
    
    try {
      const context = buildTimelineContext({ months: monthIndex, chats });
      
      if (effectiveMode === "local") {
        // Use WebLLM local model
        const response = await generateWithWebLLM(q, context, (progress) => {
          setWebllmProgress(progress.text);
        });
        
        // Add assistant response to history
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: response,
          timestamp: Date.now(),
        };
        setChatHistory(prev => [...prev, assistantMessage]);
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
        const responseText = data.text?.trim() || "(No response)";
        
        // Add assistant response to history
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: responseText,
          timestamp: Date.now(),
        };
        setChatHistory(prev => [...prev, assistantMessage]);
      }
    } catch (err) {
      const error = err as Error;
      setError(error?.message ?? "AI request failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="rounded-3xl border border-[var(--line)] bg-[var(--bg-elevated)]/70 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden h-full flex flex-col"
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
            Timeline Chat
          </HolographicText>
        </div>
        <div className="mt-2 text-sm text-[var(--text-secondary)] flex items-center gap-2">
          <Brain className="h-3.5 w-3.5 text-[var(--neon-purple)]" />
          Ask questions about your timeline and get AI-powered insights
        </div>
      </div>

      <div className="px-6 py-6 flex-1 min-h-0">
        {!hydrated || loading ? (
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-sm text-[var(--electric-blue)] flex items-center gap-3"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Zap className="h-4 w-4" />
            </motion.div>
            Loading settings…
          </motion.div>
        ) : null}

        {shouldShowKeyEntry ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="text-sm text-[var(--text-primary)] leading-6">
              {!webGPUAvailable && (
                <div className="mb-3 px-3 py-2 rounded-xl bg-[var(--amber-glow)]/10 border border-[var(--amber-glow)]/30 text-xs">
                  ⚠️ WebGPU is not available in your browser. Local AI mode is disabled. Please use Pro mode with your Gemini API key.
                </div>
              )}
              Enter your Gemini API key for <span className="font-mono text-[var(--electric-blue)]">{uid}</span> to use Pro mode.
              {webGPUAvailable && <> Or switch to Local mode to use WebLLM (no API key needed).</>}
            </div>

            <label className="block">
              <span className="mb-2 inline-flex items-center gap-2 font-sans text-xs text-[var(--text-secondary)]">
                <KeyRound className="h-4 w-4 text-[var(--neon-purple)]" /> Gemini API Key (encrypted at rest)
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

            <div className="flex flex-wrap gap-3">
              <motion.button
                disabled={busy || !keyDraft.trim()}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setNeedsKey(false);
                  setKeyEntryDismissed(false);
                  setError(null);
                  setAiKey(keyDraft);
                  setKeyDraft("");
                }}
                className={cn(
                  "rounded-2xl px-5 py-3 font-sans text-sm font-bold text-[var(--bg-deep)]",
                  "bg-gradient-to-r from-[var(--neon-cyan)] via-[var(--neon-purple)] to-[var(--neon-pink)]",
                  "shadow-[0_10px_40px_rgba(131,56,236,0.4)]",
                  "hover:shadow-[0_15px_50px_rgba(131,56,236,0.5)] transition-all",
                  "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
                )}
              >
                Save key
              </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    setNeedsKey(false);
                    setKeyEntryDismissed(true);
                    setKeyDraft("");
                    setError(null);
                    if (webGPUAvailable) {
                      setAiMode("local");
                    }
                  }}
                className={cn(
                  "inline-flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--bg-surface)]/60 px-4 py-3 text-sm font-sans text-[var(--text-secondary)]",
                  "hover:text-[var(--text-primary)] hover:border-[var(--neon-cyan)] transition-colors",
                )}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </motion.button>
            </div>
          </motion.div>
        ) : null}

        {shouldShowKeyHint ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-[var(--line)] bg-[var(--bg-surface)]/70 px-5 py-4 text-sm text-[var(--text-secondary)]"
          >
            <div className="flex flex-col gap-3">
              <div>
                Pro mode needs an API key. You can keep using Local mode or add a key when you're ready.
              </div>
              <div className="flex flex-wrap gap-3">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    setKeyEntryDismissed(false);
                    setNeedsKey(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--bg-surface)]/60 px-4 py-2 text-xs font-sans text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--neon-purple)] transition-colors"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  Enter API key
                </motion.button>
                {webGPUAvailable && (
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      setAiMode("local");
                      setKeyEntryDismissed(false);
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--bg-surface)]/60 px-4 py-2 text-xs font-sans text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--neon-cyan)] transition-colors"
                  >
                    <Cpu className="h-3.5 w-3.5" />
                    Use Local mode
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        ) : null}

        {hydrated && ready ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col h-full min-h-[360px]"
          >
            {/* Mode Selection and Settings */}
            <div className="flex items-center gap-3 px-6 pt-4 pb-3 border-b border-[var(--line)]">
              <div className="text-xs text-[var(--text-secondary)] font-sans">AI Mode:</div>
              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setAiMode("local");
                    setKeyEntryDismissed(false);
                  }}
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
                  Local (Qwen)
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setAiMode("pro");
                    setKeyEntryDismissed(false);
                  }}
                  className={cn(
                    "rounded-xl px-4 py-2 text-xs font-sans border transition-all duration-200 flex items-center gap-2",
                    aiMode === "pro"
                      ? "border-[var(--neon-purple)] bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-[0_0_20px_var(--glow-purple)]"
                      : "border-[var(--line)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--neon-purple)]",
                  )}
                  title="Pro AI using Gemini (requires API key)"
                >
                  <Cloud className="h-3.5 w-3.5" />
                  Pro
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
                    setKeyEntryDismissed(false);
                  }}
                  className="text-xs font-sans text-[var(--text-secondary)] underline underline-offset-4 hover:text-[var(--neon-cyan)] transition-colors ml-auto"
                >
                  Change key
                </motion.button>
              )}
            </div>

            {/* Chat Messages - Scrollable Area */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {chatHistory.length === 0 && (
                <div className="text-center text-sm text-[var(--text-secondary)] py-8">
                  <Brain className="h-8 w-8 mx-auto mb-3 text-[var(--neon-cyan)] opacity-50" />
                  <p>Start a conversation about your timeline</p>
                  <p className="text-xs mt-2">Try: &ldquo;Tell me about July&rdquo;</p>
                </div>
              )}
              
              <AnimatePresence>
                {chatHistory.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className={cn(
                      "rounded-2xl px-4 py-3 text-[15px] leading-7 w-full",
                      msg.role === "user"
                        ? "bg-gradient-to-r from-[var(--neon-cyan)]/20 to-[var(--neon-purple)]/20 border border-[var(--neon-cyan)]/30"
                        : "bg-[var(--bg-surface)]/60 backdrop-blur-xl border border-[var(--line)]"
                    )}
                    style={{
                      boxShadow: msg.role === "user"
                        ? "0 0 20px rgba(0,245,255,0.2)"
                        : "0 0 20px rgba(0,0,0,0.3)",
                    }}
                  >
                    <div className="text-xs text-[var(--text-secondary)] mb-1 font-sans">
                      {msg.role === "user" ? "You" : "AI"}
                    </div>
                    <div className="text-[var(--text-primary)]">{msg.content}</div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {/* Loading indicator while thinking */}
              {busy && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="rounded-2xl bg-[var(--bg-surface)]/60 backdrop-blur-xl border border-[var(--line)] px-4 py-3 w-full"
                  style={{
                    boxShadow: "0 0 20px rgba(0,0,0,0.3)",
                  }}
                >
                  <div className="text-xs text-[var(--text-secondary)] mb-1 font-sans">AI</div>
                  <div className="flex items-center gap-2 text-[var(--text-primary)]">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Sparkles className="h-4 w-4 text-[var(--neon-cyan)]" />
                    </motion.div>
                    <span>Thinking...</span>
                  </div>
                </motion.div>
              )}
              
              {/* WebLLM Progress */}
              <AnimatePresence>
                {webllmProgress && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    className="rounded-2xl border border-[var(--neon-cyan)]/50 bg-[var(--bg-surface)]/80 px-4 py-2 text-xs text-[var(--text-secondary)] flex items-center gap-2 w-full"
                  >
                    <Cpu className="h-3.5 w-3.5 text-[var(--neon-cyan)]" />
                    {webllmProgress}
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Error Display */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    className="rounded-2xl border border-[var(--neon-pink)]/50 bg-[var(--bg-surface)]/80 px-4 py-3 text-sm text-[var(--text-primary)] w-full"
                    style={{
                      boxShadow: "0 0 20px rgba(255,0,110,0.3)",
                    }}
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Scroll anchor */}
              <div ref={chatEndRef} />
            </div>

            {/* Input Bar at Bottom */}
            <div className="px-6 py-4 border-t border-[var(--line)]">
              <div className="flex gap-3">
                <motion.input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void ask();
                    }
                  }}
                  placeholder="Ask about your timeline..."
                  whileFocus={{ scale: 1.01 }}
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
                  Ask
                </motion.button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </div>
    </motion.div>
  );
}
