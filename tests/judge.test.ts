import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { JudgeRubric } from '../src/types.js';

const { createMock, MockAPIError } = vi.hoisted(() => {
  const createMock = vi.fn();

  class MockAPIError extends Error {
    status: number;
    headers: Record<string, string>;
    constructor(status: number, message: string) {
      super(message);
      this.name = 'APIError';
      this.status = status;
      this.headers = {};
    }
  }

  return { createMock, MockAPIError };
});

vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages = { create: createMock };
      static APIError = MockAPIError;
    },
  };
});

import { createJudge } from '../src/judge.js';

const OK_RESPONSE = {
  content: [{ type: 'text', text: '{"score": 3, "reasoning": "Competent content", "suggestions": ["Add more examples"]}' }],
};

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

beforeEach(() => {
  createMock.mockReset();
  createMock.mockResolvedValue(OK_RESPONSE);
});

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
    createMock.mockResolvedValueOnce({
      content: [{ type: 'text', text: '{"score": 4, "reasoning": "Strong content"}' }],
    });

    const judge = createJudge({ apiKey: 'test-key' });
    const result = await judge.score('Some content', testRubric);

    expect(result.suggestions).toEqual([]);
  });

  it('filters out non-string suggestions', async () => {
    createMock.mockResolvedValueOnce({
      content: [{ type: 'text', text: '{"score": 2, "reasoning": "Weak", "suggestions": ["Fix this", 42, null]}' }],
    });

    const judge = createJudge({ apiKey: 'test-key' });
    const result = await judge.score('Some content', testRubric);

    expect(result.suggestions).toEqual(['Fix this']);
  });
});

describe('string rubric', () => {
  it('accepts a string rubric and returns score + reasoning', async () => {
    const judge = createJudge({ apiKey: 'test-key' });
    const result = await judge.score('Some content', 'Content is engaging and well-paced');

    expect(result.score).toBe(3);
    expect(result.reasoning).toBe('Competent content');
    expect(result.suggestions).toEqual(['Add more examples']);
  });

  it('builds prompt with default agreement scale', async () => {
    const judge = createJudge({ apiKey: 'test-key' });
    await judge.score('Some content', 'Content is engaging and well-paced');

    const callArgs = createMock.mock.calls[0][0];
    const prompt = callArgs.messages[0].content as string;
    expect(prompt).toContain('## Assertion to Evaluate');
    expect(prompt).toContain('Content is engaging and well-paced');
    expect(prompt).toContain('Strongly disagree');
    expect(prompt).toContain('Strongly agree');
    expect(prompt).toContain('Score this content on the assertion above');
  });

  it('includes context when provided', async () => {
    const judge = createJudge({ apiKey: 'test-key' });
    await judge.score('Some content', 'Is not apologetic', 'Topic: JavaScript closures');

    const callArgs = createMock.mock.calls[0][0];
    const prompt = callArgs.messages[0].content as string;
    expect(prompt).toContain('## Additional Context');
    expect(prompt).toContain('Topic: JavaScript closures');
  });

  it('handles markdown-wrapped JSON response', async () => {
    createMock.mockResolvedValueOnce({
      content: [{ type: 'text', text: '```json\n{"score": 4, "reasoning": "Good content"}\n```' }],
    });

    const judge = createJudge({ apiKey: 'test-key' });
    const result = await judge.score('Some content', 'Content is clear and concise');

    expect(result.score).toBe(4);
    expect(result.reasoning).toBe('Good content');
    expect(result.suggestions).toEqual([]);
  });

  it('defaults suggestions to empty array when missing', async () => {
    createMock.mockResolvedValueOnce({
      content: [{ type: 'text', text: '{"score": 5, "reasoning": "Excellent"}' }],
    });

    const judge = createJudge({ apiKey: 'test-key' });
    const result = await judge.score('Some content', 'Content is well-structured');

    expect(result.suggestions).toEqual([]);
  });
});

