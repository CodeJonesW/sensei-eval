import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { CliArgs } from '../args.js';
import type { SenseiEvalConfig } from '../../types.js';
import { toBaselineEntry, createBaseline } from '../../baseline.js';
import { createRunner, evaluatePrompts } from './shared.js';

export async function runBaseline(args: CliArgs, config: SenseiEvalConfig): Promise<void> {
  const runner = createRunner(args, config);
  const results = await evaluatePrompts(runner, config.prompts, args.quick);

  const entries = [...results.entries()].map(([name, result]) =>
    toBaselineEntry(name, result),
  );
  const mode = args.quick ? 'quick' as const : 'full' as const;
  const baseline = createBaseline(entries, mode);

  const outputPath = resolve(args.output);
  writeFileSync(outputPath, JSON.stringify(baseline, null, 2) + '\n');
  console.log(`Baseline written to ${outputPath} (${entries.length} prompts, mode: ${mode})`);
}
