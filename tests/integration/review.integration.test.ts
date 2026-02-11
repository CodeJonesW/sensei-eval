import { describe, it, expect, beforeAll } from 'vitest';
import {
  loadFixture,
  createIntegrationRunner,
  assertScoreGap,
} from './helpers.js';
import type { EvalResult } from '../../src/types.js';

const describeIntegration = process.env.ANTHROPIC_API_KEY
  ? describe
  : describe.skip;

describeIntegration('Review discrimination', () => {
  let good: EvalResult;
  let bad: EvalResult;
  let mediocre: EvalResult;

  beforeAll(async () => {
    const runner = createIntegrationRunner();

    good = await runner.evaluate({
      content: loadFixture('good-review.md'),
      contentType: 'review',
    });
    bad = await runner.evaluate({
      content: loadFixture('bad-review.md'),
      contentType: 'review',
    });
    mediocre = await runner.evaluate({
      content: loadFixture('mediocre-review.md'),
      contentType: 'review',
    });
  });

  describe('pass/fail discrimination', () => {
    it('good review passes overall', () => {
      expect(good.passed).toBe(true);
    });

    it('good review passes all review-specific criteria', () => {
      const reviewCriteria = ['brevity', 'actionability', 'honesty'];
      for (const name of reviewCriteria) {
        const score = good.scores.find((s) => s.criterion === name);
        expect(score?.passed, `${name} should pass`).toBe(true);
      }
    });

    it('bad review fails overall', () => {
      expect(bad.passed).toBe(false);
    });
  });

  describe('score range discrimination', () => {
    it('good review scores > 0.65 overall', () => {
      expect(good.overallScore).toBeGreaterThan(0.65);
    });

    it('bad review scores < 0.55 overall', () => {
      expect(bad.overallScore).toBeLessThan(0.55);
    });

    it('mediocre review scores between good and bad', () => {
      expect(mediocre.overallScore).toBeGreaterThan(bad.overallScore);
      expect(mediocre.overallScore).toBeLessThan(good.overallScore);
    });
  });

  describe('per-criterion score gaps (good vs bad >= 0.25)', () => {
    it('actionability discriminates', () => {
      assertScoreGap(good, bad, 'actionability', 0.25);
    });

    it('honesty discriminates', () => {
      assertScoreGap(good, bad, 'honesty', 0.25);
    });

    // brevity may have low discrimination — both good and bad reviews
    // can be under 2000 chars, so both pass. This is expected behavior.
  });
});