describe('retry logic', () => {
  const retryOpts = { apiKey: 'test-key', retries: 2, initialDelayMs: 0 };

  it('retries on rate limit (429) and succeeds', async () => {
    createMock
      .mockRejectedValueOnce(new MockAPIError(429, 'Rate limited'))
      .mockResolvedValueOnce(OK_RESPONSE);

    const judge = createJudge(retryOpts);
    const result = await judge.score('Some content', testRubric);

    expect(result.score).toBe(3);
    expect(createMock).toHaveBeenCalledTimes(2);
  });

  it('retries on server error (500) and succeeds', async () => {
    createMock
      .mockRejectedValueOnce(new MockAPIError(500, 'Internal server error'))
      .mockResolvedValueOnce(OK_RESPONSE);

    const judge = createJudge(retryOpts);
    const result = await judge.score('Some content', testRubric);

    expect(result.score).toBe(3);
    expect(createMock).toHaveBeenCalledTimes(2);
  });

  it('retries on overloaded (529) and succeeds', async () => {
    createMock
      .mockRejectedValueOnce(new MockAPIError(529, 'Overloaded'))
      .mockResolvedValueOnce(OK_RESPONSE);

    const judge = createJudge(retryOpts);
    const result = await judge.score('Some content', testRubric);

    expect(result.score).toBe(3);
    expect(createMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry on auth error (401)', async () => {
    createMock.mockRejectedValueOnce(new MockAPIError(401, 'Unauthorized'));

    const judge = createJudge({ ...retryOpts, retries: 3 });
    await expect(judge.score('Some content', testRubric)).rejects.toThrow('Unauthorized');

    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it('does not retry on bad request (400)', async () => {
    createMock.mockRejectedValueOnce(new MockAPIError(400, 'Bad request'));

    const judge = createJudge({ ...retryOpts, retries: 3 });
    await expect(judge.score('Some content', testRubric)).rejects.toThrow('Bad request');

    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it('throws after exhausting all retries', async () => {
    createMock
      .mockRejectedValueOnce(new MockAPIError(429, 'Rate limited'))
      .mockRejectedValueOnce(new MockAPIError(429, 'Rate limited'))
      .mockRejectedValueOnce(new MockAPIError(429, 'Rate limited'));

    const judge = createJudge(retryOpts);
    await expect(judge.score('Some content', testRubric)).rejects.toThrow('Rate limited');

    // initial + 2 retries = 3 calls
    expect(createMock).toHaveBeenCalledTimes(3);
  });

  it('retries on network errors', async () => {
    const networkError = Object.assign(new Error('connect ECONNRESET'), { code: 'ECONNRESET' });
    createMock
      .mockRejectedValueOnce(networkError)
      .mockResolvedValueOnce(OK_RESPONSE);

    const judge = createJudge(retryOpts);
    const result = await judge.score('Some content', testRubric);

    expect(result.score).toBe(3);
    expect(createMock).toHaveBeenCalledTimes(2);
  });

  it('retries multiple times before succeeding', async () => {
    createMock
      .mockRejectedValueOnce(new MockAPIError(503, 'Service unavailable'))
      .mockRejectedValueOnce(new MockAPIError(503, 'Service unavailable'))
      .mockResolvedValueOnce(OK_RESPONSE);

    const judge = createJudge({ ...retryOpts, retries: 3 });
    const result = await judge.score('Some content', testRubric);

    expect(result.score).toBe(3);
    expect(createMock).toHaveBeenCalledTimes(3);
  });

  it('respects retries: 0 option (no retries)', async () => {
    createMock.mockRejectedValueOnce(new MockAPIError(429, 'Rate limited'));

    const judge = createJudge({ ...retryOpts, retries: 0 });
    await expect(judge.score('Some content', testRubric)).rejects.toThrow('Rate limited');

    expect(createMock).toHaveBeenCalledTimes(1);
  });
});
