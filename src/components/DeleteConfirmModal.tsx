"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, X, Sparkles } from "lucide-react";
import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

export function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  entryPreview,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  entryPreview?: string;
}) {
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (isOpen && confirmRef.current) {
      confirmRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-[var(--neon-pink)]/30 bg-[var(--bg-elevated)]/90 backdrop-blur-2xl shadow-[0_24px_60px_rgba(0,0,0,0.5),0_0_40px_rgba(255,0,110,0.2)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Animated gradient background */}
            <motion.div
              className="absolute inset-0 -z-10 opacity-20 rounded-3xl"
              animate={{
                background: [
                  "radial-gradient(circle at 0% 0%, var(--glow-pink), transparent)",
                  "radial-gradient(circle at 100% 100%, var(--glow-purple), transparent)",
                  "radial-gradient(circle at 0% 100%, var(--glow-pink), transparent)",
                ],
              }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            />
            
            <div className="relative px-8 pt-8 pb-6">
              <button
                onClick={onClose}
                className="absolute right-6 top-6 rounded-xl p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]/60 hover:text-[var(--neon-cyan)] transition-all"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-start gap-4">
                <motion.div 
                  className="rounded-2xl bg-[var(--neon-pink)]/10 p-3 border border-[var(--neon-pink)]/30"
                  animate={{
                    boxShadow: [
                      "0 0 20px rgba(255,0,110,0.2)",
                      "0 0 30px rgba(255,0,110,0.4)",
                      "0 0 20px rgba(255,0,110,0.2)",
                    ],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <AlertTriangle className="h-6 w-6 text-[var(--neon-pink)]" />
                </motion.div>
                <div className="flex-1">
                  <h3 className="font-book text-2xl text-[var(--text-primary)]">
                    Delete this entry?
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)] font-sans">
                    This will archive the entry (kept for last 30 deletions). You can restore it from the admin panel if needed.
                  </p>
                  {entryPreview ? (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="mt-4 rounded-2xl border border-[var(--line)] bg-[var(--bg-surface)]/60 backdrop-blur-xl px-4 py-3"
                      style={{
                        boxShadow: "0 0 20px rgba(0,0,0,0.3), 0 0 10px rgba(0,245,255,0.1) inset",
                      }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-3 w-3 text-[var(--neon-cyan)]" />
                        <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-secondary)] font-sans">
                          Preview
                        </div>
                      </div>
                      <div className="text-sm text-[var(--text-primary)] line-clamp-3 font-serif leading-relaxed">
                        {entryPreview}
                      </div>
                    </motion.div>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-[var(--line)] bg-[var(--bg-surface)]/20 px-8 py-5">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className={cn(
                  "rounded-2xl border border-[var(--line)] bg-[var(--bg-surface)]/60 backdrop-blur-xl px-5 py-2.5",
                  "font-sans text-sm text-[var(--text-primary)] hover:bg-[var(--bg-surface)]/80 transition-all",
                  "hover:border-[var(--neon-cyan)] hover:text-[var(--neon-cyan)]",
                )}
              >
                Cancel
              </motion.button>
              <motion.button
                ref={confirmRef}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={cn(
                  "rounded-2xl border border-[var(--neon-pink)]/50 bg-[var(--neon-pink)]/10 px-5 py-2.5",
                  "font-sans text-sm font-semibold text-[var(--neon-pink)]",
                  "hover:bg-[var(--neon-pink)]/20 hover:border-[var(--neon-pink)] transition-all",
                  "focus:outline-none focus:ring-4 focus:ring-[var(--neon-pink)]/30",
                  "shadow-[0_8px_20px_rgba(255,0,110,0.2)]",
                )}
                style={{
                  textShadow: "0 0 10px rgba(255,0,110,0.3)",
                }}
              >
                Delete & Archive
              </motion.button>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

