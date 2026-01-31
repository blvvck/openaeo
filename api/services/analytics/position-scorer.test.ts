/**
 * Position Scorer Tests
 * @vitest-environment node
 * Run with: npm test
 */

import { describe, it, expect } from 'vitest';
import {
  calculatePositionScore,
  analyzePosition,
  getSimplePositionScore,
} from './position-scorer';

describe('Position Scorer', () => {
  describe('calculatePositionScore', () => {
    it('returns 0 for missing entity', () => {
      const result = calculatePositionScore('This text has no brand mention', 'Acme');
      expect(result.score).toBe(0);
      expect(result.details.mentionCount).toBe(0);
    });

    it('gives higher score for early mention', () => {
      const earlyMention = calculatePositionScore('Acme is great. Other stuff follows. More text here.', 'Acme');
      const lateMention = calculatePositionScore('Other stuff first. More text here. Finally Acme.', 'Acme');
      expect(earlyMention.score).toBeGreaterThan(lateMention.score);
    });

    it('tracks first mention position', () => {
      const result = calculatePositionScore('Start text Acme middle text', 'Acme');
      expect(result.details.firstMentionPosition).toBeGreaterThan(0);
      expect(result.details.firstMentionPosition).toBeLessThan(1);
    });

    it('counts multiple mentions', () => {
      const result = calculatePositionScore('Acme is here. Acme is there. Acme everywhere.', 'Acme');
      expect(result.details.mentionCount).toBe(3);
    });

    it('detects first paragraph mention', () => {
      const inFirst = calculatePositionScore('Acme Corp is great.\n\nOther paragraph.', 'Acme Corp');
      const notInFirst = calculatePositionScore('First paragraph.\n\nAcme Corp is here.', 'Acme Corp');
      expect(inFirst.details.inFirstParagraph).toBe(true);
      expect(notInFirst.details.inFirstParagraph).toBe(false);
    });

    it('gives prominence bonus for first paragraph', () => {
      const inFirst = calculatePositionScore('Acme Corp is great.\n\nOther stuff.', 'Acme Corp');
      const notInFirst = calculatePositionScore('First paragraph no brand.\n\nAcme Corp is here.', 'Acme Corp');
      expect(inFirst.breakdown.prominenceScore).toBeGreaterThan(notInFirst.breakdown.prominenceScore);
    });

    it('detects markdown headings', () => {
      const inHeading = calculatePositionScore('# Acme Corp Review\n\nThis is content.', 'Acme Corp');
      expect(inHeading.details.inHeading).toBe(true);
    });

    it('detects bold text as heading', () => {
      const inBold = calculatePositionScore('**Acme Corp** is the best choice for this.', 'Acme Corp');
      expect(inBold.details.inHeading).toBe(true);
    });

    it('detects explicit recommendation', () => {
      const recommended = calculatePositionScore('I recommend Acme Corp for this task.', 'Acme Corp');
      expect(recommended.details.isRecommended).toBe(true);
      expect(recommended.breakdown.recommendationScore).toBeGreaterThan(0);
    });

    it('detects "best choice" pattern', () => {
      const result = calculatePositionScore('Acme Corp is the best choice for enterprise users.', 'Acme Corp');
      expect(result.details.isRecommended).toBe(true);
    });

    it('detects "top pick" pattern', () => {
      const result = calculatePositionScore('My top pick would be Acme Corp.', 'Acme Corp');
      expect(result.details.isRecommended).toBe(true);
    });

    it('detects first in list', () => {
      const text = 'Here are some options: Acme Corp, Competitor Inc, Rival LLC.';
      const result = calculatePositionScore(text, 'Acme Corp', ['Competitor Inc', 'Rival LLC']);
      expect(result.details.isFirstChoice).toBe(true);
    });

    it('detects not first in list', () => {
      const text = 'Here are some options: Competitor Inc, Acme Corp, Rival LLC.';
      const result = calculatePositionScore(text, 'Acme Corp', ['Competitor Inc', 'Rival LLC']);
      expect(result.details.isFirstChoice).toBe(false);
    });

    it('returns valid breakdown', () => {
      const result = calculatePositionScore('Acme Corp is recommended as the best choice.', 'Acme Corp');
      expect(result.breakdown.positionScore).toBeGreaterThanOrEqual(0);
      expect(result.breakdown.prominenceScore).toBeGreaterThanOrEqual(0);
      expect(result.breakdown.recommendationScore).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });

  describe('analyzePosition', () => {
    it('returns brand and competitor scores', () => {
      const text = 'Acme Corp is great. Competitor Inc is okay.';
      const result = analyzePosition(text, 'Acme Corp', ['Competitor Inc']);
      expect(result.brand).toBe('Acme Corp');
      expect(result.competitorScores.length).toBe(1);
      expect(result.competitorScores[0].name).toBe('Competitor Inc');
    });

    it('calculates ranking', () => {
      const text = 'Acme Corp is the best. Competitor Inc is second. Rival LLC is third.';
      const result = analyzePosition(text, 'Acme Corp', ['Competitor Inc', 'Rival LLC']);
      expect(result.ranking.brandRank).toBeGreaterThanOrEqual(1);
      expect(result.ranking.totalCompetitors).toBeGreaterThan(0);
    });

    it('ranks by score', () => {
      const text = 'I recommend Acme Corp as the best choice. Competitor Inc is also good.';
      const result = analyzePosition(text, 'Acme Corp', ['Competitor Inc']);
      expect(result.ranking.brandRank).toBe(1);
    });
  });

  describe('getSimplePositionScore', () => {
    it('returns number 0-100', () => {
      const score = getSimplePositionScore('Acme Corp is great.', 'Acme Corp');
      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('returns 0 for missing entity', () => {
      const score = getSimplePositionScore('No brand here.', 'Acme');
      expect(score).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('handles case insensitive matching', () => {
      const result = calculatePositionScore('ACME CORP is here. acme corp again.', 'Acme Corp');
      expect(result.details.mentionCount).toBe(2);
    });

    it('handles empty text', () => {
      const result = calculatePositionScore('', 'Acme');
      expect(result.score).toBe(0);
    });

    it('handles very long text', () => {
      const longText = 'Start. ' + 'More text. '.repeat(100) + 'Acme Corp at end.';
      const result = calculatePositionScore(longText, 'Acme Corp');
      expect(result.score).toBeGreaterThan(0);
      expect(result.details.firstMentionPosition).toBeGreaterThan(0.9);
    });
  });
});
