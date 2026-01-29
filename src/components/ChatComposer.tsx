"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Feather, Sparkles, Mic, Zap, ImagePlus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { WordVacuum } from "@/components/WordVacuum";
import { cn } from "@/lib/utils";

// Ripple effect on send button
function RippleEffect({ x, y }: { x: number; y: number }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        left: x,
        top: y,
        width: 0,
        height: 0,
        background: "radial-gradient(circle, var(--neon-cyan), transparent)",
        boxShadow: "0 0 40px var(--glow-cyan)",
      }}
      animate={{
        width: 200,
        height: 200,
        opacity: [1, 0],
      }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    />
  );
}

// Enhanced word counter with neon progress
function WordCounter({ count, target = 50 }: { count: number; target?: number }) {
  const progress = Math.min(count / target, 1);
  const isSatisfying = count > 0 && count % 10 === 0 && count < target;

  return (
    <motion.div
      animate={isSatisfying ? { scale: [1, 1.2, 1] } : {}}
      transition={{ duration: 0.4 }}
      className="flex items-center gap-3 text-sm text-[var(--text-secondary)]"
    >
      <span className="font-mono tabular-nums text-[var(--text-primary)] font-bold">{count}</span>
      <motion.div
        className="h-2 w-24 rounded-full bg-[var(--bg-surface)] overflow-hidden border border-[var(--line)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: count > 0 ? 1 : 0 }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{
            background: `linear-gradient(90deg, var(--neon-cyan), var(--neon-purple), var(--neon-pink))`,
            boxShadow: progress > 0.5 ? "0 0 20px var(--glow-cyan)" : "none",
          }}
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        />
      </motion.div>
      {count >= target ? (
        <motion.span
          initial={{ opacity: 0, scale: 0, rotate: -180 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          className="text-[var(--neon-cyan)]"
        >
          <Zap className="h-4 w-4" />
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
  onSend: (text: string, imageFile?: File) => Promise<void> | void;
  onSendStart?: (start: DOMRect) => void;
}) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [ink, setInk] = useState<null | number>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [ripple, setRipple] = useState<{ x: number; y: number } | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const sendButtonRef = useRef<HTMLButtonElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const wordCount = value.trim().split(/\s+/).filter((w) => w.trim()).length;

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  useEffect(() => {
    if (imageFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(imageFile);
    } else {
      setImagePreview(null);
    }
  }, [imageFile]);

  async function send() {
    const text = value.trim();
    if (!text) return;
    setBusy(true);
    setInk(Date.now());
    if (sendButtonRef.current) {
      const rect = sendButtonRef.current.getBoundingClientRect();
      setRipple({ x: rect.width / 2, y: rect.height / 2 });
      setTimeout(() => setRipple(null), 600);
      onSendStart?.(rect);
    }
    try {
      await onSend(text, imageFile || undefined);
      setValue("");
      setImageFile(null);
      setImagePreview(null);
    } finally {
      setBusy(false);
    }
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
    }
  }

  function removeImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative rounded-3xl border border-[var(--line)] bg-[var(--bg-elevated)]/70 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden",
        isFocused && "ring-2 ring-[var(--neon-cyan)]/50 ring-offset-2 ring-offset-[var(--bg-deep)]",
      )}
      style={{
        boxShadow: isFocused
          ? "0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(0,245,255,0.3) inset"
          : "0 20px 60px rgba(0,0,0,0.5), 0 0 20px rgba(0,245,255,0.1) inset",
      }}
    >
      {/* Animated background gradient */}
      <motion.div
        className="absolute inset-0 -z-10 opacity-20"
        animate={{
          background: [
            "radial-gradient(circle at 0% 0%, var(--glow-cyan), transparent)",
            "radial-gradient(circle at 100% 100%, var(--glow-purple), transparent)",
            "radial-gradient(circle at 50% 50%, var(--glow-pink), transparent)",
            "radial-gradient(circle at 0% 0%, var(--glow-cyan), transparent)",
          ],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative px-6 pt-6 pb-4 border-b border-[var(--line)]">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="flex items-center gap-3 text-[var(--text-primary)]"
        >
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          >
            <Feather className="h-5 w-5 text-[var(--neon-cyan)]" />
          </motion.div>
          <div className="font-sans text-base font-bold">Add an entry</div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="mt-2 text-sm text-[var(--text-secondary)] flex items-center gap-2"
        >
          <Mic className="h-3.5 w-3.5 text-[var(--neon-purple)]" />
          Press <span className="font-mono text-[var(--neon-cyan)]">Enter</span> to send,{" "}
          <span className="font-mono text-[var(--neon-purple)]">Shift</span>+
          <span className="font-mono text-[var(--neon-pink)]">Enter</span> for a new line.
        </motion.div>
      </div>

      <div className="relative px-6 py-6">
        <div className="relative" style={{ perspective: "1000px" }}>
          <motion.textarea
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
              "relative z-10 w-full resize-none rounded-2xl border border-[var(--line)] bg-[var(--bg-surface)]/60 backdrop-blur-xl",
              "px-5 py-4 font-sans text-[16px] leading-7 text-[var(--text-primary)]",
              "outline-none focus:ring-4 focus:ring-[var(--glow-cyan)] transition-all duration-300",
              "disabled:opacity-60 disabled:cursor-not-allowed",
              "placeholder:text-[var(--text-muted)]/50",
            )}
            style={{
              boxShadow: isFocused
                ? "0 0 30px rgba(0,245,255,0.2), inset 0 0 20px rgba(0,245,255,0.05)"
                : "0 0 10px rgba(0,0,0,0.2)",
            }}
            rows={3}
          />
          {/* Word vacuum system */}
          {isFocused && value.trim() ? (
            <WordVacuum
              value={value}
              textareaRef={textareaRef as React.RefObject<HTMLTextAreaElement>}
              isActive={isFocused}
            />
          ) : null}
        </div>

        {/* Image preview */}
        <AnimatePresence>
          {imagePreview && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="mt-4 relative rounded-2xl overflow-hidden border border-[var(--line)] bg-[var(--bg-surface)]/60 backdrop-blur-xl"
              style={{
                boxShadow: "0 0 20px rgba(0,245,255,0.2)",
              }}
            >
              <img 
                src={imagePreview} 
                alt="Preview" 
                className="w-full h-auto max-h-64 object-contain"
              />
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={removeImage}
                className="absolute top-2 right-2 rounded-full bg-[var(--bg-deep)]/80 backdrop-blur-xl p-2 border border-[var(--line)]"
                style={{
                  boxShadow: "0 0 20px rgba(0,0,0,0.5)",
                }}
              >
                <X className="h-4 w-4 text-[var(--neon-pink)]" />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <WordCounter count={wordCount} />
            
            {/* Image upload button */}
            <motion.label
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "inline-flex items-center gap-2 rounded-2xl px-4 py-2 cursor-pointer",
                "border border-[var(--line)] bg-[var(--bg-surface)]/60 backdrop-blur-xl",
                "text-[var(--text-secondary)] hover:text-[var(--neon-cyan)] transition-all",
                imageFile && "text-[var(--neon-cyan)] border-[var(--neon-cyan)]",
              )}
              style={{
                boxShadow: imageFile 
                  ? "0 0 20px rgba(0,245,255,0.3)" 
                  : "0 0 10px rgba(0,0,0,0.2)",
              }}
            >
              <ImagePlus className="h-4 w-4" />
              <span className="text-sm font-sans">{imageFile ? 'Image added' : 'Add image'}</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                disabled={disabled || busy}
                className="hidden"
              />
            </motion.label>
          </div>

          <div className="relative">
            <motion.button
              ref={sendButtonRef}
              onClick={() => void send()}
              disabled={disabled || busy || !value.trim()}
              whileHover={!disabled && !busy && value.trim() ? { scale: 1.08, y: -2 } : {}}
              whileTap={!disabled && !busy && value.trim() ? { scale: 0.95 } : {}}
              className={cn(
                "relative inline-flex items-center gap-3 rounded-2xl px-6 py-3 overflow-hidden",
                "bg-gradient-to-r from-[var(--neon-cyan)] via-[var(--neon-purple)] to-[var(--neon-pink)]",
                "text-[var(--bg-deep)] font-sans text-sm font-bold",
                "shadow-[0_10px_40px_rgba(0,245,255,0.4)]",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
                value.trim() && "shadow-[0_15px_50px_rgba(131,56,236,0.5)]",
              )}
              style={{
                boxShadow: value.trim()
                  ? "0 15px 50px rgba(131,56,236,0.5), 0 0 30px rgba(0,245,255,0.3)"
                  : "0 10px 40px rgba(0,245,255,0.4)",
              }}
            >
              {ripple && <RippleEffect x={ripple.x} y={ripple.y} />}
              <span>{busy ? "Sending…" : "Send"}</span>
              <motion.div
                animate={value.trim() && !busy ? { rotate: [0, 15, -15, 0] } : {}}
                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
              >
                <ArrowUpRight className="h-4 w-4" />
              </motion.div>
            </motion.button>

            <AnimatePresence>
              {ink ? (
                <motion.div
                  key={ink}
                  initial={{ opacity: 0, x: 0, y: 0, scale: 0.5 }}
                  animate={{
                    opacity: [0, 1, 0],
                    x: [0, -40],
                    y: [0, -70],
                    scale: [0.5, 1.5, 1],
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                  className="pointer-events-none absolute right-2 top-2 h-4 w-4 rounded-full bg-[var(--neon-cyan)]"
                  style={{
                    boxShadow: "0 0 20px var(--glow-cyan)",
                  }}
                />
              ) : null}
            </AnimatePresence>

            {/* Sparkle effect */}
            {value.trim() && !busy ? (
              <motion.div
                className="absolute -right-2 -top-2"
                animate={{ rotate: [0, 180, 360], scale: [1, 1.3, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="h-5 w-5 text-[var(--neon-cyan)]" style={{ filter: "drop-shadow(0 0 8px var(--glow-cyan))" }} />
              </motion.div>
            ) : null}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
