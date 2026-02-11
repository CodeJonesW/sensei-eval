import { describe, it, expect, beforeAll } from 'vitest';
import { loadFixture, createIntegrationRunner } from './helpers.js';
import type { EvalResult } from '../../src/types.js';

const describeIntegration = process.env.ANTHROPIC_API_KEY
  ? describe
  : describe.skip;

describeIntegration('Full pipeline integration', () => {
  let lessonResult: EvalResult;
  let challengeResult: EvalResult;
  let reviewResult: EvalResult;

  beforeAll(async () => {
    const runner = createIntegrationRunner();

    lessonResult = await runner.evaluate({
      content: loadFixture('good-lesson.md'),
      contentType: 'lesson',
      topic: 'neural networks',
      difficulty: 'beginner',
    });
    challengeResult = await runner.evaluate({
      content: loadFixture('good-challenge.md'),
      contentType: 'challenge',
      difficulty: 'medium',
    });
    reviewResult = await runner.evaluate({
      content: loadFixture('good-review.md'),
      contentType: 'review',
    });
  });

  describe('criteria filtering', () => {
    it('applies lesson-specific criteria to lessons', () => {
      const criteriaNames = lessonResult.scores.map((s) => s.criterion);
      expect(criteriaNames).toContain('topic_accuracy');
      expect(criteriaNames).toContain('pedagogical_structure');
      expect(criteriaNames).toContain('code_quality');
      expect(criteriaNames).toContain('progressive_difficulty');
      expect(criteriaNames).not.toContain('problem_clarity');
      expect(criteriaNames).not.toContain('actionability');
    });

    it('applies challenge-specific criteria to challenges', () => {
      const criteriaNames = challengeResult.scores.map((s) => s.criterion);
      expect(criteriaNames).toContain('problem_clarity');
      expect(criteriaNames).toContain('hint_quality');
      expect(criteriaNames).toContain('testability');
      expect(criteriaNames).not.toContain('topic_accuracy');
      expect(criteriaNames).not.toContain('actionability');
    });

    it('applies review-specific criteria to reviews', () => {
      const criteriaNames = reviewResult.scores.map((s) => s.criterion);
      expect(criteriaNames).toContain('brevity');
      expect(criteriaNames).toContain('actionability');
      expect(criteriaNames).toContain('honesty');
      expect(criteriaNames).not.toContain('topic_accuracy');
      expect(criteriaNames).not.toContain('problem_clarity');
    });

    it('applies universal criteria to all content types', () => {
      for (const result of [lessonResult, challengeResult, reviewResult]) {
        const criteriaNames = result.scores.map((s) => s.criterion);
        expect(criteriaNames).toContain('format_compliance');
        expect(criteriaNames).toContain('length_compliance');
        expect(criteriaNames).toContain('engagement');
        expect(criteriaNames).toContain('repetition_avoidance');
      }
    });
  });

  describe('good fixtures pass overall', () => {
    it('good lesson passes and scores > 0.6', () => {
      expect(lessonResult.passed).toBe(true);
      expect(lessonResult.overallScore).toBeGreaterThan(0.6);
    });

    it('good challenge passes and scores > 0.6', () => {
      expect(challengeResult.passed).toBe(true);
      expect(challengeResult.overallScore).toBeGreaterThan(0.6);
    });

    it('good review passes and scores > 0.6', () => {
      expect(reviewResult.passed).toBe(true);
      expect(reviewResult.overallScore).toBeGreaterThan(0.6);
    });
  });

  describe('score validity', () => {
    it('all scores have reasoning strings', () => {
      for (const result of [lessonResult, challengeResult, reviewResult]) {
        for (const score of result.scores) {
          expect(score.reasoning).toBeTruthy();
          expect(typeof score.reasoning).toBe('string');
        }
      }
    });

    it('all scores are in [0, 1] range', () => {
      for (const result of [lessonResult, challengeResult, reviewResult]) {
        for (const score of result.scores) {
          expect(score.score).toBeGreaterThanOrEqual(0);
          expect(score.score).toBeLessThanOrEqual(1);
        }
      }
    });
  });
});
