import { describe, it, expect } from 'vitest';
import { createCriterion } from '../src/createCriterion.js';
import { contains, containsAll } from '../src/assertions.js';
import { trim, lowercase, extractBetween } from '../src/transforms.js';
import type { EvalInput } from '../src/types.js';

function makeInput(content: string, contentType = 'lesson'): EvalInput {
  return { content, contentType };
}

describe('createCriterion', () => {
  it('returns a valid EvalCriterion with correct fields', () => {
    const criterion = createCriterion({
      name: 'test_criterion',
      description: 'A test criterion',
      contentTypes: ['lesson'],
      assertions: [contains('hello')],
    });

    expect(criterion.name).toBe('test_criterion');
    expect(criterion.description).toBe('A test criterion');
    expect(criterion.contentTypes).toEqual(['lesson']);
    expect(criterion.method).toBe('deterministic');
    expect(criterion.threshold).toBe(1.0);
    expect(criterion.weight).toBe(1.0);
    expect(typeof criterion.evaluate).toBe('function');
  });

  it('uses custom threshold and weight', () => {
    const criterion = createCriterion({
      name: 'custom',
      description: 'Custom',
      contentTypes: '*',
      threshold: 0.5,
      weight: 1.5,
      assertions: [contains('x')],
    });

    expect(criterion.threshold).toBe(0.5);
    expect(criterion.weight).toBe(1.5);
  });

  it('sets optional flag', () => {
    const criterion = createCriterion({
      name: 'opt',
      description: 'Optional',
      contentTypes: '*',
      optional: true,
      assertions: [contains('x')],
    });

    expect(criterion.optional).toBe(true);
  });

  it('applies transforms before assertions', async () => {
    const criterion = createCriterion({
      name: 'transformed',
      description: 'Uses transforms',
      contentTypes: '*',
      transforms: [extractBetween('<b>', '</b>'), trim()],
      assertions: [contains('hello')],
    });

    const result = await criterion.evaluate(makeInput('prefix<b>  hello  </b>suffix'));
    expect(result.passed).toBe(true);
    expect(result.score).toBe(1);
  });

  it('fails when assertion fails after transforms', async () => {
    const criterion = createCriterion({
      name: 'transformed_fail',
      description: 'Uses transforms',
      contentTypes: '*',
      transforms: [extractBetween('<b>', '</b>')],
      assertions: [contains('missing')],
    });

    const result = await criterion.evaluate(makeInput('<b>hello</b>'));
    expect(result.passed).toBe(false);
    expect(result.score).toBe(0);
  });

  describe('mode: all (default)', () => {
    it('passes when all assertions pass', async () => {
      const criterion = createCriterion({
        name: 'all_pass',
        description: 'All must pass',
        contentTypes: '*',
        assertions: [contains('hello'), contains('world')],
      });

      const result = await criterion.evaluate(makeInput('hello world'));
      expect(result.passed).toBe(true);
      expect(result.score).toBe(1);
    });

    it('fails if any assertion fails, score = min', async () => {
      const criterion = createCriterion({
        name: 'one_fails',
        description: 'One fails',
        contentTypes: '*',
        assertions: [contains('hello'), containsAll(['a', 'b', 'c'])],
      });

      // contains('hello') → 1, containsAll(['a','b','c']) on 'hello a' → 1/3
      const result = await criterion.evaluate(makeInput('hello a'));
      expect(result.passed).toBe(false);
      expect(result.score).toBeCloseTo(1 / 3);
    });
  });

  describe('mode: any', () => {
    it('passes if any assertion passes, score = max', async () => {
      const criterion = createCriterion({
        name: 'any_pass',
        description: 'Any can pass',
        contentTypes: '*',
        mode: 'any',
        assertions: [contains('hello'), contains('missing')],
      });

      const result = await criterion.evaluate(makeInput('hello'));
      expect(result.passed).toBe(true);
      expect(result.score).toBe(1);
    });

    it('fails when no assertions pass', async () => {
      const criterion = createCriterion({
        name: 'none_pass',
        description: 'None pass',
        contentTypes: '*',
        mode: 'any',
        assertions: [contains('x'), contains('y')],
      });

      const result = await criterion.evaluate(makeInput('hello'));
      expect(result.passed).toBe(false);
      expect(result.score).toBe(0);
    });
  });

  it('passes with empty assertions in all mode', async () => {
    const criterion = createCriterion({
      name: 'empty',
      description: 'No assertions',
      contentTypes: '*',
      assertions: [],
    });

    const result = await criterion.evaluate(makeInput('anything'));
    expect(result.passed).toBe(true);
    expect(result.score).toBe(1);
    expect(result.reasoning).toBe('No assertions to check');
  });

  it('includes suggestions from failed assertions', async () => {
    const criterion = createCriterion({
      name: 'suggestions',
      description: 'Has suggestions',
      contentTypes: '*',
      assertions: [contains('present'), contains('missing')],
    });

    const result = await criterion.evaluate(makeInput('present'));
    expect(result.suggestions).toBeDefined();
    expect(result.suggestions!.length).toBeGreaterThan(0);
    expect(result.suggestions![0]).toContain('missing');
  });

  it('sets criterion name on result', async () => {
    const criterion = createCriterion({
      name: 'my_criterion',
      description: 'Test',
      contentTypes: '*',
      assertions: [contains('x')],
    });

    const result = await criterion.evaluate(makeInput('x'));
    expect(result.criterion).toBe('my_criterion');
  });

  it('respects custom threshold for pass/fail', async () => {
    const criterion = createCriterion({
      name: 'low_threshold',
      description: 'Low threshold',
      contentTypes: '*',
      threshold: 0.5,
      assertions: [containsAll(['a', 'b', 'c'])],
    });

    // 2/3 found → score ≈ 0.667 ≥ 0.5 threshold → passed
    const result = await criterion.evaluate(makeInput('a b'));
    expect(result.passed).toBe(true);
    expect(result.score).toBeCloseTo(2 / 3);
  });
});
