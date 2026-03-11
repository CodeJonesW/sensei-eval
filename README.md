# ai-content-eval

[![npm version](https://img.shields.io/npm/v/ai-content-eval)](https://www.npmjs.com/package/ai-content-eval)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![npm downloads](https://img.shields.io/npm/dm/ai-content-eval)](https://www.npmjs.com/package/ai-content-eval)

TypeScript library for evaluating AI-generated content using deterministic checks and LLM-as-judge scoring. Includes a CLI and GitHub Action for detecting quality regressions in CI.

## Why This Exists

AI systems are generating massive amounts of educational content, from lessons and coding challenges to reviews and quizzes. But there's no lightweight, practical way to programmatically assess whether that content is actually good. Most evaluation frameworks target research benchmarks or academic use cases. If you're a developer shipping AI-generated content in production, you need something simpler: a quality gate that runs in CI and tells you when content quality has regressed.

ai-content-eval solves this with a two-tier approach. Deterministic checks catch structural problems instantly, things like unclosed markdown blocks, missing code examples, or content that's too short. LLM-as-judge criteria evaluate deeper qualities like pedagogical structure, topic accuracy, and engagement. You get fast, zero-cost structural validation and deep quality scoring in one pipeline.

This is not a research evaluation framework or a benchmark suite. It's a practical tool for developers who generate content with AI and need to know whether the output meets a quality bar before it ships.

## Quick Start

```bash
npm install ai-content-eval
```

### Deterministic Only (No API Calls)

The fastest way to start. `quickCheck` runs only deterministic criteria, so there are no API calls and no cost.

```typescript
import { EvalRunner, criteria } from 'ai-content-eval';

const runner = new EvalRunner({
  criteria: [
    ...criteria.universal,
    ...criteria.lesson,
  ],
});

const result = await runner.quickCheck({
  content: lessonMarkdown,
  contentType: 'lesson',
});

console.log(result.passed);       // true if all criteria met their thresholds
console.log(result.overallScore); // weighted average (0-1)
```

### Full Evaluation (Deterministic + LLM Judge)

For deeper quality assessment, add a judge. This uses the Claude API to score content against rubrics.

```typescript
import { EvalRunner, createJudge, criteria } from 'ai-content-eval';

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
console.log(result.scores);       // per-criterion breakdown
```

## How It Works

Content flows through a two-tier evaluation pipeline:

```
                    EvalInput
                       |
              Filter by contentType
                       |
           +-----------+-----------+
           |                       |
   Deterministic checks      LLM judge checks
   (parallel, instant)      (parallel, API calls)
           |                       |
           +-----------+-----------+
                       |
              Weighted average score
                       |
                   EvalResult
```

`EvalRunner.evaluate()` filters criteria by `contentType`, runs deterministic checks in parallel, then runs LLM checks in parallel, computes a weighted overall score, and returns an `EvalResult`.

`EvalRunner.quickCheck()` does the same but skips all LLM criteria (no API calls).

LLM calls include automatic retry with exponential backoff for transient errors (429, 500, 502, 503, 529, network errors). Retries default to 3 attempts with 1s/2s/4s delays. Non-retryable errors (401, 400) throw immediately.

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

## Criteria Reference

Criteria are composable and automatically filtered by content type. Each criterion declares which content types it applies to, and the runner only evaluates criteria that match the input's `contentType`.

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

## CLI

The CLI evaluates prompts defined in a config file, generates baselines, and compares against them to detect regressions.

### Setup

Create a config file (`ai-content-eval.config.ts`) in your project:

```typescript
import type { EvalConfig } from 'ai-content-eval';

const config: EvalConfig = {
  prompts: [
    {
      name: 'intro-to-arrays',
      content: `# Arrays in JavaScript\n\nArrays are ordered collections...`,
      contentType: 'lesson',
      topic: 'Arrays',
      difficulty: 'beginner',
    },
    {
      name: 'array-challenge',
      content: `# Challenge: Flatten an Array\n\nGiven a nested array...`,
      contentType: 'challenge',
      difficulty: 'intermediate',
    },
  ],
};

export default config;
```

> `.ts` configs require [`tsx`](https://github.com/privatenumber/tsx) (`npm install -D tsx`). `.js`/`.mjs` configs work natively.

### Commands

```bash
# Evaluate all prompts and print results
npx ai-content-eval eval

# Evaluate and write a baseline file
npx ai-content-eval baseline

