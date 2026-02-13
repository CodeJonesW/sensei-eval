import { describe, it, expect, vi } from 'vitest';
import { EvalRunner } from '../src/runner.js';
import { formatCompliance, lengthCompliance, hasCodeBlockCriterion, hasStructure } from '../src/criteria/universal.js';
import { brevity } from '../src/criteria/review.js';
import type { EvalCriterion, EvalInput, Judge } from '../src/types.js';

function makeInput(content: string, contentType = 'lesson'): EvalInput {
  return { content, contentType };
}

describe('EvalRunner', () => {
  describe('getCriteria', () => {
    it('filters criteria by content type', () => {
      const runner = new EvalRunner({
        criteria: [formatCompliance, hasCodeBlockCriterion, brevity],
      });

      const lessonCriteria = runner.getCriteria('lesson');
      expect(lessonCriteria.map((c) => c.name)).toContain('format_compliance');
      expect(lessonCriteria.map((c) => c.name)).toContain('has_code_block');
      expect(lessonCriteria.map((c) => c.name)).not.toContain('brevity');
    });

    it('includes wildcard criteria for any content type', () => {
      const runner = new EvalRunner({
        criteria: [formatCompliance, hasCodeBlockCriterion],
      });

      const reviewCriteria = runner.getCriteria('review');
      expect(reviewCriteria.map((c) => c.name)).toContain('format_compliance');
      expect(reviewCriteria.map((c) => c.name)).not.toContain('has_code_block');
    });
  });

  describe('quickCheck', () => {
    it('runs only deterministic criteria', async () => {
      const runner = new EvalRunner({
        criteria: [formatCompliance, lengthCompliance, hasCodeBlockCriterion, hasStructure],
      });

      const content = '# Test\n\nSome content\n\n## More\n\n```js\nconsole.log("hi");\n```\n\n' + 'a'.repeat(400);
      const result = await runner.quickCheck(makeInput(content));

      expect(result.scores.length).toBe(4);
      expect(result.contentType).toBe('lesson');
      expect(result.evaluatedAt).toBeTruthy();
      expect(result.feedback).toBeDefined();
    });

    it('skips LLM criteria even if present', async () => {
      const llmCriterion: EvalCriterion = {
        name: 'fake_llm',
        description: 'test',
        contentTypes: '*',
        method: 'llm_judge',
        threshold: 0.5,
        weight: 1.0,
        evaluate: vi.fn(),
      };

      const runner = new EvalRunner({
        criteria: [formatCompliance, llmCriterion],
      });

      const result = await runner.quickCheck(makeInput('some content'));
      expect(result.scores.length).toBe(1);
      expect(llmCriterion.evaluate).not.toHaveBeenCalled();
    });

    it('computes weighted overall score', async () => {
      const runner = new EvalRunner({
        criteria: [formatCompliance, hasStructure],
      });

      // Good format (weight 1.0, score 1.0) + no structure (weight 0.5, score 0.0)
      const result = await runner.quickCheck(makeInput('just text no headings'));
      // expected: (1.0 * 1.0 + 0.0 * 0.5) / (1.0 + 0.5) = 0.667
      expect(result.overallScore).toBeCloseTo(0.667, 2);
    });

    it('marks passed=false when any criterion fails', async () => {
      const runner = new EvalRunner({
        criteria: [formatCompliance, hasCodeBlockCriterion],
      });

      const result = await runner.quickCheck(makeInput('# Heading\n\nNo code block here.'));
      expect(result.passed).toBe(false);
    });

    it('marks passed=true when all criteria pass', async () => {
      const runner = new EvalRunner({
        criteria: [formatCompliance],
      });

      const result = await runner.quickCheck(makeInput('clean content'));
      expect(result.passed).toBe(true);
    });
  });

  describe('optional criteria', () => {
    const failingOptional: EvalCriterion = {
      name: 'optional_check',
      description: 'optional criterion that always fails',
      contentTypes: '*',
      method: 'deterministic',
      threshold: 1.0,
      weight: 1.0,
      optional: true,
      async evaluate(): Promise<import('../src/types.js').EvalScore> {
        return {
          criterion: 'optional_check',
          score: 0.0,
          rawScore: 0,
          maxScore: 1,
          passed: false,
          reasoning: 'Always fails',
          suggestions: ['Fix the optional check'],
        };
      },
    };

    it('failing optional criterion does NOT block passed', async () => {
      const runner = new EvalRunner({
        criteria: [formatCompliance, failingOptional],
      });

      const result = await runner.quickCheck(makeInput('clean content'));
      expect(result.passed).toBe(true);
    });

    it('failing optional criterion still affects overallScore', async () => {
      const runner = new EvalRunner({
        criteria: [formatCompliance, failingOptional],
      });

      const result = await runner.quickCheck(makeInput('clean content'));
      // formatCompliance passes (score 1.0, weight 1.0), optional fails (score 0.0, weight 1.0)
      // expected: (1.0 * 1.0 + 0.0 * 1.0) / (1.0 + 1.0) = 0.5
      expect(result.overallScore).toBeCloseTo(0.5, 2);
    });
  });

  describe('evaluate', () => {
    it('throws when LLM criterion present but no judge', async () => {
      const llmCriterion: EvalCriterion = {
        name: 'fake_llm',
        description: 'test',
        contentTypes: '*',
        method: 'llm_judge',
        threshold: 0.5,
        weight: 1.0,
        evaluate: vi.fn().mockRejectedValue(new Error('Judge required')),
      };

      const runner = new EvalRunner({
        criteria: [llmCriterion],
      });

      await expect(runner.evaluate(makeInput('content'))).rejects.toThrow(
        'LLM judge required',
      );
    });

    it('runs both deterministic and LLM criteria', async () => {
      const mockJudge: Judge = {
        score: vi.fn().mockResolvedValue({ score: 4, reasoning: 'Good', suggestions: [] }),
      };

      const llmCriterion: EvalCriterion = {
        name: 'mock_llm',
        description: 'test',
        contentTypes: '*',
        method: 'llm_judge',
        threshold: 0.5,
        weight: 1.0,
        async evaluate(input, judge) {
          const result = await judge!.score(input.content, {
            criterion: 'test',
            description: 'test',
            scale: [],
          });
          return {
            criterion: 'mock_llm',
            score: result.score / 5,
            rawScore: result.score,
            maxScore: 5,
            passed: true,
            reasoning: result.reasoning,
            suggestions: result.suggestions ?? [],
          };
        },
      };

      const runner = new EvalRunner({
        criteria: [formatCompliance, llmCriterion],
        judge: mockJudge,
      });

      const result = await runner.evaluate(makeInput('test content'));
      expect(result.scores.length).toBe(2);
      expect(result.scores.map((s) => s.criterion)).toContain('format_compliance');
      expect(result.scores.map((s) => s.criterion)).toContain('mock_llm');
      expect(result.feedback).toBeDefined();
    });
  });

  describe('feedback', () => {
    it('returns failed criteria with reasoning and suggestions', async () => {
      const runner = new EvalRunner({
        criteria: [formatCompliance, hasCodeBlockCriterion],
      });

      // No code block → has_code_block fails
      const result = await runner.quickCheck(makeInput('# Heading\n\nNo code here.'));
      expect(result.feedback.failedCriteria.length).toBeGreaterThan(0);

      const failed = result.feedback.failedCriteria.find((f) => f.criterion === 'has_code_block');
      expect(failed).toBeDefined();
      expect(failed!.suggestions).toContain('Add at least one fenced code block');
    });

    it('returns strengths from high-scoring criteria', async () => {
      const runner = new EvalRunner({
        criteria: [formatCompliance],
      });

      const result = await runner.quickCheck(makeInput('clean content'));
      // formatCompliance passes with score 1.0 (>= 0.75)
      expect(result.feedback.strengths.length).toBeGreaterThan(0);
      expect(result.feedback.strengths[0]).toContain('properly closed');
    });

    it('aggregates suggestions from failed criteria', async () => {
      const runner = new EvalRunner({
        criteria: [hasCodeBlockCriterion, hasStructure],
      });

      // No code block, no headings
      const result = await runner.quickCheck(makeInput('just plain text'));
      expect(result.feedback.suggestions.length).toBeGreaterThan(0);
      expect(result.feedback.suggestions.some((s) => s.includes('code block'))).toBe(true);
      expect(result.feedback.suggestions.some((s) => s.includes('heading'))).toBe(true);
    });

    it('returns empty feedback arrays when all criteria pass', async () => {
      const runner = new EvalRunner({
        criteria: [formatCompliance],
      });

      const result = await runner.quickCheck(makeInput('clean content'));
      expect(result.feedback.failedCriteria).toEqual([]);
      expect(result.feedback.suggestions).toEqual([]);
      expect(result.feedback.strengths.length).toBeGreaterThan(0);
    });

    it('orders suggestions by criterion weight descending', async () => {
      // Create two failing criteria with different weights
      const highWeight: EvalCriterion = {
        name: 'high_weight',
        description: 'high weight criterion',
        contentTypes: '*',
        method: 'deterministic',
        threshold: 1.0,
        weight: 1.5,
        async evaluate(): Promise<import('../src/types.js').EvalScore> {
          return {
            criterion: 'high_weight',
            score: 0.0,
            rawScore: 0,
            maxScore: 1,
            passed: false,
            reasoning: 'Failed high weight',
            suggestions: ['Fix high weight issue'],
          };
        },
      };

      const lowWeight: EvalCriterion = {
        name: 'low_weight',
        description: 'low weight criterion',
        contentTypes: '*',
        method: 'deterministic',
        threshold: 1.0,
        weight: 0.5,
        async evaluate(): Promise<import('../src/types.js').EvalScore> {
          return {
            criterion: 'low_weight',
            score: 0.0,
            rawScore: 0,
            maxScore: 1,
            passed: false,
            reasoning: 'Failed low weight',
            suggestions: ['Fix low weight issue'],
          };
        },
      };

      const runner = new EvalRunner({
        criteria: [lowWeight, highWeight],
      });

      const result = await runner.quickCheck(makeInput('test'));
      // High weight suggestions should come first
      expect(result.feedback.suggestions[0]).toBe('Fix high weight issue');
      expect(result.feedback.suggestions[1]).toBe('Fix low weight issue');
    });
  });
});
