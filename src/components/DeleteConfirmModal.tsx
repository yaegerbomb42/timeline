"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
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
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-3xl border-2 border-[rgba(140,60,40,0.3)] bg-white shadow-[0_24px_60px_rgba(0,0,0,0.35)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative px-8 pt-8 pb-6">
              <button
                onClick={onClose}
                className="absolute right-6 top-6 rounded-xl p-2 text-[color:var(--muted)] hover:bg-white/80 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-[rgba(140,60,40,0.1)] p-3">
                  <AlertTriangle className="h-6 w-6 text-[rgba(140,60,40,0.85)]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-serif text-xl text-[color:var(--ink)]">Delete this entry?</h3>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                    This action cannot be undone. The entry will be permanently removed from your timeline.
                  </p>
                  {entryPreview ? (
                    <div className="mt-4 rounded-xl border border-[var(--line)] bg-white/60 px-4 py-3">
                      <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)] font-sans mb-1.5">
                        Preview
                      </div>
                      <div className="text-sm text-[color:var(--ink)] line-clamp-2">{entryPreview}</div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-[var(--line)] bg-white/40 px-8 py-5">
              <button
                onClick={onClose}
                className={cn(
                  "rounded-2xl border border-[var(--line)] bg-white/60 px-5 py-2.5",
                  "font-sans text-sm text-[color:var(--ink)] hover:bg-white/80 transition-colors",
                )}
              >
                Cancel
              </button>
              <button
                ref={confirmRef}
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={cn(
                  "rounded-2xl border-2 border-[rgba(140,60,40,0.4)] bg-[rgba(140,60,40,0.1)] px-5 py-2.5",
                  "font-sans text-sm font-semibold text-[rgba(140,60,40,0.95)]",
                  "hover:bg-[rgba(140,60,40,0.15)] hover:border-[rgba(140,60,40,0.5)] transition-colors",
                  "focus:outline-none focus:ring-4 focus:ring-[rgba(140,60,40,0.2)]",
                )}
              >
                Delete Forever
              </button>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

