import { describe, it, expect, vi } from 'vitest';
import type { JudgeRubric } from '../src/types.js';

// Mock the Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages = {
        create: vi.fn().mockResolvedValue({
          content: [{ type: 'text', text: '{"score": 3, "reasoning": "Competent content"}' }],
        }),
      };
    },
  };
});

import { createJudge } from '../src/judge.js';

const testRubric: JudgeRubric = {
  criterion: 'Test Criterion',
  description: 'A test criterion for unit testing',
  scale: [
    { score: 1, label: 'Poor', description: 'Very bad' },
    { score: 2, label: 'Below average', description: 'Needs work' },
    { score: 3, label: 'Competent', description: 'Acceptable' },
    { score: 4, label: 'Good', description: 'Above average' },
    { score: 5, label: 'Excellent', description: 'Outstanding' },
  ],
};

describe('createJudge', () => {
  it('returns a judge with a score method', () => {
    const judge = createJudge({ apiKey: 'test-key' });
    expect(judge.score).toBeTypeOf('function');
  });

  it('parses JSON response and returns score + reasoning', async () => {
    const judge = createJudge({ apiKey: 'test-key' });
    const result = await judge.score('Some content', testRubric);

    expect(result.score).toBe(3);
    expect(result.reasoning).toBe('Competent content');
  });

  it('passes context when provided', async () => {
    const judge = createJudge({ apiKey: 'test-key' });
    const result = await judge.score(
      'Some content',
      testRubric,
      'Expected topic: Neural Networks',
    );

    expect(result.score).toBe(3);
    expect(result.reasoning).toBe('Competent content');
  });
});
