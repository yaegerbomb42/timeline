import { format } from "date-fns";

import type { MonthIndex } from "@/lib/ai/monthIndex";
import type { Chat } from "@/lib/chats";

function clampText(s: string, maxChars: number) {
  const t = s.trim();
  if (t.length <= maxChars) return t;
  return t.slice(0, Math.max(0, maxChars - 1)).trimEnd() + "…";
}

/**
 * Build a summary of entries matching a filter
 * Used for targeted queries like "days above 80"
 */
export function buildFilteredSummary(chats: Chat[], filterFn: (chat: Chat) => boolean): string {
  const filtered = chats.filter(filterFn);
  
  if (filtered.length === 0) {
    return "No entries match the filter criteria.";
  }
  
  const sortedByDate = [...filtered].sort((a, b) => b.createdAtMs - a.createdAtMs);
  const summary = sortedByDate
    .slice(0, 50) // Limit to 50 entries to avoid context overflow
    .map((c, i) => {
      const when = format(c.createdAt, "PPP");
      const body = clampText(c.text, 300);
      const mood = c.moodAnalysis ? ` [Mood: ${c.moodAnalysis.rating}/100 ${c.moodAnalysis.emoji}]` : '';
      return `${i + 1}. [${when}]${mood} ${body}`;
    })
    .join("\n");
  
  return `Found ${filtered.length} matching entries. Showing ${Math.min(50, filtered.length)} most recent:\n${summary}`;
}

export function buildTimelineContext({
  months,
  chats,
  maxChars = 32000,
}: {
  months: MonthIndex[];
  chats: Chat[];
  maxChars?: number;
}) {
  const ordered = [...chats].sort((a, b) => b.createdAtMs - a.createdAtMs);
  const totalEntries = ordered.length;
  const oldest = ordered[ordered.length - 1]?.createdAt;
  const newest = ordered[0]?.createdAt;
  const newestDayKey = ordered[0]?.dayKey;
  const range =
    oldest && newest ? `${format(oldest, "PPP")} → ${format(newest, "PPP")}` : "No entries yet";

  // Calculate mood statistics
  const moodStats = {
    high: ordered.filter(c => c.moodAnalysis && c.moodAnalysis.rating >= 80).length,
    good: ordered.filter(c => c.moodAnalysis && c.moodAnalysis.rating >= 60 && c.moodAnalysis.rating < 80).length,
    neutral: ordered.filter(c => c.moodAnalysis && c.moodAnalysis.rating >= 40 && c.moodAnalysis.rating < 60).length,
    low: ordered.filter(c => c.moodAnalysis && c.moodAnalysis.rating < 40).length,
  };

  const recent = ordered.slice(0, 30);
  const recentDaySummary = (() => {
    const dayMap = new Map<string, { date: Date; count: number }>();
    for (const c of recent) {
      const existing = dayMap.get(c.dayKey);
      if (existing) {
        existing.count += 1;
      } else {
        dayMap.set(c.dayKey, { date: c.createdAt, count: 1 });
      }
    }
    return [...dayMap.entries()]
      .sort((a, b) => b[1].date.getTime() - a[1].date.getTime())
      .slice(0, 7)
      .map(([dayKey, info]) => `${dayKey} (${info.count} entry${info.count === 1 ? "" : "ies"})`)
      .join(" | ");
  })();

  const monthLines = months
    .slice(0, 24)
    .map((m) => {
      const sample = m.samples
        .slice(0, 5)
        .map((s) => `"${clampText(s, 140)}"`)
        .join(" | ");
      return `- ${m.monthKey}: ${m.count} entr${m.count === 1 ? "y" : "ies"}${
        sample ? ` — ${sample}` : ""
      }`;
    })
    .join("\n");

  const olderMonths = months.slice(24);
  const olderCount = olderMonths.reduce((acc, m) => acc + (m.count || 0), 0);
  const olderLine =
    olderMonths.length > 0 ? `- Earlier: ${olderCount} entries across ${olderMonths.length} months` : "";

  const recentLines = recent
    .map((c, i) => {
      const when = format(c.createdAt, "PPP p");
      const body = clampText(c.text, 700);
      const mood = c.moodAnalysis ? ` [Mood: ${c.moodAnalysis.rating}/100 ${c.moodAnalysis.emoji}]` : '';
      return `${i + 1}. [${when}]${mood} ${body}`;
    })
    .join("\n");

  const context = `
You are “The Librarian”—an eloquent, calm assistant. No hype, no neon. Warm, precise.
You answer ONLY using the user's timeline context below. If asked to “find X”, suggest using local search; if asked for synthesis (“tell me about July”), summarize themes + standout days + gentle insights.

TIMELINE RANGE: ${range}
TOTAL ENTRIES: ${totalEntries}
MOST RECENT DAY: ${newestDayKey ?? "Unknown"}

MOOD DISTRIBUTION:
- High mood (80-100): ${moodStats.high} entries
- Good mood (60-79): ${moodStats.good} entries
- Neutral (40-59): ${moodStats.neutral} entries
- Low mood (1-39): ${moodStats.low} entries
RECENT DAY COUNTS: ${recentDaySummary || "No recent entries"}

MONTH INDEX (condensed):
${[monthLines, olderLine].filter(Boolean).join("\n")}

RECENT ENTRIES (verbatim):
${recentLines}
`.trim();

  return clampText(context, maxChars);
}

