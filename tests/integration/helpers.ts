import { readFileSync } from 'fs';
import { join } from 'path';
import { EvalRunner } from '../../src/runner.js';
import { createJudge } from '../../src/judge.js';
import { universal } from '../../src/criteria/universal.js';
import { lesson } from '../../src/criteria/lesson.js';
import { challenge } from '../../src/criteria/challenge.js';
import { review } from '../../src/criteria/review.js';
import type { EvalResult } from '../../src/types.js';

const fixturesDir = join(__dirname, '../fixtures');

export function loadFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), 'utf-8');
}

export function createIntegrationRunner(): EvalRunner {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY required for integration tests');
  }

  const judge = createJudge({ apiKey });
  return new EvalRunner({
    criteria: [...universal, ...lesson, ...challenge, ...review],
    judge,
  });
}

export function assertScoreGap(
  good: EvalResult,
  bad: EvalResult,
  criterion: string,
  minGap: number,
): void {
  const goodScore = good.scores.find((s) => s.criterion === criterion);
  const badScore = bad.scores.find((s) => s.criterion === criterion);

  if (!goodScore) {
    throw new Error(`Criterion "${criterion}" not found in good result`);
  }
  if (!badScore) {
    throw new Error(`Criterion "${criterion}" not found in bad result`);
  }

  const gap = goodScore.score - badScore.score;
  if (gap < minGap) {
    throw new Error(
      `Score gap for "${criterion}" is ${gap.toFixed(3)} (good=${goodScore.score.toFixed(3)}, bad=${badScore.score.toFixed(3)}), expected >= ${minGap}`,
    );
  }
}

export function assertScoreRange(
  result: EvalResult,
  criterion: string,
  min: number,
  max: number,
): void {
  const score = result.scores.find((s) => s.criterion === criterion);
  if (!score) {
    throw new Error(`Criterion "${criterion}" not found in result`);
  }

  if (score.score < min || score.score > max) {
    throw new Error(
      `Score for "${criterion}" is ${score.score.toFixed(3)}, expected [${min}, ${max}]`,
    );
  }
}

export function getScore(result: EvalResult, criterion: string): number {
  const score = result.scores.find((s) => s.criterion === criterion);
  if (!score) {
    throw new Error(`Criterion "${criterion}" not found in result`);
  }
  return score.score;
}
