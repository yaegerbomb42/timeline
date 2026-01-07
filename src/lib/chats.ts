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
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";

import { db } from "@/lib/firebase/client";

export type Chat = {
  id: string;
  text: string;
  excerpt: string;
  createdAt: Date;
  createdAtMs: number;
  dayKey: string; // yyyy-MM-dd (local)
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

export async function addChat(uid: string, text: string) {
  const now = new Date();
  const dayKey = format(now, "yyyy-MM-dd");
  const monthKey = dayKey.slice(0, 7);
  const excerpt = makeExcerpt(text);
  const ref = await addDoc(collection(db, "users", uid, "chats"), {
    text,
    excerpt,
    dayKey,
    createdAtLocal: now.toISOString(),
    createdAt: serverTimestamp(),
    v: 1,
  });

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
        const idx = hashString(ref.id) % nextSamples.length;
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

  return ref.id;
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
          return {
            id: d.id,
            text: String(data.text ?? ""),
            excerpt: String(data.excerpt ?? makeExcerpt(String(data.text ?? ""))),
            createdAt,
            createdAtMs: createdAt.getTime(),
            dayKey,
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


