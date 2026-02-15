import { describe, it, expect } from 'vitest';
import { toBaselineEntry, createBaseline, compareResults } from '../src/baseline.js';
import type { EvalResult, BaselineFile } from '../src/types.js';

function makeResult(overrides: Partial<EvalResult> = {}): EvalResult {
  return {
    overallScore: 0.8,
    passed: true,
    scores: [
      { criterion: 'format_compliance', score: 0.9, rawScore: 0.9, maxScore: 1, passed: true, reasoning: 'Good' },
      { criterion: 'topic_accuracy', score: 0.7, rawScore: 3.8, maxScore: 5, passed: true, reasoning: 'OK' },
    ],
    feedback: { failedCriteria: [], strengths: ['Good'], suggestions: [] },
    contentType: 'lesson',
    evaluatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('toBaselineEntry', () => {
  it('extracts name, scores, and overallScore from EvalResult', () => {
    const result = makeResult();
    const entry = toBaselineEntry('intro-lesson', result);

    expect(entry.name).toBe('intro-lesson');
    expect(entry.contentType).toBe('lesson');
    expect(entry.overallScore).toBe(0.8);
    expect(entry.scores).toEqual({
      format_compliance: 0.9,
      topic_accuracy: 0.7,
    });
    expect(entry.evaluatedAt).toBe('2025-01-01T00:00:00.000Z');
  });
});

describe('createBaseline', () => {
  it('wraps entries with version and metadata', () => {
    const entry = toBaselineEntry('test', makeResult());
    const baseline = createBaseline([entry], 'full');

    expect(baseline.version).toBe(1);
    expect(baseline.mode).toBe('full');
    expect(baseline.entries).toHaveLength(1);
    expect(baseline.generatedAt).toBeTruthy();
  });

  it('sets mode to quick when specified', () => {
    const baseline = createBaseline([], 'quick');
    expect(baseline.mode).toBe('quick');
  });
});

describe('compareResults', () => {
  const baselineFile: BaselineFile = {
    version: 1,
    generatedAt: '2025-01-01T00:00:00.000Z',
    mode: 'full',
    entries: [
      {
        name: 'intro-lesson',
        contentType: 'lesson',
        overallScore: 0.8,
        scores: { format_compliance: 0.9, topic_accuracy: 0.7 },
        evaluatedAt: '2025-01-01T00:00:00.000Z',
      },
      {
        name: 'advanced-lesson',
        contentType: 'lesson',
        overallScore: 0.75,
        scores: { format_compliance: 0.8, topic_accuracy: 0.7 },
        evaluatedAt: '2025-01-01T00:00:00.000Z',
      },
    ],
  };

  it('detects regression when score drops', () => {
    const current = new Map([
      ['intro-lesson', makeResult({ overallScore: 0.6 })],
      ['advanced-lesson', makeResult({ overallScore: 0.75 })],
    ]);

    const result = compareResults(current, baselineFile);

    expect(result.passed).toBe(false);
    expect(result.summary.regressed).toBe(1);
    expect(result.summary.unchanged).toBe(1);

    const regressed = result.prompts.find((p) => p.name === 'intro-lesson');
    expect(regressed?.regressed).toBe(true);
    expect(regressed?.delta).toBeCloseTo(-0.2);
  });

  it('detects improvement when score rises', () => {
    const current = new Map([
      ['intro-lesson', makeResult({ overallScore: 0.95 })],
      ['advanced-lesson', makeResult({ overallScore: 0.75 })],
    ]);

    const result = compareResults(current, baselineFile);

    expect(result.passed).toBe(true);
    expect(result.summary.improved).toBe(1);
    expect(result.summary.unchanged).toBe(1);
  });

  it('marks new prompts correctly', () => {
    const current = new Map([
      ['intro-lesson', makeResult({ overallScore: 0.8 })],
      ['brand-new', makeResult({ overallScore: 0.9, contentType: 'challenge' })],
    ]);

    const result = compareResults(current, baselineFile);

    expect(result.passed).toBe(true);
    expect(result.summary.new).toBe(1);

    const newPrompt = result.prompts.find((p) => p.name === 'brand-new');
    expect(newPrompt?.newPrompt).toBe(true);
    expect(newPrompt?.baselineScore).toBeNull();
    expect(newPrompt?.delta).toBe(0);
  });

  it('passes when all scores are equal', () => {
    const current = new Map([
      ['intro-lesson', makeResult({ overallScore: 0.8 })],
      ['advanced-lesson', makeResult({ overallScore: 0.75 })],
    ]);

    const result = compareResults(current, baselineFile);

    expect(result.passed).toBe(true);
    expect(result.summary.unchanged).toBe(2);
    expect(result.summary.regressed).toBe(0);
  });

  it('respects threshold for regression detection', () => {
    const current = new Map([
      ['intro-lesson', makeResult({ overallScore: 0.78 })], // drop of 0.02 < threshold 0.05
      ['advanced-lesson', makeResult({ overallScore: 0.75 })],
    ]);

    const result = compareResults(current, baselineFile, 0.05);

    expect(result.passed).toBe(true);
    expect(result.summary.regressed).toBe(0);
    expect(result.summary.unchanged).toBe(2);
  });

  it('computes per-criterion deltas', () => {
    const current = new Map([
      ['intro-lesson', makeResult({
        overallScore: 0.85,
        scores: [
          { criterion: 'format_compliance', score: 1.0, rawScore: 1.0, maxScore: 1, passed: true, reasoning: 'Perfect' },
          { criterion: 'topic_accuracy', score: 0.7, rawScore: 3.8, maxScore: 5, passed: true, reasoning: 'OK' },
        ],
      })],
    ]);

    const result = compareResults(current, baselineFile);
    const prompt = result.prompts.find((p) => p.name === 'intro-lesson')!;

    expect(prompt.criteriaDeltas).toHaveLength(2);
    const formatDelta = prompt.criteriaDeltas.find((d) => d.criterion === 'format_compliance');
    expect(formatDelta?.current).toBe(1.0);
    expect(formatDelta?.baseline).toBe(0.9);
    expect(formatDelta?.delta).toBeCloseTo(0.1);
  });

  it('returns empty prompts for empty current map', () => {
    const current = new Map<string, EvalResult>();
    const result = compareResults(current, baselineFile);

    expect(result.passed).toBe(true);
    expect(result.prompts).toHaveLength(0);
    expect(result.summary.total).toBe(0);
  });

  it('detects regression when a single criterion drops even if overall score holds', () => {
    // Overall score stays at 0.8, but topic_accuracy drops from 0.7 to 0.3
    const current = new Map([
      ['intro-lesson', makeResult({
        overallScore: 0.8,
        scores: [
          { criterion: 'format_compliance', score: 0.9, rawScore: 0.9, maxScore: 1, passed: true, reasoning: 'Good' },
          { criterion: 'topic_accuracy', score: 0.3, rawScore: 2.2, maxScore: 5, passed: false, reasoning: 'Bad' },
        ],
      })],
      ['advanced-lesson', makeResult({ overallScore: 0.75 })],
    ]);

    const result = compareResults(current, baselineFile);

    expect(result.passed).toBe(false);
    expect(result.summary.regressed).toBe(1);
    const regressed = result.prompts.find((p) => p.name === 'intro-lesson');
    expect(regressed?.regressed).toBe(true);
  });

  it('counts criterionRegressions correctly', () => {
    // Both criteria regress for intro-lesson
    const current = new Map([
      ['intro-lesson', makeResult({
        overallScore: 0.5,
        scores: [
          { criterion: 'format_compliance', score: 0.5, rawScore: 0.5, maxScore: 1, passed: false, reasoning: 'Bad' },
          { criterion: 'topic_accuracy', score: 0.3, rawScore: 2.2, maxScore: 5, passed: false, reasoning: 'Bad' },
        ],
      })],
      ['advanced-lesson', makeResult({ overallScore: 0.75 })],
    ]);

    const result = compareResults(current, baselineFile);

    expect(result.summary.criterionRegressions).toBe(2);
  });

  it('does not flag criterion regression within threshold tolerance', () => {
    // topic_accuracy drops by 0.02, but threshold is 0.05
    const current = new Map([
      ['intro-lesson', makeResult({
        overallScore: 0.8,
        scores: [
          { criterion: 'format_compliance', score: 0.9, rawScore: 0.9, maxScore: 1, passed: true, reasoning: 'Good' },
          { criterion: 'topic_accuracy', score: 0.68, rawScore: 3.7, maxScore: 5, passed: true, reasoning: 'OK' },
        ],
      })],
      ['advanced-lesson', makeResult({ overallScore: 0.75 })],
    ]);

    const result = compareResults(current, baselineFile, 0.05);

    expect(result.passed).toBe(true);
    expect(result.summary.regressed).toBe(0);
    expect(result.summary.criterionRegressions).toBe(0);
  });
});
