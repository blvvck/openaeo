/**
 * Type definitions for vader-sentiment
 * VADER (Valence Aware Dictionary and sEntiment Reasoner)
 *
 * JavaScript port of the VADER sentiment analysis tool
 * @see https://github.com/vaderSentiment/vaderSentiment-js
 */

declare module 'vader-sentiment' {
  export interface PolarityScores {
    /** Negative sentiment proportion (0 to 1) */
    neg: number;
    /** Neutral sentiment proportion (0 to 1) */
    neu: number;
    /** Positive sentiment proportion (0 to 1) */
    pos: number;
    /** Compound score normalized between -1 (most negative) and +1 (most positive) */
    compound: number;
  }

  export const SentimentIntensityAnalyzer: {
    /**
     * Analyze the sentiment of a text string
     * @param text The text to analyze
     * @returns Polarity scores including neg, neu, pos, and compound
     */
    polarity_scores(text: string): PolarityScores;
  };

  const vader: {
    SentimentIntensityAnalyzer: typeof SentimentIntensityAnalyzer;
  };

  export default vader;
}
