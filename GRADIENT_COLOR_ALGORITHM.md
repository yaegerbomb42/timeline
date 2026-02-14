# Sentiment-Based Gradient Color Algorithm

## Overview
The timeline rollercoaster uses a dynamic gradient that changes color based on the mood rating of each day's entries. This creates an intuitive visual representation of emotional states.

## Color Algorithm

### Rating Ranges and Colors

```
Rating 1-40 (Negative)    → Red gradient
Rating 40-60 (Neutral)    → Yellow/Orange gradient  
Rating 60-100 (Positive)  → Green gradient
```

### Detailed Color Calculation

#### Negative Range (Rating < 40)
```javascript
const intensity = (40 - avgRating) / 40;
color = rgb(
  255,                                    // Full red
  Math.round(100 * (1 - intensity)),     // Less green as more negative
  Math.round(100 * (1 - intensity))      // Less blue as more negative
);
```

**Examples:**
- Rating 40 → intensity=0.0 → rgb(255, 100, 100) - Light pink/red
- Rating 20 → intensity=0.5 → rgb(255, 50, 50) - Medium red
- Rating 1 → intensity=0.975 → rgb(255, 3, 3) - Nearly pure red (most negative)

#### Neutral Range (Rating 40-60)
```javascript
const neutralPos = (avgRating - 40) / 20;
color = rgb(
  255,                                    // Full red (for warm yellow/orange)
  Math.round(200 + 55 * neutralPos),     // 200-255 green (creates yellow)
  Math.round(100 * (1 - neutralPos))     // 100-0 blue (removes blue for warmth)
);
```

**Examples:**
- Rating 40 → rgb(255, 200, 100) - Orange
- Rating 50 → rgb(255, 227, 50) - Yellow-orange
- Rating 60 → rgb(255, 255, 0) - Yellow

#### Positive Range (Rating > 60)
```javascript
const intensity = (avgRating - 60) / 40;
color = rgb(
  Math.round(100 * (1 - intensity)),     // Less red as more positive
  255,                                    // Full green
  Math.round(136 * intensity)            // More blue-green as more positive
);
```

**Examples:**
- Rating 60 → intensity=0.0 → rgb(100, 255, 0) - Bright lime green
- Rating 80 → intensity=0.5 → rgb(50, 255, 68) - Bright green with cyan tint
- Rating 100 → intensity=1.0 → rgb(0, 255, 136) - Cyan-green (most positive)

## SVG Gradient Implementation

### Dynamic Gradient Stops

The gradient is created dynamically with one color stop per day:

```tsx
<linearGradient id="rollercoaster-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
  {days.map((day, idx) => {
    const avgRating = calculateDayAverageRating(day);
    const color = ratingToColor(avgRating);
    const offset = `${(idx / (days.length - 1)) * 100}%`;
    
    return (
      <stop 
        key={`gradient-${idx}`} 
        offset={offset} 
        stopColor={color} 
        stopOpacity="0.8" 
      />
    );
  })}
</linearGradient>
```

### Applied to Path

```tsx
<motion.path
  d={pathData}
  stroke="url(#rollercoaster-gradient)"
  strokeWidth="8"
  fill="none"
  strokeLinecap="round"
  strokeLinejoin="round"
  style={{
    filter: 'drop-shadow(0 0 16px rgba(255, 200, 100, 0.6)) drop-shadow(0 0 8px rgba(100, 255, 136, 0.6))',
  }}
/>
```

## Daily Average Calculation

Each day's color is based on the average rating of all entries for that day:

```javascript
const ratings = day.chats
  .map(c => c.moodAnalysis?.rating ?? 50)
  .filter(r => r !== null);

const avgRating = ratings.length > 0 
  ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length 
  : 50;
```

## Visual Effects

### Glow Effects
The gradient path includes two drop-shadows for a glowing effect:
- Primary glow: Warm yellow-orange (rgba(255, 200, 100, 0.6))
- Secondary glow: Cool green (rgba(100, 255, 136, 0.6))

These colors complement the full gradient range, creating a cohesive visual appearance.

### Smooth Transitions
The SVG gradient automatically interpolates between color stops, creating smooth color transitions even with abrupt mood changes. This is enhanced by:

1. **Bézier Curves**: The path uses cubic Bézier curves for smooth flowing lines
2. **Tension Control**: Adaptive tension (0.5-0.6) based on vertical distance
3. **Stroke Properties**: Round line caps and joins prevent harsh edges

## Color Psychology

The color choices are intentional:

- **Red**: Universally associated with negative emotions (anger, sadness, stress)
- **Yellow/Orange**: Represents neutral, balanced states or transitions
- **Green**: Associated with positive emotions (happiness, growth, peace)

## Performance Considerations

### Optimization Techniques
1. **Memoization**: Gradient stops calculated once per render cycle
2. **Conditional Rendering**: Only renders when days.length > 1
3. **Limited Stops**: One stop per day (not per entry) reduces complexity
4. **CSS Variables**: Base colors use CSS variables for theme consistency

### Browser Compatibility
- SVG gradients: Supported in all modern browsers
- Motion path animations: Framer Motion handles fallbacks
- RGB color format: Universal browser support

## Example Color Progression

A week with varying moods might look like:

```
Day 1: Rating 25  → intensity=0.375 → rgb(255, 63, 63)    - Medium red (negative)
Day 2: Rating 35  → intensity=0.125 → rgb(255, 88, 88)    - Light red (negative)
Day 3: Rating 50  → neutralPos=0.5  → rgb(255, 228, 50)   - Yellow (neutral)
Day 4: Rating 65  → intensity=0.125 → rgb(88, 255, 17)    - Lime green (positive)
Day 5: Rating 80  → intensity=0.5   → rgb(50, 255, 68)    - Bright green (very positive)
Day 6: Rating 75  → intensity=0.375 → rgb(63, 255, 51)    - Green (positive)
Day 7: Rating 55  → neutralPos=0.75 → rgb(255, 241, 25)   - Yellow-orange (neutral)
```

This creates a visual "emotional rollercoaster" where the color literally flows from red through yellow to green and back, mirroring the mood journey.

## Customization Options

Future enhancements could include:

1. **Custom Color Schemes**: Allow users to define their own color mappings
2. **Intensity Controls**: Adjust color intensity for subtle or bold visualizations
3. **Alternative Palettes**: Color-blind friendly options
4. **Theme Integration**: Adapt colors to light/dark modes

## Code Location

The implementation can be found in:
- File: `src/components/TimelineBar.tsx`
- Lines: ~416-490 (SVG gradient definition and path rendering)
- Function: Inline gradient generation within the component render
