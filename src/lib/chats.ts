"use client";

import { format } from "date-fns";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  deleteDoc,
  getDocs,
  getDoc,
  updateDoc,
  writeBatch,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useEffect, useMemo, useState } from "react";

import { db, storage } from "@/lib/firebase/client";
import { analyzeMood, analyzeMoodDetailed, type Mood, type MoodAnalysis } from "@/lib/sentiment";

export type Chat = {
  id: string;
  text: string;
  excerpt: string;
  createdAt: Date;
  createdAtMs: number;
  dayKey: string; // yyyy-MM-dd (local)
  mood?: Mood;
  moodAnalysis?: MoodAnalysis;
  imageUrl?: string;
  batchId?: string; // For tracking batch imports
};

export type BatchImportEntry = {
  date: string; // YYYY-MM-DD
  content: string;
};

function makeExcerpt(text: string, max = 220) {
  const oneLine = text.replace(/\s+/g, " ").trim();
  if (oneLine.length <= max) return oneLine;
  return oneLine.slice(0, max - 1).trimEnd() + "…";
}

function hashString(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

export async function addChat(uid: string, text: string, imageFile?: File) {
  const now = new Date();
  const dayKey = format(now, "yyyy-MM-dd");
  const monthKey = dayKey.slice(0, 7);
  const excerpt = makeExcerpt(text);
  const mood = analyzeMood(text);
  const moodAnalysis = analyzeMoodDetailed(text);
  
  // Upload image to Firebase Storage if provided
  let imageUrl: string | undefined = undefined;
  if (imageFile) {
    try {
      const imagePath = `users/${uid}/images/${now.getTime()}_${imageFile.name}`;
      const storageRef = ref(storage, imagePath);
      await uploadBytes(storageRef, imageFile);
      imageUrl = await getDownloadURL(storageRef);
    } catch (error) {
      console.error('Failed to upload image:', error);
      // Continue without image if upload fails
      throw new Error('Image upload failed. Please try again.');
    }
  }
  
  // Build the document data, only including imageUrl if it's defined
  const docData: Record<string, unknown> = {
    text,
    excerpt,
    dayKey,
    mood,
    moodAnalysis,
    createdAtLocal: now.toISOString(),
    createdAt: serverTimestamp(),
    v: 1,
  };
  
  // Only add imageUrl if it's defined (Firebase doesn't allow undefined values)
  if (imageUrl !== undefined) {
    docData.imageUrl = imageUrl;
  }
  
  const docRef = await addDoc(collection(db, "users", uid, "chats"), docData);

  // Lightweight, persistent condensation for AI: per-month index with a few samples.
  // Not critical for core app flow—fail silently.
  try {
    const nowIso = now.toISOString();
    const monthRef = doc(db, "users", uid, "ai_months", monthKey);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(monthRef);
      const data = snap.exists() ? (snap.data() as any) : {};
      const prevCount = Number(data.count ?? 0);
      const nextCount = prevCount + 1;

      const prevSamples: unknown = data.samples;
      const samples = Array.isArray(prevSamples) ? prevSamples.filter((s) => typeof s === "string") : [];
      const k = 10;
      const nextSamples = [...samples];
      if (nextSamples.length < k) {
        nextSamples.push(excerpt);
      } else if (nextSamples.length > 0) {
        const idx = hashString(docRef.id) % nextSamples.length;
        nextSamples[idx] = excerpt;
      }

      const prevFirst = typeof data.firstAtLocal === "string" ? data.firstAtLocal : nowIso;
      const prevLast = typeof data.lastAtLocal === "string" ? data.lastAtLocal : nowIso;
      const firstAtLocal = prevFirst < nowIso ? prevFirst : nowIso;
      const lastAtLocal = prevLast > nowIso ? prevLast : nowIso;

      tx.set(
        monthRef,
        {
          monthKey,
          count: nextCount,
          samples: nextSamples.slice(0, k),
          firstAtLocal,
          lastAtLocal,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    });
  } catch {
    // ignore
  }

  return docRef.id;
}

export async function deleteChat(uid: string, chatId: string) {
  // First, get the chat data to archive it
  const chatRef = doc(db, "users", uid, "chats", chatId);
  const chatSnap = await getDoc(chatRef);
  
  if (chatSnap.exists()) {
    const chatData = chatSnap.data();
    
    // Archive the deleted entry
    try {
      await addDoc(collection(db, "users", uid, "deleted_archive"), {
        ...chatData,
        originalId: chatId,
        deletedAt: serverTimestamp(),
      });
      
      // Clean up old archives (keep only last 30)
      const archiveQuery = query(
        collection(db, "users", uid, "deleted_archive"),
        orderBy("deletedAt", "desc")
      );
      const archiveSnap = await getDocs(archiveQuery);
      
      // Delete entries beyond the 30th
      const toDelete = archiveSnap.docs.slice(30);
      for (const docToDelete of toDelete) {
        await deleteDoc(docToDelete.ref);
      }
    } catch (err) {
      // Non-fatal - continue with deletion even if archiving fails
      console.error("Failed to archive deleted entry:", err);
    }
  }
  
  // Delete the original chat
  await deleteDoc(chatRef);
}

export function useChats(uid?: string) {
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState<Chat[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    setError(null);

    const q = query(collection(db, "users", uid, "chats"), orderBy("createdAt", "desc"));

    return onSnapshot(
      q,
      (snap) => {
        const items: Chat[] = snap.docs.map((d) => {
          const data = d.data({ serverTimestamps: "estimate" }) as any;
          const createdAt: Date =
            data.createdAt?.toDate?.() ??
            (data.createdAtLocal ? new Date(data.createdAtLocal) : new Date());
          const dayKey: string = data.dayKey ?? format(createdAt, "yyyy-MM-dd");
          const text = String(data.text ?? "");
          
          // Calculate mood and moodAnalysis for prior chats that don't have it
          const mood = data.mood ?? (text ? analyzeMood(text) : undefined);
          const moodAnalysis = data.moodAnalysis ?? (text ? analyzeMoodDetailed(text) : undefined);
          
          return {
            id: d.id,
            text,
            excerpt: String(data.excerpt ?? makeExcerpt(text)),
            createdAt,
            createdAtMs: createdAt.getTime(),
            dayKey,
            mood,
            moodAnalysis,
            imageUrl: data.imageUrl,
            batchId: data.batchId,
          };
        });
        setChats(items);
        setLoading(false);
      },
      (err) => {
        setError(err.message ?? "Failed to load chats.");
        setLoading(false);
      },
    );
  }, [uid]);

  const groupedByDay = useMemo(() => {
    const map = new Map<string, Chat[]>();
    for (const c of chats) {
      const arr = map.get(c.dayKey);
      if (arr) arr.push(c);
      else map.set(c.dayKey, [c]);
    }
    return map;
  }, [chats]);

  return { chats, groupedByDay, loading, error };
}

