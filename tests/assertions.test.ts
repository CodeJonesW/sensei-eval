import { describe, it, expect } from 'vitest';
import {
  contains,
  containsAll,
  containsAny,
  matchesRegex,
  containsJson,
  lengthBetween,
  startsWith,
  endsWith,
} from '../src/assertions.js';

describe('contains', () => {
  it('passes when substring is present', () => {
    const result = contains('hello')('say hello world');
    expect(result.passed).toBe(true);
    expect(result.score).toBe(1);
  });

  it('fails when substring is absent', () => {
    const result = contains('goodbye')('say hello world');
    expect(result.passed).toBe(false);
    expect(result.score).toBe(0);
    expect(result.reasoning).toContain('goodbye');
  });
});

describe('containsAll', () => {
  it('passes when all substrings present', () => {
    const result = containsAll(['a', 'b', 'c'])('a b c');
    expect(result.passed).toBe(true);
    expect(result.score).toBe(1);
  });

  it('fails with graduated score when some missing', () => {
    const result = containsAll(['a', 'b', 'c'])('a b');
    expect(result.passed).toBe(false);
    expect(result.score).toBeCloseTo(2 / 3);
    expect(result.reasoning).toContain('"c"');
  });

  it('returns score 0 when none present', () => {
    const result = containsAll(['x', 'y'])('a b');
    expect(result.score).toBe(0);
  });

  it('passes for empty substrings array', () => {
    const result = containsAll([])('anything');
    expect(result.passed).toBe(true);
    expect(result.score).toBe(1);
  });
});

describe('containsAny', () => {
  it('passes when at least one substring present', () => {
    const result = containsAny(['a', 'z'])('abc');
    expect(result.passed).toBe(true);
    expect(result.score).toBe(1);
  });

  it('fails when none present', () => {
    const result = containsAny(['x', 'y'])('abc');
    expect(result.passed).toBe(false);
    expect(result.score).toBe(0);
  });
});

describe('matchesRegex', () => {
  it('passes when pattern matches', () => {
    const result = matchesRegex(/\d{3}/)('code 123 here');
    expect(result.passed).toBe(true);
    expect(result.score).toBe(1);
  });

  it('fails when pattern does not match', () => {
    const result = matchesRegex(/\d{3}/)('no numbers');
    expect(result.passed).toBe(false);
    expect(result.score).toBe(0);
  });
});

describe('containsJson', () => {
  it('detects valid JSON object', () => {
    const result = containsJson()('config: {"key": "value"}');
    expect(result.passed).toBe(true);
    expect(result.score).toBe(1);
  });

  it('detects valid JSON array', () => {
    const result = containsJson()('items: [1, 2, 3]');
    expect(result.passed).toBe(true);
  });

  it('detects JSON embedded in prose', () => {
    const result = containsJson()('Here is the config:\n{"name": "test", "count": 5}\nEnd.');
    expect(result.passed).toBe(true);
  });

  it('fails when no JSON present', () => {
    const result = containsJson()('just plain text');
    expect(result.passed).toBe(false);
    expect(result.score).toBe(0);
  });

  it('fails for invalid JSON-like content', () => {
    const result = containsJson()('{not valid json}');
    expect(result.passed).toBe(false);
  });
});

describe('lengthBetween', () => {
  it('passes when within range', () => {
    const result = lengthBetween(5, 20)('hello world');
    expect(result.passed).toBe(true);
    expect(result.score).toBe(1);
  });

  it('gives graduated score when too short', () => {
    // length 3, min 10 → score = 3/10 = 0.3
    const result = lengthBetween(10, 100)('abc');
    expect(result.passed).toBe(false);
    expect(result.score).toBeCloseTo(0.3);
    expect(result.reasoning).toContain('below minimum');
  });

  it('gives graduated score when too long', () => {
    // length 150, max 100 → score = 1 - (150-100)/100 = 0.5
    const result = lengthBetween(10, 100)('x'.repeat(150));
    expect(result.passed).toBe(false);
    expect(result.score).toBeCloseTo(0.5);
    expect(result.reasoning).toContain('exceeds maximum');
  });

  it('clamps score to 0 for very short content', () => {
    const result = lengthBetween(100, 200)('');
    expect(result.score).toBe(0);
  });

  it('clamps score to 0 for very long content', () => {
    // length 300, max 100 → 1 - 200/100 = -1 → clamped to 0
    const result = lengthBetween(10, 100)('x'.repeat(300));
    expect(result.score).toBe(0);
  });

  it('passes at exact boundaries', () => {
    expect(lengthBetween(5, 10)('12345').passed).toBe(true);
    expect(lengthBetween(5, 10)('1234567890').passed).toBe(true);
  });
});

describe('startsWith', () => {
  it('passes when content starts with prefix', () => {
    const result = startsWith('# ')('# Heading');
    expect(result.passed).toBe(true);
    expect(result.score).toBe(1);
  });

  it('fails when content does not start with prefix', () => {
    const result = startsWith('# ')('No heading');
    expect(result.passed).toBe(false);
    expect(result.score).toBe(0);
  });
});

describe('endsWith', () => {
  it('passes when content ends with suffix', () => {
    const result = endsWith('.')('A sentence.');
    expect(result.passed).toBe(true);
    expect(result.score).toBe(1);
  });

  it('fails when content does not end with suffix', () => {
    const result = endsWith('.')('No period');
    expect(result.passed).toBe(false);
    expect(result.score).toBe(0);
  });
});
