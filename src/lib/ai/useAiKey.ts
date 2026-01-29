"use client";

import { useEffect, useMemo, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
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
    
    async function loadKey() {
      setLoading(true);
      try {
        const docRef = doc(db, "users", uid, "settings", "aiConfig");
        const docSnap = await getDoc(docRef);
        
        if (!cancelled && docSnap.exists()) {
          const data = docSnap.data();
          setAiKeyState(data?.geminiApiKey ?? "");
        }
      } catch (error) {
        console.error("Error loading AI key from Firebase:", error);
        // Silently fail - user can re-enter key
      } finally {
        if (!cancelled) {
          setHydrated(true);
          setLoading(false);
        }
      }
    }

    void loadKey();

    return () => {
      cancelled = true;
    };
  }, [uid]);

  async function setAiKey(next: string) {
    const v = next.trim();
    setAiKeyState(v);
    
    if (!uid) return;
    
    try {
      const docRef = doc(db, "users", uid, "settings", "aiConfig");
      if (!v) {
        // Clear the key by setting it to empty string
        await setDoc(docRef, { geminiApiKey: "" }, { merge: true });
      } else {
        await setDoc(docRef, { geminiApiKey: v }, { merge: true });
      }
    } catch (error) {
      console.error("Error saving AI key to Firebase:", error);
      // Key is still updated locally, so user can continue using it this session
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

