"use client";

import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Clock3, Trash2, Sparkles } from "lucide-react";
import { useState } from "react";

import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import type { Chat } from "@/lib/chats";
import { cn } from "@/lib/utils";

// Timeline Entry Component
function TimelineEntry({
  chat,
  isHighlighted,
  onDelete,
  index,
  isFirst,
}: {
  chat: Chat;
  isHighlighted?: boolean;
  onDelete?: (id: string) => void;
  index: number;
  isFirst: boolean;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = () => {
    if (!onDelete) return;
    setIsDeleting(true);
    setTimeout(() => {
      onDelete(chat.id);
    }, 300);
  };

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
          {/* Header with mood and delete button */}
          <div className="flex items-center justify-between gap-4 mb-3">
            {chat.moodAnalysis && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 + 0.25 }}
                className="inline-flex items-center gap-2 rounded-xl px-3 py-1 border border-[var(--line)] bg-[var(--bg-surface)]/50"
                title={`Mood: ${chat.moodAnalysis.mood}`}
              >
                <span className="text-base">{chat.moodAnalysis.emoji}</span>
                <span className="text-xs font-mono text-[var(--text-secondary)] font-semibold">
                  {chat.moodAnalysis.rating}/10
                </span>
              </motion.div>
            )}
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

          {/* Text content */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.05 + 0.3 }}
            className="whitespace-pre-wrap text-[15px] leading-7 text-[var(--text-primary)] font-sans"
          >
            {chat.text}
          </motion.div>

          {/* Image display */}
          {chat.imageUrl && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: index * 0.05 + 0.4, duration: 0.5 }}
              className="mt-4 rounded-xl overflow-hidden border border-[var(--line)] bg-[var(--bg-surface)]/40"
              style={{
                boxShadow: "0 0 20px rgba(0,245,255,0.2)",
              }}
            >
              <img
                src={chat.imageUrl}
                alt="Entry image"
                loading="lazy"
                decoding="async"
                className="w-full h-auto max-h-[420px] object-contain bg-[var(--bg-deep)]/40"
              />
            </motion.div>
          )}
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
}: {
  chats: Chat[];
  loading: boolean;
  error: string | null;
  onDelete?: (id: string) => void;
  highlightChatId?: string | null;
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