/**
 * Parse a batch import file according to the specified format:
 * - Records separated by ~`~ on its own line
 * - Each record: YYYY-MM-DD : content (content can be multiline)
 */
export function parseBatchImport(text: string): BatchImportEntry[] {
  // Split by the separator pattern: newline, ~`~, newline
  const chunks = text.split(/\r?\n~`~\r?\n/);
  const entries: BatchImportEntry[] = [];

  for (const chunk of chunks) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;

    // Split on the first occurrence of " : "
    const separatorIndex = trimmed.indexOf(" : ");
    if (separatorIndex === -1) continue;

    const date = trimmed.slice(0, separatorIndex).trim();
    const content = trimmed.slice(separatorIndex + 3).trim();

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;

    entries.push({ date, content });
  }

  return entries;
}

/**
 * Add multiple entries from a batch import - FAST VERSION
 * Skips mood analysis initially, will be processed in background by queue
 */
export async function addBatchChats(
  uid: string,
  entries: BatchImportEntry[],
  onProgress?: (current: number, total: number) => void,
): Promise<{ batchId: string; chatIds: string[] }> {
  const batchId = `batch_${Date.now()}`;
  const chatIds: string[] = [];

  // Process entries quickly without mood analysis - nearly instant!
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    
    // Parse the date
    const entryDate = new Date(entry.date + "T12:00:00");
    const dayKey = format(entryDate, "yyyy-MM-dd");
    const monthKey = dayKey.slice(0, 7);
    const excerpt = makeExcerpt(entry.content);
    
    // Skip mood analysis for instant import - will be processed by background queue
    // Use basic sentiment library as temporary placeholder
    const mood = analyzeMood(entry.content);
    const moodAnalysis = analyzeMoodDetailed(entry.content);
    
    // Create the document
    const docData: Record<string, unknown> = {
      text: entry.content,
      excerpt,
      dayKey,
      mood,
      moodAnalysis,
      createdAtLocal: entryDate.toISOString(),
      createdAt: serverTimestamp(),
      batchId, // Track which batch this belongs to
      v: 1,
    };

    const docRef = await addDoc(collection(db, "users", uid, "chats"), docData);
    chatIds.push(docRef.id);

    // Update AI month index (same as addChat)
    try {
      const monthRef = doc(db, "users", uid, "ai_months", monthKey);
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(monthRef);
        const data = snap.exists() ? (snap.data() as any) : {};
        const prevCount = Number(data.count ?? 0);
        const nextCount = prevCount + 1;

        const prevSamples: unknown = data.samples;
        const samples = Array.isArray(prevSamples) ? prevSamples.filter((s) => typeof s === "string") : [];
        const k = 10;
        const nextSamples = [...samples];
        if (nextSamples.length < k) {
          nextSamples.push(excerpt);
        } else if (nextSamples.length > 0) {
          const idx = hashString(docRef.id) % nextSamples.length;
          nextSamples[idx] = excerpt;
        }

        const nowIso = entryDate.toISOString();
        const prevFirst = typeof data.firstAtLocal === "string" ? data.firstAtLocal : nowIso;
        const prevLast = typeof data.lastAtLocal === "string" ? data.lastAtLocal : nowIso;
        const firstAtLocal = prevFirst < nowIso ? prevFirst : nowIso;
        const lastAtLocal = prevLast > nowIso ? prevLast : nowIso;

        tx.set(
          monthRef,
          {
            monthKey,
            count: nextCount,
            samples: nextSamples.slice(0, k),
            firstAtLocal,
            lastAtLocal,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      });
    } catch {
      // ignore
    }

    // Report progress
    onProgress?.(i + 1, entries.length);
  }

  // Store batch metadata for undo functionality
  try {
    await addDoc(collection(db, "users", uid, "batches"), {
      batchId,
      chatIds,
      entryCount: entries.length,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.error("Failed to store batch metadata:", err);
  }

  return { batchId, chatIds };
}

/**
 * Delete all entries from a specific batch import
 */
export async function deleteBatch(uid: string, batchId: string): Promise<number> {
  // First, find all chats with this batchId
  const chatsSnapshot = await query(
    collection(db, "users", uid, "chats"),
  );
  
  // We need to query for chats with this batchId
  // Since Firestore queries need to be constructed differently, we'll fetch all and filter
  // This is not ideal for large datasets, but works for the use case
  
  let deletedCount = 0;
  
  return new Promise((resolve, reject) => {
    const q = query(collection(db, "users", uid, "chats"));
    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        unsubscribe(); // Unsubscribe immediately after first fetch
        
        const deletePromises = snapshot.docs
          .filter(doc => doc.data().batchId === batchId)
          .map(doc => deleteDoc(doc.ref));
        
        try {
          await Promise.all(deletePromises);
          deletedCount = deletePromises.length;
          
          // Delete batch metadata
          const batchQuery = query(collection(db, "users", uid, "batches"));
          const batchSnap = await new Promise<any>((res, rej) => {
            const unsub = onSnapshot(batchQuery, (snap) => {
              unsub();
              res(snap);
            }, rej);
          });
          
          const batchDocToDelete = batchSnap.docs.find((d: any) => d.data().batchId === batchId);
          if (batchDocToDelete) {
            await deleteDoc(batchDocToDelete.ref);
          }
          
          resolve(deletedCount);
        } catch (err) {
          reject(err);
        }
      },
      (error) => {
        reject(error);
      }
    );
  });
}

/**
 * Get list of recent batch imports for undo functionality
 */
export function useBatches(uid?: string) {
  const [batches, setBatches] = useState<Array<{
    id: string;
    batchId: string;
    entryCount: number;
    createdAt: Date;
  }>>([]);

  useEffect(() => {
    if (!uid) return;

    const q = query(
      collection(db, "users", uid, "batches"),
      orderBy("createdAt", "desc")
    );

    return onSnapshot(q, (snap) => {
      const items = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          batchId: data.batchId,
          entryCount: data.entryCount || 0,
          createdAt: data.createdAt?.toDate?.() ?? new Date(),
        };
      });
      setBatches(items);
    });
  }, [uid]);

  return batches;
}

/**
 * Hook to get deleted chat archives (last 30)
 */
export function useDeletedArchive(uid?: string) {
  const [deletedChats, setDeletedChats] = useState<Chat[]>([]);

  useEffect(() => {
    if (!uid) return;

    const q = query(
      collection(db, "users", uid, "deleted_archive"),
      orderBy("deletedAt", "desc")
    );

    return onSnapshot(q, (snap) => {
      const items: Chat[] = snap.docs.map((d) => {
        const data = d.data({ serverTimestamps: "estimate" }) as any;
        const createdAt: Date =
          data.createdAt?.toDate?.() ??
          (data.createdAtLocal ? new Date(data.createdAtLocal) : new Date());
        const dayKey: string = data.dayKey ?? format(createdAt, "yyyy-MM-dd");
        const text = String(data.text ?? "");
        const mood = data.mood ?? (text ? analyzeMood(text) : undefined);
        const moodAnalysis = data.moodAnalysis ?? (text ? analyzeMoodDetailed(text) : undefined);
        
        return {
          id: d.id,
          text,
          excerpt: String(data.excerpt ?? makeExcerpt(text)),
          createdAt,
          createdAtMs: createdAt.getTime(),
          dayKey,
          mood,
          moodAnalysis,
          imageUrl: data.imageUrl,
          batchId: data.batchId,
        };
      });
      setDeletedChats(items);
    });
  }, [uid]);

  return deletedChats;
}

/**
 * Bulk delete chats that came from batch imports - OPTIMIZED VERSION
 * Uses Firestore batch writes for much better performance
 * @param uid User ID
 * @param batchIds Optional array of specific batch IDs to delete. If undefined, deletes all batch-imported entries
 * @returns Number of entries deleted
 */
export async function bulkDeleteChats(uid: string, batchIds?: string[]): Promise<number> {
  const q = query(collection(db, "users", uid, "chats"));
  const snapshot = await getDocs(q);
  
  let deletedCount = 0;
  const BATCH_SIZE = 500; // Firestore batch write limit
  let currentBatch: QueryDocumentSnapshot<DocumentData>[] = [];
  
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    
    // Only delete entries that have a batchId (came from bulk import)
    if (!data.batchId) continue;
    
    // If specific batchIds provided, only delete those
    if (batchIds && !batchIds.includes(data.batchId)) continue;
    
    // Archive before deleting (not in batch for safety)
    try {
      await addDoc(collection(db, "users", uid, "deleted_archive"), {
        ...data,
        originalId: docSnap.id,
        deletedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Failed to archive entry:", err);
      // Continue with deletion even if archiving fails
    }
    
    currentBatch.push(docSnap);
    
    // When batch is full, commit and start a new one
    if (currentBatch.length >= BATCH_SIZE) {
      const batch = writeBatch(db);
      currentBatch.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      deletedCount += currentBatch.length;
      currentBatch = [];
      batchIndex++;
    }
  }
  
  // Commit remaining items in the last batch
  if (currentBatch.length > 0) {
    const batch = writeBatch(db);
    currentBatch.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    deletedCount += currentBatch.length;
  }
  
  // Clean up old archives (keep only last 30)
  try {
    const archiveQuery = query(
      collection(db, "users", uid, "deleted_archive"),
      orderBy("deletedAt", "desc")
    );
    const archiveSnap = await getDocs(archiveQuery);
    const toDelete = archiveSnap.docs.slice(30);
    
    // Also batch delete archives for efficiency
    if (toDelete.length > 0) {
      const archiveBatch = writeBatch(db);
      toDelete.forEach(doc => archiveBatch.delete(doc.ref));
      await archiveBatch.commit();
    }
  } catch (err) {
    console.error("Failed to clean up archive:", err);
  }
  
  return deletedCount;
}

/**
 * Get count of entries for each batch
 * @param uid User ID
 * @returns Map of batchId to entry count
 */
export async function getBatchEntryCounts(uid: string): Promise<Map<string, number>> {
  const q = query(collection(db, "users", uid, "chats"));
  const snapshot = await getDocs(q);
  
  const counts = new Map<string, number>();
  
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    if (data.batchId) {
      counts.set(data.batchId, (counts.get(data.batchId) || 0) + 1);
    }
  }
  
  return counts;
}

/**
 * Recalculate mood ratings for all existing entries that don't have them
 * This ensures all entries have mood analysis, even those created before the feature
 */
export async function recalculateMoodRatings(uid: string, onProgress?: (current: number, total: number) => void): Promise<number> {
  const q = query(collection(db, "users", uid, "chats"));
  const snapshot = await getDocs(q);
  
  let updated = 0;
  const total = snapshot.docs.length;
  
  for (let i = 0; i < snapshot.docs.length; i++) {
    const docSnap = snapshot.docs[i]!;
    const data = docSnap.data();
    
    // Update if mood analysis is missing OR if rationale field is missing
    if (data.text && (!data.moodAnalysis || !data.moodAnalysis.rationale)) {
      const text = String(data.text);
      const mood = analyzeMood(text);
      const moodAnalysis = analyzeMoodDetailed(text);
      
      try {
        await runTransaction(db, async (transaction) => {
          transaction.update(docSnap.ref, {
            mood,
            moodAnalysis,
          });
        });
        updated++;
      } catch (err) {
        console.error(`Failed to update mood for chat ${docSnap.id}:`, err);
      }
    }
    
    if (onProgress) {
      onProgress(i + 1, total);
    }
  }
  
  return updated;
}


