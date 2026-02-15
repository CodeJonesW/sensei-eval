import type { CliArgs } from '../args.js';
import type { SenseiEvalConfig } from '../../types.js';
import { createRunner, evaluatePrompts } from './shared.js';
import { formatEvalText, formatEvalMarkdown } from '../format.js';

export async function runEval(args: CliArgs, config: SenseiEvalConfig): Promise<void> {
  const runner = createRunner(args, config);
  const results = await evaluatePrompts(runner, config.prompts, args.quick);

  if (args.format === 'json') {
    console.log(JSON.stringify(Object.fromEntries(results), null, 2));
  } else if (args.format === 'markdown') {
    console.log(formatEvalMarkdown(results));
  } else {
    console.log(formatEvalText(results, args.verbose));
  }
}
