"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Upload, X, FileText, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { parseBatchImport, addBatchChats, type BatchImportEntry } from "@/lib/chats";
import { cn } from "@/lib/utils";

type ImportState = "idle" | "parsing" | "uploading" | "success" | "error";

export function BatchImportModal({
  uid,
  onClose,
  preloadedFile,
}: {
  uid: string;
  onClose: () => void;
  preloadedFile?: File;
}) {
  const [state, setState] = useState<ImportState>("idle");
  const [entries, setEntries] = useState<BatchImportEntry[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    setState("parsing");
    setError(null);

    try {
      const text = await file.text();
      const parsed = parseBatchImport(text);

      if (parsed.length === 0) {
        setError("No valid entries found in file. Check format.");
        setState("error");
        return;
      }

      setEntries(parsed);
      setState("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse file");
      setState("error");
    }
  }, []);

  // Process preloaded file on mount
  useEffect(() => {
    if (preloadedFile) {
      void processFile(preloadedFile);
    }
  }, [preloadedFile, processFile]);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  async function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.txt')) {
      setError("Please upload a .txt file");
      setState("error");
      return;
    }

    await processFile(file);
  }

  async function handleImport() {
    if (entries.length === 0) return;

    setState("uploading");
    setError(null);

    try {
      await addBatchChats(uid, entries, (current, total) => {
        setProgress({ current, total });
      });

      setState("success");
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import entries");
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
              <div className="h-12 w-12 rounded-2xl border border-[var(--line)] bg-[var(--bg-surface)]/60 flex items-center justify-center">
                <Upload className="h-6 w-6 text-[var(--neon-cyan)]" />
              </div>
              <div>
                <h2 className="font-sans text-xl font-bold text-[var(--text-primary)]">
                  Batch Import
                </h2>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  Upload timeline entries from a text file
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
          {/* File format info */}
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-surface)]/60 p-4 mb-6">
            <h3 className="font-sans text-sm font-semibold text-[var(--text-primary)] mb-2">
              File Format
            </h3>
            <div className="text-xs text-[var(--text-secondary)] space-y-1 font-mono">
              <div>YYYY-MM-DD : Entry content here</div>
              <div>Multiple lines are OK</div>
              <div>~`~</div>
              <div>2025-01-02 : Another entry</div>
              <div>~`~</div>
            </div>
          </div>

          {/* File upload */}
          {entries.length === 0 && state !== "uploading" && state !== "success" ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt"
                onChange={handleFileSelect}
                className="hidden"
              />
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => fileInputRef.current?.click()}
                disabled={state === "parsing"}
                className={cn(
                  "w-full rounded-2xl border-2 border-dashed",
                  isDragging 
                    ? "border-[var(--neon-cyan)] bg-[var(--neon-cyan)]/20"
                    : "border-[var(--line)] bg-[var(--bg-surface)]/40",
                  "px-6 py-12 flex flex-col items-center gap-4",
                  "hover:border-[var(--neon-cyan)] hover:bg-[var(--bg-surface)]/60 transition-all",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {state === "parsing" ? (
                  <>
                    <Loader2 className="h-8 w-8 text-[var(--neon-cyan)] animate-spin" />
                    <span className="text-sm text-[var(--text-secondary)]">Parsing file...</span>
                  </>
                ) : (
                  <>
                    <FileText className="h-8 w-8 text-[var(--neon-cyan)]" />
                    <div className="text-center">
                      <div className="text-sm font-semibold text-[var(--text-primary)]">
                        Choose a text file
                      </div>
                      <div className="text-xs text-[var(--text-secondary)] mt-1">
                        Click to browse or drag and drop
                      </div>
                    </div>
                  </>
                )}
              </motion.button>
            </div>
          ) : null}

          {/* Preview */}
          {entries.length > 0 && state !== "uploading" && state !== "success" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-[var(--text-primary)]">
                  Found {entries.length} entries
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setEntries([]);
                    setState("idle");
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  Choose different file
                </motion.button>
              </div>
              <div className="max-h-48 overflow-y-auto rounded-2xl border border-[var(--line)] bg-[var(--bg-surface)]/40 p-4 space-y-2">
                {entries.slice(0, 5).map((entry, i) => (
                  <div key={i} className="text-xs">
                    <span className="text-[var(--neon-cyan)] font-mono">{entry.date}</span>
                    <span className="text-[var(--text-secondary)]">: {entry.content.slice(0, 60)}...</span>
                  </div>
                ))}
                {entries.length > 5 && (
                  <div className="text-xs text-[var(--text-secondary)] italic">
                    ... and {entries.length - 5} more
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* Upload progress */}
          {state === "uploading" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--text-primary)]">
                  Importing entries...
                </span>
                <span className="text-[var(--neon-cyan)] font-mono">
                  {progress.current} / {progress.total}
                </span>
              </div>
              <div className="h-2 rounded-full bg-[var(--bg-surface)] overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-purple)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${(progress.current / progress.total) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <div className="text-xs text-[var(--text-secondary)] text-center">
                Processing with mood analysis... This may take a few moments.
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
                  Import Complete!
                </div>
                <div className="text-sm text-[var(--text-secondary)] mt-1">
                  {progress.total} entries added to your timeline
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
        {entries.length > 0 && state !== "uploading" && state !== "success" ? (
          <div className="px-8 py-6 border-t border-[var(--line)] flex items-center justify-end gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[var(--line)] text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              Cancel
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleImport}
              className={cn(
                "px-6 py-2 rounded-xl text-sm font-semibold",
                "bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-purple)]",
                "text-[var(--bg-deep)] shadow-[0_10px_40px_rgba(0,245,255,0.4)]"
              )}
            >
              Import {entries.length} Entries
            </motion.button>
          </div>
        ) : null}
      </motion.div>
    </motion.div>
  );
}
