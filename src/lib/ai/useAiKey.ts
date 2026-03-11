"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, setDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export function useAiKey(uid?: string | null) {
  const [aiKey, setAiKeyState] = useState<string>("");
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load API key from Firebase on mount
  useEffect(() => {
    if (!uid) {
      setHydrated(true);
      return;
    }

    let cancelled = false;

    async function loadKey(userId: string) {
      setLoading(true);
      try {
        const settingsRef = collection(db, "users", userId, "settings");
        const docRef = doc(settingsRef, "aiConfig");
        const docSnap = await getDoc(docRef);

        if (!cancelled && docSnap.exists()) {
          const data = docSnap.data();
          const rawKey = typeof data?.geminiApiKey === "string" ? data.geminiApiKey : "";
          // Keys are now stored as raw strings for cross-device persistence
          setAiKeyState(rawKey);
        }
      } catch (error) {
        console.error("Error loading AI key from Firebase:", error);
      } finally {
        if (!cancelled) {
          setHydrated(true);
          setLoading(false);
        }
      }
    }

    void loadKey(uid);

    return () => {
      cancelled = true;
    };
  }, [uid]);

  async function setAiKey(next: string) {
    const v = next.trim();
    setAiKeyState(v);

    if (!uid) return;

    try {
      const settingsRef = collection(db, "users", uid, "settings");
      const docRef = doc(settingsRef, "aiConfig");
      // Store raw key in Firestore (secured by Firestore rules)
      await setDoc(docRef, { geminiApiKey: v }, { merge: true });
    } catch (error) {
      console.error("Error saving AI key to Firebase:", error);
    }
  }

  function clearAiKey() {
    void setAiKey("");
  }

  return {
    aiKey,
    hydrated,
    loading,
    hasKey: Boolean(aiKey.trim()),
    setAiKey,
    clearAiKey,
  };
}

