"use client";

import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Clock3, Trash2, Sparkles, RotateCw } from "lucide-react";
import { useState, useCallback, useRef } from "react";

import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import type { Chat } from "@/lib/chats";
import { updateMoodRating, resetSingleMoodAnalysis } from "@/lib/chats";
import { cn } from "@/lib/utils";

// Convert a rating (1-100) to the same color used by the rollercoaster gradient
function ratingToColor(rating: number): string {
  if (rating < 40) {
    const intensity = (40 - rating) / 40;
    return `rgb(${255}, ${Math.round(100 * (1 - intensity))}, ${Math.round(100 * (1 - intensity))})`;
  } else if (rating > 60) {
    const intensity = (rating - 60) / 40;
    return `rgb(${Math.round(100 * (1 - intensity))}, ${255}, ${Math.round(136 * intensity)})`;
  } else {
    const neutralPos = (rating - 40) / 20;
    return `rgb(${255}, ${Math.round(200 + 55 * neutralPos)}, ${Math.round(100 * (1 - neutralPos))})`;
  }
}

// Timeline Entry Component
function TimelineEntry({
  chat,
  isHighlighted,
  onDelete,
  uid,
  index,
  isFirst,
}: {
  chat: Chat;
  isHighlighted?: boolean;
  onDelete?: (id: string) => void;
  uid?: string;
  index: number;
  isFirst: boolean;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sliderValue, setSliderValue] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isDraggingBadge = useRef(false);

  const currentRating = chat.moodAnalysis?.rating ?? 50;
  const displayRating = sliderValue !== null ? sliderValue : currentRating;

  const handleConfirmDelete = () => {
    if (!onDelete) return;
    setIsDeleting(true);
    setTimeout(() => {
      onDelete(chat.id);
    }, 300);
  };

  const handleBadgeDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!uid) return;
    e.preventDefault();
    isDraggingBadge.current = true;
    const startX = "touches" in e ? e.touches[0]!.clientX : e.clientX;
    const startRating = sliderValue ?? currentRating;

    const handleMove = (ev: MouseEvent | TouchEvent) => {
      if (!isDraggingBadge.current) return;
      const currentX = "touches" in ev ? ev.touches[0]!.clientX : (ev as MouseEvent).clientX;
      const dx = currentX - startX;
      // 2px of drag = 1 rating point
      const delta = Math.round(dx / 2);
      setSliderValue(Math.max(1, Math.min(100, startRating + delta)));
    };

    const handleUp = () => {
      if (!isDraggingBadge.current) return;
      isDraggingBadge.current = false;
      // Commit the drag value
      setSliderValue((val) => {
        if (val !== null && val !== currentRating) {
          void updateMoodRating(uid!, chat.id, val);
        }
        return null;
      });
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleUp);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("touchend", handleUp);
  }, [uid, chat.id, sliderValue, currentRating]);

  const handleRefresh = useCallback(async () => {
    if (!uid || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await resetSingleMoodAnalysis(uid, chat.id);
    } catch (err) {
      console.error("Failed to re-queue entry:", err);
    } finally {
      // Keep spinner briefly so user sees feedback
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  }, [uid, chat.id, isRefreshing]);

  const dateStr = format(chat.createdAt, "MMM d, yyyy");
  const timeStr = format(chat.createdAt, "h:mm a");

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, x: -30 }}
        animate={
          isDeleting
            ? { opacity: 0, x: -30, scale: 0.9 }
            : { opacity: 1, x: 0, scale: 1 }
        }
        exit={{ opacity: 0, x: -30, scale: 0.9 }}
        transition={{ duration: 0.5, delay: index * 0.05 }}
        id={`chat-${chat.id}`}
        className="group relative flex gap-6 items-start py-4"
      >
        {/* Date column on the left */}
        <div className="flex-shrink-0 w-32 text-right">
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 + 0.1 }}
            className="text-xs font-mono text-[var(--text-secondary)]"
          >
            <div className="font-bold text-[var(--neon-cyan)]">{dateStr}</div>
            <div className="mt-1 text-[var(--text-muted)]">{timeStr}</div>
          </motion.div>
        </div>

        {/* Timeline node and connector */}
        <div className="relative flex flex-col items-center flex-shrink-0">
          {/* Connector line to previous entry */}
          {!isFirst && (
            <motion.div
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
              className="absolute bottom-1/2 w-[2px] h-12 origin-bottom"
              style={{
                background:
                  "linear-gradient(180deg, var(--neon-cyan), var(--neon-purple))",
                boxShadow: "0 0 5px var(--glow-cyan)",
              }}
            />
          )}

          {/* Node */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: isHighlighted ? [1, 1.3, 1] : 1,
              opacity: 1,
            }}
            transition={{ delay: index * 0.05 + 0.15, duration: 0.4 }}
            className="relative z-10 w-4 h-4 rounded-full"
            style={{
              background: chat.moodAnalysis
                ? `radial-gradient(circle, ${
                    chat.moodAnalysis.mood === "positive"
                      ? "#00ff88"
                      : chat.moodAnalysis.mood === "negative"
                        ? "#ff6b9d"
                        : "#00f5ff"
                  }, ${
                    chat.moodAnalysis.mood === "positive"
                      ? "#00ff88dd"
                      : chat.moodAnalysis.mood === "negative"
                        ? "#ff6b9ddd"
                        : "#00f5ffdd"
                  })`
                : "radial-gradient(circle, var(--neon-cyan), var(--neon-cyan-dd))",
              boxShadow: isHighlighted
                ? "0 0 20px var(--glow-cyan), 0 0 40px var(--glow-purple)"
                : "0 0 10px var(--glow-cyan)",
            }}
          >
            {isHighlighted && (
              <motion.div
                className="absolute inset-0 rounded-full"
                animate={{
                  scale: [1, 2, 1],
                  opacity: [0.6, 0, 0.6],
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
                style={{
                  background: "radial-gradient(circle, var(--neon-cyan), transparent)",
                }}
              />
            )}
          </motion.div>

          {/* Connector line to next entry */}
          <motion.div
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ delay: index * 0.05 + 0.2, duration: 0.3 }}
            className="w-[2px] flex-1 min-h-8 origin-top"
            style={{
              background:
                "linear-gradient(180deg, var(--neon-purple), var(--neon-pink))",
              boxShadow: "0 0 5px var(--glow-purple)",
            }}
          />
        </div>

        {/* Content area */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 + 0.2, duration: 0.4 }}
          className={cn(
            "flex-1 rounded-2xl border border-[var(--line)] bg-[var(--bg-elevated)]/70 backdrop-blur-xl p-5",
            "shadow-[0_8px_24px_rgba(0,0,0,0.3)]",
            isHighlighted &&
              "ring-2 ring-[var(--neon-cyan)]/50 shadow-[0_12px_32px_rgba(0,245,255,0.3)]"
          )}
        >
          {/* Header with mood badge (draggable to rescore), refresh, and delete button */}
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {chat.moodAnalysis && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 + 0.25 }}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl px-3 py-1.5 border border-[var(--line)] bg-[var(--bg-surface)]/50",
                    uid && !chat.imageOnly && "cursor-ew-resize select-none"
                  )}
                  title={uid && !chat.imageOnly
                    ? `Drag left/right to adjust rating (${Math.round(displayRating)}/100)\n${chat.moodAnalysis.description}\n${chat.moodAnalysis.rationale}`
                    : `Mood: ${chat.moodAnalysis.mood} - ${chat.moodAnalysis.description}\n${chat.moodAnalysis.rationale}`}
                  onMouseDown={uid && !chat.imageOnly ? handleBadgeDragStart : undefined}
                  onTouchStart={uid && !chat.imageOnly ? handleBadgeDragStart : undefined}
                >
                  <span className="text-base">{chat.moodAnalysis.emoji}</span>
                  <span className="text-xs font-mono font-semibold" style={{ color: ratingToColor(displayRating) }}>
                    {Math.round(displayRating)}/100
                  </span>
                  <span className="text-xs text-[var(--text-secondary)] italic capitalize hidden sm:inline">
                    {chat.moodAnalysis.description}
                  </span>
                </motion.div>
              )}

              {/* Refresh button to re-queue for AI analysis */}
              {!chat.imageOnly && uid && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 + 0.3 }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                >
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.15, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className={cn(
                      "rounded-lg p-1.5 text-[var(--text-secondary)] hover:text-[var(--neon-cyan)] hover:bg-[var(--bg-surface)]/50 transition-colors",
                      isRefreshing && "animate-spin text-[var(--neon-cyan)]"
                    )}
                    title="Re-analyze with AI"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                  </motion.button>
                </motion.div>
              )}
            </div>

            {onDelete && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 + 0.3 }}
                whileHover={{ scale: 1.1, rotate: 15 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowConfirm(true)}
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl p-2 text-[var(--text-secondary)] hover:text-[var(--neon-pink)] hover:bg-[var(--bg-surface)]/50"
              >
                <Trash2 className="h-4 w-4" />
              </motion.button>
            )}
          </div>

          {/* Content with image and text */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.05 + 0.3 }}
            className={cn(
              "text-[15px] leading-7 text-[var(--text-primary)] font-sans",
              chat.imageUrl && chat.text && "flex gap-4"
            )}
          >
            {/* Image display */}
            {chat.imageUrl && (
              <motion.div
                initial={{ opacity: 0, x: -10, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ delay: index * 0.05 + 0.4, duration: 0.5 }}
                className={cn(
                  "rounded-xl overflow-hidden border border-[var(--line)] bg-[var(--bg-surface)]/40",
                  chat.text ? "flex-shrink-0 w-48 h-48" : "w-full max-w-md"
                )}
                style={{
                  boxShadow: "0 0 20px rgba(0,245,255,0.2)",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={chat.imageUrl}
                  alt="Entry image"
                  loading="lazy"
                  decoding="async"
                  className={cn(
                    "w-full object-cover bg-[var(--bg-deep)]/40",
                    chat.text ? "h-full" : "max-h-80"
                  )}
                />
              </motion.div>
            )}
            
            {/* Text content - wraps around image if present */}
            {chat.text ? (
              <div className="flex-1 whitespace-pre-wrap">
                {chat.text}
              </div>
            ) : chat.imageOnly ? (
              <div className="mt-2 text-sm text-[var(--text-muted)] italic">
                Image entry
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      </motion.div>

      <DeleteConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmDelete}
        entryPreview={chat.excerpt}
      />
    </>
  );
}

export function TimelineLog({
  chats,
  loading,
  error,
  onDelete,
  highlightChatId,
  uid,
}: {
  chats: Chat[];
  loading: boolean;
  error: string | null;
  onDelete?: (id: string) => void;
  highlightChatId?: string | null;
  uid?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="rounded-3xl border border-[var(--line)] bg-[var(--bg-elevated)]/60 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden"
      style={{
        boxShadow:
          "0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(0,245,255,0.1) inset",
      }}
    >
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-[var(--line)]">
        <div className="flex items-center gap-3 text-[var(--text-primary)]">
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          >
            <Clock3 className="h-5 w-5 text-[var(--neon-cyan)]" />
          </motion.div>
          <div className="font-sans text-base font-bold">Timeline View</div>
        </div>
        <div className="mt-2 text-sm text-[var(--text-secondary)] flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-[var(--neon-purple)]" />
          Your journey, one moment at a time.
        </div>
      </div>

      {/* Timeline content - no scrolling, just grows */}
      <div className="px-6 py-4">
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-4 rounded-2xl border border-[var(--neon-pink)]/50 bg-[var(--bg-surface)]/80 px-5 py-4 text-sm text-[var(--text-primary)]"
            style={{
              boxShadow: "0 0 20px rgba(255,0,110,0.3)",
            }}
          >
            {error}
          </motion.div>
        )}

        {loading && chats.length === 0 && (
          <div className="py-12 text-center">
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-base text-[var(--neon-cyan)] font-book flex items-center justify-center gap-3"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="h-5 w-5" />
              </motion.div>
              Loading…
            </motion.div>
          </div>
        )}

        {!loading && chats.length === 0 && (
          <div className="py-12 text-center">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-base text-[var(--text-secondary)]"
            >
              No entries yet. Start your timeline by writing above.
            </motion.p>
          </div>
        )}

        <AnimatePresence mode="popLayout" initial={false}>
          {chats.map((c, idx) => (
            <TimelineEntry
              key={c.id}
              chat={c}
              isHighlighted={c.id === highlightChatId}
              onDelete={onDelete}
              uid={uid}
              index={idx}
              isFirst={idx === 0}
            />
          ))}
        </AnimatePresence>

        {/* End marker */}
        {chats.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: chats.length * 0.05 + 0.5 }}
            className="flex items-center justify-center py-8"
          >
            <div className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)] font-sans flex items-center gap-3">
              <div className="h-[2px] w-12 bg-gradient-to-r from-transparent to-[var(--neon-cyan)]" />
              <Sparkles className="h-3 w-3 text-[var(--neon-cyan)]" />
              Beginning
              <Sparkles className="h-3 w-3 text-[var(--neon-cyan)]" />
              <div className="h-[2px] w-12 bg-gradient-to-l from-transparent to-[var(--neon-cyan)]" />
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
