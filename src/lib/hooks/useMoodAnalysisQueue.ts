"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { doc, collection, query, getDocs, updateDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

type PendingEntry = {
  id: string;
  text: string;
  date: string;
};

export type QueueLogItem = {
  id: string;
  entryId: string;
  date: string;
  text: string;
  rating: number;
  mood: string;
  description: string;
  emoji: string;
  geminiRationale: string;
  timestamp: number;
};

export type PendingDisplayEntry = {
  id: string;
  text: string;
  date: string;
};

type QueueStatus = {
  pending: number;
  processing: boolean;
  processed: number;
  total: number;
  errors: number;
};

const BATCH_SIZE = 5; // Smaller batches return faster and distribute work better across AI buckets
const MAX_CONCURRENCY = 12; // Process up to 12 batches in parallel (utilizing the 30-key cluster)
const MAX_CONSECUTIVE_FAILS = 3;
const FETCH_TIMEOUT_MS = 60_000; // 60 seconds is plenty for 5 entries

/**
 * Hook to manage background mood analysis queue
 * Optimized for high-concurrency parallel processing across multiple AI buckets
 */
export function useMoodAnalysisQueue(uid: string | null, userEmail: string | null, apiKey: string | null, enabled: boolean = true) {
  const [status, setStatus] = useState<QueueStatus>({
    pending: 0,
    processing: false,
    processed: 0,
    total: 0,
    errors: 0,
  });
  const [recentResults, setRecentResults] = useState<QueueLogItem[]>([]);
  const [pendingEntries, setPendingEntries] = useState<PendingDisplayEntry[]>([]);

  const processingRef = useRef(false);
  const abortRef = useRef(false);
  const consecutiveFailsRef = useRef(0);
  const pendingEntriesRef = useRef<PendingEntry[]>([]);

  // Count pending entries that need mood analysis
  useEffect(() => {
    if (!uid || !enabled) return;

    const unsubscribe = onSnapshot(
      collection(db, "users", uid, "chats"),
      (snapshot) => {
        const pendingList: PendingDisplayEntry[] = [];
        const fullPendingList: PendingEntry[] = [];

        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          if (data.text && data.text.trim() && !data.imageOnly && (!data.moodAnalysis || !data.moodAnalysis.geminiRationale)) {
            const entry = {
              id: doc.id,
              text: String(data.text),
              date: data.dayKey || "",
            };
            pendingList.push(entry);
            fullPendingList.push(entry);
          }
        });

        const pendingCount = pendingList.length;

        // If pending count increased, reset consecutive fails to allow auto-restart
        if (pendingCount > status.pending) {
          consecutiveFailsRef.current = 0;
        }

        setPendingEntries(pendingList);
        pendingEntriesRef.current = fullPendingList;

        setStatus((prev) => {
          if (prev.pending !== pendingCount || prev.total !== pendingCount + prev.processed) {
            return {
              ...prev,
              pending: pendingCount,
              total: pendingCount + prev.processed,
            };
          }
          return prev;
        });
      },
      (err) => console.error("[Queue Snapshot Error]:", err)
    );

    return () => unsubscribe();
  }, [uid, enabled, status.pending]);

  const processBatch = useCallback(async (entries: PendingEntry[]): Promise<number> => {
    if (!uid) return 0;

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (apiKey) headers["x-timeline-ai-key"] = apiKey;
      if (userEmail) headers["x-user-email"] = userEmail;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      let response: Response;
      try {
        response = await fetch("/api/mood-analysis", {
          method: "POST",
          headers,
          body: JSON.stringify({ entries }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 429) {
          console.warn("[Mood Analysis Swarm Status]:", errorData.diagnostics);
          throw new Error("RATE_LIMITED");
        }
        throw new Error(errorData.error || "Analysis failed");
      }

      const { results } = await response.json();

      let updated = 0;
      for (const result of results) {
        try {
          const docRef = doc(db, "users", uid, "chats", result.id);
          await updateDoc(docRef, {
            mood: result.mood,
            moodAnalysis: {
              mood: result.mood,
              rating: result.rating,
              description: result.description,
              emoji: result.emoji,
              score: result.score,
              rationale: result.rationale,
              geminiRationale: result.geminiRationale || result.rationale,
            },
          });
          updated++;

          const matchingEntry = entries.find(e => e.id === result.id);
          setRecentResults((prev) => {
            const newItem: QueueLogItem = {
              id: `${result.id}-${Date.now()}`,
              entryId: result.id,
              date: matchingEntry?.date || "",
              text: matchingEntry?.text || "",
              rating: result.rating,
              mood: result.mood,
              description: result.description,
              emoji: result.emoji,
              geminiRationale: result.geminiRationale || result.rationale || "",
              timestamp: Date.now(),
            };
            return [newItem, ...prev].slice(0, 30);
          });
        } catch (updateError) {
          console.error(`Failed to update entry ${result.id}:`, updateError);
        }
      }

      return updated;
    } catch (error: any) {
      if (error.message === "RATE_LIMITED") throw error;
      if (error.name === "AbortError") {
        console.error("Mood analysis request timed out");
        return 0;
      }
      console.error("Batch processing error:", error);
      return 0;
    }
  }, [uid, apiKey, userEmail]);

  const processQueue = useCallback(async () => {
    if (!uid || !enabled || processingRef.current) return;

    processingRef.current = true;
    abortRef.current = false;
    setStatus((prev) => ({ ...prev, processing: true }));

    try {
      const pending = [...pendingEntriesRef.current];
      if (pending.length === 0) {
        processingRef.current = false;
        setStatus((prev) => ({ ...prev, processing: false }));
        return;
      }

      console.log(`[Queue] Starting process for ${pending.length} entries...`);
      setStatus((prev) => ({ ...prev, total: pending.length, processed: 0, errors: 0 }));

      // Partition into chunks
      const chunks: PendingEntry[][] = [];
      for (let i = 0; i < pending.length; i += BATCH_SIZE) {
        chunks.push(pending.slice(i, i + BATCH_SIZE));
      }

      // Parallel Worker Pool
      let anySucceeded = false;
      const workQueue = [...chunks];
      const concurrency = Math.min(workQueue.length, MAX_CONCURRENCY);

      const worker = async () => {
        while (workQueue.length > 0 && !abortRef.current) {
          const batch = workQueue.shift();
          if (!batch) break;

          try {
            const updated = await processBatch(batch);
            if (updated > 0) anySucceeded = true;

            setStatus((prev) => ({
              ...prev,
              processed: prev.processed + updated,
              errors: prev.errors + (batch.length - updated),
            }));
          } catch (error: any) {
            if (error.message === "RATE_LIMITED") {
              // On global 429, wait briefly and retry or return to pool
              console.log("Bucket saturation detected, backing off...");
              await new Promise(resolve => setTimeout(resolve, 3000));
              workQueue.unshift(batch); // Push back to try again
            } else {
              setStatus((prev) => ({ ...prev, errors: prev.errors + batch.length }));
            }
          }
        }
      };

      // Start parallel workers
      await Promise.all(Array.from({ length: concurrency }).map(worker));

      if (!anySucceeded && chunks.length > 0) {
        consecutiveFailsRef.current++;
      } else {
        consecutiveFailsRef.current = 0;
      }
    } catch (error) {
      console.error("Queue processing error:", error);
      consecutiveFailsRef.current++;
    } finally {
      processingRef.current = false;
      setStatus((prev) => ({ ...prev, processing: false }));
    }
  }, [uid, enabled, processBatch]);

  const startQueue = useCallback(() => {
    consecutiveFailsRef.current = 0;
    void processQueue();
  }, [processQueue]);

  const stopQueue = useCallback(() => {
    abortRef.current = true;
  }, []);

  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (autoTimerRef.current) {
      clearTimeout(autoTimerRef.current);
      autoTimerRef.current = null;
    }

    if (
      enabled &&
      uid &&
      status.pending > 0 &&
      !status.processing &&
      !processingRef.current &&
      consecutiveFailsRef.current < MAX_CONSECUTIVE_FAILS
    ) {
      autoTimerRef.current = setTimeout(() => {
        autoTimerRef.current = null;
        if (enabled && uid && !processingRef.current && consecutiveFailsRef.current < MAX_CONSECUTIVE_FAILS) {
          void processQueue();
        }
      }, 1000); // Aggressive restart
    }

    return () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    };
  }, [enabled, uid, status.pending, status.processing, processQueue]);

  return {
    status,
    recentResults,
    pendingEntries,
    startQueue,
    stopQueue,
    isProcessing: status.processing,
  };
}
