import type { CliArgs } from '../args.js';
import type { SenseiEvalConfig } from '../../types.js';
import { EvalRunner } from '../../runner.js';
import { createJudge } from '../../judge.js';
import * as allCriteria from '../../criteria/index.js';

export function createRunner(args: CliArgs, config: SenseiEvalConfig): EvalRunner {
  // Use config criteria if provided, otherwise default to all built-in criteria
  const criteria = config.criteria ?? [
    ...allCriteria.universal,
    ...allCriteria.lesson,
    ...allCriteria.challenge,
    ...allCriteria.review,
  ];

  let judge = undefined;
  if (!args.quick) {
    if (!args.apiKey) {
      console.error('Error: Anthropic API key required for full evaluation.');
      console.error('Set ANTHROPIC_API_KEY environment variable or use --api-key.');
      process.exit(1);
    }
    judge = createJudge({
      apiKey: args.apiKey,
      model: args.model || config.model || undefined,
    });
  }

  return new EvalRunner({ criteria, judge });
}
