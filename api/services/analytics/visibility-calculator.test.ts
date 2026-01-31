/**
 * Visibility Calculator Tests
 * @vitest-environment node
 * Run with: npm test
 */

import { describe, it, expect } from 'vitest';
import {
  calculateVisibilityScore,
  getSimpleVisibilityScore,
  compareVisibility,
  type ResponseData,
} from './visibility-calculator';

// Helper to create test responses
function createResponse(platform: string, text: string, brandMentioned: boolean): ResponseData {
  return { platform, text, brandMentioned };
}

describe('Visibility Calculator', () => {
  describe('calculateVisibilityScore', () => {
    it('returns 0 for empty responses', () => {
      const result = calculateVisibilityScore([], 'Acme');
      expect(result.score).toBe(0);
    });

    it('returns score 0-100', () => {
      const responses: ResponseData[] = [
        createResponse('chatgpt', 'Acme is a great company with excellent products.', true),
      ];
      const result = calculateVisibilityScore(responses, 'Acme');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('includes breakdown', () => {
      const responses: ResponseData[] = [
        createResponse('chatgpt', 'Acme is recommended as the best choice.', true),
      ];
      const result = calculateVisibilityScore(responses, 'Acme');
      expect(result.breakdown.mentionRate).toBeGreaterThanOrEqual(0);
      expect(result.breakdown.position).toBeGreaterThanOrEqual(0);
      expect(result.breakdown.sentiment).toBeGreaterThanOrEqual(0);
      expect(result.breakdown.platformCoverage).toBeGreaterThanOrEqual(0);
    });

    it('breakdown sums to total score', () => {
      const responses: ResponseData[] = [
        createResponse('chatgpt', 'Acme is excellent.', true),
        createResponse('claude', 'Acme is great.', true),
      ];
      const result = calculateVisibilityScore(responses, 'Acme');
      const sum = result.breakdown.mentionRate + result.breakdown.position +
        result.breakdown.sentiment + result.breakdown.platformCoverage;
      expect(Math.abs(sum - result.score)).toBeLessThanOrEqual(1);
    });

    it('rewards higher mention rate', () => {
      const lowMentionResponses: ResponseData[] = [
        createResponse('chatgpt', 'Acme is good.', true),
        createResponse('chatgpt', 'No brand here.', false),
        createResponse('chatgpt', 'Still no brand.', false),
        createResponse('chatgpt', 'Nothing here.', false),
      ];
      const highMentionResponses: ResponseData[] = [
        createResponse('chatgpt', 'Acme is good.', true),
        createResponse('chatgpt', 'Acme again.', true),
        createResponse('chatgpt', 'Acme everywhere.', true),
        createResponse('chatgpt', 'More Acme.', true),
      ];

      const lowResult = calculateVisibilityScore(lowMentionResponses, 'Acme');
      const highResult = calculateVisibilityScore(highMentionResponses, 'Acme');

      expect(highResult.breakdown.mentionRate).toBeGreaterThan(lowResult.breakdown.mentionRate);
    });

    it('rewards platform coverage', () => {
      const singlePlatform: ResponseData[] = [
        createResponse('chatgpt', 'Acme is great.', true),
      ];
      const multiPlatform: ResponseData[] = [
        createResponse('chatgpt', 'Acme is great.', true),
        createResponse('claude', 'Acme is good.', true),
        createResponse('perplexity', 'Acme works well.', true),
      ];

      const singleResult = calculateVisibilityScore(singlePlatform, 'Acme');
      const multiResult = calculateVisibilityScore(multiPlatform, 'Acme');

      expect(multiResult.breakdown.platformCoverage).toBeGreaterThan(singleResult.breakdown.platformCoverage);
    });

    it('calculates per-platform visibility', () => {
      const responses: ResponseData[] = [
        createResponse('chatgpt', 'Acme is excellent and recommended.', true),
        createResponse('claude', 'Other stuff, no brand.', false),
      ];
      const result = calculateVisibilityScore(responses, 'Acme');

      const chatgptVis = result.platforms.find(p => p.platform === 'chatgpt');
      const claudeVis = result.platforms.find(p => p.platform === 'claude');

      expect(chatgptVis).toBeDefined();
      expect(claudeVis).toBeDefined();
      expect(chatgptVis!.mentioned).toBe(true);
      expect(claudeVis!.mentioned).toBe(false);
    });

    it('platform visibility includes scores', () => {
      const responses: ResponseData[] = [
        createResponse('chatgpt', 'Acme is the best choice we recommend.', true),
      ];
      const result = calculateVisibilityScore(responses, 'Acme');
      const chatgptVis = result.platforms.find(p => p.platform === 'chatgpt');

      expect(chatgptVis!.positionScore).toBeGreaterThan(0);
      expect(chatgptVis!.visibilityScore).toBeGreaterThan(0);
    });

    it('includes metadata', () => {
      const responses: ResponseData[] = [
        createResponse('chatgpt', 'Acme is great.', true),
        createResponse('claude', 'Acme too.', true),
        createResponse('perplexity', 'No mention.', false),
      ];
      const result = calculateVisibilityScore(responses, 'Acme');

      expect(result.metadata.totalResponses).toBe(3);
      expect(result.metadata.responsesWithMention).toBe(2);
      expect(result.metadata.platformsCovered).toBe(2);
      expect(result.metadata.calculatedAt).toBeInstanceOf(Date);
    });
  });

  describe('getSimpleVisibilityScore', () => {
    it('returns number 0-100', () => {
      const responses: ResponseData[] = [
        createResponse('chatgpt', 'Acme is good.', true),
      ];
      const score = getSimpleVisibilityScore(responses, 'Acme');
      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('compareVisibility', () => {
    it('ranks brand against competitors', () => {
      const responses: ResponseData[] = [
        createResponse('chatgpt', 'Acme is the best, highly recommended. CompA is okay.', true),
        createResponse('claude', 'Acme leads the market. CompB is behind.', true),
      ];
      const result = compareVisibility(responses, 'Acme', ['CompA', 'CompB']);

      expect(result.brand.name).toBe('Acme');
      expect(result.competitors.length).toBe(2);
      expect(result.ranking.position).toBeGreaterThanOrEqual(1);
      expect(result.ranking.total).toBe(3);
    });

    it('detects competitor mentions', () => {
      const responses: ResponseData[] = [
        createResponse('chatgpt', 'CompA is mentioned here. Acme too.', true),
      ];
      const result = compareVisibility(responses, 'Acme', ['CompA']);

      const compAScore = result.competitors.find(c => c.name === 'CompA');
      expect(compAScore).toBeDefined();
      expect(compAScore!.score.score).toBeGreaterThan(0);
    });
  });

  describe('Sentiment Impact', () => {
    it('positive sentiment increases score', () => {
      const negative: ResponseData[] = [
        createResponse('chatgpt', 'Acme is terrible and awful.', true),
      ];
      const positive: ResponseData[] = [
        createResponse('chatgpt', 'Acme is excellent and amazing.', true),
      ];

      const negResult = calculateVisibilityScore(negative, 'Acme');
      const posResult = calculateVisibilityScore(positive, 'Acme');

      expect(posResult.breakdown.sentiment).toBeGreaterThan(negResult.breakdown.sentiment);
    });
  });

  describe('Edge Cases', () => {
    it('handles brand with no mentions', () => {
      const responses: ResponseData[] = [
        createResponse('chatgpt', 'Nothing about the brand.', false),
        createResponse('claude', 'Still nothing.', false),
      ];
      const result = calculateVisibilityScore(responses, 'Acme');
      expect(result.score).toBe(0);
      expect(result.metadata.responsesWithMention).toBe(0);
    });

    it('handles single response', () => {
      const responses: ResponseData[] = [
        createResponse('chatgpt', 'Acme is the best.', true),
      ];
      const result = calculateVisibilityScore(responses, 'Acme');
      expect(result.score).toBeGreaterThan(0);
    });
  });
});
