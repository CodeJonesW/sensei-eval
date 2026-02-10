import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  formatCompliance,
  lengthCompliance,
  hasCodeBlockCriterion,
  hasStructure,
} from '../../src/criteria/universal.js';
import type { EvalInput } from '../../src/types.js';

const fixturesDir = join(__dirname, '../fixtures');
const goodLesson = readFileSync(join(fixturesDir, 'good-lesson.md'), 'utf-8');
const badLesson = readFileSync(join(fixturesDir, 'bad-lesson.md'), 'utf-8');
const goodChallenge = readFileSync(join(fixturesDir, 'good-challenge.md'), 'utf-8');
const badChallenge = readFileSync(join(fixturesDir, 'bad-challenge.md'), 'utf-8');

function makeInput(content: string, contentType = 'lesson'): EvalInput {
  return { content, contentType };
}

describe('format_compliance', () => {
  it('passes for well-formatted content', async () => {
    const result = await formatCompliance.evaluate(makeInput(goodLesson));
    expect(result.passed).toBe(true);
    expect(result.score).toBe(1.0);
  });

  it('fails for unclosed bold markers', async () => {
    const result = await formatCompliance.evaluate(
      makeInput('This has **unclosed bold'),
    );
    expect(result.passed).toBe(false);
    expect(result.reasoning).toContain('unclosed bold marker');
  });

  it('fails for unclosed code blocks', async () => {
    const result = await formatCompliance.evaluate(
      makeInput('```python\nprint("hi")\n'),
    );
    expect(result.passed).toBe(false);
    expect(result.reasoning).toContain('unclosed code block');
  });

  it('fails for bad lesson with unclosed bold', async () => {
    const result = await formatCompliance.evaluate(makeInput(badLesson));
    expect(result.passed).toBe(false);
  });

  it('passes for content with properly paired markers', async () => {
    const result = await formatCompliance.evaluate(
      makeInput('This is **bold** and *italic* text'),
    );
    expect(result.passed).toBe(true);
  });
});

describe('length_compliance', () => {
  it('passes for good lesson within range', async () => {
    const result = await lengthCompliance.evaluate(makeInput(goodLesson));
    expect(result.passed).toBe(true);
  });

  it('fails for content that is too short', async () => {
    const result = await lengthCompliance.evaluate(makeInput('too short'));
    expect(result.passed).toBe(false);
    expect(result.score).toBeLessThan(1);
  });

  it('gives partial score for slightly short content', async () => {
    const content = 'a'.repeat(400); // below 500 min for lesson
    const result = await lengthCompliance.evaluate(makeInput(content));
    expect(result.passed).toBe(false);
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(1);
  });

  it('respects custom length limits in metadata', async () => {
    const input: EvalInput = {
      content: 'short',
      contentType: 'lesson',
      metadata: { lengthLimits: { min: 1, max: 100 } },
    };
    const result = await lengthCompliance.evaluate(input);
    expect(result.passed).toBe(true);
  });

  it('uses type-specific defaults', async () => {
    const result = await lengthCompliance.evaluate(
      makeInput('a'.repeat(150), 'review'),
    );
    // review min is 100, max is 2000
    expect(result.passed).toBe(true);
  });
});

describe('has_code_block', () => {
  it('passes for content with code blocks', async () => {
    const result = await hasCodeBlockCriterion.evaluate(makeInput(goodLesson));
    expect(result.passed).toBe(true);
  });

  it('fails for content without code blocks', async () => {
    const result = await hasCodeBlockCriterion.evaluate(
      makeInput('# Heading\n\nJust text, no code.'),
    );
    expect(result.passed).toBe(false);
  });

  it('fails for unclosed code blocks', async () => {
    const result = await hasCodeBlockCriterion.evaluate(
      makeInput('```python\nprint("hi")\n'),
    );
    expect(result.passed).toBe(false);
  });

  it('only applies to lesson and challenge content types', () => {
    expect(hasCodeBlockCriterion.contentTypes).toContain('lesson');
    expect(hasCodeBlockCriterion.contentTypes).toContain('challenge');
  });
});

describe('has_structure', () => {
  it('passes for content with headings and sections', async () => {
    const result = await hasStructure.evaluate(makeInput(goodLesson));
    expect(result.passed).toBe(true);
    expect(result.score).toBe(1.0);
  });

  it('fails for content with no headings', async () => {
    const result = await hasStructure.evaluate(
      makeInput('Just a paragraph of text without any structure at all.'),
    );
    expect(result.passed).toBe(false);
    expect(result.score).toBe(0.0);
  });

  it('gives partial score for single heading', async () => {
    const result = await hasStructure.evaluate(
      makeInput('# Only One Heading\n\nSome content here.'),
    );
    expect(result.score).toBe(0.5);
  });

  it('passes for content with multiple headings', async () => {
    const content = '# Section 1\n\nText\n\n## Section 2\n\nMore text';
    const result = await hasStructure.evaluate(makeInput(content));
    expect(result.passed).toBe(true);
  });
});
