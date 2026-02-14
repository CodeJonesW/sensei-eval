import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { CliArgs } from '../args.js';
import type { EvalResult, SenseiEvalConfig } from '../../types.js';
import { toBaselineEntry, createBaseline } from '../../baseline.js';
import { createRunner } from './shared.js';

export async function runBaseline(args: CliArgs, config: SenseiEvalConfig): Promise<void> {
  const runner = createRunner(args, config);
  const results = new Map<string, EvalResult>();

  for (const prompt of config.prompts) {
    const input = {
      content: prompt.content,
      contentType: prompt.contentType,
      topic: prompt.topic,
      difficulty: prompt.difficulty,
      previousContent: prompt.previousContent,
      metadata: prompt.metadata,
    };

    const result = args.quick
      ? await runner.quickCheck(input)
      : await runner.evaluate(input);

    results.set(prompt.name, result);
  }

  const entries = [...results.entries()].map(([name, result]) =>
    toBaselineEntry(name, result),
  );
  const mode = args.quick ? 'quick' as const : 'full' as const;
  const baseline = createBaseline(entries, mode);

  const outputPath = resolve(args.output);
  writeFileSync(outputPath, JSON.stringify(baseline, null, 2) + '\n');
  console.log(`Baseline written to ${outputPath} (${entries.length} prompts, mode: ${mode})`);
}
