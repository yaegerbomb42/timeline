import Sentiment from 'sentiment';

const sentiment = new Sentiment();

export type Mood = 'positive' | 'negative' | 'neutral';

export type MoodAnalysis = {
  mood: Mood;
  rating: number; // 1-100 scale
  description: string; // Sophisticated mood description
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

function getMoodDescription(rating: number, mood: Mood): string {
  // Sophisticated mood descriptions based on rating
  if (mood === 'positive') {
    if (rating >= 95) return 'euphoric';
    if (rating >= 90) return 'found love';
    if (rating >= 85) return 'absolutely thrilled';
    if (rating >= 80) return 'feeling blessed';
    if (rating >= 75) return 'genuinely happy';
    if (rating >= 70) return 'grateful';
    if (rating >= 65) return 'accomplished';
    if (rating >= 60) return 'motivated';
    if (rating >= 55) return 'content';
    return 'peaceful';
  } else if (mood === 'negative') {
    if (rating <= 5) return 'completely devastated';
    if (rating <= 10) return 'laid in bed all day';
    if (rating <= 15) return 'deeply struggling';
    if (rating <= 20) return 'overwhelmed';
    if (rating <= 25) return 'emotionally drained';
    if (rating <= 30) return 'disappointed';
    if (rating <= 35) return 'frustrated';
    if (rating <= 40) return 'stressed out';
    if (rating <= 45) return 'mildly anxious';
    return 'slightly off';
  } else {
    // neutral
    if (rating >= 55) return 'taking things in stride';
    if (rating >= 50) return 'going through the motions';
    return 'existing';
  }
}

export function analyzeMoodDetailed(text: string): MoodAnalysis {
  const result = sentiment.analyze(text);
  const score = result.score;
  
  // Normalize score to 1-100 scale
  // Sentiment scores typically range from -10 to +10 for normal text
  // Map -10 to 1, 0 to 50, +10 to 100
  const normalized = Math.max(-10, Math.min(10, score));
  const rating = Math.round(((normalized + 10) / 20) * 99 + 1);
  
  let mood: Mood;
  let emoji: string;
  
  if (score > 3) {
    mood = 'positive';
    emoji = rating >= 90 ? '😄' : rating >= 75 ? '😊' : '🙂';
  } else if (score < -3) {
    mood = 'negative';
    emoji = rating <= 10 ? '😢' : rating <= 25 ? '😔' : '😐';
  } else {
    mood = 'neutral';
    emoji = '😐';
  }
  
  const description = getMoodDescription(rating, mood);
  
  return {
    mood,
    rating: Math.max(1, Math.min(100, rating)),
    description,
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
  if (rating >= 90) return '😄';
  if (rating >= 75) return '😊';
  if (rating >= 60) return '🙂';
  if (rating >= 50) return '😐';
  if (rating >= 25) return '😔';
  if (rating >= 10) return '☹️';
  return '😢';
}
