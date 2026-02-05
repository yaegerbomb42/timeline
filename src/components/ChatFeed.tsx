"use client";

import { format } from "date-fns";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import { Bookmark, Clock3, Trash2, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import type { Chat } from "@/lib/chats";

const WORD_DELAY = 28;

// Enhanced particle burst with neon colors
function ParticleBurst({ x, y, count = 20 }: { x: number; y: number; count?: number }) {
  const [particles] = useState(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      angle: (i / count) * Math.PI * 2,
      distance: 35 + Math.random() * 25,
      duration: 0.8 + Math.random() * 0.4,
      delay: Math.random() * 0.2,
      color: i % 3 === 0 ? "var(--neon-cyan)" : i % 3 === 1 ? "var(--neon-purple)" : "var(--neon-pink)",
    }))
  );

  return (
    <div
      className="pointer-events-none fixed left-0 top-0 z-50"
      style={{ left: `${x}px`, top: `${y}px`, transform: "translate(-50%, -50%)" }}
    >
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute h-2 w-2 rounded-full"
          style={{
            background: `radial-gradient(circle, ${p.color}, transparent)`,
            boxShadow: `0 0 10px ${p.color}`,
          }}
          initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1.5, 0.8],
            x: Math.cos(p.angle) * p.distance,
            y: Math.sin(p.angle) * p.distance,
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: [0.22, 1, 0.36, 1],
          }}
        />
      ))}
    </div>
  );
}

// Word-by-word reveal with neon glow
function WordReveal({ text, onComplete }: { text: string; onComplete?: () => void }) {
  const words = useMemo(() => text.split(/(\s+)/).filter((w) => w.trim() || w === " "), [text]);
  const [revealed, setRevealed] = useState(0);
  const completedRef = useRef(false);

  useEffect(() => {
    if (completedRef.current || revealed >= words.length) return;
    const timer = setTimeout(() => {
      const next = revealed + 1;
      setRevealed(next);
      if (next >= words.length && onComplete && !completedRef.current) {
        completedRef.current = true;
        setTimeout(onComplete, 50);
      }
    }, WORD_DELAY);
    return () => clearTimeout(timer);
  }, [revealed, words.length, onComplete]);

  return (
    <span className="inline">
      {words.map((word, i) => {
        const isSpace = word === " ";
        if (i >= revealed) return isSpace ? " " : null;
        return (
          <motion.span
            key={i}
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="inline-block"
            style={{
              textShadow: i === revealed - 1 ? "0 0 10px var(--glow-cyan)" : "none",
            }}
          >
            {word}
          </motion.span>
        );
      })}
    </span>
  );
}

