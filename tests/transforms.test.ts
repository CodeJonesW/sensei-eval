import { describe, it, expect } from 'vitest';
import { trim, lowercase, stripCodeBlocks, extractBetween, pipe } from '../src/transforms.js';

describe('trim', () => {
  it('removes leading and trailing whitespace', () => {
    expect(trim()('  hello  ')).toBe('hello');
  });

  it('removes newlines', () => {
    expect(trim()('\n\nhello\n\n')).toBe('hello');
  });

  it('is a no-op for already trimmed content', () => {
    expect(trim()('hello')).toBe('hello');
  });

  it('returns empty string for whitespace-only input', () => {
    expect(trim()('   ')).toBe('');
  });
});

describe('lowercase', () => {
  it('converts to lowercase', () => {
    expect(lowercase()('Hello WORLD')).toBe('hello world');
  });

  it('is a no-op for already lowercase content', () => {
    expect(lowercase()('hello')).toBe('hello');
  });

  it('handles empty string', () => {
    expect(lowercase()('')).toBe('');
  });
});

describe('stripCodeBlocks', () => {
  it('removes fenced code blocks', () => {
    const input = 'before\n```js\nconsole.log("hi");\n```\nafter';
    expect(stripCodeBlocks()(input)).toBe('before\n\nafter');
  });

  it('removes multiple code blocks', () => {
    const input = 'a\n```\ncode1\n```\nb\n```\ncode2\n```\nc';
    expect(stripCodeBlocks()(input)).toBe('a\n\nb\n\nc');
  });

  it('is a no-op when no code blocks present', () => {
    const input = 'just some text';
    expect(stripCodeBlocks()(input)).toBe('just some text');
  });

  it('handles empty string', () => {
    expect(stripCodeBlocks()('')).toBe('');
  });
});

describe('extractBetween', () => {
  it('extracts content between markers', () => {
    const input = 'prefix<config>{"key":"value"}</config>suffix';
    expect(extractBetween('<config>', '</config>')(input)).toBe('{"key":"value"}');
  });

  it('returns original content when start marker missing', () => {
    const input = 'no markers here';
    expect(extractBetween('<config>', '</config>')(input)).toBe('no markers here');
  });

  it('returns original content when end marker missing', () => {
    const input = '<config>no end marker';
    expect(extractBetween('<config>', '</config>')(input)).toBe('<config>no end marker');
  });

  it('extracts first occurrence when multiple markers exist', () => {
    const input = '<a>first</a><a>second</a>';
    expect(extractBetween('<a>', '</a>')(input)).toBe('first');
  });

  it('handles empty content between markers', () => {
    expect(extractBetween('<a>', '</a>')('<a></a>')).toBe('');
  });
});

describe('pipe', () => {
  it('composes transforms left-to-right', () => {
    const transform = pipe(trim(), lowercase());
    expect(transform('  HELLO  ')).toBe('hello');
  });

  it('handles zero transforms', () => {
    const transform = pipe();
    expect(transform('hello')).toBe('hello');
  });

  it('handles single transform', () => {
    const transform = pipe(trim());
    expect(transform('  hello  ')).toBe('hello');
  });

  it('handles multiple transforms', () => {
    const transform = pipe(
      extractBetween('<b>', '</b>'),
      trim(),
      lowercase(),
    );
    expect(transform('prefix<b>  HELLO  </b>suffix')).toBe('hello');
  });
});
