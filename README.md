# sensei-eval

TypeScript library for evaluating AI-generated educational content using deterministic checks and LLM-as-judge scoring.

## Install

```bash
npm install sensei-eval
```

## Quick Start

```typescript
import { EvalRunner, createJudge, criteria } from 'sensei-eval';

// Full evaluation (deterministic + LLM judge)
const judge = createJudge({ apiKey: process.env.ANTHROPIC_API_KEY! });
const runner = new EvalRunner({
  criteria: [
    ...criteria.universal,
    ...criteria.lesson,
    ...criteria.challenge,
    ...criteria.review,
  ],
  judge,
});

const result = await runner.evaluate({
  content: lessonMarkdown,
  contentType: 'lesson',
  topic: 'Array methods in JavaScript',
  difficulty: 'beginner',
});

console.log(result.passed);       // true if all criteria met their thresholds
console.log(result.overallScore); // weighted average (0-1)
console.log(result.scores);      // per-criterion breakdown

// Quick check — deterministic only, no API calls
const quick = await runner.quickCheck({
  content: lessonMarkdown,
  contentType: 'lesson',
});
```

## How It Works

Content is evaluated through a two-tier system:

1. **Deterministic criteria** — fast, pure functions that check markdown formatting, length, and structure
2. **LLM-judge criteria** — Claude API calls that score content against rubrics on a 1-5 scale, normalized to 0-1

`EvalRunner.evaluate()` filters criteria by `contentType`, runs deterministic checks in parallel, then runs LLM checks in parallel, computes a weighted overall score, and returns an `EvalResult`.

`EvalRunner.quickCheck()` does the same but skips all LLM criteria (no API calls).

### Scoring

- **Overall score**: weighted average of all criterion scores (0-1)
- **Pass/fail**: every individual criterion must meet its threshold for `passed` to be `true`
- **LLM normalization**: raw 1-5 scores are mapped to 0-1 via `(score - 1) / 4`

### Weights

| Weight | Criteria |
|--------|----------|
| 1.5 | `topic_accuracy`, `pedagogical_structure`, `problem_clarity` |
| 1.0 | Most criteria (engagement, repetition_avoidance, code_quality, etc.) |
| 0.5 | `has_code_block`, `has_structure`, `brevity` |

## Criteria

### Universal (all content types)

| Criterion | Method | Description |
|-----------|--------|-------------|
| `format_compliance` | deterministic | No unclosed code blocks, bold, or italic markers |
| `length_compliance` | deterministic | Content within min/max character limits per type |
| `has_code_block` | deterministic | At least one fenced code block (lesson, challenge only) |
| `has_structure` | deterministic | Headings and multiple sections (lesson, challenge only) |
| `engagement` | LLM judge | Hook, pacing, and closure quality |
| `repetition_avoidance` | LLM judge | Avoids repeating previous content |

### Lesson

| Criterion | Method | Description |
|-----------|--------|-------------|
| `topic_accuracy` | LLM judge | Covers stated topic correctly, no factual errors |
| `pedagogical_structure` | LLM judge | Progression from intuition to examples to practice |
| `code_quality` | LLM judge | Relevant, correct, well-explained code examples |
| `progressive_difficulty` | LLM judge | Appropriate scaffolding for stated difficulty level |

### Challenge

| Criterion | Method | Description |
|-----------|--------|-------------|
| `problem_clarity` | LLM judge | Unambiguous requirements with clear inputs/outputs |
| `difficulty_calibration` | LLM judge | Matches stated difficulty level |
| `hint_quality` | LLM judge | Progressive hints without spoiling the solution |
| `testability` | LLM judge | Verifiable with clear expected outputs or test cases |

### Review

| Criterion | Method | Description |
|-----------|--------|-------------|
| `brevity` | deterministic | Under character limit (default 2000, configurable via metadata) |
| `actionability` | LLM judge | Concrete, specific next steps |
| `honesty` | LLM judge | Honest gap assessment without sugarcoating |

## API

### `EvalRunner`

```typescript
const runner = new EvalRunner({ criteria: EvalCriterion[], judge?: Judge });

runner.evaluate(input: EvalInput): Promise<EvalResult>    // full eval
runner.quickCheck(input: EvalInput): Promise<EvalResult>   // deterministic only
runner.getCriteria(contentType: string): EvalCriterion[]   // filter by type
```

### `createJudge`

```typescript
const judge = createJudge({
  apiKey: string,
  model?: string,      // default: 'claude-sonnet-4-20250514'
  maxTokens?: number,
});
```

### Types

```typescript
interface EvalInput {
  content: string;
  contentType: string;              // 'lesson' | 'challenge' | 'review' | 'quiz'
  topic?: string;
  difficulty?: string;
  previousContent?: string[];       // for repetition checking
  metadata?: Record<string, unknown>;
}

interface EvalResult {
  overallScore: number;             // weighted average (0-1)
  passed: boolean;                  // all criteria passed their thresholds
  scores: EvalScore[];
  contentType: string;
  evaluatedAt: string;              // ISO timestamp
}

interface EvalScore {
  criterion: string;
  score: number;                    // normalized (0-1)
  rawScore: number;
  maxScore: number;
  passed: boolean;
  reasoning: string;
  metadata?: Record<string, unknown>;
}
```

## Adding a New Criterion

1. Define a `JudgeRubric` with a 1-5 scale (if LLM) in the appropriate `src/criteria/*.ts`
2. Export an `EvalCriterion` object with an `evaluate()` function
3. Add it to the exported array at the bottom of the file
4. Add tests — mock the `Judge` for LLM criteria, use fixtures for deterministic

## Development

```bash
npm run build        # tsc -> dist/
npm test             # vitest run (unit tests, no API calls)
npm run test:watch   # vitest in watch mode
```

Tests mock all LLM calls — no Anthropic API key needed to run the test suite.

## Project Structure

```
src/
  index.ts              # public API
  types.ts              # all interfaces
  runner.ts             # EvalRunner orchestration
  judge.ts              # Anthropic SDK wrapper
  criteria/
    index.ts            # re-exports all criterion sets
    universal.ts        # criteria for all content types
    lesson.ts           # lesson-specific criteria
    challenge.ts        # challenge-specific criteria
    review.ts           # review-specific criteria
  utils/
    markdown.ts         # markdown parsing helpers
tests/
  fixtures/             # good/bad lesson and challenge markdown
  criteria/             # per-criterion tests
  runner.test.ts        # orchestration tests
  judge.test.ts         # judge tests
```
