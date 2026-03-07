import Sentiment from 'sentiment';

const sentiment = new Sentiment();

export type Mood = 'positive' | 'negative' | 'neutral';

export type MoodAnalysis = {
  mood: Mood;
  rating: number; // 1-100 scale
  description: string; // Sophisticated mood description
  emoji: string;
  score: number; // raw sentiment score
  rationale: string; // Detailed explanation of the rating
  geminiRationale?: string; // Gemini AI's detailed reasoning (optional, added when Gemini analysis is used)
  consciousness?: string; // Abbreviated summary of consciousness level (e.g., "observant text", "self discovery")
};

export function analyzeMood(text: string): Mood {
  const result = sentiment.analyze(text);

  // Score ranges from -infinity to +infinity
  // Typically -5 to 5 for normal text
  if (result.score > 1) {
    return 'positive';
  } else if (result.score < -1) {
    return 'negative';
  }
  return 'neutral';
}

function getMoodDescription(rating: number, mood: Mood): string {
  if (mood === 'positive') {
    if (rating >= 95) return 'straight up vibing';
    if (rating >= 90) return 'on cloud nine';
    if (rating >= 85) return 'feeling blessed';
    if (rating >= 80) return 'genuinely winning';
    if (rating >= 75) return 'optimistic as hell';
    if (rating >= 70) return 'solid content';
    if (rating >= 65) return 'pretty chill';
    if (rating >= 60) return 'lowkey happy';
    if (rating >= 55) return 'not bad at all';
    return 'peaceful energy';
  } else if (mood === 'negative') {
    if (rating <= 5) return 'actually devastated';
    if (rating <= 10) return 'deep in the feels';
    if (rating <= 15) return 'rough day alert';
    if (rating <= 20) return 'heavy heart vibes';
    if (rating <= 25) return 'drained and done';
    if (rating <= 30) return 'pretty bummed';
    if (rating <= 35) return 'majorly annoyed';
    if (rating <= 40) return 'stressing big time';
    if (rating <= 45) return 'anxiety is talkative';
    return 'mood is... off';
  } else {
    // neutral
    if (rating >= 55) return 'steady and ready';
    if (rating >= 52) return 'thinking deep thoughts';
    if (rating >= 50) return 'cool, calm, collected';
    if (rating >= 48) return 'just existing';
    return 'quietly observing';
  }
}

function generateRationale(rating: number, mood: Mood, score: number, positiveCount: number, negativeCount: number): string {
  const intensity = Math.abs(score);

  if (mood === 'positive') {
    if (rating >= 90) return `Your words are basically radiating light right now. Such a massive win.`;
    if (rating >= 75) return `Definitely a good vibe. You sound like you're in a great head space.`;
    if (rating >= 60) return `Solidly positive. Not shouting from the rooftops, but living the good life.`;
    return `Quietly content. It's the small wins that count, honestly.`;
  } else if (mood === 'negative') {
    if (rating <= 10) return `Oof, this one hurt to read. Rooting for you to bounce back from this.`;
    if (rating <= 25) return `You're carrying a lot right now. Give yourself some grace, you need it.`;
    if (rating <= 40) return `Things feel a bit heavy. Maybe take a breather? You've got this.`;
    return `Slightly tilted, but you're still standing. We've all been there.`;
  } else {
    if (rating >= 52) return `Pretty balanced, maybe a tiny bit on the sunny side. Keeping it steady.`;
    if (rating >= 48) return `Classic neutral. Just taking things as they come without the drama.`;
    return `A bit quiet, maybe a lot on your mind. Just being a chill observer today.`;
  }
}

export function analyzeMoodDetailed(text: string): MoodAnalysis {
  const result = sentiment.analyze(text);
  const score = result.score;
  const positiveCount = result.positive?.length ?? 0;
  const negativeCount = result.negative?.length ?? 0;

  // Improved normalization with better distribution
  // The sentiment library typically produces scores from -10 to +10 for normal text,
  // but can go higher for very emotionally charged content. We clamp to -15/+15
  // to handle extreme cases while maintaining good distribution across the 1-100 scale.
  const clampedScore = Math.max(-15, Math.min(15, score));

  // More sophisticated mapping for better accuracy
  // Use non-linear scaling to give more granularity in the middle ranges
  let rating: number;
  if (clampedScore >= 0) {
    // Positive: map 0-15 to 50-100 with emphasis on higher scores
    rating = 50 + (clampedScore / 15) * 50;
  } else {
    // Negative: map -15-0 to 1-50 with emphasis on lower scores  
    rating = 50 + (clampedScore / 15) * 49;
  }

  rating = Math.round(Math.max(1, Math.min(100, rating)));

  let mood: Mood;
  let emoji: string;

  // Adjusted thresholds for more accurate mood detection
  if (score > 2) {
    mood = 'positive';
    emoji = rating >= 90 ? '😄' : rating >= 75 ? '😊' : rating >= 60 ? '🙂' : '😌';
  } else if (score < -2) {
    mood = 'negative';
    emoji = rating <= 10 ? '😢' : rating <= 25 ? '😔' : rating <= 40 ? '😐' : '😕';
  } else {
    mood = 'neutral';
    emoji = rating >= 52 ? '😐' : rating >= 48 ? '🤔' : '😶';
  }

  const description = getMoodDescription(rating, mood);
  const rationale = generateRationale(rating, mood, score, positiveCount, negativeCount);

  return {
    mood,
    rating,
    description,
    emoji,
    score,
    rationale,
  };
}

export function getMoodColor(mood: Mood): string {
  switch (mood) {
    case 'positive':
      return '#00ff88'; // Green for positive
    case 'negative':
      return '#ff6b9d'; // Pink for negative
    case 'neutral':
      return '#00f5ff'; // Cyan for neutral
  }
}

export function getMoodGradient(mood: Mood): string {
  switch (mood) {
    case 'positive':
      return 'from-green-400 to-emerald-500';
    case 'negative':
      return 'from-pink-400 to-rose-500';
    case 'neutral':
      return 'from-cyan-400 to-blue-500';
  }
}

export function getMoodEmoji(rating: number): string {
  if (rating >= 90) return '😄';
  if (rating >= 75) return '😊';
  if (rating >= 60) return '🙂';
  if (rating >= 50) return '😐';
  if (rating >= 25) return '😔';
  if (rating >= 10) return '☹️';
  return '😢';
}
