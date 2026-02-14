"use client";

import { motion } from "framer-motion";
import { Minus, Plus, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";

interface ZoomSliderProps {
  zoomLevel: number;
  minZoom: number;
  maxZoom: number;
  onZoomChange: (level: number) => void;
  visibleDaysCount?: number;
  totalDays?: number;
}

export function ZoomSlider({
  zoomLevel,
  minZoom,
  maxZoom,
  onZoomChange,
  visibleDaysCount,
  totalDays,
}: ZoomSliderProps) {
  const percentage = ((zoomLevel - minZoom) / (maxZoom - minZoom)) * 100;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onZoomChange(parseFloat(e.target.value));
  };

  const handleZoomIn = () => {
    const newZoom = Math.min(maxZoom, zoomLevel + 0.5);
    onZoomChange(newZoom);
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(minZoom, zoomLevel - 0.5);
    onZoomChange(newZoom);
  };

  const getZoomLabel = () => {
    if (zoomLevel === minZoom) return "All";
    if (zoomLevel === maxZoom) return "Max";
    return `${zoomLevel.toFixed(1)}x`;
  };

  const getVisibleRangeText = () => {
    if (!visibleDaysCount || !totalDays) return "";
    if (visibleDaysCount >= totalDays) return "Entire timeline";
    
    if (visibleDaysCount === 1) return "1 day";
    if (visibleDaysCount < 7) return `${visibleDaysCount} days`;
    if (visibleDaysCount < 30) {
      const weeks = Math.round(visibleDaysCount / 7);
      return `~${weeks} week${weeks > 1 ? 's' : ''}`;
    }
    if (visibleDaysCount < 365) {
      const months = Math.round(visibleDaysCount / 30);
      return `~${months} month${months > 1 ? 's' : ''}`;
    }
    const years = Math.round(visibleDaysCount / 365);
    return `~${years} year${years > 1 ? 's' : ''}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-4 px-6 py-4 border-t border-[var(--line)] bg-[var(--bg-surface)]/40 backdrop-blur-xl"
    >
      {/* Zoom Out Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={handleZoomOut}
        disabled={zoomLevel <= minZoom}
        className={cn(
          "rounded-xl p-2 transition-all",
          "border border-[var(--line)] bg-[var(--bg-elevated)]/60",
          "hover:border-[var(--neon-cyan)] hover:bg-[var(--neon-cyan)]/10",
          "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
        )}
        aria-label="Zoom out"
      >
        <Minus className="h-4 w-4 text-[var(--text-primary)]" />
      </motion.button>

      {/* Zoom Level Indicator */}
      <div className="flex items-center gap-2 min-w-[60px]">
        <ZoomIn className="h-4 w-4 text-[var(--neon-cyan)]" />
        <span className="text-sm font-mono font-bold text-[var(--text-primary)]">
          {getZoomLabel()}
        </span>
      </div>

      {/* Slider */}
      <div className="flex-1 relative">
        <input
          type="range"
          min={minZoom}
          max={maxZoom}
          step={0.1}
          value={zoomLevel}
          onChange={handleSliderChange}
          className="w-full h-2 rounded-full appearance-none cursor-pointer zoom-slider"
          style={{
            background: `linear-gradient(to right, 
              var(--neon-cyan) 0%, 
              var(--neon-cyan) ${percentage}%, 
              var(--bg-surface) ${percentage}%, 
              var(--bg-surface) 100%)`,
          }}
          aria-label="Zoom level"
        />
      </div>

      {/* Visible Range Display - always visible */}
      {visibleDaysCount !== undefined && totalDays !== undefined && totalDays > 0 && (
        <div className="flex items-center gap-1.5 min-w-[100px]">
          <span className="text-xs font-mono font-semibold text-[var(--neon-cyan)] whitespace-nowrap">
            {getVisibleRangeText()}
          </span>
        </div>
      )}

      {/* Zoom In Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={handleZoomIn}
        disabled={zoomLevel >= maxZoom}
        className={cn(
          "rounded-xl p-2 transition-all",
          "border border-[var(--line)] bg-[var(--bg-elevated)]/60",
          "hover:border-[var(--neon-purple)] hover:bg-[var(--neon-purple)]/10",
          "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
        )}
        aria-label="Zoom in"
      >
        <Plus className="h-4 w-4 text-[var(--text-primary)]" />
      </motion.button>
    </motion.div>
  );
}
