"use client";

import { useEffect, useMemo, useState } from "react";

import { DEFAULT_GEMINI_API_KEY } from "@/lib/ai/config";

const STORAGE_PREFIX = "timeline.aiKey.v1:";

function storageKey(identity: string) {
  return `${STORAGE_PREFIX}${identity}`;
}

export function useAiKey(identity?: string | null) {
  const key = useMemo(() => (identity ? storageKey(identity) : null), [identity]);
  const [aiKey, setAiKeyState] = useState<string>("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!key) return;
    try {
      const v = localStorage.getItem(key);
      setAiKeyState(v ?? "");
    } catch {
      setAiKeyState("");
    } finally {
      setHydrated(true);
    }
  }, [key]);

  function setAiKey(next: string) {
    const v = next.trim();
    setAiKeyState(v);
    if (!key) return;
    try {
      if (!v) localStorage.removeItem(key);
      else localStorage.setItem(key, v);
    } catch {
      // ignore
    }
  }

  function useDefaultKey() {
    setAiKey(DEFAULT_GEMINI_API_KEY);
  }

  function clearAiKey() {
    setAiKey("");
  }

  return {
    aiKey,
    hydrated,
    hasKey: Boolean(aiKey.trim()),
    setAiKey,
    clearAiKey,
    useDefaultKey,
  };
}


