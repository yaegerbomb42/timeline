"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const TICK_MS = 5000;

function storageKey(id: string) {
  return `timeline.engagement.v1:${id}`;
}

export function useEngagementStats(identity?: string | null) {
  const [seconds, setSeconds] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!identity) return;
    const key = storageKey(identity);
    try {
      const raw = localStorage.getItem(key);
      if (raw) setSeconds(Number(raw) || 0);
    } catch {
      // ignore
    }
    setLoaded(true);
    timer.current = setInterval(() => {
      setSeconds((s) => {
        const next = s + TICK_MS / 1000;
        try {
          localStorage.setItem(key, String(next));
        } catch {
          // ignore
        }
        return next;
      });
    }, TICK_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [identity]);

  const pretty = useMemo(() => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const parts = [];
    if (hrs) parts.push(`${hrs}h`);
    if (mins || hrs) parts.push(`${mins}m`);
    parts.push(`${secs}s`);
    return parts.join(" ");
  }, [seconds]);

  return { loaded, seconds, pretty };
}


