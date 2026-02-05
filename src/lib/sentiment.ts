import Sentiment from 'sentiment';

const sentiment = new Sentiment();

export type Mood = 'positive' | 'negative' | 'neutral';

export type MoodAnalysis = {
  mood: Mood;
  rating: number; // 1-10 scale
  emoji: string;
  score: number; // raw sentiment score
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

export function analyzeMoodDetailed(text: string): MoodAnalysis {
  const result = sentiment.analyze(text);
  const score = result.score;
  
  // Normalize score to 1-10 scale
  // Sentiment scores typically range from -10 to +10 for normal text
  // Map -10 to 1, 0 to 5.5, +10 to 10
  const normalized = Math.max(-10, Math.min(10, score));
  const rating = Math.round(((normalized + 10) / 20) * 9 + 1);
  
  let mood: Mood;
  let emoji: string;
  
  if (score > 3) {
    mood = 'positive';
    emoji = rating >= 9 ? '😄' : rating >= 7 ? '😊' : '🙂';
  } else if (score < -3) {
    mood = 'negative';
    emoji = rating <= 2 ? '😢' : rating <= 4 ? '😔' : '😐';
  } else {
    mood = 'neutral';
    emoji = '😐';
  }
  
  return {
    mood,
    rating: Math.max(1, Math.min(10, rating)),
    emoji,
    score,
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
  if (rating >= 9) return '😄';
  if (rating >= 8) return '😊';
  if (rating >= 7) return '🙂';
  if (rating >= 6) return '😐';
  if (rating >= 5) return '😐';
  if (rating >= 4) return '😔';
  if (rating >= 3) return '☹️';
  return '😢';
}