// Immersive entry card with morphing background
function EntryCard({
  chat,
  isHighlighted,
  onDelete,
  index,
}: {
  chat: Chat;
  isHighlighted?: boolean;
  onDelete?: (id: string) => void;
  index: number;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [particlePos, setParticlePos] = useState<{ x: number; y: number } | null>(null);
  const [wordRevealComplete, setWordRevealComplete] = useState(false);
  const cardRef = useRef<HTMLElement | null>(null);
  const controls = useAnimationControls();
  const showParticles = useRef(false);

  useEffect(() => {
    if (isHighlighted && !showParticles.current) {
      showParticles.current = true;
      controls.start({
        scale: [1, 1.03, 1],
        boxShadow: [
          "0 8px 32px rgba(0,245,255,0.2)",
          "0 16px 48px rgba(131,56,236,0.4)",
          "0 8px 32px rgba(0,245,255,0.2)",
        ],
        transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
      });
      if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        setParticlePos({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
        setTimeout(() => setParticlePos(null), 1200);
      }
    }
  }, [isHighlighted, controls]);

  const handleDeleteClick = () => {
    setShowConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (!onDelete) return;
    setIsDeleting(true);
    setTimeout(() => {
      onDelete(chat.id);
    }, 300);
  };

  const baseAnimate = isDeleting
    ? { opacity: 0, y: -20, scale: 0.9, filter: "blur(8px)", rotateX: -15 }
    : { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", rotateX: 0 };

  return (
    <>
      <motion.article
        ref={cardRef}
        layout
        initial={{ opacity: 0, y: 30, scale: 0.92, rotateX: 10 }}
        animate={isHighlighted && !isDeleting ? controls : baseAnimate}
        exit={{ opacity: 0, y: 20, scale: 0.92, rotateX: -10 }}
        transition={{
          duration: 0.5,
          ease: [0.22, 1, 0.36, 1],
          layout: { duration: 0.4 },
        }}
        whileHover={{ y: -4, scale: 1.01 }}
        id={`chat-${chat.id}`}
        className="group relative rounded-3xl border border-[var(--line)] bg-[var(--bg-elevated)]/70 backdrop-blur-2xl px-6 py-5 mx-4 my-4 overflow-hidden"
        style={{
          boxShadow: isHighlighted
            ? "0 20px 60px rgba(0,245,255,0.3), 0 0 40px rgba(131,56,236,0.2) inset"
            : "0 12px 40px rgba(0,0,0,0.4), 0 0 20px rgba(0,245,255,0.05) inset",
        }}
      >
        {/* Morphing gradient background */}
        <motion.div
          className="absolute inset-0 -z-10 opacity-30"
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

        {/* Animated border glow */}
        <motion.div
          className="absolute inset-0 rounded-3xl -z-10"
          animate={{
            boxShadow: [
              "0 0 20px var(--glow-cyan)",
              "0 0 30px var(--glow-purple)",
              "0 0 20px var(--glow-cyan)",
            ],
          }}
          transition={{ duration: 3, repeat: Infinity }}
        />

        {/* Divider with gradient */}
        {index > 0 ? (
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: index * 0.03, duration: 0.5 }}
            className="absolute -top-2 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-[var(--neon-cyan)] to-transparent"
            style={{ boxShadow: "0 0 10px var(--glow-cyan)" }}
          />
        ) : null}

        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.04, duration: 0.4 }}
            className="inline-flex items-center gap-3 text-xs text-[var(--text-secondary)] font-mono"
          >
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              <Clock3 className="h-4 w-4 text-[var(--neon-cyan)]" />
            </motion.div>
            <span className="font-semibold">{format(chat.createdAt, "PPP p")}</span>
          </motion.div>
          <div className="flex items-center gap-3">
            {/* Mood indicator */}
            {chat.moodAnalysis && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.04 + 0.05, duration: 0.4 }}
                className="inline-flex items-center gap-2 rounded-xl px-3 py-1 border border-[var(--line)] bg-[var(--bg-surface)]/50"
                title={`Mood: ${chat.moodAnalysis.mood}`}
              >
                <span className="text-lg">{chat.moodAnalysis.emoji}</span>
                <span className="text-xs font-mono text-[var(--text-secondary)] font-semibold">
                  {chat.moodAnalysis.rating}/10
                </span>
              </motion.div>
            )}
            {onDelete ? (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.04 + 0.1, duration: 0.4 }}
                whileHover={{ scale: 1.15, rotate: 15 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleDeleteClick}
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl p-2 text-[var(--text-secondary)] hover:text-[var(--neon-pink)] hover:bg-[var(--bg-surface)]/50"
              >
                <Trash2 className="h-4 w-4" />
              </motion.button>
            ) : null}
          </div>
        </div>

        {/* Content with word reveal */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.05 + 0.2, duration: 0.5 }}
          className="whitespace-pre-wrap text-[16px] leading-8 text-[var(--text-primary)] font-sans"
        >
          {isHighlighted && !wordRevealComplete && index === 0 ? (
            <WordReveal text={chat.text} onComplete={() => setWordRevealComplete(true)} />
          ) : (
            chat.text
          )}
        </motion.div>

        {/* Image display */}
        {chat.imageUrl && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: index * 0.05 + 0.3, duration: 0.5 }}
            className="mt-4 rounded-2xl overflow-hidden border border-[var(--line)] bg-[var(--bg-surface)]/40"
            style={{
              boxShadow: "0 0 30px rgba(0,245,255,0.2)",
            }}
          >
            <img
              src={chat.imageUrl}
              alt="Entry image"
              className="w-full h-auto object-contain"
            />
          </motion.div>
        )}

        {/* Shimmer effect on highlight */}
        {isHighlighted ? (
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: "200%" }}
            transition={{ duration: 1.5, ease: "easeInOut", repeat: Infinity, repeatDelay: 2.5 }}
            className="absolute inset-0 -z-10 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            style={{ clipPath: "polygon(0 0, 30% 0, 35% 100%, 0 100%)" }}
          />
        ) : null}
      </motion.article>
      {particlePos ? <ParticleBurst x={particlePos.x} y={particlePos.y} count={24} /> : null}
      <DeleteConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmDelete}
        entryPreview={chat.excerpt}
      />
    </>
  );
}

export function ChatFeed({
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
        boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(0,245,255,0.1) inset",
      }}
    >
      <div className="px-6 pt-6 pb-4 border-b border-[var(--line)]">
        <div className="flex items-center gap-3 text-[var(--text-primary)]">
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          >
            <Bookmark className="h-5 w-5 text-[var(--neon-cyan)]" />
          </motion.div>
          <div className="font-sans text-base font-bold">Entries</div>
        </div>
        <div className="mt-2 text-sm text-[var(--text-secondary)] flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-[var(--neon-purple)]" />
          Newest at the top, always.
        </div>
      </div>

      <div className="px-0 py-4 max-h-[calc(100vh-420px)] overflow-y-auto">
        {error ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mx-4 my-4 rounded-2xl border border-[var(--neon-pink)]/50 bg-[var(--bg-surface)]/80 px-5 py-4 text-sm text-[var(--text-primary)]"
            style={{
              boxShadow: "0 0 20px rgba(255,0,110,0.3)",
            }}
          >
            {error}
          </motion.div>
        ) : null}

        {loading && chats.length === 0 ? (
          <div className="px-6 py-12 text-center">
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
        ) : null}

        {!loading && chats.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-base text-[var(--text-secondary)]"
            >
              No entries yet. Write one above and watch your story come alive.
            </motion.p>
          </div>
        ) : null}

        <AnimatePresence mode="popLayout" initial={false}>
          {chats.map((c, idx) => (
            <EntryCard
              key={c.id}
              chat={c}
              isHighlighted={c.id === highlightChatId}
              onDelete={onDelete}
              index={idx}
            />
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
