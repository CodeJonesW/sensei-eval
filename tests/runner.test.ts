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
        score: vi.fn().mockResolvedValue({ score: 4, reasoning: 'Good' }),
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
    });
  });
});
