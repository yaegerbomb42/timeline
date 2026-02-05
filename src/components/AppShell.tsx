"use client";

import type { User } from "firebase/auth";
import { AnimatePresence, motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { ArrowDown01, LogOut, UserCircle2, Sparkles, Zap, Upload, Undo2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { AuthCard } from "@/components/AuthCard";
import { AiPanel } from "@/components/AiPanel";
import { ChatComposer } from "@/components/ChatComposer";
import { TimelineLog } from "@/components/TimelineLog";
import { StatsBar } from "@/components/StatsBar";
import { TimelineBar } from "@/components/TimelineBar";
import { BatchImportModal } from "@/components/BatchImportModal";
import { UndoBatchModal } from "@/components/UndoBatchModal";
import { useAuth } from "@/lib/auth/AuthContext";
import { addChat, deleteChat, useChats } from "@/lib/chats";
import { useEngagementStats } from "@/lib/useEngagementStats";
import { cn } from "@/lib/utils";

// Animated background particles
function FloatingParticles() {
  const [particles] = useState(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 10 + Math.random() * 10,
      width: Math.random() * 4 + 2,
      height: Math.random() * 4 + 2,
      opacity: 0.3 + Math.random() * 0.4,
      blur: Math.random() * 10 + 5,
      xMovement: Math.random() * 20 - 10,
    }))
  );

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.width,
            height: p.height,
            background: `radial-gradient(circle, rgba(0, 245, 255, ${p.opacity}), transparent)`,
            boxShadow: `0 0 ${p.blur}px rgba(0, 245, 255, 0.5)`,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, p.xMovement, 0],
            opacity: [0.3, 1, 0.3],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

// Parallax header with depth
function ParallaxHeader({ 
  scrollY, 
  user, 
  signOut, 
  isGuest, 
  isAdmin,
  onBatchImport,
  onUndoBatch,
}: { 
  scrollY: MotionValue<number>; 
  user: User | null; 
  signOut: () => void;
  isGuest: boolean;
  isAdmin: boolean;
  onBatchImport: () => void;
  onUndoBatch: () => void;
}) {
  const headerY = useTransform(scrollY, [0, 300], [0, -50]);
  const headerOpacity = useTransform(scrollY, [0, 200], [1, 0.7]);
  const headerScale = useTransform(scrollY, [0, 200], [1, 0.95]);

  return (
    <motion.header
      style={{ y: headerY, opacity: headerOpacity, scale: headerScale }}
      className="relative flex items-start justify-between gap-6 mb-12"
    >
      <div className="relative z-10">
        <motion.h1
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative font-book text-6xl md:text-7xl font-bold tracking-tight"
        >
          <span className="bg-gradient-to-r from-[var(--neon-cyan)] via-[var(--neon-purple)] to-[var(--neon-pink)] bg-clip-text text-transparent animate-pulse">
            Timeline
          </span>
          <motion.div
            className="absolute -inset-4 bg-gradient-to-r from-[var(--glow-cyan)] via-[var(--glow-purple)] to-[var(--glow-pink)] opacity-20 blur-3xl -z-10"
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.2, 0.3, 0.2],
            }}
            transition={{ duration: 3, repeat: Infinity }}
          />
        </motion.h1>

      </div>

      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="flex items-center gap-3 flex-wrap justify-end"
      >
        {/* Batch Import Button (admin only) */}
        {!isGuest && user && (
          <>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onBatchImport}
              className={cn(
                "inline-flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--bg-elevated)]/80 backdrop-blur-xl px-4 py-2.5",
                "font-sans text-sm text-[var(--neon-cyan)] hover:bg-[var(--bg-elevated)] transition-all duration-200",
                "shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:shadow-[0_12px_40px_rgba(0,245,255,0.4)]",
                "hover:border-[var(--neon-cyan)]"
              )}
            >
              <Upload className="h-4 w-4" />
              Batch Import
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onUndoBatch}
              className={cn(
                "inline-flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--bg-elevated)]/80 backdrop-blur-xl px-4 py-2.5",
                "font-sans text-sm text-[var(--neon-pink)] hover:bg-[var(--bg-elevated)] transition-all duration-200",
                "shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:shadow-[0_12px_40px_rgba(255,0,110,0.4)]",
                "hover:border-[var(--neon-pink)]"
              )}
            >
              <Undo2 className="h-4 w-4" />
              Undo Batch
            </motion.button>
          </>
        )}

        <motion.div
          whileHover={{ scale: 1.05 }}
          className="hidden sm:flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--bg-elevated)]/80 backdrop-blur-xl px-4 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
        >
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <UserCircle2 className="h-5 w-5 text-[var(--neon-cyan)]" />
          </motion.div>
          <div className="font-sans text-sm text-[var(--text-primary)] font-medium">
            {isGuest ? "Guest (View Only)" : user?.email ?? user?.displayName ?? "Signed in"}
          </div>
        </motion.div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => void signOut()}
          className={cn(
            "inline-flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--bg-elevated)]/80 backdrop-blur-xl px-4 py-2.5",
            "font-sans text-sm text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-all duration-200",
            "shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:shadow-[0_12px_40px_rgba(131,56,236,0.4)]",
            "hover:border-[var(--neon-purple)]"
          )}
        >
          <LogOut className="h-4 w-4 text-[var(--text-secondary)]" />
          Sign out
        </motion.button>
      </motion.div>
    </motion.header>
  );
}

