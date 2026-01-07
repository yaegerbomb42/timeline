import { format } from "date-fns";

import type { MonthIndex } from "@/lib/ai/monthIndex";
import type { Chat } from "@/lib/chats";

function clampText(s: string, maxChars: number) {
  const t = s.trim();
  if (t.length <= maxChars) return t;
  return t.slice(0, Math.max(0, maxChars - 1)).trimEnd() + "…";
}

export function buildTimelineContext({
  months,
  chats,
  maxChars = 24000,
}: {
  months: MonthIndex[];
  chats: Chat[];
  maxChars?: number;
}) {
  const totalEntries = chats.length;
  const oldest = chats[chats.length - 1]?.createdAt;
  const newest = chats[0]?.createdAt;
  const range =
    oldest && newest ? `${format(oldest, "PPP")} → ${format(newest, "PPP")}` : "No entries yet";

  const recent = chats.slice(0, 18);

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
      return `${i + 1}. [${when}] ${body}`;
    })
    .join("\n");

  const context = `
You are “The Librarian”—an eloquent, calm assistant. No hype, no neon. Warm, precise.
You answer ONLY using the user's timeline context below. If asked to “find X”, suggest using local search; if asked for synthesis (“tell me about July”), summarize themes + standout days + gentle insights.

TIMELINE RANGE: ${range}
TOTAL ENTRIES: ${totalEntries}

MONTH INDEX (condensed):
${[monthLines, olderLine].filter(Boolean).join("\n")}

RECENT ENTRIES (verbatim):
${recentLines}
`.trim();

  return clampText(context, maxChars);
}


