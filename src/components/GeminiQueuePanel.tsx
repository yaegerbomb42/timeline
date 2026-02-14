"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Brain, Zap, Clock, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useState, useMemo, useSyncExternalStore, useCallback } from "react";
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

const DISPLAY_DURATION_MS = 10_000;

// External store for tracking seen IDs and display items
// This avoids calling setState in effects which violates react-hooks/set-state-in-effect
const queueStore = {
  seenIds: new Set<string>(),
  items: [] as (QueueLogItem & { expiresAt: number })[],
  listeners: new Set<() => void>(),
  
  addItems(newResults: QueueLogItem[]) {
    const now = Date.now();
    let changed = false;
    for (const item of newResults) {
      if (!this.seenIds.has(item.id)) {
        this.seenIds.add(item.id);
        this.items = [{ ...item, expiresAt: now + DISPLAY_DURATION_MS }, ...this.items];
        changed = true;
      }
    }
    if (changed) this.notify();
  },
  
  cleanup() {
    const now = Date.now();
    const filtered = this.items.filter(item => item.expiresAt > now);
    if (filtered.length !== this.items.length) {
      this.items = filtered;
      this.notify();
    }
  },
  
  notify() {
    this.listeners.forEach(fn => fn());
  },
  
  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  },
  
  getSnapshot() {
    return this.items;
  }
};

function useDisplayQueue(recentResults: QueueLogItem[]) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  
  // Periodic tick for countdown + expiry
  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
      queueStore.cleanup();
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  
  // Sync new results into the external store
  useEffect(() => {
    if (recentResults.length > 0) {
      queueStore.addItems(recentResults);
    }
  }, [recentResults]);
  
  // Subscribe to store changes
  const items = useSyncExternalStore(
    useCallback((cb: () => void) => queueStore.subscribe(cb), []),
    useCallback(() => queueStore.getSnapshot(), []),
    useCallback(() => queueStore.getSnapshot(), []),
  );
  
  // Filter expired items for display
  const displayItems = useMemo(() => {
    return items.filter(item => item.expiresAt > nowMs);
  }, [items, nowMs]);
  
  return { displayItems, nowMs };
}

export function GeminiQueuePanel({ status, recentResults }: GeminiQueuePanelProps) {
  const { displayItems, nowMs } = useDisplayQueue(recentResults);

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
            Queue Processor
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

      {/* Two-column layout: Left = Queue / Right = Analysis */}
      {(displayItems.length > 0 || status.processing) && (
        <div className="grid grid-cols-2 divide-x divide-[var(--line)] min-h-[120px]">
          {/* Left column: Queue items being processed */}
          <div className="p-4">
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-sans mb-3 flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin text-[var(--neon-purple)]" />
              Queue
            </div>
            <div className="space-y-2 max-h-[240px] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
              <AnimatePresence initial={false}>
                {displayItems.map((item) => {
                  const timeLeft = Math.max(0, Math.ceil((item.expiresAt - nowMs) / 1000));
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="flex items-center gap-2 rounded-lg bg-[var(--bg-surface)]/60 px-3 py-2 border border-[var(--line)]/30"
                    >
                      <div
                        className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold font-mono border"
                        style={{
                          background: `${getMoodColorForPanel(item.mood)}15`,
                          borderColor: `${getMoodColorForPanel(item.mood)}40`,
                          color: getMoodColorForPanel(item.mood),
                        }}
                      >
                        {item.rating}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-mono text-[var(--text-muted)]">{item.date}</div>
                        <div className="text-xs text-[var(--text-secondary)] truncate">{item.description}</div>
                      </div>
                      <div className="text-[9px] font-mono text-[var(--text-muted)]">{timeLeft}s</div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {displayItems.length === 0 && status.processing && (
                <motion.div
                  animate={{ opacity: [0.3, 0.7, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-xs text-[var(--text-muted)] font-sans py-4 text-center"
                >
                  Analyzing entries...
                </motion.div>
              )}
            </div>
          </div>

          {/* Right column: Analysis results */}
          <div className="p-4">
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-sans mb-3 flex items-center gap-1.5">
              <Brain className="h-3 w-3 text-[var(--neon-cyan)]" />
              Analysis
            </div>
            <div className="space-y-3 max-h-[240px] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
              <AnimatePresence initial={false}>
                {displayItems.map((item) => (
                  <motion.div
                    key={`analysis-${item.id}`}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="rounded-lg bg-[var(--bg-surface)]/40 px-3 py-2 border border-[var(--line)]/30"
                  >
                    {/* Score and emoji header */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-sm">{item.emoji}</span>
                      <span
                        className="text-xs font-bold font-mono"
                        style={{ color: getMoodColorForPanel(item.mood) }}
                      >
                        {item.rating}/100
                      </span>
                      {item.consciousness && (
                        <span className="text-[9px] text-[var(--text-muted)] italic ml-auto bg-[var(--bg-surface)]/60 px-1.5 py-0.5 rounded">
                          {item.consciousness}
                        </span>
                      )}
                    </div>
                    
                    {/* Big rationale */}
                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed mb-1.5 line-clamp-4">
                      {item.geminiRationale}
                    </p>
                    
                    {/* Small permanent sentence summary */}
                    <div 
                      className="text-[10px] font-semibold border-t border-[var(--line)]/30 pt-1.5"
                      style={{ color: getMoodColorForPanel(item.mood) }}
                    >
                      {item.description}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {displayItems.length === 0 && status.processing && (
                <motion.div
                  animate={{ opacity: [0.3, 0.7, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-xs text-[var(--text-muted)] font-sans py-4 text-center"
                >
                  Waiting for results...
                </motion.div>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
