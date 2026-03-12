# Changelog

All notable changes to this project will be documented in this file.

This project follows [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-03-11

Initial stable release. Renamed from `sensei-eval` to `ai-content-eval` to better reflect the library's purpose as a standalone AI content evaluation tool.

### Features

- **Two-tier evaluation pipeline**: deterministic structural checks (instant, zero API calls) and LLM-as-judge scoring (Claude API, rubric-based 1-5 scale normalized to 0-1)
- **Built-in criteria** for lessons, challenges, and reviews, covering format compliance, topic accuracy, pedagogical structure, code quality, and more
- **EvalRunner** class that orchestrates evaluation, filters criteria by content type, and computes weighted scores
- **quickCheck mode** for deterministic-only evaluation with no API calls
- **createJudge** factory with configurable model, retry logic, and exponential backoff for transient errors
- **CLI** with `eval`, `baseline`, and `compare` commands for CI integration
- **GitHub Action** for easy pull request quality gates
- **Baseline comparison** system that detects score regressions across prompt changes
- **Inline rubrics** for ad-hoc LLM evaluation without pre-registering criteria
- **Custom criteria** support through composable `EvalCriterion` objects
- **Multiple output formats**: text, JSON, and markdown
