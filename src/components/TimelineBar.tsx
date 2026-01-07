"use client";

import { format, parse } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays } from "lucide-react";
import { useEffect, useMemo } from "react";

import type { Chat } from "@/lib/chats";
import { useElementSize } from "@/lib/hooks/useElementSize";
import { cn } from "@/lib/utils";

type DayBucket = {
  dayKey: string; // yyyy-MM-dd
  date: Date;
  chats: Chat[];
};

function isValidDayKey(dayKey: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dayKey);
}

export function TimelineBar({
  groupedByDay,
  newestChatId,
  highlightChatId,
  onSelectChat,
}: {
  groupedByDay: Map<string, Chat[]>;
  newestChatId?: string;
  highlightChatId?: string | null;
  onSelectChat?: (chatId: string) => void;
}) {
  const viewport = useElementSize<HTMLDivElement>();

  const days = useMemo<DayBucket[]>(() => {
    const entries = [...groupedByDay.entries()]
      .filter(([dayKey]) => isValidDayKey(dayKey))
      .map(([dayKey, chats]) => ({
        dayKey,
        date: parse(dayKey, "yyyy-MM-dd", new Date()),
        chats: [...chats].sort((a, b) => a.createdAtMs - b.createdAtMs),
      }));
    entries.sort((a, b) => a.dayKey.localeCompare(b.dayKey));
    return entries;
  }, [groupedByDay]);

  const { slotWidth, trackWidth, scrollable, labelStride } = useMemo(() => {
    const width = viewport.width || 0;
    const count = days.length || 1;
    const minSlot = 14;
    const maxSlot = 64;
    const ideal = width > 0 ? width / count : minSlot;
    const slot = Math.max(minSlot, Math.min(maxSlot, ideal));
    const track = slot * count;
    const canScroll = width > 0 ? track > width + 1 : false;
    const stride = Math.max(1, Math.ceil(86 / slot));
    return { slotWidth: slot, trackWidth: track, scrollable: canScroll, labelStride: stride };
  }, [viewport.width, days.length]);

  // Auto-scroll to the newest side when the line overflows.
  useEffect(() => {
    if (!scrollable) return;
    const el = viewport.ref.current;
    if (!el) return;
    el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
  }, [scrollable, newestChatId, viewport.ref]);

  const rangeLabel = useMemo(() => {
    if (days.length === 0) return "No entries yet";
    const a = days[0]!.date;
    const b = days[days.length - 1]!.date;
    if (format(a, "yyyy-MM") === format(b, "yyyy-MM")) return format(a, "LLLL yyyy");
    return `${format(a, "LLL yyyy")} → ${format(b, "LLL yyyy")}`;
  }, [days]);

  const maxMarks = slotWidth < 18 ? 4 : slotWidth < 26 ? 6 : 10;

  return (
    <div className="px-6 py-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-[color:var(--muted)] font-mono">
          <CalendarDays className="h-3.5 w-3.5 opacity-70" />
          <span>{rangeLabel}</span>
        </div>
        <div className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--muted)] font-sans">
          {days.length === 0 ? "" : `${days.length} day${days.length === 1 ? "" : "s"}`}
        </div>
      </div>

      <div
        ref={viewport.ref}
        className={cn(
          "mt-4 rounded-2xl border border-[var(--line)] bg-white/55",
          "overflow-x-auto overscroll-x-contain",
          scrollable ? "pb-2" : "",
        )}
      >
        <div
          className="relative h-[120px]"
          style={{
            width: trackWidth,
            minWidth: "100%",
          }}
        >
          {/* Baseline */}
          <div className="absolute left-0 right-0 bottom-7 h-px bg-[var(--line)]" />
          <div className="absolute left-0 right-0 bottom-7 h-px bg-[linear-gradient(90deg,transparent,rgba(176,141,87,0.35),transparent)] opacity-60" />

          <div className="flex h-full items-end">
            {days.map((day, idx) => {
              const prevMonth = idx > 0 ? format(days[idx - 1]!.date, "yyyy-MM") : null;
              const thisMonth = format(day.date, "yyyy-MM");
              const isNewMonth = prevMonth !== thisMonth;

              const showDayLabel =
                idx === 0 ||
                idx === days.length - 1 ||
                idx % labelStride === 0 ||
                isNewMonth;

              const marks = day.chats.slice(0, maxMarks);
              const extra = day.chats.length - marks.length;

              return (
                <div
                  key={day.dayKey}
                  className="relative h-full"
                  style={{ width: slotWidth, flex: `0 0 ${slotWidth}px` }}
                >
                  {/* Month label */}
                  {isNewMonth ? (
                    <div className="absolute left-1/2 -translate-x-1/2 top-2 text-[10px] font-sans tracking-[0.18em] uppercase text-[color:var(--muted)] whitespace-nowrap">
                      {format(day.date, "LLL")}
                    </div>
                  ) : null}

                  {/* Tick */}
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-7 h-2 w-px bg-[var(--line)]" />

                  {/* Marks stack */}
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-9 flex flex-col items-center gap-[5px] pb-2">
                    <AnimatePresence initial={false}>
                      {marks.map((c) => (
                        <motion.button
                          key={c.id}
                          type="button"
                          onClick={() => onSelectChat?.(c.id)}
                          title={`${format(c.createdAt, "PPP p")}\n\n${c.excerpt}`}
                          initial={{ opacity: 0, scale: 0.7, y: 6 }}
                          animate={{
                            opacity: 1,
                            scale: 1,
                            y: 0,
                            boxShadow:
                              c.id === highlightChatId
                                ? [
                                    "0 0 0 0px rgba(176,141,87,0)",
                                    "0 0 0 10px rgba(176,141,87,0.20)",
                                    "0 0 0 6px rgba(176,141,87,0.14)",
                                    "0 0 0 0px rgba(176,141,87,0)",
                                  ]
                                : "0 0 0 0px rgba(176,141,87,0)",
                          }}
                          exit={{ opacity: 0, scale: 0.7, y: 6 }}
                          transition={{
                            duration: c.id === highlightChatId ? 1.2 : 0.35,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                          className={cn(
                            "h-[7px] w-[7px] rounded-full",
                            "bg-[color:var(--ink)]/70 hover:bg-[color:var(--ink)]",
                            "focus:outline-none focus:ring-4 focus:ring-[var(--ring)]",
                            c.id === newestChatId ? "bg-[color:var(--brass-2)]" : "",
                          )}
                        />
                      ))}
                    </AnimatePresence>

                    {extra > 0 ? (
                      <div className="text-[10px] font-mono text-[color:var(--muted)] select-none">
                        +{extra}
                      </div>
                    ) : null}
                  </div>

                  {/* Day label */}
                  {showDayLabel ? (
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-1 text-[10px] font-mono text-[color:var(--muted)] whitespace-nowrap">
                      {format(day.date, "d")}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}


