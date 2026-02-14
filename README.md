# sensei-eval

TypeScript library for evaluating AI-generated educational content using deterministic checks and LLM-as-judge scoring. Includes a CLI and GitHub Action for detecting prompt quality regressions in CI.

## Install

```bash
npm install sensei-eval
```

## Quick Start

### Library Usage

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

## CLI

The CLI evaluates prompts defined in a config file, generates baselines, and compares against them to detect regressions.

### Setup

Create a config file (`sensei-eval.config.ts`) in your project:

```typescript
import type { SenseiEvalConfig } from 'sensei-eval';

const config: SenseiEvalConfig = {
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
npx sensei-eval eval

# Evaluate and write a baseline file
npx sensei-eval baseline

# Evaluate and compare against the baseline (exits non-zero on regression)
npx sensei-eval compare
```

### Options

| Flag | Short | Description | Default |
|------|-------|-------------|---------|
| `--config <path>` | `-c` | Config file path | `sensei-eval.config.ts` |
| `--baseline <path>` | `-b` | Baseline file path | `sensei-eval.baseline.json` |
| `--output <path>` | `-o` | Output file path (baseline command) | Same as `--baseline` |
| `--quick` | `-q` | Deterministic only, skip LLM criteria | `false` |
| `--format <fmt>` | `-f` | Output format: `text`, `json`, `markdown` | `text` |
| `--model <model>` | `-m` | LLM model to use | `claude-sonnet-4-20250514` |
| `--threshold <n>` | `-t` | Score drop tolerance before failing | `0` |
| `--verbose` | `-v` | Show per-criterion details | `false` |
| `--api-key <key>` | | Anthropic API key | `ANTHROPIC_API_KEY` env |
| `--result-file <path>` | | Write JSON result to file (compare) | |

### CI Workflow

The typical workflow for using sensei-eval as a CI quality gate:

1. **Generate a baseline on main** — run `npx sensei-eval baseline` and commit `sensei-eval.baseline.json`
2. **PRs compare against baseline** — CI runs `npx sensei-eval compare`, which evaluates current prompts and fails if any score drops below baseline
3. **Update baseline when prompts change intentionally** — re-run `npx sensei-eval baseline` and commit the updated file

This approach avoids re-evaluating the baseline on every PR (saving LLM cost) and eliminates non-determinism from comparing two separate LLM runs.

## GitHub Action

A reusable composite action is provided for easy CI integration.

### Basic Usage

```yaml
# .github/workflows/prompt-quality.yml
name: Prompt Quality
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
| `config` | Path to config file | `sensei-eval.config.ts` |
| `baseline` | Path to baseline JSON | `sensei-eval.baseline.json` |
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
  run: echo "Prompt quality regressed!"
```

The action writes a markdown summary table to the GitHub Actions job summary automatically.

## How It Works

Content is evaluated through a two-tier system:

1. **Deterministic criteria** — fast, pure functions that check markdown formatting, length, and structure
2. **LLM-judge criteria** — Claude API calls that score content against rubrics on a 1-5 scale, normalized to 0-1

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
  model?: string,           // default: 'claude-sonnet-4-20250514'
  maxTokens?: number,
  retries?: number,         // default: 3 (set 0 to disable)
  initialDelayMs?: number,  // default: 1000
});
```

### Baseline Functions

```typescript
import { toBaselineEntry, createBaseline, compareResults } from 'sensei-eval';

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

interface SenseiEvalConfig {
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
