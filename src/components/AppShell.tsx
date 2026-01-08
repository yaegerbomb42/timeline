"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown01, ArrowUp10, LogOut, UserCircle2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { AuthCard } from "@/components/AuthCard";
import { AiPanel } from "@/components/AiPanel";
import { ChatComposer } from "@/components/ChatComposer";
import { ChatFeed } from "@/components/ChatFeed";
import { StatsBar } from "@/components/StatsBar";
import { TimelineBar } from "@/components/TimelineBar";
import { useAuth } from "@/lib/auth/AuthContext";
import { addChat, deleteChat, useChats } from "@/lib/chats";
import { useEngagementStats } from "@/lib/useEngagementStats";
import { cn } from "@/lib/utils";

export function AppShell() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { chats, groupedByDay, loading: chatsLoading, error } = useChats(user?.uid);
  const [sending, setSending] = useState(false);
  const [sortMode, setSortMode] = useState<"newest" | "oldest">("newest");
  const newestChatId = chats[0]?.id;
  const [highlightChatId, setHighlightChatId] = useState<string | null>(null);
  const [flight, setFlight] = useState<
    | null
    | {
        id: number;
        startX: number;
        startY: number;
        midX: number;
        midY: number;
        endX: number;
        endY: number;
      }
  >(null);
  const timelineCardRef = useRef<HTMLElement | null>(null);
  const stats = useEngagementStats(user?.email ?? user?.uid ?? null);

  useEffect(() => {
    if (!highlightChatId) return;
    const t = window.setTimeout(() => setHighlightChatId(null), 1300);
    return () => window.clearTimeout(t);
  }, [highlightChatId]);

  const sortedChats = [...chats].sort((a, b) =>
    sortMode === "newest" ? b.createdAtMs - a.createdAtMs : a.createdAtMs - b.createdAtMs,
  );

  const statsSnapshot = useMemo(() => {
    const totalEntries = chats.length;
    const dayKeys = [...new Set(chats.map((c) => c.dayKey))].sort();
    const totalDays = dayKeys.length;
    const streak = (() => {
      if (dayKeys.length === 0) return 0;
      const today = new Date();
      const daySet = new Set(dayKeys);
      let s = 0;
      for (let i = 0; ; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        if (daySet.has(key)) s += 1;
        else break;
      }
      return s;
    })();
    return { totalEntries, totalDays, streakDays: streak, engagement: stats.pretty };
  }, [chats, stats.pretty]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-sm text-[color:var(--muted)]">Loading…</div>
      </div>
    );
  }

  if (!user) return <AuthCard />;

  return (
    <div className="min-h-screen px-6 py-10">
      <AnimatePresence>
        {flight ? (
          <motion.div
            key={flight.id}
            className="fixed left-0 top-0 z-50 h-3 w-3 rounded-full bg-[color:var(--brass-2)] shadow-[0_12px_30px_rgba(176,141,87,0.35)]"
            initial={{
              x: flight.startX,
              y: flight.startY,
              opacity: 0,
              scale: 0.6,
            }}
            animate={{
              x: [flight.startX, flight.midX, flight.endX],
              y: [flight.startY, flight.midY, flight.endY],
              opacity: [0, 1, 1, 0],
              scale: [0.6, 1.15, 0.85],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            onAnimationComplete={() => setFlight(null)}
          />
        ) : null}
      </AnimatePresence>

      <div className="mx-auto w-full max-w-6xl">
        <header className="flex items-start justify-between gap-6">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="font-serif text-4xl tracking-tight text-[color:var(--ink)]"
            >
              Timeline
            </motion.h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[color:var(--muted)]">
              A time‑bound story of your life—written in small honest sentences. No neon. Just ink.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-white/50 px-3 py-2">
              <UserCircle2 className="h-4 w-4 text-[color:var(--brass-2)]" />
              <div className="font-sans text-xs text-[color:var(--ink)]">
                {user.email ?? user.displayName ?? "Signed in"}
              </div>
            </div>
            <button
              onClick={() => void signOut()}
              className={cn(
                "inline-flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-white/60 px-3 py-2",
                "font-sans text-xs text-[color:var(--ink)] hover:bg-white/80 transition-colors",
              )}
            >
              <LogOut className="h-4 w-4 text-[color:var(--muted)]" />
              Sign out
            </button>
          </div>
        </header>

        {/* Composer + stats */}
        <div className="mt-8 flex flex-col items-center gap-4">
          <div className="w-full max-w-3xl">
            <ChatComposer
              disabled={sending}
              onSendStart={(start) => {
                const startX = start.left + start.width / 2;
                const startY = start.top + start.height / 2;
                const target = timelineCardRef.current?.getBoundingClientRect();
                const endX = target ? target.right - 56 : startX;
                const endY = target ? target.top + target.height - 82 : startY - 120;
                const midX = (startX + endX) / 2 + 60;
                const midY = Math.min(startY, endY) - 130;
                setFlight({ id: Date.now(), startX, startY, midX, midY, endX, endY });
              }}
              onSend={async (text) => {
                if (!user?.uid) return;
                setSending(true);
                try {
                  const id = await addChat(user.uid, text);
                  setHighlightChatId(id);
                } finally {
                  setSending(false);
                }
              }}
            />
          </div>
          <div className="w-full">
            <StatsBar stats={statsSnapshot} />
          </div>
        </div>

        {/* Timeline bar */}
        <section
          ref={timelineCardRef}
          className="mt-6 rounded-3xl border border-[var(--line)] bg-white/45 backdrop-blur-sm shadow-[0_14px_50px_var(--shadow)] overflow-hidden"
        >
          <div className="px-6 pt-6 pb-4 border-b border-[var(--line)]">
            <div className="font-sans text-sm text-[color:var(--ink)]">Your line</div>
            <div className="mt-1 text-xs text-[color:var(--muted)]">
              {groupedByDay.size === 0
                ? "No marks yet."
                : `${groupedByDay.size} day${groupedByDay.size === 1 ? "" : "s"} recorded.`}
            </div>
          </div>
          <TimelineBar
            groupedByDay={groupedByDay}
            newestChatId={newestChatId}
            highlightChatId={highlightChatId}
            onSelectChat={(id) => {
              const el = document.getElementById(`chat-${id}`);
              el?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
          />
        </section>

        {/* Feed + AI + sort */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <ChatFeed
            chats={sortedChats}
            loading={chatsLoading}
            error={error}
            highlightChatId={highlightChatId}
            onDelete={async (id) => {
              if (!user?.uid) return;
              await deleteChat(user.uid, id);
            }}
          />
          <div className="space-y-4">
            <div className="rounded-3xl border border-[var(--line)] bg-white/60 px-4 py-3 shadow-[0_12px_40px_var(--shadow)]">
              <div className="flex items-center justify-between text-xs text-[color:var(--muted)] font-sans">
                <div className="inline-flex items-center gap-2">
                  <span>Sort entries</span>
                </div>
                <div className="inline-flex gap-2">
                  <SortButton label="Newest" active={sortMode === "newest"} onClick={() => setSortMode("newest")} />
                  <SortButton label="Oldest" active={sortMode === "oldest"} onClick={() => setSortMode("oldest")} />
                </div>
              </div>
            </div>
            <AiPanel uid={user.uid} identity={user.email ?? user.uid} chats={chats} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white/60 px-3 py-2 shadow-[0_6px_24px_var(--shadow)]">
      <div className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--muted)] font-sans">{label}</div>
      <div className="mt-1 text-lg font-serif text-[color:var(--ink)]">{value}</div>
    </div>
  );
}

function SortButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-xl px-3 py-1 text-[11px] font-sans border",
        active
          ? "border-[color:var(--brass-2)] bg-[rgba(176,141,87,0.1)] text-[color:var(--ink)]"
          : "border-[var(--line)] text-[color:var(--muted)] hover:text-[color:var(--ink)]",
      )}
    >
      {label}
    </button>
  );
}


