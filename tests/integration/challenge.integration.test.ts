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

describeIntegration('Challenge discrimination', () => {
  let good: EvalResult;
  let bad: EvalResult;
  let mediocre: EvalResult;

  beforeAll(async () => {
    const runner = createIntegrationRunner();

    good = await runner.evaluate({
      content: loadFixture('good-challenge.md'),
      contentType: 'challenge',
      difficulty: 'medium',
    });
    bad = await runner.evaluate({
      content: loadFixture('bad-challenge.md'),
      contentType: 'challenge',
      difficulty: 'medium',
    });
    mediocre = await runner.evaluate({
      content: loadFixture('mediocre-challenge.md'),
      contentType: 'challenge',
      difficulty: 'easy',
    });
  });

  describe('pass/fail discrimination', () => {
    it('good challenge passes overall', () => {
      expect(good.passed).toBe(true);
    });

    it('good challenge passes all challenge-specific criteria', () => {
      const challengeCriteria = ['problem_clarity', 'difficulty_calibration', 'hint_quality', 'testability'];
      for (const name of challengeCriteria) {
        const score = good.scores.find((s) => s.criterion === name);
        expect(score?.passed, `${name} should pass`).toBe(true);
      }
    });

    it('bad challenge fails overall', () => {
      expect(bad.passed).toBe(false);
    });
  });

  describe('score range discrimination', () => {
    it('good challenge scores > 0.65 overall', () => {
      expect(good.overallScore).toBeGreaterThan(0.65);
    });

    it('bad challenge scores < 0.35 overall', () => {
      expect(bad.overallScore).toBeLessThan(0.35);
    });

    it('mediocre challenge scores between good and bad', () => {
      expect(mediocre.overallScore).toBeGreaterThan(bad.overallScore);
      expect(mediocre.overallScore).toBeLessThan(good.overallScore);
    });
  });

  describe('per-criterion score gaps (good vs bad >= 0.25)', () => {
    it('problem_clarity discriminates', () => {
      assertScoreGap(good, bad, 'problem_clarity', 0.25);
    });

    it('hint_quality discriminates', () => {
      assertScoreGap(good, bad, 'hint_quality', 0.25);
    });

    it('testability discriminates', () => {
      assertScoreGap(good, bad, 'testability', 0.25);
    });
  });
});
