"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { doc, collection, query, where, getDocs, updateDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { MoodAnalysis } from "@/lib/sentiment";

type PendingEntry = {
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

const BATCH_SIZE = 15; // Process 15 entries at a time - balances API token usage (~3-4k tokens) with processing speed
const RATE_LIMIT_DELAY = 3000; // 3 seconds between batches to avoid rate limits
const MAX_BATCH_SIZE_API = 25; // API can handle up to 25, but we use 15 for optimal balance

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
  
  const processingRef = useRef(false);
  const abortRef = useRef(false);

  // Count pending entries that need mood analysis
  useEffect(() => {
    if (!uid || !enabled) return;

    const unsubscribe = onSnapshot(
      collection(db, "users", uid, "chats"),
      (snapshot) => {
        let pendingCount = 0;
        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          // Count entries without mood analysis or with old analysis (no rationale)
          if (data.text && (!data.moodAnalysis || !data.moodAnalysis.rationale)) {
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
    
    if (!apiKey) {
      console.warn("No API key available for mood analysis");
      return 0;
    }

    try {
      const response = await fetch("/api/mood-analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-timeline-ai-key": apiKey,
        },
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
            },
          });
          updated++;
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
    if (!uid || !apiKey || !enabled || processingRef.current) {
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
        if (data.text && (!data.moodAnalysis || !data.moodAnalysis.rationale)) {
          pending.push({
            id: doc.id,
            text: String(data.text),
            date: data.dayKey || new Date(data.createdAtLocal || data.createdAt).toISOString().split('T')[0],
          });
        }
      });

      setStatus((prev) => ({ ...prev, total: pending.length, processed: 0, errors: 0 }));

      // Process in batches
      for (let i = 0; i < pending.length; i += BATCH_SIZE) {
        if (abortRef.current) {
          console.log("Queue processing aborted");
          break;
        }

        const batch = pending.slice(i, i + BATCH_SIZE);
        
        try {
          const updated = await processBatch(batch);
          
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
    } catch (error) {
      console.error("Queue processing error:", error);
    } finally {
      processingRef.current = false;
      setStatus((prev) => ({ ...prev, processing: false }));
    }
  }, [uid, apiKey, enabled, processBatch]);

  const startQueue = useCallback(() => {
    void processQueue();
  }, [processQueue]);

  const stopQueue = useCallback(() => {
    abortRef.current = true;
  }, []);

  return {
    status,
    startQueue,
    stopQueue,
    isProcessing: status.processing,
  };
}