# Evaluate and compare against the baseline (exits non-zero on regression)
npx ai-content-eval compare
```

### Options

| Flag | Short | Description | Default |
|------|-------|-------------|---------|
| `--config <path>` | `-c` | Config file path | `ai-content-eval.config.ts` |
| `--baseline <path>` | `-b` | Baseline file path | `ai-content-eval.baseline.json` |
| `--output <path>` | `-o` | Output file path (baseline command) | Same as `--baseline` |
| `--quick` | `-q` | Deterministic only, skip LLM criteria | `false` |
| `--format <fmt>` | `-f` | Output format: `text`, `json`, `markdown` | `text` |
| `--model <model>` | `-m` | LLM model to use | `claude-sonnet-4-20250514` |
| `--threshold <n>` | `-t` | Score drop tolerance before failing | `0` |
| `--verbose` | `-v` | Show per-criterion details | `false` |
| `--api-key <key>` | | Anthropic API key | `ANTHROPIC_API_KEY` env |
| `--result-file <path>` | | Write JSON result to file (compare) | |

### CI Workflow

The typical workflow for using ai-content-eval as a CI quality gate:

1. **Generate a baseline on main** — run `npx ai-content-eval baseline` and commit `ai-content-eval.baseline.json`
2. **PRs compare against baseline** — CI runs `npx ai-content-eval compare`, which evaluates current prompts and fails if any score drops below baseline
3. **Update baseline when prompts change intentionally** — re-run `npx ai-content-eval baseline` and commit the updated file

This approach avoids re-evaluating the baseline on every PR (saving LLM cost) and eliminates non-determinism from comparing two separate LLM runs.

## GitHub Action

A reusable composite action is provided for easy CI integration.

### Basic Usage

```yaml
# .github/workflows/content-quality.yml
name: Content Quality
on: [pull_request]

jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: CodeJonesW/sensei-eval@v1
        with:
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
```

### All Inputs

| Input | Description | Default |
|-------|-------------|---------|
| `config` | Path to config file | `ai-content-eval.config.ts` |
| `baseline` | Path to baseline JSON | `ai-content-eval.baseline.json` |
| `mode` | `full` (with LLM) or `quick` (deterministic only) | `full` |
| `anthropic-api-key` | Anthropic API key | |
| `model` | LLM model override | |
| `threshold` | Score drop tolerance | `0` |
| `node-version` | Node.js version | `20` |

### Outputs

| Output | Description |
|--------|-------------|
| `passed` | `'true'` or `'false'` |
| `result` | Full `CompareResult` JSON |

### Using Outputs

```yaml
- uses: CodeJonesW/sensei-eval@v1
  id: eval
  with:
    anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}

- if: steps.eval.outputs.passed == 'false'
  run: echo "Content quality regressed!"
```

The action writes a markdown summary table to the GitHub Actions job summary automatically.

## API Reference

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
  model?: string,           // default: 'claude-sonnet-4-20250514'
  maxTokens?: number,
  retries?: number,         // default: 3 (set 0 to disable)
  initialDelayMs?: number,  // default: 1000
});
```

### Baseline Functions

```typescript
import { toBaselineEntry, createBaseline, compareResults } from 'ai-content-eval';

// Convert an EvalResult to a baseline entry
const entry = toBaselineEntry('intro-lesson', evalResult);

// Create a baseline file from entries
const baseline = createBaseline([entry], 'full');

// Compare current results against a baseline
const comparison = compareResults(currentResults, baseline, threshold);
console.log(comparison.passed);   // true if no regressions
console.log(comparison.summary);  // { total, regressed, improved, unchanged, new }
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
  feedback: EvalFeedback;           // actionable feedback from evaluation
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

interface EvalFeedback {
  failedCriteria: { criterion: string; reasoning: string; suggestions: string[] }[];
  strengths: string[];
  suggestions: string[];
}

interface PromptEntry {
  name: string;
  content: string;
  contentType: string;
  topic?: string;
  difficulty?: string;
  previousContent?: string[];
  metadata?: Record<string, unknown>;
}

interface EvalConfig {
  prompts: PromptEntry[];
  criteria?: EvalCriterion[];       // override built-in criteria
  model?: string;                   // override default model
}

interface CompareResult {
  passed: boolean;
  prompts: PromptCompareResult[];
  summary: { total: number; regressed: number; improved: number; unchanged: number; new: number };
}
```

## Adding Custom Criteria

1. Define a `JudgeRubric` with a 1-5 scale (if LLM) in the appropriate `src/criteria/*.ts` file
2. Export an `EvalCriterion` object with an `evaluate()` function implementing the check
3. Add it to the exported array at the bottom of the file
4. Add tests: mock the Judge for LLM criteria, use fixtures for deterministic

## Development

```bash
npm run build      # tsc -> dist/
npm test           # vitest run (unit tests only, no API calls)
npm run test:watch # vitest in watch mode
```

## Project Structure

```
src/
  index.ts              # Public API re-exports
  types.ts              # All interfaces
  runner.ts             # EvalRunner class — orchestrates evaluation
  judge.ts              # createJudge() — Anthropic SDK wrapper
  criteria/
    index.ts            # Re-exports all criterion sets
    universal.ts        # Criteria for ALL content types
    lesson.ts           # Lesson-specific LLM criteria
    challenge.ts        # Challenge-specific LLM criteria
    review.ts           # Review-specific criteria
  utils/
    markdown.ts         # Markdown parsing helpers
tests/
  fixtures/             # Sample content files for testing
  criteria/             # Criterion-level tests
  runner.test.ts        # EvalRunner orchestration tests
  judge.test.ts         # Judge tests with mocked Anthropic SDK
```

## Contributing

Issues and pull requests are welcome. If you're adding a new criterion, please include tests and follow the patterns in the existing criterion files.

For bug reports, include the content type and criteria configuration you're using along with the unexpected behavior.

## License

[MIT](LICENSE)
