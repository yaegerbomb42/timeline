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
  await deleteDoc(doc(db, "users", uid, "chats", chatId));
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


