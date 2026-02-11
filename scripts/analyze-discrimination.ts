import { readFileSync } from 'fs';
import { join } from 'path';
import { EvalRunner } from '../src/runner.js';
import { createJudge } from '../src/judge.js';
import { universal } from '../src/criteria/universal.js';
import { lesson } from '../src/criteria/lesson.js';
import { challenge } from '../src/criteria/challenge.js';
import { review } from '../src/criteria/review.js';
import type { EvalResult, EvalInput } from '../src/types.js';

const fixturesDir = join(import.meta.dirname, '../tests/fixtures');

function loadFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), 'utf-8');
}

interface FixtureConfig {
  file: string;
  quality: 'good' | 'mediocre' | 'bad' | 'subtle-bad';
  input: EvalInput;
}

const fixtures: Record<string, FixtureConfig[]> = {
  lesson: [
    {
      file: 'good-lesson.md',
      quality: 'good',
      input: { content: '', contentType: 'lesson', topic: 'neural networks', difficulty: 'beginner' },
    },
    {
      file: 'mediocre-lesson.md',
      quality: 'mediocre',
      input: { content: '', contentType: 'lesson', topic: 'JavaScript closures', difficulty: 'intermediate' },
    },
    {
      file: 'bad-lesson.md',
      quality: 'bad',
      input: { content: '', contentType: 'lesson', topic: 'neural networks', difficulty: 'beginner' },
    },
    {
      file: 'subtle-bad-lesson.md',
      quality: 'subtle-bad',
      input: { content: '', contentType: 'lesson', topic: 'JavaScript array methods', difficulty: 'beginner' },
    },
  ],
  challenge: [
    {
      file: 'good-challenge.md',
      quality: 'good',
      input: { content: '', contentType: 'challenge', difficulty: 'medium' },
    },
    {
      file: 'mediocre-challenge.md',
      quality: 'mediocre',
      input: { content: '', contentType: 'challenge', difficulty: 'easy' },
    },
    {
      file: 'bad-challenge.md',
      quality: 'bad',
      input: { content: '', contentType: 'challenge', difficulty: 'medium' },
    },
  ],
  review: [
    {
      file: 'good-review.md',
      quality: 'good',
      input: { content: '', contentType: 'review' },
    },
    {
      file: 'mediocre-review.md',
      quality: 'mediocre',
      input: { content: '', contentType: 'review' },
    },
    {
      file: 'bad-review.md',
      quality: 'bad',
      input: { content: '', contentType: 'review' },
    },
  ],
};

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('Error: ANTHROPIC_API_KEY environment variable required');
    process.exit(1);
  }

  const judge = createJudge({ apiKey });
  const runner = new EvalRunner({
    criteria: [...universal, ...lesson, ...challenge, ...review],
    judge,
  });

  console.log('='.repeat(80));
  console.log('DISCRIMINATION ANALYSIS');
  console.log('='.repeat(80));
  console.log();

  const allResults: Record<string, Map<string, EvalResult>> = {};

  for (const [contentType, configs] of Object.entries(fixtures)) {
    console.log(`Evaluating ${contentType} fixtures...`);
    allResults[contentType] = new Map();

    for (const config of configs) {
      const content = loadFixture(config.file);
      const input = { ...config.input, content };
      console.log(`  ${config.file}...`);
      const result = await runner.evaluate(input);
      allResults[contentType].set(config.quality, result);
    }
  }

  // 1. Detailed scores
  console.log();
  console.log('='.repeat(80));
  console.log('1. DETAILED SCORES');
  console.log('='.repeat(80));

  for (const [contentType, configs] of Object.entries(fixtures)) {
    console.log(`\n--- ${contentType.toUpperCase()} ---`);
    const results = allResults[contentType];

    for (const config of configs) {
      const result = results.get(config.quality)!;
      console.log(`\n  [${config.quality.toUpperCase()}] ${config.file}`);
      console.log(`  Overall: ${result.overallScore.toFixed(3)} | Passed: ${result.passed}`);

      for (const score of result.scores) {
        const reasoning = score.reasoning.length > 80
          ? score.reasoning.slice(0, 77) + '...'
          : score.reasoning;
        console.log(
          `    ${score.criterion.padEnd(25)} ${score.score.toFixed(3)} ${score.passed ? 'PASS' : 'FAIL'}  "${reasoning}"`,
        );
      }
    }
  }

  // 2. Discrimination table
  console.log();
  console.log('='.repeat(80));
  console.log('2. DISCRIMINATION TABLE');
  console.log('='.repeat(80));

  for (const [contentType, configs] of Object.entries(fixtures)) {
    const results = allResults[contentType];
    const good = results.get('good');
    const mediocre = results.get('mediocre');
    const bad = results.get('bad');

    if (!good || !bad) continue;

    console.log(`\n--- ${contentType.toUpperCase()} ---`);
    console.log(
      `  ${'Criterion'.padEnd(25)} ${'Good'.padStart(6)} ${'Med'.padStart(6)} ${'Bad'.padStart(6)} ${'Gap'.padStart(6)} ${'Order'.padStart(7)}`,
    );
    console.log('  ' + '-'.repeat(62));

    const allCriteria = new Set(good.scores.map((s) => s.criterion));

    for (const criterion of allCriteria) {
      const goodScore = good.scores.find((s) => s.criterion === criterion)?.score ?? NaN;
      const medScore = mediocre?.scores.find((s) => s.criterion === criterion)?.score ?? NaN;
      const badScore = bad.scores.find((s) => s.criterion === criterion)?.score ?? NaN;
      const gap = goodScore - badScore;

      let order = '';
      if (!isNaN(medScore)) {
        order = goodScore >= medScore && medScore >= badScore ? 'G>=M>=B' : 'WRONG';
      } else {
        order = goodScore >= badScore ? 'G>=B' : 'WRONG';
      }

      console.log(
        `  ${criterion.padEnd(25)} ${fmt(goodScore)} ${fmt(medScore)} ${fmt(badScore)} ${fmt(gap)} ${order.padStart(7)}`,
      );
    }
  }

  // 3. Low discrimination flags
  console.log();
  console.log('='.repeat(80));
  console.log('3. LOW DISCRIMINATION FLAGS (gap < 0.10)');
  console.log('='.repeat(80));

  let flagCount = 0;
  for (const [contentType] of Object.entries(fixtures)) {
    const results = allResults[contentType];
    const good = results.get('good');
    const bad = results.get('bad');
    if (!good || !bad) continue;

    for (const goodScore of good.scores) {
      const badScore = bad.scores.find((s) => s.criterion === goodScore.criterion);
      if (!badScore) continue;

      const gap = goodScore.score - badScore.score;
      if (gap < 0.1) {
        console.log(
          `  WARNING: ${contentType}/${goodScore.criterion} — gap=${gap.toFixed(3)} (good=${goodScore.score.toFixed(3)}, bad=${badScore.score.toFixed(3)})`,
        );
        flagCount++;
      }
    }
  }

  if (flagCount === 0) {
    console.log('  No low-discrimination criteria found.');
  }

  // 4. Subtle-bad analysis
  console.log();
  console.log('='.repeat(80));
  console.log('4. SUBTLE-BAD ANALYSIS');
  console.log('='.repeat(80));

  const subtleBad = allResults['lesson']?.get('subtle-bad');
  if (subtleBad) {
    const deterministicCriteria = ['format_compliance', 'length_compliance', 'has_code_block', 'has_structure'];
    const llmCriteria = ['topic_accuracy', 'code_quality', 'pedagogical_structure', 'engagement', 'progressive_difficulty', 'repetition_avoidance'];

    console.log('\n  Deterministic criteria (should all pass):');
    for (const name of deterministicCriteria) {
      const score = subtleBad.scores.find((s) => s.criterion === name);
      if (score) {
        console.log(`    ${name.padEnd(25)} ${score.score.toFixed(3)} ${score.passed ? 'PASS' : 'FAIL'}`);
      }
    }

    console.log('\n  LLM criteria (should catch factual errors):');
    for (const name of llmCriteria) {
      const score = subtleBad.scores.find((s) => s.criterion === name);
      if (score) {
        const reasoning = score.reasoning.length > 60
          ? score.reasoning.slice(0, 57) + '...'
          : score.reasoning;
        console.log(`    ${name.padEnd(25)} ${score.score.toFixed(3)} ${score.passed ? 'PASS' : 'FAIL'}  "${reasoning}"`);
      }
    }

    const llmFailed = subtleBad.scores.filter(
      (s) => llmCriteria.includes(s.criterion) && !s.passed,
    );
    console.log(
      `\n  Result: ${llmFailed.length} LLM criteria caught issues: ${llmFailed.map((s) => s.criterion).join(', ') || 'NONE'}`,
    );
  } else {
    console.log('  No subtle-bad lesson fixture found.');
  }

  console.log();
  console.log('='.repeat(80));
  console.log('Analysis complete.');
  console.log('='.repeat(80));
}

function fmt(n: number): string {
  return isNaN(n) ? '   N/A' : n.toFixed(3).padStart(6);
}

main().catch((err) => {
  console.error('Analysis failed:', err);
  process.exit(1);
});
