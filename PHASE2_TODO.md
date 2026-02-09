# Phase 2 TODO: Timeline Viewport and Virtualization

## Overview
Phase 2 will implement a high-performance viewport system for displaying thousands of timeline events efficiently. This document outlines the remaining work based on the original requirements.

## Core Requirements

### 1. Main Timeline Viewport System

#### 1.1 Horizontal Scrolling Container
**Current State:** Timeline uses horizontal scrolling with `overflow-auto`
**Needs:** 
- ✅ Already implemented in TimelineBar
- ✅ Supports native pinch-zoom
- ✅ Ultra-compact spacing (8-60px based on entry count)

#### 1.2 Virtualization (HIGH PRIORITY)
**Status:** NOT IMPLEMENTED
**Requirements:**
- Render only visible events (50-100 at a time)
- Load batches of 200 events as user pans
- Use IntersectionObserver or similar for lazy loading
- Maintain smooth 60 FPS performance

**Implementation Strategy:**
```typescript
// Pseudocode for virtualization
const visibleRange = {
  startIdx: Math.floor(scrollLeft / slotWidth) - buffer,
  endIdx: Math.ceil((scrollLeft + viewportWidth) / slotWidth) + buffer
};

// Only render days within visible range
const visibleDays = days.slice(visibleRange.startIdx, visibleRange.endIdx);
```

**Recommended Libraries:**
- TanStack Virtual (formerly react-virtual)
- react-window
- Or custom implementation with IntersectionObserver

#### 1.3 Event Clustering
**Status:** PARTIALLY IMPLEMENTED via daily averaging
**Current:** One node per day with averaged mood
**Needs Enhancement:**
- When zoomed out significantly, cluster multiple days/weeks
- Show cluster indicators (e.g., "12 events in March 2023")
- Make clusters clickable to zoom in
- Dynamically adjust clustering based on zoom level

### 2. Zoom Control System

#### 2.1 Bottom Zoom Slider
**Status:** NOT IMPLEMENTED
**Requirements:**
- Horizontal slider at bottom of timeline viewport
- Range: 1x (full timeline) to 10x or dynamic max zoom
- Continuous scale factor (not hardcoded units)
- Labels showing current zoom level
- Tooltips showing visible time range

**Implementation Notes:**
```typescript
interface ZoomState {
  level: number;        // 1-10
  visibleSpan: number;  // in days
  slotWidth: number;    // pixels per day
}

// Example zoom levels
// 1x: Show all 5400 events (heavily compressed)
// 4x: Show ~25% (few months, less clustering)
// 10x: Show ~1% (single day, individual events)
```

#### 2.2 Zoom Interactions
**Status:** BASIC SUPPORT (native pinch-zoom)
**Needs:**
- Keyboard shortcuts (Ctrl + scroll wheel)
- Smooth transitions on zoom change
- Maintain center point when zooming
- Update clustering dynamically
- Sync with minimap

### 3. Minimap Component

#### 3.1 Minimap Overview
**Status:** NOT IMPLEMENTED
**Requirements:**
- Secondary horizontal timeline below main viewport
- Shows entire dataset in compressed view
- Low-fidelity rendering (density plot or simple dots)
- No individual labels, just visual overview

**Visual Design:**
- Height: 60-80px
- Background: Semi-transparent panel
- Events: Small dots or heatmap-style density indicators
- Current view: Highlighted rectangle overlay

#### 3.2 View Window Rectangle
**Status:** NOT IMPLEMENTED
**Requirements:**
- Draggable rectangle showing current main viewport portion
- Resizable edges to adjust zoom
- Width corresponds to visible time span/event count
- Syncs with main viewport in real-time

**Interactions:**
1. **Drag:** Pan main viewport
2. **Resize left edge:** Adjust start of visible range + zoom
3. **Resize right edge:** Adjust end of visible range + zoom
4. **Click anywhere:** Jump main viewport to that location

#### 3.3 Bidirectional Sync
**Status:** NOT IMPLEMENTED
**Requirements:**
- Main viewport changes update minimap window position
- Minimap interactions update main viewport
- Smooth animations for transitions
- Debounced updates to prevent performance issues

### 4. Performance Optimizations

#### 4.1 Current State
✅ Ultra-compact spacing implemented
✅ Memoized components (GlowingDot)
✅ Daily aggregation reduces node count
✅ AnimatePresence for smooth entry/exit

#### 4.2 Additional Needed
- [ ] Virtualized rendering (only visible nodes)
- [ ] Debounced scroll/pan handlers
- [ ] Throttled zoom changes
- [ ] Canvas rendering for rollercoaster path (instead of SVG for 5000+ events)
- [ ] Web Workers for heavy computations
- [ ] Service Worker for caching

#### 4.3 Target Metrics
- 60 FPS during scroll/zoom
- <100ms response time for interactions
- Support 10,000+ events without degradation
- <50MB memory footprint

### 5. Edge Cases to Handle

#### 5.1 Data Distribution
- [ ] Sparse periods (few entries over months)
- [ ] Dense periods (hundreds of entries in days)
- [ ] Future dates (preview mode)
- [ ] Empty dataset (placeholder state)

