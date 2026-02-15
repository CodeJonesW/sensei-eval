import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { CliArgs } from '../args.js';
import type { BaselineFile, SenseiEvalConfig } from '../../types.js';
import { compareResults } from '../../baseline.js';
import { createRunner, evaluatePrompts } from './shared.js';
import { formatCompareText, formatCompareMarkdown } from '../format.js';

export async function runCompare(args: CliArgs, config: SenseiEvalConfig): Promise<void> {
  const baselinePath = resolve(args.baseline);
  if (!existsSync(baselinePath)) {
    console.error(`Baseline file not found: ${baselinePath}`);
    console.error('Run "sensei-eval baseline" first to generate one.');
    process.exit(1);
  }

  const baselineFile = JSON.parse(readFileSync(baselinePath, 'utf-8')) as BaselineFile;
  const runner = createRunner(args, config);
  const results = await evaluatePrompts(runner, config.prompts, args.quick);

  const comparison = compareResults(results, baselineFile, args.threshold);

  if (args.format === 'json') {
    console.log(JSON.stringify(comparison, null, 2));
  } else if (args.format === 'markdown') {
    console.log(formatCompareMarkdown(comparison));
  } else {
    console.log(formatCompareText(comparison, args.verbose));
  }

  // Write JSON result to file if requested
  if (args.resultFile) {
    writeFileSync(resolve(args.resultFile), JSON.stringify(comparison, null, 2) + '\n');
  }

  // Write to GITHUB_STEP_SUMMARY if available
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) {
    const markdown = formatCompareMarkdown(comparison);
    writeFileSync(summaryPath, markdown + '\n', { flag: 'a' });
  }

  if (!comparison.passed) {
    process.exit(1);
  }
}
