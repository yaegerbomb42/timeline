"use client";

import { format, parse, isAfter, isBefore, startOfDay } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, Sparkles, Calendar } from "lucide-react";
import { useMemo, memo, useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";

import type { Chat } from "@/lib/chats";
import { useElementSize } from "@/lib/hooks/useElementSize";
import { cn } from "@/lib/utils";
import { getMoodColor } from "@/lib/sentiment";
import { MoodRationaleModal } from "@/components/MoodRationaleModal";

type DayBucket = {
  dayKey: string; // yyyy-MM-dd
  date: Date;
  chats: Chat[];
};

function isValidDayKey(dayKey: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dayKey);
}

// Minimum height for timeline container to ensure adequate space for rollercoaster visualization
const MIN_TIMELINE_HEIGHT = 340;

// Rollercoaster coordinate system constants
// Y range within the container: rating 100 (happy) at top, rating 1 (sad) at bottom
const COASTER_TOP = 50;     // y for rating 100 (top of coaster)
const COASTER_BOTTOM = 280;  // y for rating 1 (bottom of coaster)
const COASTER_RANGE = COASTER_BOTTOM - COASTER_TOP;

// Bézier curve tension for smooth rollercoaster flow
const CURVE_TENSION_DEFAULT = 0.6;  // Standard horizontal control point ratio
const CURVE_TENSION_STEEP = 0.5;    // For large vertical mood changes (>50px)
const STEEP_THRESHOLD = 50;          // Y-distance threshold for reduced tension

// Calculate dynamic node size based on visible event count
function getDynamicNodeSize(visibleCount: number): number {
  if (visibleCount > 3000) return 10;
  if (visibleCount > 1500) return 12;
  if (visibleCount > 800) return 14;
  if (visibleCount > 400) return 16;
  if (visibleCount > 200) return 18;
  if (visibleCount > 100) return 20;
  if (visibleCount > 50) return 22;
  return 26;
}

// Scaling constants for dynamic font/stroke sizing
const NODE_FONT_SIZE_RATIO = 0.38;   // Font size as proportion of node diameter
const DATE_LABEL_FONT_SIZE_RATIO = 0.4;  // Date label font size as proportion of node diameter
const MIN_SLOT_WIDTH_PX = 8;         // Minimum slot width in pixels
const MIN_STROKE_WIDTH = 2;          // Minimum rollercoaster line width
const MAX_STROKE_WIDTH = 6;          // Maximum rollercoaster line width
const STROKE_SLOT_RATIO = 8;         // Divisor: slotWidth / this = stroke width

// Convert a mood rating (1-100) to a y coordinate in the SVG/container
function ratingToY(rating: number): number {
  return COASTER_BOTTOM - ((rating - 1) / 99) * COASTER_RANGE;
}

// Geometric interpolation for image-only entries
// Finds the nearest rated entries before and after, and interpolates based on timestamp
function interpolateYPosition(
  targetDate: Date,
  allDays: DayBucket[]
): number {
  // Find nearest rated day before
  let beforeDay: DayBucket | null = null;
  let beforeRating: number | null = null;
  
  for (let i = allDays.length - 1; i >= 0; i--) {
    const day = allDays[i]!;
    if (day.date < targetDate) {
      // Check if this day has any rated entries (non-image-only)
      const ratings = day.chats
        .filter(c => !c.imageOnly)
        .map(c => c.moodAnalysis?.rating)
        .filter((r): r is number => r !== undefined && r !== null);
      
      if (ratings.length > 0) {
        beforeDay = day;
        beforeRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
        break;
      }
    }
  }
  
  // Find nearest rated day after
  let afterDay: DayBucket | null = null;
  let afterRating: number | null = null;
  
  for (let i = 0; i < allDays.length; i++) {
    const day = allDays[i]!;
    if (day.date > targetDate) {
      // Check if this day has any rated entries (non-image-only)
      const ratings = day.chats
        .filter(c => !c.imageOnly)
        .map(c => c.moodAnalysis?.rating)
        .filter((r): r is number => r !== undefined && r !== null);
      
      if (ratings.length > 0) {
        afterDay = day;
        afterRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
        break;
      }
    }
  }
  
  // If we have both before and after, interpolate
  if (beforeDay && afterDay && beforeRating !== null && afterRating !== null) {
    const totalMs = afterDay.date.getTime() - beforeDay.date.getTime();
    const targetMs = targetDate.getTime() - beforeDay.date.getTime();
    const ratio = totalMs > 0 ? targetMs / totalMs : 0.5;
    
    const interpolatedRating = beforeRating + (afterRating - beforeRating) * ratio;
    return ratingToY(interpolatedRating);
  }
  
  // If we only have before, use that rating
  if (beforeRating !== null) {
    return ratingToY(beforeRating);
  }
  
  // If we only have after, use that rating
  if (afterRating !== null) {
    return ratingToY(afterRating);
  }
  
  // Default to neutral if no rated entries exist
  return ratingToY(50);
}

