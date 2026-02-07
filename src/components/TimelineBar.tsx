"use client";

import { format, parse } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, Sparkles } from "lucide-react";
import { useMemo, memo } from "react";

import type { Chat } from "@/lib/chats";
import { useElementSize } from "@/lib/hooks/useElementSize";
import { cn } from "@/lib/utils";
import { getMoodColor } from "@/lib/sentiment";

type DayBucket = {
  dayKey: string; // yyyy-MM-dd
  date: Date;
  chats: Chat[];
};

function isValidDayKey(dayKey: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dayKey);
}

// Glowing dot with rating inside - Memoized for performance
const GlowingDot = memo(function GlowingDot({
  chat,
  isNewest,
  isHighlighted,
  onClick,
  size,
  yOffset,
}: {
  chat: Chat;
  isNewest?: boolean;
  isHighlighted?: boolean;
  onClick?: () => void;
  size: number;
  yOffset: number;
}) {
  const moodColor = chat.moodAnalysis ? getMoodColor(chat.moodAnalysis.mood) : '#00f5ff';
  const moodColorRgba = chat.moodAnalysis 
    ? (chat.moodAnalysis.mood === 'positive' ? 'rgba(0,255,136,0.6)' : 
       chat.moodAnalysis.mood === 'negative' ? 'rgba(255,107,157,0.6)' : 
       'rgba(0,245,255,0.6)')
    : 'rgba(0,245,255,0.6)';
  
  const rating = chat.moodAnalysis?.rating ?? 50;
    
  return (
    <div className="relative group/dot">
      <motion.button
        type="button"
        onClick={onClick}
        aria-label={`${format(chat.createdAt, "MMMM d, yyyy 'at' h:mm a")}${chat.moodAnalysis ? `, Mood: ${chat.moodAnalysis.description}, Rating: ${chat.moodAnalysis.rating} out of 100` : ''}`}
        title={`${format(chat.createdAt, "EEEE, MMMM d, yyyy 'at' h:mm a")}\n\n${chat.excerpt}${chat.moodAnalysis ? `\n\nMood: ${chat.moodAnalysis.emoji} ${chat.moodAnalysis.rating}/100 - ${chat.moodAnalysis.description}\n${chat.moodAnalysis.rationale}` : ''}`}
        initial={{ opacity: 0, scale: 0.3, y: 10 }}
        animate={{
          opacity: 1,
          scale: isHighlighted ? [1, 1.4, 1] : isNewest ? 1.1 : 1,
          y: yOffset,
          boxShadow: isHighlighted
            ? [
                `0 0 0 0px ${moodColorRgba.replace('0.6', '0')}`,
                `0 0 0 18px ${moodColorRgba}`,
                `0 0 0 10px ${moodColorRgba.replace('0.6', '0.4')}`,
                `0 0 0 0px ${moodColorRgba.replace('0.6', '0')}`,
              ]
            : isNewest
              ? `0 0 24px ${moodColorRgba}, 0 0 48px ${moodColorRgba.replace('0.6', '0.4')}`
              : `0 0 12px ${moodColorRgba.replace('0.6', '0.4')}`,
        }}
        exit={{ opacity: 0, scale: 0.3, y: 10 }}
        transition={{
          duration: isHighlighted ? 1.5 : 0.4,
          ease: [0.22, 1, 0.36, 1],
        }}
        whileHover={{ scale: 1.4, y: yOffset - 3 }}
        whileTap={{ scale: 0.9 }}
        className={cn(
          "relative rounded-full cursor-pointer focus:outline-none focus:ring-4 z-10 border-2 flex items-center justify-center",
        )}
        style={{
          width: size,
          height: size,
          background: `radial-gradient(circle, ${moodColor}, ${moodColor}dd)`,
          borderColor: moodColor,
          boxShadow: isNewest 
            ? `0 0 24px ${moodColorRgba}, 0 0 48px ${moodColorRgba.replace('0.6', '0.4')}`
            : `0 0 12px ${moodColorRgba.replace('0.6', '0.4')}`,
        }}
      >
        {/* Rating number inside circle */}
        <span 
          className="text-[9px] font-bold font-mono pointer-events-none"
          style={{
            color: 'rgba(0, 0, 0, 0.8)',
            textShadow: `0 0 2px ${moodColor}`,
          }}
        >
          {rating}
        </span>
        {isNewest && (
          <motion.div
            className="absolute inset-0 rounded-full"
            animate={{
              scale: [1, 1.6, 1],
              opacity: [0.7, 0, 0.7],
            }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              background: `radial-gradient(circle, ${moodColor}, transparent)`,
            }}
          />
        )}
      </motion.button>
    </div>
  );
});

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
  const { ref: viewportRef, width: viewportWidth } = useElementSize<HTMLDivElement>();

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

  const { slotWidth, trackWidth, labelStride } = useMemo(() => {
    const width = viewportWidth || 0;
    const count = days.length || 1;
    
    // Ultra-compact spacing for high-density display
    // Allow elements to be very close together - users will zoom to see detail
    const minSlot = count > 2000 ? 8 : count > 1000 ? 12 : count > 500 ? 16 : 20;
    const maxSlot = 60;
    const ideal = width > 0 ? width / count : minSlot;
    const slot = Math.max(minSlot, Math.min(maxSlot, ideal));
    const track = slot * count;
    
    // Show date labels very sparingly to avoid clutter
    let stride;
    if (count > 2000) {
      stride = Math.max(100, Math.ceil(800 / slot));
    } else if (count > 1000) {
      stride = Math.max(60, Math.ceil(480 / slot));
    } else if (count > 500) {
      stride = Math.max(30, Math.ceil(240 / slot));
    } else if (count > 200) {
      stride = Math.max(15, Math.ceil(120 / slot));
    } else {
      stride = Math.max(5, Math.ceil(60 / slot));
    }
    
    return { slotWidth: slot, trackWidth: track, labelStride: stride };
  }, [viewportWidth, days.length]);

  // No auto-scroll - users can zoom/pan to navigate
  // Removed auto-scroll to newest side to allow users to see full timeline

  const rangeLabel = useMemo(() => {
    if (days.length === 0) return "No entries yet";
    const a = days[0]!.date;
    const b = days[days.length - 1]!.date;
    if (format(a, "yyyy-MM") === format(b, "yyyy-MM")) return format(a, "LLLL yyyy");
    return `${format(a, "LLL yyyy")} → ${format(b, "LLL yyyy")}`;
  }, [days]);

  return (
    <div className="flex h-full flex-col px-6 py-6">
      <div className="flex items-center justify-between gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 text-sm text-[var(--text-secondary)] font-mono"
        >
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <CalendarDays className="h-4 w-4 text-[var(--neon-cyan)]" />
          </motion.div>
          <span className="font-semibold">{rangeLabel}</span>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-xs uppercase tracking-[0.3em] text-[var(--text-secondary)] font-sans flex items-center gap-2"
        >
          {days.length > 0 && (
            <>
              <Sparkles className="h-3 w-3 text-[var(--neon-purple)]" />
              {days.length} day{days.length === 1 ? "" : "s"}
              <span className="text-[10px] opacity-60 ml-2">(pinch to zoom)</span>
            </>
          )}
        </motion.div>
      </div>

      <div
        ref={viewportRef}
        className={cn(
          "mt-4 rounded-2xl border border-[var(--line)] bg-[var(--bg-surface)]/40 backdrop-blur-xl",
          "flex-1",
          "overflow-hidden",
          "shadow-[0_8px_32px_rgba(0,0,0,0.3)]",
        )}
        style={{
          touchAction: 'pan-x pan-y pinch-zoom',
        }}
      >
        <div
          className="relative min-h-[340px] h-full overflow-auto"
          style={{
            width: '100%',
            scrollbarWidth: "thin",
            scrollbarColor: "var(--neon-cyan) var(--bg-surface)",
          }}
        >
          <div
            className="relative h-full"
            style={{
              width: trackWidth,
              minWidth: "100%",
              transformOrigin: 'top left',
            }}
          >
          {/* Roller coaster path connecting the dots */}
          <svg 
            className="absolute inset-0 pointer-events-none" 
            style={{ width: '100%', height: '100%' }}
          >
            <defs>
              <linearGradient id="rollercoaster-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="var(--neon-cyan)" stopOpacity="0.6" />
                <stop offset="50%" stopColor="var(--neon-purple)" stopOpacity="0.6" />
                <stop offset="100%" stopColor="var(--neon-pink)" stopOpacity="0.6" />
              </linearGradient>
            </defs>
            {days.length > 1 && (
              <motion.path
                d={(() => {
                  const points = days.flatMap((day, idx) => {
                    const x = idx * slotWidth + slotWidth / 2;
                    return day.chats.map((chat) => {
                      // Calculate Y position based on mood rating (1-100)
                      // Canvas coordinates: lower Y = top of screen, higher Y = bottom of screen
                      // Rating 1 (sad) -> y=230 (near bottom), Rating 100 (happy) -> y=30 (near top)
                      // This creates the "rollercoaster" effect with happy moments at peaks
                      const rating = chat.moodAnalysis?.rating ?? 50;
                      const y = 230 - ((rating - 1) / 99) * 200;
                      return { x, y };
                    });
                  });
                  
                  if (points.length < 2) return '';
                  
                  // Create smooth cubic Bézier curve through points for flowing line
                  // Improved smoothing with adaptive tension based on distance
                  let path = `M ${points[0]!.x} ${points[0]!.y}`;
                  
                  for (let i = 1; i < points.length; i++) {
                    const prev = points[i - 1]!;
                    const curr = points[i]!;
                    
                    // Calculate control points for smooth curve
                    // Adaptive tension: smoother for close points, tighter for distant points
                    const dx = curr.x - prev.x;
                    const dy = Math.abs(curr.y - prev.y);
                    
                    // Enhanced tension for smoother rollercoaster flow
                    // Higher tension creates more flowing, natural curves
                    let tension = 0.6;
                    
                    // For large vertical changes, use moderate tension for dramatic but smooth swoops
                    if (dy > 50) {
                      tension = 0.5;
                    }
                    
                    // Control point 1 (from previous point)
                    const cp1x = prev.x + dx * tension;
                    const cp1y = prev.y;
                    
                    // Control point 2 (to current point)
                    const cp2x = curr.x - dx * tension;
                    const cp2y = curr.y;
                    
                    // Cubic Bézier curve for smooth rollercoaster flow
                    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
                  }
                  
                  return path;
                })()}
                stroke="url(#rollercoaster-gradient)"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 2, ease: "easeInOut" }}
                style={{
                  filter: 'drop-shadow(0 0 16px var(--glow-cyan)) drop-shadow(0 0 8px var(--glow-purple))',
                }}
              />
            )}
          </svg>

          {/* Animated baseline with gradient */}
          <motion.div
            className="absolute left-0 right-0 bottom-8 h-[2px]"
            style={{
              background: "linear-gradient(90deg, transparent, var(--neon-cyan), var(--neon-purple), var(--neon-pink), transparent)",
              boxShadow: "0 0 10px var(--glow-cyan), 0 0 20px var(--glow-purple)",
            }}
            animate={{
              opacity: [0.6, 1, 0.6],
            }}
            transition={{ duration: 3, repeat: Infinity }}
          />

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

              const marks = day.chats;
              const dotPx = Math.max(18, Math.min(26, 22)); // Larger dots for rating visibility

              return (
                <motion.div
                  key={day.dayKey}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05, duration: 0.5 }}
                  className="relative h-full group"
                  style={{ width: slotWidth, flex: `0 0 ${slotWidth}px` }}
                >
                  {/* Month label with glow */}
                  {isNewMonth ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute left-1/2 -translate-x-1/2 top-2 text-[12px] font-sans tracking-[0.2em] uppercase text-[var(--neon-cyan)] font-bold whitespace-nowrap px-2 py-1 rounded-md"
                      style={{
                        textShadow: "0 0 10px var(--glow-cyan)",
                        background: "rgba(0, 245, 255, 0.1)",
                        border: "1px solid rgba(0, 245, 255, 0.3)",
                      }}
                    >
                      {format(day.date, "LLL yyyy")}
                    </motion.div>
                  ) : null}

                  {/* Animated tick */}
                  <motion.div
                    className="absolute left-1/2 -translate-x-1/2 bottom-8 h-3 w-[2px]"
                    style={{
                      background: "linear-gradient(180deg, var(--neon-cyan), var(--neon-purple))",
                      boxShadow: "0 0 5px var(--glow-cyan)",
                    }}
                    animate={{
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />

                  {/* Marks positioned by mood rating for roller coaster effect */}
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-full h-full">
                    <AnimatePresence initial={false}>
                      {marks.map((c) => {
                        // Calculate Y offset based on mood rating (1-100)
                        // Canvas coordinates: lower Y = top, higher Y = bottom
                        // Rating 1 (sad) -> bottom, Rating 100 (happy) -> top
                        // Adjusted to match the path calculation for perfect alignment
                        const rating = c.moodAnalysis?.rating ?? 50;
                        const yOffset = -30 - ((rating - 1) / 99) * 200;
                        
                        return (
                          <div
                            key={c.id}
                            className="absolute left-1/2 -translate-x-1/2"
                            style={{ bottom: '32px' }}
                          >
                            <GlowingDot
                              chat={c}
                              isNewest={c.id === newestChatId}
                              isHighlighted={c.id === highlightChatId}
                              onClick={() => onSelectChat?.(c.id)}
                              size={dotPx}
                              yOffset={yOffset}
                            />
                          </div>
                        );
                      })}
                    </AnimatePresence>
                  </div>

                  {/* Day label with subtle glow */}
                  {showDayLabel ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.05 + 0.2 }}
                      className="absolute left-1/2 -translate-x-1/2 bottom-1 text-[10px] font-mono text-[var(--text-secondary)] whitespace-nowrap font-semibold"
                    >
                      {format(day.date, isNewMonth ? "MMM d" : "d")}
                    </motion.div>
                  ) : null}
                </motion.div>
              );
            })}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
