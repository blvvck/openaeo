/**
 * Sentiment Analyzer Tests
 * @vitest-environment node
 * Run with: npm test
 */

import { describe, it, expect } from 'vitest';
import {
  analyzeTieredSentiment,
  getSimpleSentiment,
  compareSentiments,
} from './sentiment-analyzer';

describe('Sentiment Analyzer', () => {
  describe('getSimpleSentiment', () => {
    it('returns positive for positive text', () => {
      const result = getSimpleSentiment('This is an excellent and amazing product');
      expect(result.score).toBeGreaterThan(0);
      expect(result.label).toBe('positive');
    });

    it('returns negative for negative text', () => {
      const result = getSimpleSentiment('This is a terrible and awful experience');
      expect(result.score).toBeLessThan(0);
      expect(result.label).toBe('negative');
    });

    it('returns neutral for neutral text', () => {
      const result = getSimpleSentiment('The product exists and has features');
      expect(result.label).toBe('neutral');
    });

    it('handles negation', () => {
      const result = getSimpleSentiment('This is not excellent at all');
      expect(result.score).toBeLessThan(0.5);
    });

    it('handles intensifiers', () => {
      const regular = getSimpleSentiment('This is good');
      const intensified = getSimpleSentiment('This is extremely good');
      expect(intensified.score).toBeGreaterThanOrEqual(regular.score);
    });
  });

  describe('analyzeTieredSentiment', () => {
    it('returns document sentiment', () => {
      const result = analyzeTieredSentiment('This is a great product with amazing features.');
      expect(result.document).toBeDefined();
      expect(typeof result.document.score).toBe('number');
      expect(typeof result.document.confidence).toBe('number');
    });

    it('splits into paragraphs', () => {
      const text = 'First paragraph here.\n\nSecond paragraph here.\n\nThird paragraph.';
      const result = analyzeTieredSentiment(text);
      expect(result.paragraphs.length).toBe(3);
    });

    it('detects brand mentions in paragraphs', () => {
      const text = 'Acme Corp is great.\n\nOther companies exist.\n\nAcme Corp is innovative.';
      const result = analyzeTieredSentiment(text, 'Acme Corp');
      const brandParagraphs = result.paragraphs.filter(p => p.mentionsBrand);
      expect(brandParagraphs.length).toBe(2);
    });

    it('extracts brand sentiment', () => {
      const text = 'Acme Corp is an excellent company with outstanding products.';
      const result = analyzeTieredSentiment(text, 'Acme Corp');
      expect(result.brandSentiment).not.toBeNull();
      expect(result.brandSentiment?.entity).toBe('Acme Corp');
      expect(result.brandSentiment!.sentiment.score).toBeGreaterThan(0);
    });

    it('extracts competitor sentiments', () => {
      const text = 'Acme Corp is great. Competitor Inc is also good. Rival LLC is terrible.';
      const result = analyzeTieredSentiment(text, 'Acme Corp', ['Competitor Inc', 'Rival LLC']);
      expect(result.competitorSentiments.length).toBe(2);
    });

    it('extracts key phrases', () => {
      const text = 'Acme Corp is the best choice. Their products are excellent quality.';
      const result = analyzeTieredSentiment(text, 'Acme Corp');
      expect(result.keyPhrases.length).toBeGreaterThan(0);
    });

    it('includes metadata', () => {
      const text = 'Test text for analysis.';
      const result = analyzeTieredSentiment(text);
      expect(result.metadata.analyzedAt).toBeInstanceOf(Date);
      expect(result.metadata.textLength).toBe(text.length);
    });

    it('counts brand mentions', () => {
      const text = 'Acme is here. Acme is there. Acme is everywhere.';
      const result = analyzeTieredSentiment(text, 'Acme');
      expect(result.metadata.brandMentionCount).toBe(3);
    });
  });

  describe('compareSentiments', () => {
    it('ranks brand against competitors', () => {
      const text = 'BrandA is excellent. BrandB is good. BrandC is terrible.';
      const result = compareSentiments(text, 'BrandA', ['BrandB', 'BrandC']);
      expect(result.comparison.brandRank).toBe(1);
      expect(result.comparison.totalEntities).toBe(3);
    });

    it('calculates brand vs average', () => {
      const text = 'BrandA is amazing. BrandB is okay. BrandC is mediocre.';
      const result = compareSentiments(text, 'BrandA', ['BrandB', 'BrandC']);
      expect(result.comparison.brandVsAverage).toBeGreaterThan(0);
    });

    it('handles missing brand', () => {
      const text = 'Only competitors here: CompA is good.';
      const result = compareSentiments(text, 'NonExistent', ['CompA']);
      expect(result.brand).toBeNull();
      expect(result.comparison.brandRank).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty text', () => {
      const result = analyzeTieredSentiment('');
      expect(result.document.score).toBe(0);
    });

    it('handles text with no sentiment words', () => {
      const result = getSimpleSentiment('The cat sat on the mat.');
      expect(result.label).toBe('neutral');
    });

    it('increases confidence with more sentiment words', () => {
      const short = getSimpleSentiment('Good');
      const long = getSimpleSentiment('Good great excellent amazing wonderful fantastic');
      expect(long.confidence).toBeGreaterThanOrEqual(short.confidence);
    });
  });
});
