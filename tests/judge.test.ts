import { describe, it, expect, vi } from 'vitest';
import type { JudgeRubric } from '../src/types.js';

// Mock the Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  const createMock = vi.fn().mockResolvedValue({
    content: [{ type: 'text', text: '{"score": 3, "reasoning": "Competent content", "suggestions": ["Add more examples"]}' }],
  });
  return {
    default: class MockAnthropic {
      messages = { create: createMock };
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

  it('parses JSON response and returns score + reasoning + suggestions', async () => {
    const judge = createJudge({ apiKey: 'test-key' });
    const result = await judge.score('Some content', testRubric);

    expect(result.score).toBe(3);
    expect(result.reasoning).toBe('Competent content');
    expect(result.suggestions).toEqual(['Add more examples']);
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

  it('defaults suggestions to empty array when missing from response', async () => {
    // Override the mock for this test to return no suggestions
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const instance = new Anthropic({ apiKey: 'test' });
    vi.mocked(instance.messages.create).mockResolvedValueOnce({
      content: [{ type: 'text', text: '{"score": 4, "reasoning": "Strong content"}' }],
    } as any);

    const judge = createJudge({ apiKey: 'test-key' });
    const result = await judge.score('Some content', testRubric);

    expect(result.suggestions).toEqual([]);
  });

  it('filters out non-string suggestions', async () => {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const instance = new Anthropic({ apiKey: 'test' });
    vi.mocked(instance.messages.create).mockResolvedValueOnce({
      content: [{ type: 'text', text: '{"score": 2, "reasoning": "Weak", "suggestions": ["Fix this", 42, null]}' }],
    } as any);

    const judge = createJudge({ apiKey: 'test-key' });
    const result = await judge.score('Some content', testRubric);

    expect(result.suggestions).toEqual(['Fix this']);
  });
});
