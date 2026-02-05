"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X, Archive, Calendar, Sparkles, RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { format } from "date-fns";

import { cn } from "@/lib/utils";
import { useDeletedArchive, type Chat } from "@/lib/chats";

export function DeletedArchiveModal({
  isOpen,
  onClose,
  uid,
}: {
  isOpen: boolean;
  onClose: () => void;
  uid?: string;
}) {
  const deletedChats = useDeletedArchive(uid);

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
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-3xl max-h-[80vh] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-[var(--neon-purple)]/30 bg-[var(--bg-elevated)]/90 backdrop-blur-2xl shadow-[0_24px_60px_rgba(0,0,0,0.5),0_0_40px_rgba(131,56,236,0.2)] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Animated gradient background */}
            <motion.div
              className="absolute inset-0 -z-10 opacity-20 rounded-3xl"
              animate={{
                background: [
                  "radial-gradient(circle at 0% 0%, var(--glow-purple), transparent)",
                  "radial-gradient(circle at 100% 100%, var(--glow-cyan), transparent)",
                  "radial-gradient(circle at 0% 100%, var(--glow-purple), transparent)",
                ],
              }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />
            
            {/* Header */}
            <div className="relative px-8 pt-8 pb-6 border-b border-[var(--line)]">
              <button
                onClick={onClose}
                className="absolute right-6 top-6 rounded-xl p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]/60 hover:text-[var(--neon-cyan)] transition-all"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-start gap-4">
                <motion.div 
                  className="rounded-2xl bg-[var(--neon-purple)]/10 p-3 border border-[var(--neon-purple)]/30"
                  animate={{
                    boxShadow: [
                      "0 0 20px rgba(131,56,236,0.2)",
                      "0 0 30px rgba(131,56,236,0.4)",
                      "0 0 20px rgba(131,56,236,0.2)",
                    ],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Archive className="h-6 w-6 text-[var(--neon-purple)]" />
                </motion.div>
                <div className="flex-1">
                  <h3 className="font-book text-2xl text-[var(--text-primary)]">
                    Deleted Archive
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)] font-sans">
                    Last 30 deleted entries. These are kept for recovery purposes.
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-8 py-6">
              {deletedChats.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="rounded-2xl bg-[var(--bg-surface)]/60 p-4 mb-4"
                  >
                    <Archive className="h-8 w-8 text-[var(--text-secondary)]" />
                  </motion.div>
                  <p className="text-sm text-[var(--text-secondary)] font-sans">
                    No deleted entries yet
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {deletedChats.map((chat, index) => (
                    <motion.div
                      key={chat.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="group rounded-2xl border border-[var(--line)] bg-[var(--bg-surface)]/40 backdrop-blur-xl p-4 hover:bg-[var(--bg-surface)]/60 transition-all"
                      style={{
                        boxShadow: "0 0 20px rgba(0,0,0,0.2)",
                      }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar className="h-3 w-3 text-[var(--neon-cyan)]" />
                            <div className="text-xs text-[var(--text-secondary)] font-sans">
                              {format(chat.createdAt, "MMM d, yyyy")}
                            </div>
                            {chat.mood && (
                              <div className="flex items-center gap-1">
                                <Sparkles className="h-3 w-3 text-[var(--neon-purple)]" />
                                <span className="text-xs text-[var(--text-secondary)] font-sans capitalize">
                                  {chat.mood}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="text-sm text-[var(--text-primary)] line-clamp-2 font-serif leading-relaxed">
                            {chat.text}
                          </div>
                        </div>
                        {/* Future: Add restore button */}
                        {/* <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity rounded-xl p-2 text-[var(--neon-cyan)] hover:bg-[var(--bg-elevated)]/60"
                          title="Restore (coming soon)"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </motion.button> */}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-[var(--line)] bg-[var(--bg-surface)]/20 px-8 py-4">
              <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] font-sans">
                <span>{deletedChats.length} of 30 slots used</span>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  className={cn(
                    "rounded-2xl border border-[var(--line)] bg-[var(--bg-surface)]/60 backdrop-blur-xl px-4 py-2",
                    "font-sans text-sm text-[var(--text-primary)] hover:bg-[var(--bg-surface)]/80 transition-all",
                    "hover:border-[var(--neon-cyan)] hover:text-[var(--neon-cyan)]",
                  )}
                >
                  Close
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
