"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Undo2, X, AlertTriangle, Trash2, Calendar } from "lucide-react";
import { useState } from "react";
import { deleteBatch, useBatches } from "@/lib/chats";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export function UndoBatchModal({
  uid,
  onClose,
}: {
  uid: string;
  onClose: () => void;
}) {
  const batches = useBatches(uid);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleUndo(batchId: string) {
    setDeleting(batchId);
    setError(null);

    try {
      const count = await deleteBatch(uid, batchId);
      // Close modal after successful deletion
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to undo batch import");
      setDeleting(null);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-6 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-3xl border border-[var(--line)] bg-[var(--bg-elevated)]/95 backdrop-blur-2xl shadow-[0_30px_80px_rgba(0,0,0,0.6)] overflow-hidden"
      >
        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-[var(--line)]">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl border border-[var(--line)] bg-[var(--bg-surface)]/60 flex items-center justify-center">
                <Undo2 className="h-6 w-6 text-[var(--neon-pink)]" />
              </div>
              <div>
                <h2 className="font-sans text-xl font-bold text-[var(--text-primary)]">
                  Undo Batch Import
                </h2>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  Remove previously imported batches
                </p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="rounded-full p-2 hover:bg-[var(--bg-surface)] transition-colors"
            >
              <X className="h-5 w-5 text-[var(--text-secondary)]" />
            </motion.button>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-6">
          {batches.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-sm text-[var(--text-secondary)]">
                No batch imports found
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mb-4">
                <AlertTriangle className="h-4 w-4 text-[var(--neon-pink)]" />
                <span>Warning: This action cannot be undone</span>
              </div>

              <div className="max-h-96 overflow-y-auto space-y-3">
                {batches.map((batch) => (
                  <motion.div
                    key={batch.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "rounded-2xl border border-[var(--line)] bg-[var(--bg-surface)]/60 p-4",
                      "flex items-center justify-between gap-4",
                      deleting === batch.batchId && "opacity-50"
                    )}
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <div className="h-10 w-10 rounded-xl bg-[var(--bg-elevated)] flex items-center justify-center flex-shrink-0">
                        <Calendar className="h-5 w-5 text-[var(--neon-cyan)]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-[var(--text-primary)]">
                          {batch.entryCount} entries
                        </div>
                        <div className="text-xs text-[var(--text-secondary)] mt-1">
                          Imported {format(batch.createdAt, "MMM d, yyyy 'at' h:mm a")}
                        </div>
                      </div>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleUndo(batch.batchId)}
                      disabled={deleting !== null}
                      className={cn(
                        "px-4 py-2 rounded-xl border border-[var(--neon-pink)]/50",
                        "bg-[var(--neon-pink)]/10 text-[var(--neon-pink)]",
                        "text-xs font-semibold flex items-center gap-2",
                        "hover:bg-[var(--neon-pink)]/20 transition-colors",
                        "disabled:opacity-50 disabled:cursor-not-allowed"
                      )}
                    >
                      {deleting === batch.batchId ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </motion.div>
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </>
                      )}
                    </motion.button>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 rounded-2xl border border-[var(--neon-pink)]/50 bg-[var(--bg-surface)]/80 px-4 py-3 flex items-start gap-3"
              >
                <AlertTriangle className="h-5 w-5 text-[var(--neon-pink)] flex-shrink-0 mt-0.5" />
                <div className="text-sm text-[var(--text-primary)]">{error}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
