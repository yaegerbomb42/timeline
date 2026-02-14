"use client";

import { format, parse } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, Sparkles } from "lucide-react";
import { useMemo, memo, useState, useRef, useCallback, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import type { Chat } from "@/lib/chats";
import { useElementSize } from "@/lib/hooks/useElementSize";
import { cn } from "@/lib/utils";
import { getMoodColor } from "@/lib/sentiment";
import { MoodRationaleModal } from "@/components/MoodRationaleModal";
import { ZoomSlider } from "@/components/ZoomSlider";
import { Minimap } from "@/components/Minimap";

type DayBucket = {
  dayKey: string; // yyyy-MM-dd
  date: Date;
  chats: Chat[];
};

function isValidDayKey(dayKey: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dayKey);
}

// Helper function to determine minimum slot width based on entry count
function getMinSlotWidth(count: number): number {
  if (count > 2000) return 8;
  if (count > 1000) return 12;
  if (count > 500) return 16;
  return 20;
}

// Helper function to calculate label stride based on count and slot width
function calculateLabelStride(count: number, slot: number): number {
  if (count > 2000) return Math.max(100, Math.ceil(800 / slot));
  if (count > 1000) return Math.max(60, Math.ceil(480 / slot));
  if (count > 500) return Math.max(30, Math.ceil(240 / slot));
  if (count > 200) return Math.max(15, Math.ceil(120 / slot));
  return Math.max(5, Math.ceil(60 / slot));
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

// Convert a mood rating (1-100) to a y coordinate in the SVG/container
function ratingToY(rating: number): number {
  return COASTER_BOTTOM - ((rating - 1) / 99) * COASTER_RANGE;
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
          className="text-[9px] font-bold font-mono pointer-events-none"
          style={{
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
  
  // Zoom state management
  const [zoomLevel, setZoomLevel] = useState(1);
  const MIN_ZOOM = 1;
  const MAX_ZOOM = 10;

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

  // Calculate slot width based on zoom level
  const { slotWidth, trackWidth, labelStride } = useMemo(() => {
    const count = days.length || 1;
    
    // Base slot width calculation
    const minSlot = getMinSlotWidth(count);
    const maxSlot = 200; // Increased for higher zoom
    
    // Apply zoom multiplier
    const baseSlot = Math.max(minSlot, 20);
    const slot = Math.min(maxSlot, baseSlot * zoomLevel);
    const track = slot * count;
    
    // Adjust label stride based on zoom
    const stride = calculateLabelStride(count, slot);
    
    return { slotWidth: slot, trackWidth: track, labelStride: stride };
  }, [viewportWidth, days.length, zoomLevel]);

  // Setup virtualizer for horizontal scrolling
  const virtualizer = useVirtualizer({
    count: days.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => slotWidth,
    horizontal: true,
    overscan: 50, // Render 50 items before/after visible range
  });

  const virtualItems = virtualizer.getVirtualItems();
  
  // Calculate visible range for minimap
  const visibleStartIdx = virtualItems[0]?.index || 0;
  const visibleEndIdx = virtualItems[virtualItems.length - 1]?.index || days.length - 1;
  
  // Calculate visible days count for zoom slider
  const visibleDaysCount = visibleEndIdx - visibleStartIdx + 1;

  // Density map for minimap
  const densityMap = useMemo(() => {
    const map = new Map<number, number>();
    days.forEach((day, idx) => {
      map.set(idx, day.chats.length);
    });
    return map;
  }, [days]);

  // Handle zoom change
  const handleZoomChange = useCallback((newZoom: number) => {
    const scrollElement = scrollContainerRef.current;
    if (!scrollElement) {
      setZoomLevel(newZoom);
      return;
    }
    
    // Calculate center point before zoom
    const scrollLeft = scrollElement.scrollLeft;
    const viewportCenter = scrollLeft + (viewportWidth / 2);
    const centerRatio = viewportCenter / (trackWidth || 1);
    
    // Update zoom
    setZoomLevel(newZoom);
    
    // After zoom, restore center point (done in useEffect)
    requestAnimationFrame(() => {
      const newTrackWidth = slotWidth * days.length;
      const newCenter = centerRatio * newTrackWidth;
      const newScrollLeft = newCenter - (viewportWidth / 2);
      scrollElement.scrollLeft = Math.max(0, newScrollLeft);
    });
  }, [viewportWidth, trackWidth, slotWidth, days.length]);

  // Handle minimap view window change
  const handleMinimapChange = useCallback((startIdx: number, endIdx: number) => {
    const scrollElement = scrollContainerRef.current;
    if (!scrollElement) return;
    
    // Calculate scroll position to show the selected range
    const scrollLeft = startIdx * slotWidth;
    scrollElement.scrollLeft = scrollLeft;
    
    // Optionally adjust zoom to fit the range
    const requestedDays = endIdx - startIdx;
    const currentVisibleDays = viewportWidth / slotWidth;
    if (requestedDays > 0 && currentVisibleDays > 0) {
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomLevel * (currentVisibleDays / requestedDays)));
      setZoomLevel(newZoom);
    }
  }, [slotWidth, viewportWidth, zoomLevel, MIN_ZOOM, MAX_ZOOM]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          handleZoomChange(Math.min(MAX_ZOOM, zoomLevel + 0.5));
        } else if (e.key === '-') {
          e.preventDefault();
          handleZoomChange(Math.max(MIN_ZOOM, zoomLevel - 0.5));
        } else if (e.key === '0') {
          e.preventDefault();
          setZoomLevel(1);
        }
      }
      
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

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.2 : 0.2;
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomLevel + delta));
        handleZoomChange(newZoom);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const scrollElement = scrollContainerRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (scrollElement) {
        scrollElement.removeEventListener('wheel', handleWheel);
      }
    };
  }, [zoomLevel, slotWidth, handleZoomChange, MIN_ZOOM, MAX_ZOOM]);

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
              <span className="text-[10px] opacity-90 ml-2 font-semibold">(pinch to zoom)</span>
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
          }}
        >
          <div
            className="relative"
            style={{
              width: Math.max(trackWidth, viewportWidth || 0),
              minWidth: "100%",
              height: MIN_TIMELINE_HEIGHT,
              transformOrigin: 'top left',
            }}
          >
          {/* Roller coaster path connecting the dots */}
          <svg 
            className="absolute top-0 left-0 pointer-events-none" 
            width={Math.max(trackWidth, viewportWidth || 0)}
            height={MIN_TIMELINE_HEIGHT}
            style={{ overflow: 'visible' }}
          >
            <defs>
              {/* Sentiment-based gradient: Red (negative) -> Yellow (neutral) -> Green (positive) */}
              <linearGradient id="rollercoaster-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                {days.map((day, idx) => {
                  // Calculate average rating for the day
                  const ratings = day.chats
                    .map(c => c.moodAnalysis?.rating ?? 50)
                    .filter(r => r !== null);
                  const avgRating = ratings.length > 0 
                    ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length 
                    : 50;
                  
                  // Convert rating to color: Red (negative) -> Yellow (neutral) -> Green (positive)
                  let color: string;
                  if (avgRating < 40) {
                    // Negative: Red with intensity based on how low the rating is
                    const intensity = (40 - avgRating) / 40;
                    color = `rgb(${255}, ${Math.round(100 * (1 - intensity))}, ${Math.round(100 * (1 - intensity))})`;
                  } else if (avgRating > 60) {
                    // Positive: Green with intensity based on how high the rating is
                    const intensity = (avgRating - 60) / 40;
                    color = `rgb(${Math.round(100 * (1 - intensity))}, ${255}, ${Math.round(136 * intensity)})`;
                  } else {
                    // Neutral: Yellow/Orange gradient
                    const neutralPos = (avgRating - 40) / 20;
                    color = `rgb(${255}, ${Math.round(200 + 55 * neutralPos)}, ${Math.round(100 * (1 - neutralPos))})`;
                  }
                  
                  // Avoid division by zero for single day (use 0% for single color fill)
                  const offset = days.length > 1 ? `${(idx / (days.length - 1)) * 100}%` : "0%";
                  return <stop key={`gradient-${idx}`} offset={offset} stopColor={color} stopOpacity="1" />;
                })}
              </linearGradient>
            </defs>
            {days.length > 1 && (
              <motion.path
                d={(() => {
                  // For rollercoaster path, use one point per day with averaged mood
                  const points = days.map((day, idx) => {
                    const x = idx * slotWidth + slotWidth / 2;
                    const ratings = day.chats
                      .map(c => c.moodAnalysis?.rating ?? 50)
                      .filter(r => r !== null);
                    const avgRating = ratings.length > 0 
                      ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length 
                      : 50;
                    const y = ratingToY(avgRating);
                    return { x, y };
                  });
                  
                  if (points.length < 2) return '';
                  
                  // Create smooth cubic Bézier curve through points for flowing rollercoaster
                  let path = `M ${points[0]!.x} ${points[0]!.y}`;
                  
                  for (let i = 1; i < points.length; i++) {
                    const prev = points[i - 1]!;
                    const curr = points[i]!;
                    const dx = curr.x - prev.x;
                    const dy = Math.abs(curr.y - prev.y);
                    
                    // Smooth tension for flowing rollercoaster line
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
                strokeWidth="6"
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
            {virtualItems.map((virtualItem) => {
              const idx = virtualItem.index;
              const day = days[idx];
              if (!day) return null;

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
                <div
                  key={day.dayKey}
                  className="relative group"
                  style={{ 
                    width: virtualItem.size, 
                    height: MIN_TIMELINE_HEIGHT,
                    position: 'absolute',
                    left: virtualItem.start,
                    top: 0,
                  }}
                >
                  {/* Month label with glow */}
                  {isNewMonth ? (
                    <div
                      className="absolute left-1/2 -translate-x-1/2 text-[12px] font-sans tracking-[0.2em] uppercase text-[var(--neon-cyan)] font-bold whitespace-nowrap px-2 py-1 rounded-md z-20"
                      style={{
                        top: 8,
                        textShadow: "0 0 10px var(--glow-cyan)",
                        background: "rgba(0, 245, 255, 0.1)",
                        border: "1px solid rgba(0, 245, 255, 0.3)",
                      }}
                    >
                      {format(day.date, "LLL yyyy")}
                    </div>
                  ) : null}

                  {/* Animated tick */}
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

                  {/* Marks positioned by mood rating for roller coaster effect */}
                  {/* Show ONE aggregated node per day with average mood */}
                  <div className="absolute left-1/2 -translate-x-1/2 top-0 w-full" style={{ height: MIN_TIMELINE_HEIGHT }}>
                    <AnimatePresence initial={false}>
                      {(() => {
                        // Calculate average rating for this day
                        const ratings = marks
                          .map(c => c.moodAnalysis?.rating ?? 50)
                          .filter(r => r !== null);
                        const avgRating = ratings.length > 0 
                          ? Math.round(ratings.reduce((sum, r) => sum + r, 0) / ratings.length)
                          : 50;
                        
                        // Use the first chat for the day as representative (for ID and click handling)
                        const representativeChat = marks[0]!;
                        
                        // Calculate Y position matching the SVG rollercoaster path
                        const yPos = ratingToY(avgRating);
                        
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
                          </div>
                        );
                      })()}
                    </AnimatePresence>
                  </div>

                  {/* Day label with subtle glow */}
                  {showDayLabel ? (
                    <div
                      className="absolute left-1/2 -translate-x-1/2 text-[10px] font-mono text-[var(--text-secondary)] whitespace-nowrap font-semibold"
                      style={{ top: COASTER_BOTTOM + 26 }}
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

      {/* Zoom Slider */}
      <ZoomSlider
        zoomLevel={zoomLevel}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        onZoomChange={handleZoomChange}
        visibleDaysCount={visibleDaysCount}
        totalDays={days.length}
      />

      {/* Minimap */}
      <Minimap
        totalDays={days.length}
        densityMap={densityMap}
        visibleStartIdx={visibleStartIdx}
        visibleEndIdx={visibleEndIdx}
        onViewWindowChange={handleMinimapChange}
        startDate={days[0]?.date}
        endDate={days[days.length - 1]?.date}
      />

      {/* Mood Rationale Modal */}
      <MoodRationaleModal
        isOpen={showRationaleModal}
        onClose={() => setShowRationaleModal(false)}
        chat={selectedChat}
      />
    </div>
  );
}
