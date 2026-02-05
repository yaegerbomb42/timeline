"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Trash2, X, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { bulkDeleteChats } from "@/lib/chats";

type DeleteState = "idle" | "confirm" | "deleting" | "success" | "error";

export function BulkDeleteModal({
  uid,
  onClose,
}: {
  uid: string;
  onClose: () => void;
}) {
  const [state, setState] = useState<DeleteState>("idle");
  const [deleteCount, setDeleteCount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<"all" | "last7" | "last30">("last7");

  async function handleDelete() {
    if (state === "idle") {
      setState("confirm");
      return;
    }

    setState("deleting");
    setError(null);

    try {
      let days: number | undefined;
      switch (selectedOption) {
        case "last7":
          days = 7;
          break;
        case "last30":
          days = 30;
          break;
        case "all":
          days = undefined;
          break;
      }

      const count = await bulkDeleteChats(uid, days);
      setDeleteCount(count);
      setState("success");
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete entries");
      setState("error");
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
        className="w-full max-w-lg rounded-3xl border border-[var(--line)] bg-[var(--bg-elevated)]/95 backdrop-blur-2xl shadow-[0_30px_80px_rgba(0,0,0,0.6)] overflow-hidden"
      >
        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-[var(--line)]">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl border border-[var(--neon-pink)]/50 bg-[var(--neon-pink)]/10 flex items-center justify-center">
                <Trash2 className="h-6 w-6 text-[var(--neon-pink)]" />
              </div>
              <div>
                <h2 className="font-sans text-xl font-bold text-[var(--text-primary)]">
                  Bulk Delete
                </h2>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  Remove multiple timeline entries
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
          {state === "idle" || state === "confirm" ? (
            <div className="space-y-4">
              <div className="text-sm text-[var(--text-secondary)]">
                Choose what to delete:
              </div>
              
              <div className="space-y-2">
                <label className={cn(
                  "flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all",
                  selectedOption === "last7"
                    ? "border-[var(--neon-cyan)] bg-[var(--neon-cyan)]/10"
                    : "border-[var(--line)] hover:border-[var(--neon-cyan)]/50"
                )}>
                  <input
                    type="radio"
                    name="deleteOption"
                    value="last7"
                    checked={selectedOption === "last7"}
                    onChange={(e) => setSelectedOption(e.target.value as "last7")}
                    className="accent-[var(--neon-cyan)]"
                  />
                  <div>
                    <div className="text-sm font-semibold text-[var(--text-primary)]">
                      Last 7 days
                    </div>
                    <div className="text-xs text-[var(--text-secondary)]">
                      Delete entries from the past week
                    </div>
                  </div>
                </label>

                <label className={cn(
                  "flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all",
                  selectedOption === "last30"
                    ? "border-[var(--neon-cyan)] bg-[var(--neon-cyan)]/10"
                    : "border-[var(--line)] hover:border-[var(--neon-cyan)]/50"
                )}>
                  <input
                    type="radio"
                    name="deleteOption"
                    value="last30"
                    checked={selectedOption === "last30"}
                    onChange={(e) => setSelectedOption(e.target.value as "last30")}
                    className="accent-[var(--neon-cyan)]"
                  />
                  <div>
                    <div className="text-sm font-semibold text-[var(--text-primary)]">
                      Last 30 days
                    </div>
                    <div className="text-xs text-[var(--text-secondary)]">
                      Delete entries from the past month
                    </div>
                  </div>
                </label>

                <label className={cn(
                  "flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all",
                  selectedOption === "all"
                    ? "border-[var(--neon-pink)] bg-[var(--neon-pink)]/10"
                    : "border-[var(--line)] hover:border-[var(--neon-pink)]/50"
                )}>
                  <input
                    type="radio"
                    name="deleteOption"
                    value="all"
                    checked={selectedOption === "all"}
                    onChange={(e) => setSelectedOption(e.target.value as "all")}
                    className="accent-[var(--neon-pink)]"
                  />
                  <div>
                    <div className="text-sm font-semibold text-[var(--text-primary)]">
                      All entries
                    </div>
                    <div className="text-xs text-[var(--neon-pink)]">
                      Delete all timeline entries (irreversible!)
                    </div>
                  </div>
                </label>
              </div>

              {state === "confirm" && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-[var(--neon-pink)]/50 bg-[var(--neon-pink)]/10 px-4 py-3"
                >
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-[var(--neon-pink)] flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-[var(--text-primary)]">
                      <div className="font-semibold mb-1">Are you sure?</div>
                      <div className="text-[var(--text-secondary)]">
                        This action cannot be undone. Entries will be moved to the archive before deletion.
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          ) : null}

          {/* Deleting progress */}
          {state === "deleting" ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-12 w-12 text-[var(--neon-pink)] animate-spin" />
              <div className="text-sm text-[var(--text-secondary)]">
                Deleting entries...
              </div>
            </div>
          ) : null}

          {/* Success */}
          {state === "success" ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center gap-4 py-8"
            >
              <div className="h-16 w-16 rounded-full bg-[var(--neon-cyan)]/20 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-[var(--neon-cyan)]" />
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-[var(--text-primary)]">
                  Deletion Complete!
                </div>
                <div className="text-sm text-[var(--text-secondary)] mt-1">
                  {deleteCount} {deleteCount === 1 ? 'entry' : 'entries'} removed from your timeline
                </div>
              </div>
            </motion.div>
          ) : null}

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 rounded-2xl border border-[var(--neon-pink)]/50 bg-[var(--bg-surface)]/80 px-4 py-3 flex items-start gap-3"
              >
                <AlertCircle className="h-5 w-5 text-[var(--neon-pink)] flex-shrink-0 mt-0.5" />
                <div className="text-sm text-[var(--text-primary)]">{error}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {(state === "idle" || state === "confirm") && (
          <div className="px-8 py-6 border-t border-[var(--line)] flex items-center justify-end gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={state === "confirm" ? () => setState("idle") : onClose}
              className="px-4 py-2 rounded-xl border border-[var(--line)] text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              {state === "confirm" ? "Back" : "Cancel"}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleDelete}
              className={cn(
                "px-6 py-2 rounded-xl text-sm font-semibold",
                state === "confirm"
                  ? "bg-[var(--neon-pink)] text-[var(--bg-deep)] shadow-[0_10px_40px_rgba(255,107,157,0.5)]"
                  : "bg-gradient-to-r from-[var(--neon-pink)] to-[var(--neon-purple)] text-[var(--bg-deep)] shadow-[0_10px_40px_rgba(255,0,110,0.4)]"
              )}
            >
              {state === "confirm" ? "Confirm Delete" : "Delete"}
            </motion.button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
