/** Result of running a single assertion */
export interface AssertionResult {
  passed: boolean;
  score: number;
  reasoning: string;
}

/** An assertion checks transformed content and returns a result */
export type Assertion = (content: string) => AssertionResult;

/** Check that content contains a substring */
export function contains(substring: string): Assertion {
  return (content) => {
    const passed = content.includes(substring);
    return {
      passed,
      score: passed ? 1 : 0,
      reasoning: passed
        ? `Content contains "${substring}"`
        : `Content does not contain "${substring}"`,
    };
  };
}

/** Check that content contains all substrings (graduated score) */
export function containsAll(substrings: string[]): Assertion {
  return (content) => {
    const found = substrings.filter((s) => content.includes(s));
    const score = substrings.length === 0 ? 1 : found.length / substrings.length;
    const passed = found.length === substrings.length;
    const missing = substrings.filter((s) => !content.includes(s));
    return {
      passed,
      score,
      reasoning: passed
        ? `Content contains all ${substrings.length} required substrings`
        : `Content is missing ${missing.length}/${substrings.length} substrings: ${missing.map((s) => `"${s}"`).join(', ')}`,
    };
  };
}

/** Check that content contains at least one of the substrings */
export function containsAny(substrings: string[]): Assertion {
  return (content) => {
    const found = substrings.filter((s) => content.includes(s));
    const passed = found.length > 0;
    return {
      passed,
      score: passed ? 1 : 0,
      reasoning: passed
        ? `Content contains ${found.map((s) => `"${s}"`).join(', ')}`
        : `Content does not contain any of: ${substrings.map((s) => `"${s}"`).join(', ')}`,
    };
  };
}

/** Check that content matches a regex pattern */
export function matchesRegex(pattern: RegExp): Assertion {
  return (content) => {
    const passed = pattern.test(content);
    return {
      passed,
      score: passed ? 1 : 0,
      reasoning: passed
        ? `Content matches pattern ${pattern}`
        : `Content does not match pattern ${pattern}`,
    };
  };
}

/** Check that content contains valid JSON (object or array) */
export function containsJson(): Assertion {
  return (content) => {
    // Find potential JSON starting with { or [
    const jsonPattern = /[{\[]/;
    let idx = 0;
    while (idx < content.length) {
      const match = jsonPattern.exec(content.slice(idx));
      if (!match) break;
      const start = idx + match.index;
      const openChar = content[start];
      const closeChar = openChar === '{' ? '}' : ']';

      // Find matching close by scanning forward
      let depth = 0;
      let inString = false;
      let escape = false;
      for (let i = start; i < content.length; i++) {
        const ch = content[i];
        if (escape) {
          escape = false;
          continue;
        }
        if (ch === '\\' && inString) {
          escape = true;
          continue;
        }
        if (ch === '"') {
          inString = !inString;
          continue;
        }
        if (inString) continue;
        if (ch === openChar) depth++;
        if (ch === closeChar) depth--;
        if (depth === 0) {
          const candidate = content.slice(start, i + 1);
          try {
            JSON.parse(candidate);
            return { passed: true, score: 1, reasoning: 'Content contains valid JSON' };
          } catch {
            break;
          }
        }
      }
      idx = start + 1;
    }
    return { passed: false, score: 0, reasoning: 'No valid JSON found in content' };
  };
}

/** Check that content length is between min and max (graduated score near bounds) */
export function lengthBetween(min: number, max: number): Assertion {
  return (content) => {
    const len = content.length;
    if (len >= min && len <= max) {
      return { passed: true, score: 1, reasoning: `Length ${len} is within [${min}, ${max}]` };
    }

    let score: number;
    if (len < min) {
      score = Math.max(0, len / min);
    } else {
      score = Math.max(0, 1 - (len - max) / max);
    }

    return {
      passed: false,
      score,
      reasoning: len < min
        ? `Length ${len} is below minimum ${min}`
        : `Length ${len} exceeds maximum ${max}`,
    };
  };
}

/** Check that content starts with a prefix */
export function startsWith(prefix: string): Assertion {
  return (content) => {
    const passed = content.startsWith(prefix);
    return {
      passed,
      score: passed ? 1 : 0,
      reasoning: passed
        ? `Content starts with "${prefix}"`
        : `Content does not start with "${prefix}"`,
    };
  };
}

/** Check that content ends with a suffix */
export function endsWith(suffix: string): Assertion {
  return (content) => {
    const passed = content.endsWith(suffix);
    return {
      passed,
      score: passed ? 1 : 0,
      reasoning: passed
        ? `Content ends with "${suffix}"`
        : `Content does not end with "${suffix}"`,
    };
  };
}