export function AppShell() {
  const { user, loading: authLoading, signOut, isGuest, isAdmin } = useAuth();
  const { chats, groupedByDay, loading: chatsLoading, error } = useChats(user?.uid);
  const [sending, setSending] = useState(false);
  const [sortMode, setSortMode] = useState<"newest" | "oldest">("newest");
  const newestChatId = chats[0]?.id;
  const [highlightChatId, setHighlightChatId] = useState<string | null>(null);
  const [showBatchImport, setShowBatchImport] = useState(false);
  const [showUndoBatch, setShowUndoBatch] = useState(false);
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
  const { scrollY } = useScroll();

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
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-lg font-book text-[var(--neon-cyan)] flex items-center gap-3"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Zap className="h-5 w-5" />
          </motion.div>
          Loading…
        </motion.div>
      </div>
    );
  }

  if (!user && !isGuest) return <AuthCard />;

  return (
    <div className="min-h-screen px-6 py-10 relative overflow-hidden">
      <FloatingParticles />
      
      {/* Batch Import Modal */}
      <AnimatePresence>
        {showBatchImport && user?.uid && (
          <BatchImportModal
            uid={user.uid}
            onClose={() => setShowBatchImport(false)}
          />
        )}
      </AnimatePresence>

      {/* Undo Batch Modal */}
      <AnimatePresence>
        {showUndoBatch && user?.uid && (
          <UndoBatchModal
            uid={user.uid}
            onClose={() => setShowUndoBatch(false)}
          />
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {flight ? (
          <motion.div
            key={flight.id}
            className="fixed left-0 top-0 z-50 h-4 w-4 rounded-full"
            style={{
              background: "radial-gradient(circle, var(--neon-cyan), var(--neon-purple))",
              boxShadow: "0 0 30px var(--glow-cyan), 0 0 60px var(--glow-purple)",
            }}
            initial={{
              x: flight.startX,
              y: flight.startY,
              opacity: 0,
              scale: 0.3,
            }}
            animate={{
              x: [flight.startX, flight.midX, flight.endX],
              y: [flight.startY, flight.midY, flight.endY],
              opacity: [0, 1, 1, 0],
              scale: [0.3, 1.5, 0.8],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            onAnimationComplete={() => setFlight(null)}
          />
        ) : null}
      </AnimatePresence>

      <div className="mx-auto w-full max-w-7xl relative z-10">
        <ParallaxHeader 
          scrollY={scrollY} 
          user={user} 
          signOut={signOut} 
          isGuest={isGuest}
          isAdmin={isAdmin}
          onBatchImport={() => setShowBatchImport(true)}
          onUndoBatch={() => setShowUndoBatch(true)}
        />

        {/* Composer + stats with breathing effect - Hidden for guest mode */}
        {!isGuest && (
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="flex flex-col items-center gap-6 mb-12"
          >
            <motion.div
              animate={{
                scale: [1, 1.01, 1],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="w-full max-w-4xl"
            >
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
              onSend={async (text, imageFile) => {
                if (!user?.uid) return;
                setSending(true);
                try {
                  const id = await addChat(user.uid, text, imageFile);
                  setHighlightChatId(id);
                } finally {
                  setSending(false);
                }
              }}
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="w-full"
            >
              <StatsBar stats={statsSnapshot} />
            </motion.div>
          </motion.section>
        )}
      </div>

      {/* Full-width timeline bar breaking out of container */}
      <div className="mx-auto w-full relative z-10 mb-12">
        {/* Timeline bar with 3D depth */}
        <motion.section
          ref={timelineCardRef}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="relative rounded-3xl border border-[var(--line)] bg-[var(--bg-elevated)]/60 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden mx-6"
          style={{
            boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(131,56,236,0.2) inset",
          }}
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-[var(--glow-purple)]/10 via-transparent to-[var(--glow-cyan)]/10"
            animate={{
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          <div className="relative px-6 pt-6 pb-4 border-b border-[var(--line)]">
            <div className="flex items-center gap-2 text-[var(--text-primary)]">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="h-5 w-5 text-[var(--neon-cyan)]" />
              </motion.div>
              <div className="font-sans text-base font-semibold">Your timeline</div>
            </div>
            <div className="mt-2 text-sm text-[var(--text-secondary)]">
              {groupedByDay.size === 0
                ? "No marks yet. Start writing to see your story unfold."
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
        </motion.section>
      </div>

      <div className="mx-auto w-full max-w-7xl relative z-10">
        {/* Feed + AI + sort with fluid grid */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.8 }}
          className="grid grid-cols-1 gap-8 lg:grid-cols-[1.2fr_0.8fr]"
        >
          <motion.div
            animate={{
              y: [0, -5, 0],
            }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          >
            <TimelineLog
              chats={sortedChats}
              loading={chatsLoading}
              error={error}
              highlightChatId={highlightChatId}
              onDelete={isGuest ? undefined : async (id) => {
                if (!user?.uid) return;
                await deleteChat(user.uid, id);
              }}
            />
          </motion.div>
          <div className="space-y-6">
            <motion.div
              whileHover={{ scale: 1.02, y: -4 }}
              className="rounded-3xl border border-[var(--line)] bg-[var(--bg-elevated)]/60 backdrop-blur-2xl px-5 py-4 shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
              style={{
                boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 30px rgba(0,245,255,0.1) inset",
              }}
            >
              <div className="flex items-center justify-between text-sm text-[var(--text-secondary)] font-sans">
                <div className="inline-flex items-center gap-2">
                  <ArrowDown01 className="h-4 w-4 text-[var(--neon-purple)]" />
                  <span>Sort entries</span>
                </div>
                <div className="inline-flex gap-2">
                  <SortButton
                    label="Newest"
                    active={sortMode === "newest"}
                    onClick={() => setSortMode("newest")}
                  />
                  <SortButton
                    label="Oldest"
                    active={sortMode === "oldest"}
                    onClick={() => setSortMode("oldest")}
                  />
                </div>
              </div>
            </motion.div>
            <motion.div
              animate={{
                y: [0, 5, 0],
              }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            >
              {user && <AiPanel uid={user.uid} chats={chats} />}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function SortButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "rounded-xl px-4 py-2 text-xs font-sans border transition-all duration-200",
        active
          ? "border-[var(--neon-purple)] bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-[0_0_20px_var(--glow-purple)]"
          : "border-[var(--line)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--neon-cyan)]",
      )}
    >
      {label}
    </motion.button>
  );
}
