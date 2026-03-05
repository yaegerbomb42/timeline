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

type QueueStatus = {
  pending: number;
  processing: boolean;
  processed: number;
  total: number;
  errors: number;
};

const BATCH_SIZE = 15; // Process 15 entries at a time - balances API token usage (~3-4k tokens) with processing speed
const RATE_LIMIT_DELAY = 3000; // 3 seconds between batches to avoid rate limits

/**
 * Hook to manage background mood analysis queue
 * Processes entries without mood analysis in batches using Gemini AI
 */
export function useMoodAnalysisQueue(uid: string | null, apiKey: string | null, enabled: boolean = true) {
  const [status, setStatus] = useState<QueueStatus>({
    pending: 0,
    processing: false,
    processed: 0,
    total: 0,
    errors: 0,
  });
  const [recentResults, setRecentResults] = useState<QueueLogItem[]>([]);
  
  const processingRef = useRef(false);
  const abortRef = useRef(false);
  const consecutiveFailsRef = useRef(0);
  const MAX_CONSECUTIVE_FAILS = 3; // Stop auto-retrying after 3 consecutive full-batch failures

  // Count pending entries that need mood analysis
  useEffect(() => {
    if (!uid || !enabled) return;

    const unsubscribe = onSnapshot(
      collection(db, "users", uid, "chats"),
      (snapshot) => {
        let pendingCount = 0;
        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          // Skip image-only entries (they don't need AI analysis)
          // Count entries with text that need mood analysis or with old analysis (no Gemini fields)
          if (data.text && data.text.trim() && !data.imageOnly && (!data.moodAnalysis || !data.moodAnalysis.geminiRationale)) {
            pendingCount++;
          }
        });
        
        // Use callback form to avoid cascading renders
        setStatus((prev) => {
          // Only update if values actually changed
          if (prev.pending !== pendingCount || prev.total !== pendingCount + prev.processed) {
            return { 
              ...prev, 
              pending: pendingCount,
              total: pendingCount + prev.processed,
            };
          }
          return prev;
        });
      }
    );

    return () => unsubscribe();
  }, [uid, enabled]);

  const processBatch = useCallback(async (entries: PendingEntry[]): Promise<number> => {
    if (!uid) {
      console.warn("No UID available for mood analysis");
      return 0;
    }

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      // Only send the API key header if the user has configured one;
      // the server-side route falls back to process.env.GEMINI_API_KEY
      if (apiKey) {
        headers["x-timeline-ai-key"] = apiKey;
      }

      const response = await fetch("/api/mood-analysis", {
        method: "POST",
        headers,
        body: JSON.stringify({ entries }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Mood analysis API error:", error);
        
        // If rate limited, throw specific error
        if (response.status === 429) {
          throw new Error("RATE_LIMITED");
        }
        
        throw new Error(error.error || "Analysis failed");
      }

      const { results } = await response.json();

      // Update Firestore with results
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
          
          // Add to recent results log
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
            return [newItem, ...prev].slice(0, 30); // Keep most recent 30
          });
        } catch (updateError) {
          console.error(`Failed to update entry ${result.id}:`, updateError);
        }
      }

      return updated;
    } catch (error: any) {
      if (error.message === "RATE_LIMITED") {
        throw error; // Re-throw to handle specially
      }
      console.error("Batch processing error:", error);
      return 0;
    }
  }, [uid, apiKey]);

  const processQueue = useCallback(async () => {
    if (!uid || !enabled || processingRef.current) {
      return;
    }

    processingRef.current = true;
    abortRef.current = false;
    setStatus((prev) => ({ ...prev, processing: true }));

    try {
      // Get all pending entries
      const q = query(collection(db, "users", uid, "chats"));
      const snapshot = await getDocs(q);

      const pending: PendingEntry[] = [];
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        // Skip image-only entries (they don't need AI analysis)
        // Check for entries with text without mood analysis OR without Gemini-enhanced analysis
        if (data.text && data.text.trim() && !data.imageOnly && (!data.moodAnalysis || !data.moodAnalysis.geminiRationale)) {
          pending.push({
            id: doc.id,
            text: String(data.text),
            date: data.dayKey || new Date(data.createdAtLocal || data.createdAt).toISOString().split('T')[0],
          });
        }
      });

      setStatus((prev) => ({ ...prev, total: pending.length, processed: 0, errors: 0 }));

      // Process in batches
      let batchSucceeded = false;
      for (let i = 0; i < pending.length; i += BATCH_SIZE) {
        if (abortRef.current) {
          console.log("Queue processing aborted");
          break;
        }

        const batch = pending.slice(i, i + BATCH_SIZE);
        
        try {
          const updated = await processBatch(batch);
          
          if (updated > 0) {
            batchSucceeded = true;
            consecutiveFailsRef.current = 0; // Reset on any success
          }
          
          setStatus((prev) => ({
            ...prev,
            processed: prev.processed + updated,
            errors: prev.errors + (batch.length - updated),
          }));

          // Rate limiting: wait between batches
          if (i + BATCH_SIZE < pending.length) {
            await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY));
          }
        } catch (error: any) {
          if (error.message === "RATE_LIMITED") {
            console.log("Rate limited, waiting longer before retry...");
            setStatus((prev) => ({ ...prev, errors: prev.errors + batch.length }));
            // Wait 10 seconds on rate limit, then continue
            await new Promise((resolve) => setTimeout(resolve, 10000));
          } else {
            setStatus((prev) => ({ ...prev, errors: prev.errors + batch.length }));
          }
        }
      }
      
      if (!batchSucceeded) {
        consecutiveFailsRef.current++;
      }
    } catch (error) {
      console.error("Queue processing error:", error);
      consecutiveFailsRef.current++;
    } finally {
      processingRef.current = false;
      setStatus((prev) => ({ ...prev, processing: false }));
      
      // After processing completes, check if new entries arrived during processing.
      // If so, the onSnapshot listener will update pending count, which will trigger
      // the auto-start effect to run again after a short delay.
    }
  }, [uid, enabled, processBatch]);

  const startQueue = useCallback(() => {
    consecutiveFailsRef.current = 0; // Manual start always retries
    void processQueue();
  }, [processQueue]);

  const stopQueue = useCallback(() => {
    abortRef.current = true;
  }, []);

  // Auto-start processing when there are pending entries.
  // Uses a timer ref to debounce rapid re-triggers while still reliably restarting
  // when new entries arrive or processing completes with remaining entries.
  // Stops auto-retrying after MAX_CONSECUTIVE_FAILS consecutive failures to avoid
  // infinite loops when no API key is available on either client or server.
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    // Clear any pending auto-start timer when deps change
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
      // Delay before starting to avoid rapid re-triggers after a batch completes
      autoTimerRef.current = setTimeout(() => {
        autoTimerRef.current = null;
        // Re-check all conditions after the delay (state/refs may have changed)
        if (enabled && uid && !processingRef.current && consecutiveFailsRef.current < MAX_CONSECUTIVE_FAILS) {
          void processQueue();
        }
      }, 2000);
    }

    return () => {
      if (autoTimerRef.current) {
        clearTimeout(autoTimerRef.current);
        autoTimerRef.current = null;
      }
    };
  }, [enabled, uid, status.pending, status.processing, processQueue]);

  return {
    status,
    recentResults,
    startQueue,
    stopQueue,
    isProcessing: status.processing,
  };
}
