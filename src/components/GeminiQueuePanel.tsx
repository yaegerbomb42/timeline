"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Brain, Zap, Clock, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useState, useMemo, useSyncExternalStore, useCallback } from "react";
import type { QueueLogItem, PendingDisplayEntry } from "@/lib/hooks/useMoodAnalysisQueue";

interface GeminiQueuePanelProps {
  status: {
    pending: number;
    processing: boolean;
    processed: number;
    total: number;
    errors: number;
  };
  recentResults: QueueLogItem[];
  pendingEntries: PendingDisplayEntry[];
}

function getMoodColorForPanel(mood: string): string {
  switch (mood) {
    case "positive": return "#00ff88";
    case "negative": return "#ff6b9d";
    default: return "#00f5ff";
  }
}

const DISPLAY_DURATION_MS = 10_000;
const MAX_DISPLAY_ITEMS = 5;

// ── Slot types ──────────────────────────────────────────────────────────
type PendingSlot = { kind: "pending"; entry: PendingDisplayEntry };
type ActiveSlot = { kind: "active"; entry: PendingDisplayEntry };
type CompletedSlot = { kind: "completed"; result: QueueLogItem; expiresAt: number };
type DisplaySlot = PendingSlot | ActiveSlot | CompletedSlot;

// ── External store for completed items (avoids setState-in-effect) ─────
const completedStore = {
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
  },
};

function useDisplaySlots(
  recentResults: QueueLogItem[],
  pendingEntries: PendingDisplayEntry[],
  isProcessing: boolean,
) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Periodic tick for countdown + expiry
  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
      completedStore.cleanup();
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync new results into the external store
  useEffect(() => {
    if (recentResults.length > 0) {
      completedStore.addItems(recentResults);
    }
  }, [recentResults]);

  // Subscribe to store changes
  const completedItems = useSyncExternalStore(
    useCallback((cb: () => void) => completedStore.subscribe(cb), []),
    useCallback(() => completedStore.getSnapshot(), []),
    useCallback(() => completedStore.getSnapshot(), []),
  );

  // Build a unified slot list: completed items first, then active, then pending
  const slots: DisplaySlot[] = useMemo(() => {
    const result: DisplaySlot[] = [];

    // IDs of entries that have completed results still on screen
    const completedEntryIds = new Set(
      completedItems.filter(c => c.expiresAt > nowMs).map(c => c.entryId),
    );

    // Completed items (still visible, showing results)
    for (const c of completedItems) {
      if (c.expiresAt > nowMs && result.length < MAX_DISPLAY_ITEMS) {
        result.push({ kind: "completed", result: c, expiresAt: c.expiresAt });
      }
    }

    // Fill remaining slots with pending entries (skip any that are already completed on screen)
    const remainingSlots = MAX_DISPLAY_ITEMS - result.length;
    if (remainingSlots > 0) {
      const filteredPending = pendingEntries.filter(e => !completedEntryIds.has(e.id));
      for (let i = 0; i < Math.min(remainingSlots, filteredPending.length); i++) {
        const entry = filteredPending[i]!;
        // First pending entry is "active" when processing
        if (i === 0 && isProcessing) {
          result.push({ kind: "active", entry });
        } else {
          result.push({ kind: "pending", entry });
        }
      }
    }

    return result;
  }, [completedItems, pendingEntries, isProcessing, nowMs]);

  return { slots, nowMs };
}