#### 5.2 Browser Compatibility
- [ ] Mobile touch gestures
- [ ] Safari pinch-zoom quirks
- [ ] Firefox scrollbar styling
- [ ] WebGPU fallbacks

## Implementation Plan

### Step 1: Virtualization (Week 1)
1. Install TanStack Virtual or react-window
2. Refactor TimelineBar to use virtual scrolling
3. Implement visible range calculation
4. Add intersection observer for batch loading
5. Test with 5000+ events

### Step 2: Minimap (Week 2)
1. Create MinimapComponent
2. Implement density visualization
3. Add view window rectangle overlay
4. Implement drag/resize handlers
5. Wire up bidirectional sync

### Step 3: Zoom Controls (Week 3)
1. Add ZoomSlider component
2. Implement zoom state management
3. Connect keyboard shortcuts
4. Add smooth zoom transitions
5. Sync with minimap

### Step 4: Clustering (Week 4)
1. Implement multi-level clustering algorithm
2. Add cluster visualization (with count)
3. Make clusters expandable
4. Dynamic clustering based on zoom
5. Smooth cluster transitions

### Step 5: Performance Tuning (Week 5)
1. Profile rendering performance
2. Optimize path calculations
3. Add canvas fallback for large datasets
4. Implement Web Workers for computations
5. Add progressive loading indicators

## Technical Design Notes

### State Management
```typescript
interface TimelineViewState {
  // Viewport
  scrollLeft: number;
  viewportWidth: number;
  
  // Zoom
  zoomLevel: number;
  slotWidth: number;
  
  // Visible range
  visibleStartIdx: number;
  visibleEndIdx: number;
  
  // Clustering
  clusterLevel: 'day' | 'week' | 'month' | 'none';
}
```

### Minimap Data Structure
```typescript
interface MinimapData {
  totalDays: number;
  densityMap: Map<number, number>; // day index -> entry count
  currentViewWindow: {
    startIdx: number;
    endIdx: number;
  };
}
```

### Virtualization Strategy
- Use fixed-size virtual list for horizontal scrolling
- Calculate visible items based on scroll position
- Render buffer zones (50 items before/after visible)
- Recycle DOM nodes for smooth performance

## Testing Checklist

### Virtualization
- [ ] Handles 10,000 events smoothly
- [ ] Scroll performance remains at 60 FPS
- [ ] No visible gaps during fast scrolling
- [ ] Proper cleanup on unmount

### Minimap
- [ ] Accurately represents full dataset
- [ ] View window updates in real-time
- [ ] Drag/resize works smoothly
- [ ] Click navigation is accurate

### Zoom
- [ ] All zoom levels work correctly
- [ ] Smooth transitions between levels
- [ ] Keyboard shortcuts function
- [ ] Maintains scroll position correctly

### Performance
- [ ] <100ms interaction response time
- [ ] 60 FPS during animations
- [ ] Memory usage stays reasonable
- [ ] Works on mobile devices

## Dependencies to Add

```json
{
  "dependencies": {
    "@tanstack/react-virtual": "^3.0.0"  // For virtualization
  }
}
```

## Accessibility Considerations

### Keyboard Navigation
- [ ] Arrow keys for scrolling
- [ ] +/- for zoom in/out
- [ ] Home/End for timeline start/end
- [ ] Tab through visible events

### Screen Readers
- [ ] Announce zoom level changes
- [ ] Announce visible date range
- [ ] Describe minimap purpose
- [ ] Provide alternative navigation

### Visual
- [ ] High contrast mode support
- [ ] Focus indicators for keyboard nav
- [ ] Reduced motion mode
- [ ] Sufficient color contrast

## Questions to Resolve

1. **Canvas vs SVG:** For 5000+ events, should we switch to canvas rendering?
   - SVG: Better accessibility, easier styling
   - Canvas: Better performance for large datasets

2. **Clustering Algorithm:** What's the best clustering strategy?
   - Time-based (day/week/month)
   - Density-based (group by proximity)
   - Hybrid approach

3. **Mobile Experience:** How should minimap work on mobile?
   - Hide by default, toggle button?
   - Auto-collapse to drawer?
   - Vertical layout instead?

4. **Data Loading:** Should we paginate backend queries?
   - Load all data upfront (5400 events = ~1-2MB)
   - Paginate in chunks as user scrolls
   - Hybrid: Load recent, lazy load older

## Priority Order

### Must-Have (P0)
1. Virtualization for 5000+ events
2. Basic zoom controls
3. Performance optimization

### Should-Have (P1)
4. Minimap with view window
5. Event clustering
6. Keyboard shortcuts

### Nice-to-Have (P2)
7. Advanced clustering
8. Canvas rendering option
9. Progressive loading indicators

## Estimated Timeline

- **Phase 2 Complete:** 5-6 weeks
- **MVP (P0 only):** 2-3 weeks
- **Full Implementation (P0+P1):** 4-5 weeks
- **Polish (P2):** +1 week

## Next Steps

1. Review this plan with stakeholders
2. Set up development environment with TanStack Virtual
3. Create feature branch for Phase 2
4. Start with virtualization implementation
5. Iterate with regular testing on large datasets
