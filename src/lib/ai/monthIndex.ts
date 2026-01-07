"use client";

import {
  collection,
  onSnapshot,
  orderBy,
  query,
  type DocumentData,
} from "firebase/firestore";
import { useEffect, useState } from "react";

import { db } from "@/lib/firebase/client";

export type MonthIndex = {
  monthKey: string; // yyyy-MM
  count: number;
  samples: string[];
  firstAtLocal?: string;
  lastAtLocal?: string;
};

function parseMonthDoc(d: DocumentData, monthKeyFallback: string): MonthIndex {
  const monthKey = String(d.monthKey ?? monthKeyFallback);
  const count = Number(d.count ?? 0);
  const samplesRaw = Array.isArray(d.samples) ? d.samples : [];
  const samples = samplesRaw.filter((s) => typeof s === "string").slice(0, 12);
  const firstAtLocal = typeof d.firstAtLocal === "string" ? d.firstAtLocal : undefined;
  const lastAtLocal = typeof d.lastAtLocal === "string" ? d.lastAtLocal : undefined;
  return { monthKey, count, samples, firstAtLocal, lastAtLocal };
}

export function useMonthIndex(uid?: string) {
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState<MonthIndex[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    setError(null);

    const q = query(collection(db, "users", uid, "ai_months"), orderBy("monthKey", "desc"));
    return onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((doc) => parseMonthDoc(doc.data(), doc.id));
        setMonths(items);
        setLoading(false);
      },
      (err) => {
        setError(err.message ?? "Failed to load month index.");
        setLoading(false);
      },
    );
  }, [uid]);

  return { months, loading, error };
}