// Glowing dot with rating inside - Memoized for performance
const GlowingDot = memo(function GlowingDot({
  chat,
  isNewest,
  isHighlighted,
  onClick,
  onShowRationale,
  size,
  yOffset,
}: {
  chat: Chat;
  isNewest?: boolean;
  isHighlighted?: boolean;
  onClick?: () => void;
  onShowRationale?: () => void;
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
  
  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onShowRationale) {
      onShowRationale();
    }
  };
    
  return (
    <div className="relative group/dot">
      <motion.button
        type="button"
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        aria-label={`${format(chat.createdAt, "MMMM d, yyyy 'at' h:mm a")}${chat.moodAnalysis ? `, Mood: ${chat.moodAnalysis.description}, Rating: ${chat.moodAnalysis.rating} out of 100` : ''}`}
        title={`${format(chat.createdAt, "EEEE, MMMM d, yyyy 'at' h:mm a")}\n\n${chat.excerpt}${chat.moodAnalysis ? `\n\nMood: ${chat.moodAnalysis.emoji} ${chat.moodAnalysis.rating}/100 - ${chat.moodAnalysis.description}\n${chat.moodAnalysis.rationale}` : ''}\n\nDouble-click for detailed analysis`}
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
          className="font-bold font-mono pointer-events-none"
          style={{
            fontSize: Math.max(6, size * NODE_FONT_SIZE_RATIO),
            color: 'rgba(255, 255, 255, 0.95)',
            textShadow: `0 0 3px rgba(0, 0, 0, 0.8), 0 1px 2px rgba(0, 0, 0, 0.6)`,
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

function SwipeableDateInput({ 
  value, 
  onChange, 
  min, 
  max, 
}: { 
  value: string; 
  onChange: (val: string) => void; 
  min?: string; 
  max?: string;
}) {
  const parsed = value ? parse(value, "yyyy-MM-dd", new Date()) : null;
  const month = parsed ? parsed.getMonth() : 0;
  const day = parsed ? parsed.getDate() : 1;
  const year = parsed ? parsed.getFullYear() : new Date().getFullYear();
  
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  
  function clampDate(y: number, m: number, d: number): string {
    m = Math.max(0, Math.min(11, m));
    y = Math.max(2000, Math.min(2099, y));
    const maxDay = new Date(y, m + 1, 0).getDate();
    d = Math.max(1, Math.min(maxDay, d));
    const result = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    if (min && result < min) return min;
    if (max && result > max) return max;
    return result;
  }
  
  function handleSegDrag(segment: "month" | "day" | "year", e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    const touch = 'touches' in e ? e.touches[0] : undefined;
    const startX = touch ? touch.clientX : (e as React.MouseEvent).clientX;
    const startVal = segment === "month" ? month : segment === "day" ? day : year;
    
    const handleMove = (ev: MouseEvent | TouchEvent) => {
      let currentX: number;
      const moveTouch = 'touches' in ev ? (ev as TouchEvent).touches[0] : undefined;
      if (moveTouch) {
        currentX = moveTouch.clientX;
      } else {
        currentX = (ev as MouseEvent).clientX;
      }
      const dx = currentX - startX;
      const sensitivity = segment === "year" ? 30 : 15;
      const delta = Math.round(dx / sensitivity);
      
      if (delta !== 0) {
        let newMonth = month, newDay = day, newYear = year;
        if (segment === "month") newMonth = startVal + delta;
        else if (segment === "day") newDay = startVal + delta;
        else newYear = startVal + delta;
        
        const newDate = clampDate(newYear, newMonth, newDay);
        onChange(newDate);
      }
    };
    
    const handleUp = () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleUp);
    };
    
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchmove", handleMove);
    window.addEventListener("touchend", handleUp);
  }
  
  if (!value) {
    return (
      <button
        onClick={() => {
          const today = format(new Date(), "yyyy-MM-dd");
          onChange(min && today < min ? min : max && today > max ? max : today);
        }}
        className="rounded-lg border border-[var(--line)] bg-[var(--bg-surface)]/80 px-2 py-1 text-xs font-mono text-[var(--text-muted)] hover:border-[var(--neon-cyan)] transition-colors cursor-pointer"
      >
        Pick date
      </button>
    );
  }
  
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-[var(--line)] bg-[var(--bg-surface)]/80 overflow-hidden select-none">
      <div
        data-date-segment="true"
        onMouseDown={(e) => handleSegDrag("month", e)}
        onTouchStart={(e) => handleSegDrag("month", e)}
        className="px-1.5 py-1 text-xs font-mono text-[var(--neon-cyan)] cursor-ew-resize hover:bg-[var(--neon-cyan)]/10 hover:scale-110 transition-all active:scale-95"
        title="Drag left/right to change month"
      >
        {monthNames[month]}
      </div>
      <span className="text-[var(--text-muted)] text-[10px]">/</span>
      <div
        data-date-segment="true"
        onMouseDown={(e) => handleSegDrag("day", e)}
        onTouchStart={(e) => handleSegDrag("day", e)}
        className="px-1.5 py-1 text-xs font-mono text-[var(--neon-purple)] cursor-ew-resize hover:bg-[var(--neon-purple)]/10 hover:scale-110 transition-all active:scale-95"
        title="Drag left/right to change day"
      >
        {String(day).padStart(2, "0")}
      </div>
      <span className="text-[var(--text-muted)] text-[10px]">/</span>
      <div
        data-date-segment="true"
        onMouseDown={(e) => handleSegDrag("year", e)}
        onTouchStart={(e) => handleSegDrag("year", e)}
        className="px-1.5 py-1 text-xs font-mono text-[var(--neon-pink)] cursor-ew-resize hover:bg-[var(--neon-pink)]/10 hover:scale-110 transition-all active:scale-95"
        title="Drag left/right to change year"
      >
        {year}
      </div>
    </div>
  );
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
  const { ref: viewportRef, width: viewportWidth } = useElementSize<HTMLDivElement>();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [showRationaleModal, setShowRationaleModal] = useState(false);
  
  // Date range state
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  
  // Drag-to-scroll state
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const scrollStartRef = useRef(0);

  const allDays = useMemo<DayBucket[]>(() => {
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

  // Filter days by selected date range
  const days = useMemo<DayBucket[]>(() => {
    if (!startDate && !endDate) return allDays;
    
    return allDays.filter((day) => {
      if (startDate) {
        const start = startOfDay(parse(startDate, "yyyy-MM-dd", new Date()));
        if (isBefore(day.date, start)) return false;
      }
      if (endDate) {
        const end = startOfDay(parse(endDate, "yyyy-MM-dd", new Date()));
        if (isAfter(day.date, end)) return false;
      }
      return true;
    });
  }, [allDays, startDate, endDate]);

  // Calculate layout: slot width fills the viewport for selected range
  const { slotWidth, trackWidth, labelStride } = useMemo(() => {
    const count = days.length || 1;
    const available = viewportWidth || 600;
    
    // Distribute width evenly across all visible days to fill viewport
    const slot = Math.max(MIN_SLOT_WIDTH_PX, available / count);
    const track = slot * count;
    
    // Label stride adapts to available space per slot
    let stride: number;
    if (slot < 15) stride = Math.max(50, Math.ceil(400 / slot));
    else if (slot < 30) stride = Math.max(20, Math.ceil(200 / slot));
    else if (slot < 60) stride = Math.max(7, Math.ceil(80 / slot));
    else stride = Math.max(1, Math.ceil(40 / slot));
    
    return { slotWidth: slot, trackWidth: Math.max(track, available), labelStride: stride };
  }, [viewportWidth, days.length]);

  // Dynamic node size based on visible count
  const dotPx = useMemo(() => getDynamicNodeSize(days.length), [days.length]);

  // Keyboard shortcuts: arrow keys to scroll
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const scrollElement = scrollContainerRef.current;
      if (!scrollElement) return;
      
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        scrollElement.scrollLeft -= slotWidth * 5;
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        scrollElement.scrollLeft += slotWidth * 5;
      } else if (e.key === 'Home') {
        e.preventDefault();
        scrollElement.scrollLeft = 0;
      } else if (e.key === 'End') {
        e.preventDefault();
        scrollElement.scrollLeft = scrollElement.scrollWidth;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slotWidth]);

  // Mouse drag-to-scroll
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Don't start drag on interactive elements or date segments
    if ((e.target as HTMLElement).closest('button, input, select, a, [data-date-segment]')) return;
    isDraggingRef.current = true;
    dragStartXRef.current = e.clientX;
    scrollStartRef.current = scrollContainerRef.current?.scrollLeft ?? 0;
    e.preventDefault();
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !scrollContainerRef.current) return;
      const dx = e.clientX - dragStartXRef.current;
      scrollContainerRef.current.scrollLeft = scrollStartRef.current - dx;
    };
    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const rangeLabel = useMemo(() => {
    if (days.length === 0) return "No entries yet";
    const a = days[0]!.date;
    const b = days[days.length - 1]!.date;
    if (format(a, "yyyy-MM") === format(b, "yyyy-MM")) return format(a, "LLLL yyyy");
    return `${format(a, "LLL yyyy")} → ${format(b, "LLL yyyy")}`;
  }, [days]);

  // Date bounds for the date inputs
  const minDateStr = allDays.length > 0 ? allDays[0]!.dayKey : "";
  const maxDateStr = allDays.length > 0 ? allDays[allDays.length - 1]!.dayKey : "";

  return (
    <div className="flex h-full flex-col px-6 py-6">
      {/* Header with date range controls */}
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
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
        
        {/* Date range picker */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-[var(--neon-purple)]" />
            <label className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-sans">From</label>
            <SwipeableDateInput
              value={startDate}
              onChange={setStartDate}
              min={minDateStr}
              max={endDate || maxDateStr}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-sans">To</label>
            <SwipeableDateInput
              value={endDate}
              onChange={setEndDate}
              min={startDate || minDateStr}
              max={maxDateStr}
            />
          </div>
          {(startDate || endDate) && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => { setStartDate(""); setEndDate(""); }}
              className="rounded-lg border border-[var(--line)] bg-[var(--bg-surface)]/60 px-2 py-1 text-[10px] font-sans text-[var(--neon-cyan)] hover:border-[var(--neon-cyan)] transition-all"
            >
              Reset
            </motion.button>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-xs uppercase tracking-[0.3em] text-[var(--text-secondary)] font-sans flex items-center gap-2"
        >
          {days.length > 0 && (
            <>
              <Sparkles className="h-3 w-3 text-[var(--neon-purple)]" />
              {days.length} day{days.length === 1 ? "" : "s"}
              <span className="text-[10px] opacity-90 ml-2 font-semibold">(drag or arrow keys to scroll)</span>
            </>
          )}
        </motion.div>
      </div>

      <div
        ref={viewportRef}
        className={cn(
          "mt-2 rounded-2xl border border-[var(--line)] bg-[var(--bg-surface)]/40 backdrop-blur-xl",
          "flex-1",
          "overflow-hidden",
          "shadow-[0_8px_32px_rgba(0,0,0,0.3)]",
        )}
        style={{
          minHeight: MIN_TIMELINE_HEIGHT,
        }}
      >
        <div
          ref={scrollContainerRef}
          className="relative h-full overflow-auto"
          style={{
            minHeight: MIN_TIMELINE_HEIGHT,
            width: '100%',
            scrollbarWidth: "thin",
            scrollbarColor: "var(--neon-cyan) var(--bg-surface)",
            cursor: 'grab',
          }}
          onMouseDown={handleMouseDown}
        >
          <div
            className="relative"
            style={{
              width: trackWidth,
              minWidth: "100%",
              height: MIN_TIMELINE_HEIGHT,
              transformOrigin: 'top left',
            }}
          >
          {/* Roller coaster path connecting the dots */}
          <svg 
            className="absolute top-0 left-0 pointer-events-none" 
            width={trackWidth}
            height={MIN_TIMELINE_HEIGHT}
            style={{ overflow: 'visible' }}
          >
            <defs>
              {/* Sentiment-based gradient: Red (negative) -> Yellow (neutral) -> Green (positive) */}
              <linearGradient id="rollercoaster-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                {days.map((day, idx) => {
                  // Check if all entries are image-only
                  const allImageOnly = day.chats.every(c => c.imageOnly);
                  
                  let avgRating: number;
                  if (allImageOnly) {
                    // For image-only days, use a neutral color (rating 50)
                    avgRating = 50;
                  } else {
                    // Calculate average rating (excluding image-only entries)
                    const ratings = day.chats
                      .filter(c => !c.imageOnly)
                      .map(c => c.moodAnalysis?.rating ?? 50)
                      .filter(r => r !== null);
                    avgRating = ratings.length > 0 
                      ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length 
                      : 50;
                  }
                  
                  // Convert rating to color: Red (negative) -> Yellow (neutral) -> Green (positive)
                  let color: string;
                  if (avgRating < 40) {
                    const intensity = (40 - avgRating) / 40;
                    color = `rgb(${255}, ${Math.round(100 * (1 - intensity))}, ${Math.round(100 * (1 - intensity))})`;
                  } else if (avgRating > 60) {
                    const intensity = (avgRating - 60) / 40;
                    color = `rgb(${Math.round(100 * (1 - intensity))}, ${255}, ${Math.round(136 * intensity)})`;
                  } else {
                    const neutralPos = (avgRating - 40) / 20;
                    color = `rgb(${255}, ${Math.round(200 + 55 * neutralPos)}, ${Math.round(100 * (1 - neutralPos))})`;
                  }
                  
                  const offset = days.length > 1 ? `${(idx / (days.length - 1)) * 100}%` : "0%";
                  return <stop key={`gradient-${idx}`} offset={offset} stopColor={color} stopOpacity="1" />;
                })}
              </linearGradient>
            </defs>
            {days.length > 1 && (
              <motion.path
                d={(() => {
                  // For rollercoaster path, use one point per day with averaged mood
                  // Skip image-only days (they use interpolation instead)
                  const points = days.map((day, idx) => {
                    const x = idx * slotWidth + slotWidth / 2;
                    
                    // Check if all entries are image-only
                    const allImageOnly = day.chats.every(c => c.imageOnly);
                    
                    let y: number;
                    if (allImageOnly) {
                      // Use interpolation for image-only days
                      y = interpolateYPosition(day.date, allDays);
                    } else {
                      // Calculate average rating (excluding image-only entries)
                      const ratings = day.chats
                        .filter(c => !c.imageOnly)
                        .map(c => c.moodAnalysis?.rating ?? 50)
                        .filter(r => r !== null);
                      const avgRating = ratings.length > 0 
                        ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length 
                        : 50;
                      y = ratingToY(avgRating);
                    }
                    
                    return { x, y };
                  });
                  
                  if (points.length < 2) return '';
                  
                  // Create smooth cubic Bézier curve through points
                  let path = `M ${points[0]!.x} ${points[0]!.y}`;
                  
                  for (let i = 1; i < points.length; i++) {
                    const prev = points[i - 1]!;
                    const curr = points[i]!;
                    const dx = curr.x - prev.x;
                    const dy = Math.abs(curr.y - prev.y);
                    
                    const tension = dy > STEEP_THRESHOLD ? CURVE_TENSION_STEEP : CURVE_TENSION_DEFAULT;
                    
                    const cp1x = prev.x + dx * tension;
                    const cp1y = prev.y;
                    const cp2x = curr.x - dx * tension;
                    const cp2y = curr.y;
                    
                    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
                  }
                  
                  return path;
                })()}
                stroke="url(#rollercoaster-gradient)"
                strokeWidth={Math.max(MIN_STROKE_WIDTH, Math.min(MAX_STROKE_WIDTH, slotWidth / STROKE_SLOT_RATIO))}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: Math.min(2, days.length * 0.1), ease: "easeInOut" }}
                style={{
                  filter: 'drop-shadow(0 0 12px rgba(255, 200, 100, 0.5)) drop-shadow(0 0 6px rgba(100, 255, 136, 0.5))',
                }}
              />
            )}
          </svg>

          {/* Animated baseline with gradient */}
          <motion.div
            className="absolute left-0 right-0 h-[2px]"
            style={{
              top: COASTER_BOTTOM + 20,
              background: "linear-gradient(90deg, transparent, var(--neon-cyan), var(--neon-purple), var(--neon-pink), transparent)",
              boxShadow: "0 0 10px var(--glow-cyan), 0 0 20px var(--glow-purple)",
            }}
            animate={{
              opacity: [0.6, 1, 0.6],
            }}
            transition={{ duration: 3, repeat: Infinity }}
          />

          <div className="absolute left-0 top-0" style={{ width: '100%', height: MIN_TIMELINE_HEIGHT }}>
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

              return (
                <div
                  key={day.dayKey}
                  className="relative group"
                  style={{ 
                    width: slotWidth, 
                    height: MIN_TIMELINE_HEIGHT,
                    position: 'absolute',
                    left: idx * slotWidth,
                    top: 0,
                  }}
                >
                  {/* Month label with glow */}
                  {isNewMonth && slotWidth > 12 ? (
                    <div
                      className="absolute left-1/2 -translate-x-1/2 text-[12px] font-sans tracking-[0.2em] uppercase text-[var(--neon-cyan)] font-bold whitespace-nowrap px-2 py-1 rounded-md z-20"
                      style={{
                        top: 8,
                        textShadow: "0 0 10px var(--glow-cyan)",
                        background: "rgba(0, 245, 255, 0.1)",
                        border: "1px solid rgba(0, 245, 255, 0.3)",
                        fontSize: Math.max(8, Math.min(12, slotWidth / 5)),
                      }}
                    >
                      {format(day.date, "LLL yyyy")}
                    </div>
                  ) : null}

                  {/* Animated tick */}
                  {slotWidth > 4 && (
                    <motion.div
                      className="absolute left-1/2 -translate-x-1/2 h-3 w-[2px]"
                      style={{
                        top: COASTER_BOTTOM + 14,
                        background: "linear-gradient(180deg, var(--neon-cyan), var(--neon-purple))",
                        boxShadow: "0 0 5px var(--glow-cyan)",
                      }}
                      animate={{
                        opacity: [0.5, 1, 0.5],
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}

                  {/* Marks positioned by mood rating for roller coaster effect */}
                  {/* Show ONE aggregated node per day with average mood */}
                  <div className="absolute left-1/2 -translate-x-1/2 top-0 w-full" style={{ height: MIN_TIMELINE_HEIGHT }}>
                    <AnimatePresence initial={false}>
                      {(() => {
                        // Check if ALL entries for this day are image-only
                        const allImageOnly = marks.every(c => c.imageOnly);
                        
                        let yPos: number;
                        let avgRating: number;
                        
                        if (allImageOnly) {
                          // Use geometric interpolation for image-only days
                          yPos = interpolateYPosition(day.date, allDays);
                          avgRating = 50; // Placeholder, not actually used for image-only
                        } else {
                          // Calculate average rating for this day (excluding image-only entries)
                          const ratings = marks
                            .filter(c => !c.imageOnly)
                            .map(c => c.moodAnalysis?.rating ?? 50)
                            .filter(r => r !== null);
                          avgRating = ratings.length > 0 
                            ? Math.round(ratings.reduce((sum, r) => sum + r, 0) / ratings.length)
                            : 50;
                          
                          // Calculate Y position matching the SVG rollercoaster path
                          yPos = ratingToY(avgRating);
                        }
                        
                        const representativeChat = marks[0]!;
                        
                        // Create a synthetic chat object with averaged mood for display
                        const avgChat = {
                          ...representativeChat,
                          moodAnalysis: representativeChat.moodAnalysis ? {
                            ...representativeChat.moodAnalysis,
                            rating: avgRating,
                            description: marks.length > 1 
                              ? `${marks.length} entries (avg)` 
                              : representativeChat.moodAnalysis.description,
                          } : undefined
                        };
                        
                        // Render image-only entries differently
                        // Note: We check for imageUrl to ensure we have an image to display.
                        // If an image-only entry somehow has no imageUrl (edge case: upload failed),
                        // it will fall through to regular node rendering with interpolated position.
                        if (allImageOnly && representativeChat.imageUrl) {
                          return (
                            <div
                              key={day.dayKey}
                              className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2"
                              style={{ top: yPos }}
                            >
                              {/* Image thumbnail node */}
                              <motion.div
                                className="relative cursor-pointer"
                                onClick={() => {
                                  onSelectChat?.(representativeChat.id);
                                }}
                                whileHover={{ scale: 1.2 }}
                                whileTap={{ scale: 0.9 }}
                                style={{
                                  width: dotPx,
                                  height: dotPx,
                                }}
                              >
                                <Image
                                  src={representativeChat.imageUrl}
                                  alt="Entry"
                                  width={dotPx}
                                  height={dotPx}
                                  className="rounded-full object-cover border-2 border-[var(--neon-cyan)]"
                                  style={{
                                    boxShadow: '0 0 20px rgba(0,245,255,0.6), 0 0 40px rgba(0,245,255,0.3)',
                                  }}
                                />
                              </motion.div>
                              {/* Small date under node */}
                              <div 
                                className="absolute left-1/2 -translate-x-1/2 text-[10px] font-mono text-[var(--text-secondary)] whitespace-nowrap pointer-events-none font-semibold"
                                style={{ 
                                  top: dotPx / 2 + 4,
                                  fontSize: Math.max(10, Math.min(12, dotPx * DATE_LABEL_FONT_SIZE_RATIO)),
                                  textShadow: '0 1px 3px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.5)',
                                }}
                              >
                                {format(day.date, "M/d")}
                              </div>
                            </div>
                          );
                        }
                        
                        return (
                          <div
                            key={day.dayKey}
                            className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2"
                            style={{ top: yPos }}
                          >
                            <GlowingDot
                              chat={avgChat}
                              isNewest={marks.some(c => c.id === newestChatId)}
                              isHighlighted={marks.some(c => c.id === highlightChatId)}
                              onClick={() => {
                                onSelectChat?.(representativeChat.id);
                              }}
                              onShowRationale={() => {
                                setSelectedChat(representativeChat);
                                setShowRationaleModal(true);
                              }}
                              size={dotPx}
                              yOffset={0}
                            />
                            {/* Small date under node */}
                            <div 
                              className="absolute left-1/2 -translate-x-1/2 text-[10px] font-mono text-[var(--text-secondary)] whitespace-nowrap pointer-events-none font-semibold"
                              style={{ 
                                top: dotPx / 2 + 4,
                                fontSize: Math.max(10, Math.min(12, dotPx * DATE_LABEL_FONT_SIZE_RATIO)),
                                textShadow: '0 1px 3px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.5)',
                              }}
                            >
                              {format(day.date, "M/d")}
                            </div>
                          </div>
                        );
                      })()}
                    </AnimatePresence>
                  </div>

                  {/* Day label with subtle glow */}
                  {showDayLabel && slotWidth > 10 ? (
                    <div
                      className="absolute left-1/2 -translate-x-1/2 text-[10px] font-mono text-[var(--text-secondary)] whitespace-nowrap font-semibold"
                      style={{ 
                        top: COASTER_BOTTOM + 26,
                        fontSize: Math.max(7, Math.min(10, slotWidth / 4)),
                      }}
                    >
                      {format(day.date, isNewMonth ? "MMM d" : "d")}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
          </div>
        </div>
      </div>

      {/* Navigation hint */}
      <div className="mt-2 text-[10px] text-[var(--text-muted)] font-sans text-center">
        Arrow keys to scroll • Drag to pan • Pick dates above to filter range
      </div>

      {/* Mood Rationale Modal */}
      <MoodRationaleModal
        isOpen={showRationaleModal}
        onClose={() => setShowRationaleModal(false)}
        chat={selectedChat}
      />
    </div>
  );
}
