"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X, Brain, Sparkles, Activity } from "lucide-react";
import { useEffect } from "react";
import { format } from "date-fns";

import { cn } from "@/lib/utils";
import type { Chat } from "@/lib/chats";

export function MoodRationaleModal({
  isOpen,
  onClose,
  chat,
}: {
  isOpen: boolean;
  onClose: () => void;
  chat: Chat | null;
}) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!chat || !chat.moodAnalysis) return null;

  const { moodAnalysis } = chat;

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-[var(--neon-purple)]/30 bg-[var(--bg-elevated)]/90 backdrop-blur-2xl shadow-[0_24px_60px_rgba(0,0,0,0.5),0_0_40px_rgba(155,81,224,0.2)] max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Animated gradient background */}
            <motion.div
              className="absolute inset-0 -z-10 opacity-20 rounded-3xl"
              animate={{
                background: [
                  "radial-gradient(circle at 0% 0%, var(--glow-purple), transparent)",
                  "radial-gradient(circle at 100% 100%, var(--glow-cyan), transparent)",
                  "radial-gradient(circle at 0% 100%, var(--glow-purple), transparent)",
                ],
              }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            />
            
            {/* Header */}
            <div className="relative px-8 pt-8 pb-6 border-b border-[var(--line)]">
              <button
                onClick={onClose}
                className="absolute right-6 top-6 rounded-xl p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]/60 hover:text-[var(--neon-cyan)] transition-all"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-start gap-4">
                <motion.div 
                  className="rounded-2xl bg-[var(--neon-purple)]/10 p-3 border border-[var(--neon-purple)]/30"
                  animate={{
                    boxShadow: [
                      "0 0 20px rgba(155,81,224,0.2)",
                      "0 0 30px rgba(155,81,224,0.4)",
                      "0 0 20px rgba(155,81,224,0.2)",
                    ],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Brain className="h-6 w-6 text-[var(--neon-purple)]" />
                </motion.div>
                <div className="flex-1">
                  <h3 className="font-book text-2xl text-[var(--text-primary)]">
                    Mood Analysis
                  </h3>
                  <p className="mt-1 text-xs text-[var(--text-secondary)] font-mono">
                    {format(chat.createdAt, "EEEE, MMMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
              </div>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
              {/* Mood Score */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-2xl border border-[var(--line)] bg-[var(--bg-surface)]/60 backdrop-blur-xl p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <Activity className="h-4 w-4 text-[var(--neon-cyan)]" />
                  <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)] font-sans">
                    Mood Score
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-6xl font-bold text-[var(--neon-purple)]" style={{ textShadow: "0 0 20px var(--glow-purple)" }}>
                    {moodAnalysis.emoji}
                  </div>
                  <div className="flex-1">
                    <div className="text-4xl font-bold font-mono text-[var(--text-primary)]">
                      {moodAnalysis.rating}
                      <span className="text-2xl text-[var(--text-secondary)]">/100</span>
                    </div>
                    <div className="mt-2 text-lg text-[var(--neon-purple)] capitalize">
                      {moodAnalysis.description}
                    </div>
                    {moodAnalysis.consciousness && (
                      <div className="mt-2 text-sm text-[var(--text-secondary)] italic">
                        "{moodAnalysis.consciousness}"
                      </div>
                    )}
                  </div>
                </div>
                {/* Progress bar */}
                <div className="mt-6 h-2 rounded-full bg-[var(--bg-surface)] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${moodAnalysis.rating}%` }}
                    transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                    className="h-full rounded-full"
                    style={{
                      background: moodAnalysis.mood === "positive" 
                        ? "linear-gradient(90deg, #00ff88, #00ffcc)"
                        : moodAnalysis.mood === "negative"
                        ? "linear-gradient(90deg, #ff6b9d, #ff8fab)"
                        : "linear-gradient(90deg, #00f5ff, #9b51e0)",
                      boxShadow: moodAnalysis.mood === "positive"
                        ? "0 0 10px #00ff88"
                        : moodAnalysis.mood === "negative"
                        ? "0 0 10px #ff6b9d"
                        : "0 0 10px #00f5ff",
                    }}
                  />
                </div>
              </motion.div>

              {/* Basic Rationale */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-2xl border border-[var(--line)] bg-[var(--bg-surface)]/60 backdrop-blur-xl p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <Sparkles className="h-4 w-4 text-[var(--neon-cyan)]" />
                  <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)] font-sans">
                    Analysis Summary
                  </div>
                </div>
                <p className="text-sm text-[var(--text-primary)] leading-relaxed font-sans">
                  {moodAnalysis.rationale}
                </p>
              </motion.div>

              {/* Gemini Deep Analysis (if available) */}
              {moodAnalysis.geminiRationale && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="rounded-2xl border border-[var(--neon-purple)]/30 bg-gradient-to-br from-[var(--neon-purple)]/5 to-[var(--neon-cyan)]/5 backdrop-blur-xl p-6"
                  style={{
                    boxShadow: "0 0 20px rgba(155,81,224,0.1)",
                  }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <Brain className="h-4 w-4 text-[var(--neon-purple)]" />
                    <div className="text-xs uppercase tracking-[0.2em] text-[var(--neon-purple)] font-sans font-semibold">
                      Gemini Deep Analysis
                    </div>
                  </div>
                  <p className="text-sm text-[var(--text-primary)] leading-relaxed font-sans">
                    {moodAnalysis.geminiRationale}
                  </p>
                </motion.div>
              )}

              {/* Entry Preview */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="rounded-2xl border border-[var(--line)] bg-[var(--bg-surface)]/40 backdrop-blur-xl p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <Sparkles className="h-4 w-4 text-[var(--neon-cyan)]" />
                  <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)] font-sans">
                    Entry Text
                  </div>
                </div>
                <div className="text-sm text-[var(--text-primary)] leading-relaxed font-serif max-h-60 overflow-y-auto">
                  {chat.text}
                </div>
              </motion.div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-[var(--line)] bg-[var(--bg-surface)]/20 px-8 py-5">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className={cn(
                  "rounded-2xl border border-[var(--neon-purple)]/50 bg-[var(--neon-purple)]/10 px-6 py-2.5",
                  "font-sans text-sm font-semibold text-[var(--neon-purple)]",
                  "hover:bg-[var(--neon-purple)]/20 hover:border-[var(--neon-purple)] transition-all",
                  "shadow-[0_8px_20px_rgba(155,81,224,0.2)]",
                )}
              >
                Close
              </motion.button>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
