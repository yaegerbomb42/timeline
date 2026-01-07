"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Feather } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const sendButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [value]);

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
    <div className="rounded-3xl border border-[var(--line)] bg-white/50 backdrop-blur-sm shadow-[0_14px_50px_var(--shadow)] overflow-hidden">
      <div className="px-6 pt-6 pb-4 border-b border-[var(--line)]">
        <div className="flex items-center gap-2 text-[color:var(--ink)]">
          <Feather className="h-4 w-4 text-[color:var(--brass-2)]" />
          <div className="font-sans text-sm">Add an entry</div>
        </div>
        <div className="mt-1 text-xs text-[color:var(--muted)]">
          Press <span className="font-mono">Enter</span> to send, <span className="font-mono">Shift</span>+<span className="font-mono">Enter</span> for a new line.
        </div>
      </div>

      <div className="relative px-6 py-5">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          disabled={disabled || busy}
          placeholder="Today, I…"
          className={cn(
            "w-full resize-none rounded-2xl border border-[var(--line)] bg-white/60",
            "px-4 py-3 font-serif text-[15px] leading-7 text-[color:var(--ink)]",
            "outline-none focus:ring-4 focus:ring-[var(--ring)]",
            "disabled:opacity-60 disabled:cursor-not-allowed",
          )}
          rows={3}
        />

        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs text-[color:var(--muted)]">
            Each entry becomes a node on your line.
          </div>

          <div className="relative">
            <button
              ref={sendButtonRef}
              onClick={() => void send()}
              disabled={disabled || busy || !value.trim()}
              className={cn(
                "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5",
                "bg-[linear-gradient(135deg,var(--brass),var(--brass-2))] text-[color:var(--paper)]",
                "shadow-[0_10px_30px_rgba(176,141,87,0.22)]",
                "hover:shadow-[0_14px_40px_rgba(176,141,87,0.26)] transition-shadow",
                "disabled:opacity-60 disabled:cursor-not-allowed",
              )}
            >
              <span className="font-sans text-sm">Send</span>
              <ArrowUpRight className="h-4 w-4" />
            </button>

            <AnimatePresence>
              {ink ? (
                <motion.div
                  key={ink}
                  initial={{ opacity: 0, x: 0, y: 0, scale: 0.8 }}
                  animate={{ opacity: [0, 0.9, 0], x: [0, -28], y: [0, -54], scale: [0.8, 1.1, 0.9] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  className="pointer-events-none absolute right-2 top-2 h-3 w-3 rounded-full bg-[color:var(--ink)]/60 blur-[0.2px]"
                />
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}


