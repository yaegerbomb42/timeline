"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Brain, Zap, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QueueLogItem } from "@/lib/hooks/useMoodAnalysisQueue";

interface GeminiQueuePanelProps {
  status: {
    pending: number;
    processing: boolean;
    processed: number;
    total: number;
    errors: number;
  };
  recentResults: QueueLogItem[];
}

function getMoodColorForPanel(mood: string): string {
  switch (mood) {
    case "positive": return "#00ff88";
    case "negative": return "#ff6b9d";
    default: return "#00f5ff";
  }
}

export function GeminiQueuePanel({ status, recentResults }: GeminiQueuePanelProps) {
  const hasActivity = status.pending > 0 || status.processing || recentResults.length > 0;
  
  if (!hasActivity) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-[var(--line)] bg-[var(--bg-elevated)]/60 backdrop-blur-2xl overflow-hidden"
      style={{
        boxShadow: "0 12px 40px rgba(0,0,0,0.4), 0 0 20px rgba(155,81,224,0.1) inset",
      }}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--line)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            animate={status.processing ? { rotate: [0, 360] } : {}}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Brain className="h-4 w-4 text-[var(--neon-purple)]" />
          </motion.div>
          <span className="text-sm font-sans font-semibold text-[var(--text-primary)]">
            Gemini Analysis Queue
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono">
          {status.processing && (
            <motion.span
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="flex items-center gap-1.5 text-[var(--neon-cyan)]"
            >
              <Zap className="h-3 w-3" />
              Processing
            </motion.span>
          )}
          {status.pending > 0 && (
            <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
              <Clock className="h-3 w-3" />
              {status.pending} pending
            </span>
          )}
          {status.processed > 0 && (
            <span className="flex items-center gap-1.5 text-green-400">
              <CheckCircle className="h-3 w-3" />
              {status.processed} done
            </span>
          )}
          {status.errors > 0 && (
            <span className="flex items-center gap-1.5 text-red-400">
              <AlertCircle className="h-3 w-3" />
              {status.errors} errors
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {status.processing && status.total > 0 && (
        <div className="h-1 bg-[var(--bg-surface)]">
          <motion.div
            className="h-full bg-gradient-to-r from-[var(--neon-purple)] to-[var(--neon-cyan)]"
            initial={{ width: 0 }}
            animate={{ width: `${Math.round((status.processed / status.total) * 100)}%` }}
            transition={{ duration: 0.5 }}
            style={{ boxShadow: "0 0 8px var(--glow-purple)" }}
          />
        </div>
      )}

      {/* Recent results log */}
      {recentResults.length > 0 && (
        <div className="max-h-[320px] overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "var(--neon-purple) var(--bg-surface)" }}>
          <AnimatePresence initial={false}>
            {recentResults.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20, height: 0 }}
                animate={{ opacity: 1, x: 0, height: "auto" }}
                exit={{ opacity: 0, x: 20, height: 0 }}
                transition={{ duration: 0.3 }}
                className={cn(
                  "px-5 py-3 border-b border-[var(--line)]/50",
                  idx === 0 && "bg-[var(--neon-purple)]/5"
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Rating badge */}
                  <div
                    className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold font-mono border"
                    style={{
                      background: `${getMoodColorForPanel(item.mood)}15`,
                      borderColor: `${getMoodColorForPanel(item.mood)}40`,
                      color: getMoodColorForPanel(item.mood),
                    }}
                  >
                    {item.rating}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-[var(--text-secondary)]">
                        {item.date}
                      </span>
                      <span className="text-sm">{item.emoji}</span>
                      <span
                        className="text-xs font-sans capitalize"
                        style={{ color: getMoodColorForPanel(item.mood) }}
                      >
                        {item.description}
                      </span>
                      {item.consciousness && (
                        <span className="text-[10px] text-[var(--text-muted)] italic ml-auto">
                          {item.consciousness}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-2">
                      {item.geminiRationale}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Empty state when processing but no results yet */}
      {status.processing && recentResults.length === 0 && (
        <div className="px-5 py-6 text-center">
          <motion.div
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-xs text-[var(--text-muted)] font-sans"
          >
            Analyzing entries with Gemini AI...
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
