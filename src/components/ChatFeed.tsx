"use client";

import { format } from "date-fns";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import { Bookmark, Clock3, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import type { Chat } from "@/lib/chats";

const WORD_DELAY = 32;
const CHAR_DELAY = 24;

// Particle effect generator for entry creation satisfaction
function ParticleBurst({ x, y, count = 12 }: { x: number; y: number; count?: number }) {
  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      angle: (i / count) * Math.PI * 2,
      distance: 28 + Math.random() * 20,
      duration: 0.6 + Math.random() * 0.3,
      delay: Math.random() * 0.15,
    }));
  }, [count]);

  return (
    <div
      className="pointer-events-none fixed left-0 top-0 z-50"
      style={{ left: `${x}px`, top: `${y}px`, transform: "translate(-50%, -50%)" }}
    >
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute h-1.5 w-1.5 rounded-full bg-[color:var(--brass-2)]"
          initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1.2, 0.6],
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

// Word-by-word reveal component with stagger
function WordReveal({ text, delay = 0, onComplete }: { text: string; delay?: number; onComplete?: () => void }) {
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
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="inline-block"
          >
            {word}
          </motion.span>
        );
      })}
    </span>
  );
}

// Entry card with micro-interactions
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
        scale: [1, 1.02, 1],
        boxShadow: [
          "0 6px 24px rgba(176,141,87,0.08)",
          "0 12px 40px rgba(176,141,87,0.25)",
          "0 6px 24px rgba(176,141,87,0.08)",
        ],
        transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
      });
      if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        setParticlePos({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
        setTimeout(() => setParticlePos(null), 1000);
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
    }, 200);
  };

  const baseAnimate = isDeleting
    ? { opacity: 0, y: -12, scale: 0.92, filter: "blur(4px)" }
    : { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" };

  return (
    <>
      <motion.article
        ref={cardRef}
        layout
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={isHighlighted && !isDeleting ? controls : baseAnimate}
        exit={{ opacity: 0, y: 12, scale: 0.96 }}
        transition={{
          duration: 0.4,
          ease: [0.22, 1, 0.36, 1],
          layout: { duration: 0.35 },
        }}
        id={`chat-${chat.id}`}
        className={`
          group relative rounded-2xl border border-[var(--line)] bg-white/70 backdrop-blur-sm
          px-5 py-4 mx-3 my-3 shadow-[0_6px_24px_rgba(0,0,0,0.04)]
          hover:border-[color:var(--brass-2)]/40 hover:bg-white/90 hover:shadow-[0_12px_40px_rgba(176,141,87,0.12)]
          transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
          ${isHighlighted ? "ring-2 ring-[color:var(--brass-2)]/30 ring-offset-2" : ""}
        `}
        style={{
          animationDelay: `${index * 0.05}s`,
        }}
      >
        {/* Subtle divider line between entries */}
        {index > 0 ? (
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: index * 0.03, duration: 0.4 }}
            className="absolute -top-1.5 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-[var(--line)] to-transparent"
          />
        ) : null}

        {/* Header with timestamp and delete */}
        <div className="flex items-center justify-between gap-4 mb-3">
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.04, duration: 0.3 }}
            className="inline-flex items-center gap-2 text-xs text-[color:var(--muted)] font-mono"
          >
            <Clock3 className="h-3.5 w-3.5 opacity-70" />
            <span>{format(chat.createdAt, "PPP p")}</span>
          </motion.div>
          {onDelete ? (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.04 + 0.1, duration: 0.3 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleDeleteClick}
              className="
                opacity-0 group-hover:opacity-100 transition-opacity duration-200
                rounded-xl p-1.5 text-[color:var(--muted)] hover:text-[rgba(140,60,40,0.85)]
                hover:bg-[rgba(140,60,40,0.08)] active:bg-[rgba(140,60,40,0.15)]
              "
            >
              <Trash2 className="h-3.5 w-3.5" />
            </motion.button>
          ) : null}
        </div>

        {/* Content with word-by-word reveal on new entries */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.05 + 0.15, duration: 0.4 }}
          className="whitespace-pre-wrap text-[15px] leading-7 text-[color:var(--ink)] font-serif"
        >
          {isHighlighted && !wordRevealComplete && index === 0 ? (
            <WordReveal text={chat.text} onComplete={() => setWordRevealComplete(true)} />
          ) : (
            chat.text
          )}
        </motion.div>

        {/* Subtle shimmer effect on highlight */}
        {isHighlighted ? (
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: "200%" }}
            transition={{ duration: 1.2, ease: "easeInOut", repeat: Infinity, repeatDelay: 2 }}
            className="absolute inset-0 -z-10 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            style={{ clipPath: "polygon(0 0, 30% 0, 35% 100%, 0 100%)" }}
          />
        ) : null}
      </motion.article>
      {particlePos ? <ParticleBurst x={particlePos.x} y={particlePos.y} count={16} /> : null}
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
    <div className="rounded-3xl border border-[var(--line)] bg-white/50 backdrop-blur-sm shadow-[0_14px_50px_var(--shadow)] overflow-hidden">
      <div className="px-6 pt-6 pb-4 border-b border-[var(--line)]">
        <div className="flex items-center gap-2 text-[color:var(--ink)]">
          <Bookmark className="h-4 w-4 text-[color:var(--brass-2)]" />
          <div className="font-sans text-sm">Entries</div>
        </div>
        <div className="mt-1 text-xs text-[color:var(--muted)]">
          Newest at the top, always.
        </div>
      </div>

      <div className="px-0 py-3 max-h-[calc(100vh-420px)] overflow-y-auto">
        {error ? (
          <div className="mx-3 my-3 rounded-2xl border border-[rgba(140,60,40,0.25)] bg-[rgba(140,60,40,0.06)] px-4 py-3 text-sm text-[color:var(--ink)]">
            {error}
          </div>
        ) : null}

        {loading && chats.length === 0 ? (
          <div className="px-6 py-10 text-sm text-[color:var(--muted)]">Loading…</div>
        ) : null}

        {!loading && chats.length === 0 ? (
          <div className="px-6 py-10 text-sm text-[color:var(--muted)]">
            No entries yet. Write one above and watch the line remember you.
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
    </div>
  );
}
