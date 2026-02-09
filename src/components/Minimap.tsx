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
  const viewWindowLeft = (visibleStartIdx / totalDays) * width;
  const viewWindowWidth = ((visibleEndIdx - visibleStartIdx) / totalDays) * width;

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
        <div className="text-[10px] font-mono text-[var(--text-muted)]">
          {totalDays} day{totalDays !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Minimap Container */}
      <div
        ref={containerRef}
        className="relative h-16 rounded-xl bg-[var(--bg-elevated)]/60 border border-[var(--line)] overflow-hidden cursor-pointer"
        onClick={handleMinimapClick}
      >
        {/* Density visualization */}
        <div className="absolute inset-0 flex items-end">
          {Array.from({ length: Math.min(totalDays, 200) }).map((_, idx) => {
            const dayIdx = Math.floor((idx / 200) * totalDays);
            const density = densityMap.get(dayIdx) || 0;
            const height = Math.max(2, (density / maxDensity) * 100);
            
            return (
              <div
                key={idx}
                className="flex-1 transition-all"
                style={{
                  height: `${height}%`,
                  background: density > 0 
                    ? `linear-gradient(to top, var(--neon-cyan), var(--neon-purple))`
                    : 'transparent',
                  opacity: 0.6,
                }}
              />
            );
          })}
        </div>

        {/* View window rectangle */}
        <motion.div
          className={cn(
            "absolute top-0 bottom-0 rounded-lg border-2",
            "bg-[var(--neon-cyan)]/10 backdrop-blur-sm",
            isDragging || isResizing
              ? "border-[var(--neon-purple)] shadow-[0_0_20px_var(--glow-purple)]"
              : "border-[var(--neon-cyan)] shadow-[0_0_15px_var(--glow-cyan)]",
            "transition-all duration-200"
          )}
          style={{
            left: viewWindowLeft,
            width: viewWindowWidth,
            cursor: isDragging ? 'grabbing' : 'grab',
          }}
          onMouseDown={(e) => handleMouseDown(e, 'drag')}
        >
          {/* Left resize handle */}
          <div
            className={cn(
              "absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize",
              "hover:bg-[var(--neon-cyan)]/20 transition-colors",
              "flex items-center justify-center"
            )}
            onMouseDown={(e) => handleMouseDown(e, 'resize-left')}
          >
            <div className="w-0.5 h-6 bg-[var(--neon-cyan)] rounded-full" />
          </div>

          {/* Right resize handle */}
          <div
            className={cn(
              "absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize",
              "hover:bg-[var(--neon-cyan)]/20 transition-colors",
              "flex items-center justify-center"
            )}
            onMouseDown={(e) => handleMouseDown(e, 'resize-right')}
          >
            <div className="w-0.5 h-6 bg-[var(--neon-cyan)] rounded-full" />
          </div>
        </motion.div>
      </div>

      {/* Instructions */}
      <div className="mt-2 text-[10px] text-[var(--text-muted)] font-sans text-center">
        Click to jump • Drag window to pan • Resize edges to zoom
      </div>
    </motion.div>
  );
}
