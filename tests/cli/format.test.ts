import { describe, it, expect } from 'vitest';
import {
  formatEvalText,
  formatCompareText,
  formatCompareMarkdown,
  formatEvalMarkdown,
} from '../../src/cli/format.js';
import type { EvalResult, CompareResult } from '../../src/types.js';

function makeEvalResult(overrides: Partial<EvalResult> = {}): EvalResult {
  return {
    overallScore: 0.85,
    passed: true,
    scores: [
      { criterion: 'format_compliance', score: 0.9, rawScore: 0.9, maxScore: 1, passed: true, reasoning: 'Good' },
      { criterion: 'topic_accuracy', score: 0.8, rawScore: 4, maxScore: 5, passed: true, reasoning: 'Accurate' },
    ],
    feedback: { failedCriteria: [], strengths: ['Good'], suggestions: [] },
    contentType: 'lesson',
    evaluatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('formatEvalText', () => {
  it('shows pass/fail status and score', () => {
    const results = new Map([['intro-lesson', makeEvalResult()]]);
    const output = formatEvalText(results, false);
    expect(output).toContain('PASS');
    expect(output).toContain('intro-lesson');
    expect(output).toContain('85.0%');
  });

  it('shows FAIL for failing results', () => {
    const results = new Map([['bad-lesson', makeEvalResult({ passed: false, overallScore: 0.3 })]]);
    const output = formatEvalText(results, false);
    expect(output).toContain('FAIL');
    expect(output).toContain('30.0%');
  });

  it('shows per-criterion details in verbose mode', () => {
    const results = new Map([['intro-lesson', makeEvalResult()]]);
    const output = formatEvalText(results, true);
    expect(output).toContain('format_compliance');
    expect(output).toContain('topic_accuracy');
  });

  it('does not show per-criterion details in non-verbose mode', () => {
    const results = new Map([['intro-lesson', makeEvalResult()]]);
    const output = formatEvalText(results, false);
    expect(output).not.toContain('format_compliance');
  });
});

describe('formatCompareText', () => {
  const compareResult: CompareResult = {
    passed: false,
    prompts: [
      {
        name: 'intro-lesson',
        contentType: 'lesson',
        currentScore: 0.7,
        baselineScore: 0.85,
        delta: -0.15,
        regressed: true,
        newPrompt: false,
        criteriaDeltas: [
          { criterion: 'format_compliance', current: 0.8, baseline: 0.9, delta: -0.1 },
        ],
      },
      {
        name: 'new-lesson',
        contentType: 'lesson',
        currentScore: 0.9,
        baselineScore: null,
        delta: 0,
        regressed: false,
        newPrompt: true,
        criteriaDeltas: [],
      },
    ],
    summary: { total: 2, regressed: 1, improved: 0, unchanged: 0, new: 1, criterionRegressions: 1 },
  };

  it('shows summary counts', () => {
    const output = formatCompareText(compareResult, false);
    expect(output).toContain('2 prompts');
    expect(output).toContain('1 regressed');
    expect(output).toContain('1 new');
  });

  it('marks regressed prompts as FAIL', () => {
    const output = formatCompareText(compareResult, false);
    expect(output).toContain('FAIL  intro-lesson');
  });

  it('marks new prompts as NEW', () => {
    const output = formatCompareText(compareResult, false);
    expect(output).toContain('NEW   new-lesson');
  });

  it('shows FAILED result on regression', () => {
    const output = formatCompareText(compareResult, false);
    expect(output).toContain('Result: FAILED');
  });

  it('shows criteria deltas in verbose mode', () => {
    const output = formatCompareText(compareResult, true);
    expect(output).toContain('format_compliance');
    expect(output).toContain('-10.0%');
  });
});

describe('formatCompareMarkdown', () => {
  const compareResult: CompareResult = {
    passed: true,
    prompts: [
      {
        name: 'intro-lesson',
        contentType: 'lesson',
        currentScore: 0.9,
        baselineScore: 0.85,
        delta: 0.05,
        regressed: false,
        newPrompt: false,
        criteriaDeltas: [],
      },
    ],
    summary: { total: 1, regressed: 0, improved: 1, unchanged: 0, new: 0, criterionRegressions: 0 },
  };

  it('produces markdown table', () => {
    const output = formatCompareMarkdown(compareResult);
    expect(output).toContain('| Prompt |');
    expect(output).toContain('| intro-lesson |');
    expect(output).toContain('+5.0%');
  });

  it('shows PASSED for passing results', () => {
    const output = formatCompareMarkdown(compareResult);
    expect(output).toContain('**Result: PASSED**');
  });
});

describe('formatEvalMarkdown', () => {
  it('produces markdown table', () => {
    const results = new Map([['intro-lesson', makeEvalResult()]]);
    const output = formatEvalMarkdown(results);
    expect(output).toContain('| Prompt |');
    expect(output).toContain('| intro-lesson |');
    expect(output).toContain('85.0%');
  });
});
