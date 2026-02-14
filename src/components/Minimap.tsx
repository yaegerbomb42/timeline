"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState, useCallback } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface MinimapProps {
  totalDays: number;
  densityMap: Map<number, number>; // day index -> entry count
  visibleStartIdx: number;
  visibleEndIdx: number;
  onViewWindowChange: (startIdx: number, endIdx: number) => void;
  startDate?: Date;
  endDate?: Date;
}

export function Minimap({
  totalDays,
  densityMap,
  visibleStartIdx,
  visibleEndIdx,
  onViewWindowChange,
  startDate,
  endDate,
}: MinimapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<'left' | 'right' | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, startIdx: 0, endIdx: 0 });

  const width = containerRef.current?.clientWidth || 0;
  const viewWindowLeft = totalDays > 0 ? (visibleStartIdx / totalDays) * width : 0;
  const viewWindowWidth = totalDays > 0 ? ((visibleEndIdx - visibleStartIdx) / totalDays) * width : 0;
  
  // Calculate visible range for display
  const getVisibleRangeText = () => {
    if (!startDate || !endDate || totalDays === 0) return "";
    const visibleDays = visibleEndIdx - visibleStartIdx;
    if (visibleDays >= totalDays) return "Entire timeline";
    
    if (visibleDays === 1) return "1 day";
    if (visibleDays < 7) return `${visibleDays} days`;
    if (visibleDays < 30) {
      const weeks = Math.round(visibleDays / 7);
      return `~${weeks} week${weeks > 1 ? 's' : ''}`;
    }
    if (visibleDays < 365) {
      const months = Math.round(visibleDays / 30);
      return `~${months} month${months > 1 ? 's' : ''}`;
    }
    const years = (visibleDays / 365).toFixed(1);
    return `~${years} year${parseFloat(years) !== 1.0 ? 's' : ''}`;
  };

  // Get max density for normalization
  const maxDensity = Math.max(...Array.from(densityMap.values()), 1);

  const handleMouseDown = useCallback((e: React.MouseEvent, action: 'drag' | 'resize-left' | 'resize-right') => {
    e.preventDefault();
    e.stopPropagation();
    
    if (action === 'drag') {
      setIsDragging(true);
      setDragStart({
        x: e.clientX,
        startIdx: visibleStartIdx,
        endIdx: visibleEndIdx,
      });
    } else if (action === 'resize-left') {
      setIsResizing('left');
      setDragStart({
        x: e.clientX,
        startIdx: visibleStartIdx,
        endIdx: visibleEndIdx,
      });
    } else if (action === 'resize-right') {
      setIsResizing('right');
      setDragStart({
        x: e.clientX,
        startIdx: visibleStartIdx,
        endIdx: visibleEndIdx,
      });
    }
  }, [visibleStartIdx, visibleEndIdx]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current) return;
    
    const containerWidth = containerRef.current.clientWidth;
    const deltaX = e.clientX - dragStart.x;
    const deltaDays = Math.round((deltaX / containerWidth) * totalDays);

    if (isDragging) {
      // Drag the view window
      let newStart = dragStart.startIdx + deltaDays;
      let newEnd = dragStart.endIdx + deltaDays;
      
      // Constrain to bounds
      if (newStart < 0) {
        newEnd -= newStart;
        newStart = 0;
      }
      if (newEnd > totalDays) {
        newStart -= (newEnd - totalDays);
        newEnd = totalDays;
      }
      
      newStart = Math.max(0, newStart);
      newEnd = Math.min(totalDays, newEnd);
      
      onViewWindowChange(newStart, newEnd);
    } else if (isResizing === 'left') {
      // Resize from left edge
      let newStart = dragStart.startIdx + deltaDays;
      newStart = Math.max(0, Math.min(newStart, dragStart.endIdx - 1));
      onViewWindowChange(newStart, dragStart.endIdx);
    } else if (isResizing === 'right') {
      // Resize from right edge
      let newEnd = dragStart.endIdx + deltaDays;
      newEnd = Math.max(dragStart.startIdx + 1, Math.min(newEnd, totalDays));
      onViewWindowChange(dragStart.startIdx, newEnd);
    }
  }, [isDragging, isResizing, dragStart, totalDays, onViewWindowChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(null);
  }, []);

  const handleMinimapClick = useCallback((e: React.MouseEvent) => {
    if (isDragging || isResizing) return;
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const clickX = e.clientX - rect.left;
    const clickRatio = clickX / rect.width;
    const clickIdx = Math.round(clickRatio * totalDays);
    
    // Center the view window on the clicked position
    const windowSize = visibleEndIdx - visibleStartIdx;
    let newStart = clickIdx - Math.floor(windowSize / 2);
    let newEnd = newStart + windowSize;
    
    // Constrain to bounds
    if (newStart < 0) {
      newStart = 0;
      newEnd = Math.min(totalDays, windowSize);
    }
    if (newEnd > totalDays) {
      newEnd = totalDays;
      newStart = Math.max(0, totalDays - windowSize);
    }
    
    onViewWindowChange(newStart, newEnd);
  }, [totalDays, visibleStartIdx, visibleEndIdx, isDragging, isResizing, onViewWindowChange]);

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative px-6 py-4 border-t border-[var(--line)] bg-[var(--bg-surface)]/40 backdrop-blur-xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="text-xs font-sans text-[var(--text-secondary)] uppercase tracking-wider">
            Timeline Overview
          </div>
          {startDate && endDate && (
            <div className="text-[10px] font-mono text-[var(--text-muted)]">
              {format(startDate, "MMM yyyy")} → {format(endDate, "MMM yyyy")}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="text-[10px] font-mono text-[var(--text-muted)]">
            {totalDays} day{totalDays !== 1 ? 's' : ''}
          </div>
          {getVisibleRangeText() && (
            <div className="text-[10px] font-mono text-[var(--neon-cyan)] font-semibold">
              Viewing: {getVisibleRangeText()}
            </div>
          )}
        </div>
      </div>

      {/* Minimap Container */}
      <div
        ref={containerRef}
        className="relative h-20 rounded-xl bg-[var(--bg-elevated)]/60 border border-[var(--line)] overflow-hidden cursor-pointer"
        onClick={handleMinimapClick}
      >
        {/* Density visualization */}
        <div className="absolute inset-0 flex items-end">
          {totalDays > 0 && Array.from({ length: Math.min(totalDays, 300) }).map((_, idx) => {
            const dayIdx = Math.floor((idx / Math.min(totalDays, 300)) * totalDays);
            const density = densityMap.get(dayIdx) || 0;
            const height = Math.max(4, (density / maxDensity) * 100);
            
            return (
              <div
                key={idx}
                className="flex-1 transition-all"
                style={{
                  height: `${height}%`,
                  background: density > 0 
                    ? `linear-gradient(to top, rgba(0, 245, 255, 0.7), rgba(168, 85, 247, 0.7))`
                    : 'transparent',
                  opacity: 0.8,
                  minWidth: '1px',
                }}
              />
            );
          })}
        </div>

        {/* View window rectangle */}
        {width > 0 && viewWindowWidth > 0 && (
          <motion.div
            className={cn(
              "absolute top-0 bottom-0 rounded-lg border-2",
              "bg-[var(--neon-cyan)]/15 backdrop-blur-sm",
              isDragging || isResizing
                ? "border-[var(--neon-purple)] shadow-[0_0_20px_var(--glow-purple)]"
                : "border-[var(--neon-cyan)] shadow-[0_0_15px_var(--glow-cyan)]",
              "transition-all duration-200"
            )}
            style={{
              left: Math.max(0, viewWindowLeft),
              width: Math.max(20, Math.min(viewWindowWidth, width - viewWindowLeft)),
              cursor: isDragging ? 'grabbing' : 'grab',
            }}
            onMouseDown={(e) => handleMouseDown(e, 'drag')}
          >
            {/* Left resize handle */}
            <div
              className={cn(
                "absolute left-0 top-0 bottom-0 w-4 cursor-ew-resize",
                "hover:bg-[var(--neon-cyan)]/30 transition-colors",
                "flex items-center justify-center"
              )}
              onMouseDown={(e) => handleMouseDown(e, 'resize-left')}
            >
              <div className="w-1 h-8 bg-[var(--neon-cyan)] rounded-full shadow-[0_0_8px_var(--glow-cyan)]" />
            </div>

            {/* Right resize handle */}
            <div
              className={cn(
                "absolute right-0 top-0 bottom-0 w-4 cursor-ew-resize",
                "hover:bg-[var(--neon-cyan)]/30 transition-colors",
                "flex items-center justify-center"
              )}
              onMouseDown={(e) => handleMouseDown(e, 'resize-right')}
            >
              <div className="w-1 h-8 bg-[var(--neon-cyan)] rounded-full shadow-[0_0_8px_var(--glow-cyan)]" />
            </div>
          </motion.div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-2 text-[10px] text-[var(--text-muted)] font-sans text-center">
        Click to jump • Drag window to pan • Resize edges to zoom
      </div>
    </motion.div>
  );
}
