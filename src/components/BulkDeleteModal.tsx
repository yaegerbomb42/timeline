"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Trash2, X, AlertCircle, CheckCircle, Loader2, Package } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { bulkDeleteChats, useBatches, getBatchEntryCounts } from "@/lib/chats";
import { format } from "date-fns";

type DeleteState = "idle" | "loading" | "confirm" | "deleting" | "success" | "error";

export function BulkDeleteModal({
  uid,
  onClose,
}: {
  uid: string;
  onClose: () => void;
}) {
  const [state, setState] = useState<DeleteState>("loading");
  const [deleteCount, setDeleteCount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedBatches, setSelectedBatches] = useState<Set<string>>(new Set());
  const batches = useBatches(uid);
  const [batchCounts, setBatchCounts] = useState<Map<string, number>>(new Map());

  // Load actual entry counts for each batch
  useEffect(() => {
    async function loadCounts() {
      try {
        const counts = await getBatchEntryCounts(uid);
        setBatchCounts(counts);
        setState("idle");
      } catch (err) {
        console.error("Failed to load batch counts:", err);
        setState("idle");
      }
    }
    loadCounts();
  }, [uid]);

  const toggleBatch = (batchId: string) => {
    const newSet = new Set(selectedBatches);
    if (newSet.has(batchId)) {
      newSet.delete(batchId);
    } else {
      newSet.add(batchId);
    }
    setSelectedBatches(newSet);
  };

  const selectAll = () => {
    setSelectedBatches(new Set(batches.map(b => b.batchId)));
  };

  const deselectAll = () => {
    setSelectedBatches(new Set());
  };

  const totalSelectedEntries = Array.from(selectedBatches).reduce(
    (sum, batchId) => sum + (batchCounts.get(batchId) || 0),
    0
  );

  async function handleDelete() {
    if (state === "idle") {
      setState("confirm");
      return;
    }

    setState("deleting");
    setError(null);

    try {
      const batchIdsToDelete = Array.from(selectedBatches);
      const count = await bulkDeleteChats(uid, batchIdsToDelete);
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
        className="w-full max-w-2xl rounded-3xl border border-[var(--line)] bg-[var(--bg-elevated)]/95 backdrop-blur-2xl shadow-[0_30px_80px_rgba(0,0,0,0.6)] overflow-hidden"
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
                  Delete Batch Imports
                </h2>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  Remove bulk-imported timeline entries
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
          {state === "loading" ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-12 w-12 text-[var(--neon-cyan)] animate-spin" />
              <div className="text-sm text-[var(--text-secondary)]">
                Loading batch imports...
              </div>
            </div>
          ) : state === "idle" || state === "confirm" ? (
            <div className="space-y-4">
              {batches.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-[var(--text-secondary)] mx-auto mb-4 opacity-50" />
                  <div className="text-sm text-[var(--text-secondary)]">
                    No batch imports found
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] mt-2">
                    Only bulk-imported entries can be deleted here
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-[var(--text-secondary)]">
                      Select batches to delete:
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={selectAll}
                        className="text-xs text-[var(--neon-cyan)] hover:underline"
                      >
                        Select All
                      </button>
                      <span className="text-xs text-[var(--text-secondary)]">|</span>
                      <button
                        onClick={deselectAll}
                        className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>

                  <div className="max-h-96 overflow-y-auto space-y-2 rounded-2xl border border-[var(--line)] bg-[var(--bg-surface)]/40 p-4">
                    {batches.map((batch) => {
                      const entryCount = batchCounts.get(batch.batchId) || batch.entryCount || 0;
                      const isSelected = selectedBatches.has(batch.batchId);
                      
                      return (
                        <label
                          key={batch.id}
                          className={cn(
                            "flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all",
                            isSelected
                              ? "border-[var(--neon-pink)] bg-[var(--neon-pink)]/10"
                              : "border-[var(--line)] hover:border-[var(--neon-pink)]/50 hover:bg-[var(--bg-surface)]/60"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleBatch(batch.batchId)}
                            className="accent-[var(--neon-pink)] w-4 h-4"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-[var(--neon-cyan)]" />
                              <div className="text-sm font-semibold text-[var(--text-primary)]">
                                Batch Import
                              </div>
                              <div className="text-xs text-[var(--text-secondary)] font-mono">
                                {batch.batchId.slice(-8)}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <div className="text-xs text-[var(--text-secondary)]">
                                {format(batch.createdAt, "MMM d, yyyy 'at' h:mm a")}
                              </div>
                              <span className="text-xs text-[var(--text-secondary)]">•</span>
                              <div className="text-xs font-semibold text-[var(--neon-cyan)]">
                                {entryCount} {entryCount === 1 ? 'entry' : 'entries'}
                              </div>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  {selectedBatches.size > 0 && (
                    <div className="rounded-2xl border border-[var(--neon-cyan)]/50 bg-[var(--neon-cyan)]/10 px-4 py-3">
                      <div className="text-sm text-[var(--text-primary)]">
                        <span className="font-semibold">{selectedBatches.size}</span> batch{selectedBatches.size === 1 ? '' : 'es'} selected
                        <span className="text-[var(--text-secondary)]"> • </span>
                        <span className="font-semibold text-[var(--neon-cyan)]">{totalSelectedEntries}</span> total entries will be deleted
                      </div>
                    </div>
                  )}

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
                            This will delete {totalSelectedEntries} bulk-imported {totalSelectedEntries === 1 ? 'entry' : 'entries'}. 
                            Entries will be archived for 30 days before permanent deletion.
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </>
              )}
            </div>
          ) : null}

          {/* Deleting progress */}
          {state === "deleting" ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-12 w-12 text-[var(--neon-pink)] animate-spin" />
              <div className="text-sm text-[var(--text-secondary)]">
                Deleting batch entries...
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
                  {deleteCount} {deleteCount === 1 ? 'entry' : 'entries'} removed and archived
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
        {(state === "idle" || state === "confirm") && batches.length > 0 && (
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
              whileHover={selectedBatches.size > 0 ? { scale: 1.05 } : {}}
              whileTap={selectedBatches.size > 0 ? { scale: 0.95 } : {}}
              onClick={handleDelete}
              disabled={selectedBatches.size === 0}
              className={cn(
                "px-6 py-2 rounded-xl text-sm font-semibold transition-all",
                selectedBatches.size > 0
                  ? state === "confirm"
                    ? "bg-[var(--neon-pink)] text-[var(--bg-deep)] shadow-[0_10px_40px_rgba(255,107,157,0.5)]"
                    : "bg-gradient-to-r from-[var(--neon-pink)] to-[var(--neon-purple)] text-[var(--bg-deep)] shadow-[0_10px_40px_rgba(255,0,110,0.4)]"
                  : "bg-[var(--bg-surface)] text-[var(--text-secondary)] opacity-50 cursor-not-allowed"
              )}
            >
              {state === "confirm" ? `Confirm Delete ${totalSelectedEntries} Entries` : `Delete Selected`}
            </motion.button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
