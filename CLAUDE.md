# sensei-eval

TypeScript library for evaluating AI-generated educational content using deterministic checks and LLM-as-judge scoring.

## Quick Reference

```bash
npm run build      # tsc → dist/
npm test           # vitest run (unit tests only, no API calls)
npm run test:watch # vitest in watch mode
```

## Architecture

The library evaluates markdown educational content (lessons, challenges, reviews) through a two-tier system:

1. **Deterministic criteria** — fast, pure functions (markdown formatting, length, structure)
2. **LLM-judge criteria** — Claude API calls that score content against rubrics on a 1-5 scale, normalized to 0-1

### Core Flow

`EvalRunner.evaluate(input)` → filters criteria by `contentType` → runs deterministic checks in parallel → runs LLM judge checks in parallel → computes weighted overall score → returns `EvalResult`

`EvalRunner.quickCheck(input)` does the same but skips all LLM criteria (no API calls).

### Key Types (`src/types.ts`)

- **EvalInput** — `{ content, contentType, topic?, difficulty?, previousContent?, metadata? }`
- **EvalCriterion** — defines a single check: name, method (`deterministic` | `llm_judge`), threshold, weight, and `evaluate()` function
- **EvalScore** — result of one criterion: score (0-1), rawScore, passed, reasoning
- **EvalResult** — aggregate: overallScore (weighted average), passed (all criteria must pass), scores array
- **Judge** — interface wrapping LLM calls: `score(content, rubric, context?) → { score, reasoning }`

### File Map

```
src/
  index.ts              # Public API re-exports
  types.ts              # All interfaces
  runner.ts             # EvalRunner class — orchestrates evaluation
  judge.ts              # createJudge() — Anthropic SDK wrapper
  criteria/
    index.ts            # Re-exports all criterion sets
    universal.ts        # Criteria for ALL content types: format_compliance, length_compliance, has_code_block, has_structure, engagement (LLM), repetition_avoidance (LLM)
    lesson.ts           # Lesson-specific LLM criteria: topic_accuracy, pedagogical_structure, code_quality, progressive_difficulty
    challenge.ts        # Challenge-specific LLM criteria: problem_clarity, difficulty_calibration, hint_quality, testability
    review.ts           # Review-specific: brevity (deterministic), actionability (LLM), honesty (LLM)
  utils/
    markdown.ts         # Markdown parsing helpers (unclosed blocks/bold/italic, extract code blocks, heading/section detection)
tests/
  fixtures/             # good-lesson.md, bad-lesson.md, good-challenge.md, bad-challenge.md
  criteria/
    universal.test.ts   # Tests deterministic universal criteria against fixtures
    lesson.test.ts      # Tests lesson criteria with mock judge
    challenge.test.ts   # Tests challenge criteria with mock judge
  judge.test.ts         # Tests createJudge with mocked Anthropic SDK
  runner.test.ts        # Tests EvalRunner orchestration, weighting, filtering
```

## Conventions

- **ESM-only** — `"type": "module"` in package.json, `.js` extensions in all imports
- **Strict TypeScript** — `strict: true`, target es2022, bundler module resolution
- **Tests** — Vitest; unit tests mock all LLM calls (mock `Judge` or mock `@anthropic-ai/sdk`); no integration tests hit the API by default
- **Scoring normalization** — LLM rubrics use 1-5 scale, always normalized to 0-1 via `(score - 1) / 4`
- **Weights** — most criteria weight 1.0; high-signal criteria (topic_accuracy, pedagogical_structure, problem_clarity) weight 1.5; structural criteria (has_code_block, has_structure, brevity) weight 0.5
- **Pass/fail** — `EvalResult.passed` requires ALL individual criteria to pass their thresholds; overall score is weighted average
- **Content type filtering** — criteria declare `contentTypes: string[] | '*'`; `'*'` applies to all types
- **Default LLM model** — `claude-sonnet-4-20250514` (configurable via `createJudge({ model })`)

## Adding a New Criterion

1. Define a `JudgeRubric` with 1-5 scale (if LLM) in the appropriate `src/criteria/*.ts`
2. Export an `EvalCriterion` object with `evaluate()` implementing the check
3. Add it to the exported array at the bottom of the file
4. Add tests — mock the Judge for LLM criteria, use fixtures for deterministic

## Versioning

This package follows [Semantic Versioning](https://semver.org/). After completing work, always review the changes made during the session and recommend an appropriate version bump before committing:

- **Patch** (0.x.Y) — bug fixes, internal refactors, doc changes, test additions, dependency updates that don't affect the public API
- **Minor** (0.X.0) — new features, new exports, new CLI commands, new options/flags — anything additive that doesn't break existing consumers
- **Major** (X.0.0) — removed or renamed exports, changed function signatures, changed type shapes that existing consumers depend on, removed CLI commands/flags, breaking config format changes

When recommending a bump, reference the current version in `package.json` and list the specific changes that justify the level. For pre-1.0 packages, minor bumps cover new features and patch bumps cover fixes — but still flag breaking changes clearly even though semver technically allows them under 0.x.

## Release Process

Merging to main with a version bump in `package.json` triggers automatic publishing to npm and creates a GitHub release. On every version bump, draft release notes covering:

1. **What changed** — list each user-facing change (new features, bug fixes, improvements)
2. **Why it matters** — one sentence per item explaining the benefit
3. **Breaking changes** — call out anything that requires consumer action (if any)
4. **Migration steps** — if breaking, provide before/after code examples

Format release notes as a markdown body for `gh release create`. Keep them concise — a consumer should understand what changed in 30 seconds.

The `NPM_TOKEN` secret must be configured in the repository settings for publishing to work.
