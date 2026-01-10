"use client";

import { motion } from "framer-motion";
import { Flame, Hourglass, ListChecks, Zap } from "lucide-react";

export type StatsSnapshot = {
  totalEntries: number;
  totalDays: number;
  streakDays: number;
  engagement: string;
};

export function StatsBar({ stats }: { stats: StatsSnapshot }) {
  const items = [
    {
      icon: <ListChecks className="h-5 w-5" />,
      label: "Entries",
      value: stats.totalEntries.toLocaleString(),
      color: "var(--neon-cyan)",
      glow: "var(--glow-cyan)",
    },
    {
      icon: <Flame className="h-5 w-5" />,
      label: "Day streak",
      value: `${stats.streakDays}d`,
      color: "var(--neon-pink)",
      glow: "var(--glow-pink)",
    },
    {
      icon: <Hourglass className="h-5 w-5" />,
      label: "Unique days",
      value: stats.totalDays.toLocaleString(),
      color: "var(--neon-purple)",
      glow: "var(--glow-purple)",
    },
    {
      icon: <Zap className="h-5 w-5" />,
      label: "Time here",
      value: stats.engagement,
      color: "var(--neon-cyan)",
      glow: "var(--glow-cyan)",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="flex flex-wrap items-center gap-4 rounded-3xl border border-[var(--line)] bg-[var(--bg-elevated)]/70 backdrop-blur-2xl px-5 py-4 shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
      style={{
        boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 30px rgba(0,245,255,0.1) inset",
      }}
    >
      {items.map((item, idx) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: idx * 0.1, duration: 0.5 }}
          whileHover={{ scale: 1.05, y: -4 }}
          className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--bg-surface)]/60 backdrop-blur-xl px-4 py-3 transition-all"
          style={{
            boxShadow: `0 8px 32px rgba(0,0,0,0.3), 0 0 20px ${item.glow}`,
          }}
        >
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            style={{ color: item.color }}
          >
            {item.icon}
          </motion.div>
          <div>
            <div className="text-xs text-[var(--text-secondary)] font-sans uppercase tracking-wider">
              {item.label}
            </div>
            <div
              className="font-mono text-lg font-bold mt-1"
              style={{
                color: item.color,
                textShadow: `0 0 10px ${item.glow}`,
              }}
            >
              {item.value}
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
