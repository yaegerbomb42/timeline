"use client";

import { Flame, Hourglass, ListChecks } from "lucide-react";

export type StatsSnapshot = {
  totalEntries: number;
  totalDays: number;
  streakDays: number;
  engagement: string;
};

export function StatsBar({ stats }: { stats: StatsSnapshot }) {
  const items = [
    {
      icon: <ListChecks className="h-4 w-4 text-[color:var(--brass-2)]" />,
      label: "Entries",
      value: stats.totalEntries.toLocaleString(),
    },
    {
      icon: <Flame className="h-4 w-4 text-[color:var(--brass-2)]" />,
      label: "Day streak",
      value: `${stats.streakDays}d`,
    },
    {
      icon: <Hourglass className="h-4 w-4 text-[color:var(--brass-2)]" />,
      label: "Unique days",
      value: stats.totalDays.toLocaleString(),
    },
    {
      icon: <Hourglass className="h-4 w-4 text-[color:var(--brass-2)]" />,
      label: "Time here",
      value: stats.engagement,
    },
  ];
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-[var(--line)] bg-white/60 px-4 py-3 shadow-[0_12px_40px_var(--shadow)]">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-white/60 px-3 py-2">
          {item.icon}
          <div className="text-xs text-[color:var(--muted)]">{item.label}</div>
          <div className="font-mono text-sm text-[color:var(--ink)]">{item.value}</div>
        </div>
      ))}
    </div>
  );
}


