"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Feather, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { WordVacuum } from "@/components/WordVacuum";
import { cn } from "@/lib/utils";

// Character-by-character satisfaction feedback
function CharacterSatisfaction({ text, isActive }: { text: string; isActive: boolean }) {
  const chars = text.split("");
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {chars.map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 8, scale: 0.8 }}
          animate={
            isActive
              ? {
                  opacity: [0, 1, 1],
                  y: [8, -2, 0],
                  scale: [0.8, 1.1, 1],
                }
              : { opacity: 0 }
          }
          transition={{
            duration: 0.35,
            delay: i * 0.02,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="absolute"
          style={{
            left: `${(i * 8.5) % 100}%`,
            top: `${Math.floor((i * 8.5) / 100) * 24}px`,
          }}
        >
          {char}
        </motion.span>
      ))}
    </div>
  );
}

// Word counter with satisfaction animation
function WordCounter({ count, target = 50 }: { count: number; target?: number }) {
  const progress = Math.min(count / target, 1);
  const isSatisfying = count > 0 && count % 10 === 0 && count < target;

  return (
    <motion.div
      animate={isSatisfying ? { scale: [1, 1.2, 1] } : {}}
      transition={{ duration: 0.3 }}
      className="flex items-center gap-2 text-xs text-[color:var(--muted)]"
    >
      <span className="font-mono tabular-nums">{count}</span>
      <motion.div
        className="h-1 w-16 rounded-full bg-[var(--line)] overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: count > 0 ? 1 : 0 }}
      >
        <motion.div
          className="h-full bg-[linear-gradient(90deg,var(--brass),var(--brass-2))] rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        />
      </motion.div>
      {count >= target ? (
        <motion.span
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-[color:var(--brass-2)]"
        >
          ✨
        </motion.span>
      ) : null}
    </motion.div>
  );
}

export function ChatComposer({
  disabled,
  onSend,
  onSendStart,
}: {
  disabled?: boolean;
  onSend: (text: string) => Promise<void> | void;
  onSendStart?: (start: DOMRect) => void;
}) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [ink, setInk] = useState<null | number>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [charSatisfaction, setCharSatisfaction] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const sendButtonRef = useRef<HTMLButtonElement | null>(null);
  const wordCount = value.trim().split(/\s+/).filter((w) => w.trim()).length;

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  useEffect(() => {
    if (value.length > 0 && !charSatisfaction) {
      setCharSatisfaction(true);
      const t = setTimeout(() => setCharSatisfaction(false), 500);
      return () => clearTimeout(t);
    }
  }, [value.length, charSatisfaction]);

  async function send() {
    const text = value.trim();
    if (!text) return;
    setBusy(true);
    setInk(Date.now());
    if (sendButtonRef.current) {
      onSendStart?.(sendButtonRef.current.getBoundingClientRect());
    }
    try {
      await onSend(text);
      setValue("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "rounded-3xl border border-[var(--line)] bg-white/50 backdrop-blur-sm shadow-[0_14px_50px_var(--shadow)] overflow-hidden",
        isFocused && "ring-2 ring-[color:var(--brass-2)]/20 ring-offset-2",
      )}
    >
      <div className="px-6 pt-6 pb-4 border-b border-[var(--line)]">
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="flex items-center gap-2 text-[color:var(--ink)]"
        >
          <Feather className="h-4 w-4 text-[color:var(--brass-2)]" />
          <div className="font-sans text-sm">Add an entry</div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="mt-1 text-xs text-[color:var(--muted)]"
        >
          Press <span className="font-mono">Enter</span> to send, <span className="font-mono">Shift</span>+
          <span className="font-mono">Enter</span> for a new line.
        </motion.div>
      </div>

      <div className="relative px-6 py-5">
        <div className="relative" style={{ perspective: "1000px" }}>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            disabled={disabled || busy}
            placeholder="Today, I…"
            className={cn(
              "relative z-10 w-full resize-none rounded-2xl border border-[var(--line)] bg-white/60",
              "px-4 py-3 font-serif text-[15px] leading-7 text-[color:var(--ink)]",
              "outline-none focus:ring-4 focus:ring-[var(--ring)] transition-all duration-200",
              "disabled:opacity-60 disabled:cursor-not-allowed",
              "placeholder:text-[color:var(--muted)]/50",
            )}
            rows={3}
          />
          {/* Word vacuum system - black hole → portal → final position */}
          {isFocused && value.trim() ? (
            <WordVacuum
              value={value}
              // Cast is safe: WordVacuum only uses the ref in the browser and guards null internally.
              textareaRef={textareaRef as React.RefObject<HTMLTextAreaElement>}
              isActive={isFocused}
            />
          ) : null}
          {charSatisfaction && value.length < 20 ? (
            <CharacterSatisfaction text={value.slice(-10)} isActive={charSatisfaction} />
          ) : null}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <WordCounter count={wordCount} />

          <div className="relative">
            <motion.button
              ref={sendButtonRef}
              onClick={() => void send()}
              disabled={disabled || busy || !value.trim()}
              whileHover={!disabled && !busy && value.trim() ? { scale: 1.05 } : {}}
              whileTap={!disabled && !busy && value.trim() ? { scale: 0.95 } : {}}
              className={cn(
                "inline-flex items-center gap-2 rounded-2xl px-5 py-2.5",
                "bg-[linear-gradient(135deg,var(--brass),var(--brass-2))] text-[color:var(--paper)]",
                "shadow-[0_10px_30px_rgba(176,141,87,0.22)]",
                "hover:shadow-[0_14px_40px_rgba(176,141,87,0.26)] transition-all duration-200",
                "disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100",
                value.trim() && "ring-2 ring-[color:var(--brass-2)]/30",
              )}
            >
              <span className="font-sans text-sm font-medium">Send</span>
              <ArrowUpRight className="h-4 w-4" />
            </motion.button>

            <AnimatePresence>
              {ink ? (
                <motion.div
                  key={ink}
                  initial={{ opacity: 0, x: 0, y: 0, scale: 0.8 }}
                  animate={{ opacity: [0, 0.9, 0], x: [0, -32], y: [0, -60], scale: [0.8, 1.2, 0.9] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
                  className="pointer-events-none absolute right-2 top-2 h-3 w-3 rounded-full bg-[color:var(--ink)]/60 blur-[0.2px]"
                />
              ) : null}
            </AnimatePresence>

            {/* Sparkle effect on send */}
            {value.trim() && !busy ? (
              <motion.div
                className="absolute -right-2 -top-2"
                animate={{ rotate: [0, 180, 360], scale: [1, 1.2, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="h-4 w-4 text-[color:var(--brass-2)]/60" />
              </motion.div>
            ) : null}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
