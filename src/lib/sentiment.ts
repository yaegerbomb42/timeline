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
  // More sophisticated mood descriptions based on rating
  if (mood === 'positive') {
    if (rating >= 95) return 'ecstatic and overjoyed';
    if (rating >= 90) return 'absolutely thrilled';
    if (rating >= 85) return 'feeling blessed and grateful';
    if (rating >= 80) return 'genuinely happy';
    if (rating >= 75) return 'optimistic and hopeful';
    if (rating >= 70) return 'content and satisfied';
    if (rating >= 65) return 'pleasantly upbeat';
    if (rating >= 60) return 'mildly positive';
    if (rating >= 55) return 'slightly cheerful';
    return 'calm and peaceful';
  } else if (mood === 'negative') {
    if (rating <= 5) return 'devastated and heartbroken';
    if (rating <= 10) return 'deeply depressed';
    if (rating <= 15) return 'severely distressed';
    if (rating <= 20) return 'overwhelmed with sadness';
    if (rating <= 25) return 'emotionally drained';
    if (rating <= 30) return 'quite disappointed';
    if (rating <= 35) return 'frustrated and irritated';
    if (rating <= 40) return 'stressed out';
    if (rating <= 45) return 'somewhat anxious';
    return 'a bit down';
  } else {
    // neutral - more nuanced descriptions
    if (rating >= 55) return 'balanced and steady';
    if (rating >= 52) return 'reflective and thoughtful';
    if (rating >= 50) return 'neutral and composed';
    if (rating >= 48) return 'contemplative';
    return 'quietly observant';
  }
}

function generateRationale(rating: number, mood: Mood, score: number, positiveCount: number, negativeCount: number): string {
  // Generate detailed rationale explaining the rating
  const intensity = Math.abs(score);
  let rationale = '';
  
  if (mood === 'positive') {
    rationale = `Positive sentiment detected with ${positiveCount} positive word${positiveCount !== 1 ? 's' : ''}`;
    if (negativeCount > 0) {
      rationale += ` and ${negativeCount} negative word${negativeCount !== 1 ? 's' : ''}`;
    }
    rationale += `. `;
    
    if (rating >= 90) {
      rationale += `Strong positive language and enthusiastic tone indicate exceptionally high mood.`;
    } else if (rating >= 75) {
      rationale += `Clear positive indicators show a notably uplifted emotional state.`;
    } else if (rating >= 60) {
      rationale += `Moderately positive expressions suggest an optimistic outlook.`;
    } else {
      rationale += `Subtle positive undertones suggest a calm, peaceful state.`;
    }
  } else if (mood === 'negative') {
    rationale = `Negative sentiment detected with ${negativeCount} negative word${negativeCount !== 1 ? 's' : ''}`;
    if (positiveCount > 0) {
      rationale += ` and ${positiveCount} positive word${positiveCount !== 1 ? 's' : ''}`;
    }
    rationale += `. `;
    
    if (rating <= 10) {
      rationale += `Intense negative language indicates severe emotional distress.`;
    } else if (rating <= 25) {
      rationale += `Strong negative expressions show significant emotional burden.`;
    } else if (rating <= 40) {
      rationale += `Moderate negative sentiment suggests stress or disappointment.`;
    } else {
      rationale += `Mild negative undertones indicate slight discomfort or concern.`;
    }
  } else {
    rationale = `Balanced sentiment with ${positiveCount} positive and ${negativeCount} negative word${negativeCount !== 1 ? 's' : ''}. `;
    
    if (rating >= 52) {
      rationale += `Neutral language with slightly positive lean suggests steady emotional state.`;
    } else if (rating >= 48) {
      rationale += `Neutral tone indicates a reflective or contemplative mood.`;
    } else {
      rationale += `Balanced expression suggests calm observation without strong emotion.`;
    }
  }
  
  // Add score context
  rationale += ` (Sentiment score: ${score > 0 ? '+' : ''}${score.toFixed(1)})`;
  
  return rationale;
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
