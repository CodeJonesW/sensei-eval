import { describe, it, expect, beforeAll } from 'vitest';
import {
  loadFixture,
  createIntegrationRunner,
  assertScoreGap,
  getScore,
} from './helpers.js';
import type { EvalResult } from '../../src/types.js';

const describeIntegration = process.env.ANTHROPIC_API_KEY
  ? describe
  : describe.skip;

describeIntegration('Lesson discrimination', () => {
  let good: EvalResult;
  let bad: EvalResult;
  let mediocre: EvalResult;
  let subtleBad: EvalResult;

  beforeAll(async () => {
    const runner = createIntegrationRunner();

    good = await runner.evaluate({
      content: loadFixture('good-lesson.md'),
      contentType: 'lesson',
      topic: 'neural networks',
      difficulty: 'beginner',
    });
    bad = await runner.evaluate({
      content: loadFixture('bad-lesson.md'),
      contentType: 'lesson',
      topic: 'neural networks',
      difficulty: 'beginner',
    });
    mediocre = await runner.evaluate({
      content: loadFixture('mediocre-lesson.md'),
      contentType: 'lesson',
      topic: 'JavaScript closures',
      difficulty: 'intermediate',
    });
    subtleBad = await runner.evaluate({
      content: loadFixture('subtle-bad-lesson.md'),
      contentType: 'lesson',
      topic: 'JavaScript array methods',
      difficulty: 'beginner',
    });
  });

  describe('pass/fail discrimination', () => {
    it('good lesson passes overall', () => {
      expect(good.passed).toBe(true);
    });

    it('bad lesson fails overall', () => {
      expect(bad.passed).toBe(false);
    });
  });

  describe('score range discrimination', () => {
    it('good lesson scores > 0.65 overall', () => {
      expect(good.overallScore).toBeGreaterThan(0.65);
    });

    it('bad lesson scores < 0.35 overall', () => {
      expect(bad.overallScore).toBeLessThan(0.35);
    });

    it('mediocre lesson scores between good and bad', () => {
      expect(mediocre.overallScore).toBeGreaterThan(bad.overallScore);
      expect(mediocre.overallScore).toBeLessThan(good.overallScore);
    });
  });

  describe('per-criterion score gaps (good vs bad >= 0.25)', () => {
    it('topic_accuracy discriminates', () => {
      assertScoreGap(good, bad, 'topic_accuracy', 0.25);
    });

    it('pedagogical_structure discriminates', () => {
      assertScoreGap(good, bad, 'pedagogical_structure', 0.25);
    });

    it('code_quality discriminates', () => {
      assertScoreGap(good, bad, 'code_quality', 0.25);
    });

    it('engagement discriminates', () => {
      assertScoreGap(good, bad, 'engagement', 0.25);
    });
  });

  describe('subtle-bad lesson detection', () => {
    it('passes deterministic checks', () => {
      const deterministicCriteria = [
        'format_compliance',
        'length_compliance',
        'has_code_block',
        'has_structure',
      ];
      for (const name of deterministicCriteria) {
        const score = subtleBad.scores.find((s) => s.criterion === name);
        if (score) {
          expect(score.passed, `${name} should pass for subtle-bad`).toBe(true);
        }
      }
    });

    it('scores lower than good lesson on code_quality or topic_accuracy', () => {
      const llmCriteria = ['code_quality', 'topic_accuracy'];
      let atLeastOneLower = false;

      for (const name of llmCriteria) {
        const subtleBadScore = subtleBad.scores.find((s) => s.criterion === name);
        const goodScore = good.scores.find((s) => s.criterion === name);
        if (subtleBadScore && goodScore && goodScore.score - subtleBadScore.score >= 0.15) {
          atLeastOneLower = true;
        }
      }

      expect(
        atLeastOneLower,
        `Expected subtle-bad to score meaningfully lower than good on code_quality or topic_accuracy`,
      ).toBe(true);
    });
  });
});