export function GeminiQueuePanel({ status, recentResults, pendingEntries }: GeminiQueuePanelProps) {
  const { slots, nowMs } = useDisplaySlots(recentResults, pendingEntries, status.processing);

  const hasContent = slots.length > 0 || status.processing;

  if (!hasContent && status.pending === 0 && status.processed === 0) return null;

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
            AI Queue Processor
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

      {/* 5-slot queue visualizer */}
      {(slots.length > 0 || status.processing) && (
        <div className="p-4 space-y-2 max-h-[600px] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
          {slots.length === 0 && status.processing && (
            <motion.div
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-xs text-[var(--text-muted)] font-sans py-4 text-center flex items-center justify-center gap-2"
            >
              <Loader2 className="h-3 w-3 animate-spin" />
              Analyzing entries...
            </motion.div>
          )}
          <AnimatePresence initial={false}>
            {slots.map((slot) => {
              const key = slot.kind === "completed" ? slot.result.id : slot.entry.id;
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.35 }}
                  className="rounded-xl bg-[var(--bg-surface)]/50 border border-[var(--line)]/40 overflow-hidden"
                >
                  {slot.kind === "active" && <ActiveSlotView entry={slot.entry} />}
                  {slot.kind === "pending" && <PendingSlotView entry={slot.entry} />}
                  {slot.kind === "completed" && <CompletedSlotView result={slot.result} expiresAt={slot.expiresAt} nowMs={nowMs} />}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

// ── Active: top-most entry being analyzed ────────────────────────────────
function ActiveSlotView({ entry }: { entry: PendingDisplayEntry }) {
  return (
    <div className="relative">
      {/* Scanning glow bar */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--neon-cyan)] to-transparent"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-1.5">
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 className="h-3 w-3 text-[var(--neon-cyan)]" />
          </motion.div>
          <span className="text-[10px] font-mono text-[var(--neon-cyan)]">ANALYZING</span>
          {entry.date && (
            <span className="text-[10px] font-mono text-[var(--text-muted)] ml-auto">{entry.date}</span>
          )}
        </div>
        <p className="text-xs text-[var(--text-primary)] leading-relaxed line-clamp-3">
          {entry.text}
        </p>
        {/* Pulsing analysis placeholder */}
        <div className="mt-2 space-y-1.5">
          <motion.div
            animate={{ opacity: [0.15, 0.3, 0.15] }}
            transition={{ duration: 1.8, repeat: Infinity }}
            className="h-2.5 rounded bg-[var(--neon-cyan)]/20 w-4/5"
          />
          <motion.div
            animate={{ opacity: [0.1, 0.25, 0.1] }}
            transition={{ duration: 1.8, repeat: Infinity, delay: 0.3 }}
            className="h-2.5 rounded bg-[var(--neon-cyan)]/20 w-3/5"
          />
        </div>
      </div>
    </div>
  );
}

// ── Pending: waiting in queue ────────────────────────────────────────────
function PendingSlotView({ entry }: { entry: PendingDisplayEntry }) {
  return (
    <div className="px-4 py-2.5 opacity-50">
      <div className="flex items-center gap-2 mb-1">
        <Clock className="h-3 w-3 text-[var(--text-muted)]" />
        <span className="text-[10px] font-mono text-[var(--text-muted)]">QUEUED</span>
        {entry.date && (
          <span className="text-[10px] font-mono text-[var(--text-muted)] ml-auto">{entry.date}</span>
        )}
      </div>
      <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-2">
        {entry.text}
      </p>
    </div>
  );
}

// ── Completed: shows results for 10s then blinks away ────────────────────
function CompletedSlotView({
  result,
  expiresAt,
  nowMs,
}: {
  result: QueueLogItem;
  expiresAt: number;
  nowMs: number;
}) {
  const timeLeft = Math.max(0, Math.ceil((expiresAt - nowMs) / 1000));
  const moodColor = getMoodColorForPanel(result.mood);
  // Blink effect in last 2 seconds
  const isBlinking = timeLeft <= 2;

  return (
    <motion.div
      animate={isBlinking ? { opacity: [1, 0.3, 1, 0.3, 1] } : { opacity: 1 }}
      transition={isBlinking ? { duration: 1, repeat: Infinity } : {}}
    >
      {/* Entry text */}
      <div className="px-4 py-3 border-b border-[var(--line)]/20 bg-[var(--bg-surface)]/30">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-mono text-[var(--text-muted)]">{result.date}</span>
          <span className="text-[9px] font-mono text-[var(--text-muted)] bg-[var(--bg-surface)]/60 px-1.5 py-0.5 rounded">
            {timeLeft}s
          </span>
        </div>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-3">
          {result.text || result.description}
        </p>
      </div>

      {/* Analysis result */}
      <div className="px-4 py-3">
        {/* Score header */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-base">{result.emoji}</span>
          <span
            className="text-sm font-bold font-mono"
            style={{ color: moodColor }}
          >
            {result.rating}/100
          </span>
        </div>

        {/* Paragraph analysis */}
        <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed mb-2">
          {result.geminiRationale}
        </p>

        {/* Sentence summary */}
        <div
          className="text-[11px] font-semibold border-t border-[var(--line)]/30 pt-2"
          style={{ color: moodColor }}
        >
          {result.description}
        </div>
      </div>
    </motion.div>
  );
}
