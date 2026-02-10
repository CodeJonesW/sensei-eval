import { describe, it, expect, vi, beforeEach } from 'vitest';
import { problemClarity, difficultyCalibration, hintQuality, testability } from '../../src/criteria/challenge.js';
import type { EvalInput, Judge } from '../../src/types.js';

let mockJudge: Judge;

beforeEach(() => {
  mockJudge = {
    score: vi.fn(),
  };
});

function makeInput(overrides: Partial<EvalInput> = {}): EvalInput {
  return {
    content: '# Challenge\n\nSolve this problem.',
    contentType: 'challenge',
    ...overrides,
  };
}

describe('problem_clarity', () => {
  it('normalizes and passes for good score', async () => {
    vi.mocked(mockJudge.score).mockResolvedValue({ score: 4, reasoning: 'Clear problem' });
    const result = await problemClarity.evaluate(makeInput(), mockJudge);

    expect(result.score).toBeCloseTo(0.75);
    expect(result.passed).toBe(true);
    expect(result.criterion).toBe('problem_clarity');
  });

  it('fails for unclear problems', async () => {
    vi.mocked(mockJudge.score).mockResolvedValue({ score: 1, reasoning: 'Completely unclear' });
    const result = await problemClarity.evaluate(makeInput(), mockJudge);

    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
  });

  it('only applies to challenge content type', () => {
    expect(problemClarity.contentTypes).toEqual(['challenge']);
  });

  it('has higher weight (1.5)', () => {
    expect(problemClarity.weight).toBe(1.5);
  });
});

describe('difficulty_calibration', () => {
  it('passes difficulty context to judge', async () => {
    vi.mocked(mockJudge.score).mockResolvedValue({ score: 3, reasoning: 'ok' });
    await difficultyCalibration.evaluate(
      makeInput({ difficulty: 'hard' }),
      mockJudge,
    );

    expect(mockJudge.score).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Object),
      'Expected difficulty: hard',
    );
  });

  it('does not pass context when no difficulty specified', async () => {
    vi.mocked(mockJudge.score).mockResolvedValue({ score: 3, reasoning: 'ok' });
    await difficultyCalibration.evaluate(makeInput(), mockJudge);

    expect(mockJudge.score).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Object),
      undefined,
    );
  });
});

describe('hint_quality', () => {
  it('scores hint quality', async () => {
    vi.mocked(mockJudge.score).mockResolvedValue({ score: 4, reasoning: 'Good progressive hints' });
    const result = await hintQuality.evaluate(makeInput(), mockJudge);

    expect(result.score).toBeCloseTo(0.75);
    expect(result.passed).toBe(true);
  });
});

describe('testability', () => {
  it('scores testability', async () => {
    vi.mocked(mockJudge.score).mockResolvedValue({ score: 5, reasoning: 'Full test cases' });
    const result = await testability.evaluate(makeInput(), mockJudge);

    expect(result.score).toBe(1.0);
    expect(result.passed).toBe(true);
  });

  it('throws without judge', async () => {
    await expect(testability.evaluate(makeInput())).rejects.toThrow('Judge required');
  });
});
