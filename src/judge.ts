import Anthropic from '@anthropic-ai/sdk';
import type { Judge, Rubric } from './types.js';

const JUDGE_SYSTEM_PROMPT = `You are an expert evaluator of educational content. You score content against a specific rubric criterion.

Scoring calibration:
- 1/5: Fundamentally broken or missing
- 2/5: Present but poor quality, major issues
- 3/5: Competent and functional — this is the baseline for acceptable content
- 4/5: Strong quality, minor issues only
- 5/5: Exceptional — reserve this for truly outstanding content

Do NOT inflate scores. A 3/5 is a positive assessment meaning "this works well." Most good content should score 3 or 4.

You MUST respond with ONLY a JSON object in this exact format, no other text:
{"score": <number>, "reasoning": "<brief explanation>", "suggestions": ["<actionable suggestion>", ...]}

For scores of 4-5, return an empty suggestions array. For scores of 1-3, provide 1-3 specific, actionable suggestions for improvement.`;

const DEFAULT_RETRIES = 3;
const INITIAL_DELAY_MS = 1000;
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 529]);

function isRetryable(err: unknown): boolean {
  if (err instanceof Anthropic.APIError) {
    return RETRYABLE_STATUS_CODES.has(err.status);
  }
  // Network errors (ECONNRESET, ETIMEDOUT, etc.)
  if (err instanceof Error && 'code' in err) {
    return true;
  }
  return false;
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries: number, baseDelay: number): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === maxRetries || !isRetryable(err)) {
        throw err;
      }
      const delay = baseDelay * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

export function createJudge(opts: {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  retries?: number;
  initialDelayMs?: number;
}): Judge {
  const client = new Anthropic({ apiKey: opts.apiKey });
  const model = opts.model ?? 'claude-sonnet-4-20250514';
  const maxTokens = opts.maxTokens ?? 750;
  const retries = opts.retries ?? DEFAULT_RETRIES;
  const initialDelayMs = opts.initialDelayMs ?? INITIAL_DELAY_MS;

  return {
    async score(content: string, rubric: Rubric, context?: string) {
      let userPrompt: string;

      if (typeof rubric === 'string') {
        userPrompt = [
          `## Assertion to Evaluate`,
          rubric,
          '',
          `## Scoring Scale`,
          `1 — Strongly disagree: The content clearly fails this assertion`,
          `2 — Disagree: The content mostly fails this assertion`,
          `3 — Neutral: The content partially meets this assertion`,
          `4 — Agree: The content mostly meets this assertion`,
          `5 — Strongly agree: The content clearly meets this assertion`,
          '',
          context ? `## Additional Context\n${context}\n` : '',
          `## Content to Evaluate`,
          content,
          '',
          `Score this content on the assertion above. Respond with ONLY a JSON object: {"score": <number>, "reasoning": "<brief explanation>", "suggestions": ["<actionable suggestion>", ...]}`,
        ]
          .filter(Boolean)
          .join('\n');
      } else {
        const scaleDescription = rubric.scale
          .map((s) => `${s.score} — ${s.label}: ${s.description}`)
          .join('\n');

        const examplesSection = rubric.examples?.length
          ? [
              '## Examples',
              ...rubric.examples.map(
                (ex) =>
                  `### Example (Score: ${ex.score}/5)\nContent: "${ex.content}"\nReasoning: "${ex.reasoning}"`,
              ),
            ].join('\n\n')
          : '';

        userPrompt = [
          `## Criterion: ${rubric.criterion}`,
          rubric.description,
          '',
          `## Scoring Scale`,
          scaleDescription,
          '',
          examplesSection,
          context ? `## Additional Context\n${context}\n` : '',
          `## Content to Evaluate`,
          content,
          '',
          `Score this content on the criterion above. Respond with ONLY a JSON object: {"score": <number>, "reasoning": "<brief explanation>", "suggestions": ["<actionable suggestion>", ...]}`,
        ]
          .filter(Boolean)
          .join('\n');
      }

      const response = await withRetry(
        () =>
          client.messages.create({
            model,
            max_tokens: maxTokens,
            system: JUDGE_SYSTEM_PROMPT,
            messages: [{ role: 'user', content: userPrompt }],
          }),
        retries,
        initialDelayMs,
      );

      let text =
        response.content[0].type === 'text' ? response.content[0].text : '';

      // Strip markdown code fences if the model wraps its JSON response
      text = text.trim();
      if (text.startsWith('```')) {
        text = text.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
      }

      const parsed = JSON.parse(text) as {
        score: number;
        reasoning: string;
        suggestions?: unknown;
      };

      if (
        typeof parsed.score !== 'number' ||
        typeof parsed.reasoning !== 'string'
      ) {
        throw new Error(`Invalid judge response: ${text}`);
      }

      const suggestions = Array.isArray(parsed.suggestions)
        ? parsed.suggestions.filter((s): s is string => typeof s === 'string')
        : [];

      return { score: parsed.score, reasoning: parsed.reasoning, suggestions };
    },
  };
}
