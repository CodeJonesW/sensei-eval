import { describe, it, expect, vi, beforeEach } from 'vitest';
import { topicAccuracy, pedagogicalStructure, codeQuality, progressiveDifficulty } from '../../src/criteria/lesson.js';
import type { EvalInput, Judge } from '../../src/types.js';

let mockJudge: Judge;

beforeEach(() => {
  mockJudge = {
    score: vi.fn(),
  };
});

function makeInput(overrides: Partial<EvalInput> = {}): EvalInput {
  return {
    content: '# Lesson\n\nSome content',
    contentType: 'lesson',
    ...overrides,
  };
}

describe('topic_accuracy', () => {
  it('normalizes 1-5 score to 0-1', async () => {
    vi.mocked(mockJudge.score).mockResolvedValue({ score: 4, reasoning: 'On topic' });
    const result = await topicAccuracy.evaluate(makeInput({ topic: 'ML' }), mockJudge);

    expect(result.score).toBeCloseTo(0.75); // (4-1)/4
    expect(result.rawScore).toBe(4);
    expect(result.maxScore).toBe(5);
    expect(result.passed).toBe(true);
  });

  it('passes topic as context to judge', async () => {
    vi.mocked(mockJudge.score).mockResolvedValue({ score: 3, reasoning: 'ok' });
    await topicAccuracy.evaluate(makeInput({ topic: 'Neural Networks' }), mockJudge);

    expect(mockJudge.score).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Object),
      'Expected topic: Neural Networks',
    );
  });

  it('fails for low scores', async () => {
    vi.mocked(mockJudge.score).mockResolvedValue({ score: 1, reasoning: 'Off-topic' });
    const result = await topicAccuracy.evaluate(makeInput(), mockJudge);

    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
  });

  it('throws without judge', async () => {
    await expect(topicAccuracy.evaluate(makeInput())).rejects.toThrow('Judge required');
  });

  it('only applies to lesson content type', () => {
    expect(topicAccuracy.contentTypes).toEqual(['lesson']);
  });
});

describe('pedagogical_structure', () => {
  it('normalizes score and checks pass/fail', async () => {
    vi.mocked(mockJudge.score).mockResolvedValue({ score: 3, reasoning: 'Solid structure' });
    const result = await pedagogicalStructure.evaluate(makeInput(), mockJudge);

    expect(result.score).toBeCloseTo(0.5);
    expect(result.passed).toBe(true);
    expect(result.criterion).toBe('pedagogical_structure');
  });

  it('has higher weight than default', () => {
    expect(pedagogicalStructure.weight).toBe(1.5);
  });
});

describe('code_quality', () => {
  it('normalizes score correctly', async () => {
    vi.mocked(mockJudge.score).mockResolvedValue({ score: 5, reasoning: 'Exemplary' });
    const result = await codeQuality.evaluate(makeInput(), mockJudge);

    expect(result.score).toBe(1.0);
    expect(result.passed).toBe(true);
  });
});

describe('progressive_difficulty', () => {
  it('passes difficulty as context', async () => {
    vi.mocked(mockJudge.score).mockResolvedValue({ score: 3, reasoning: 'ok' });
    await progressiveDifficulty.evaluate(
      makeInput({ difficulty: 'intermediate' }),
      mockJudge,
    );

    expect(mockJudge.score).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Object),
      'Expected difficulty level: intermediate',
    );
  });
});
