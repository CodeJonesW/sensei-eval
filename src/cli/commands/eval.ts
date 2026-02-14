import type { CliArgs } from '../args.js';
import type { EvalResult, SenseiEvalConfig } from '../../types.js';
import { createRunner } from './shared.js';
import { formatEvalText, formatEvalMarkdown } from '../format.js';

export async function runEval(args: CliArgs, config: SenseiEvalConfig): Promise<void> {
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

  if (args.format === 'json') {
    console.log(JSON.stringify(Object.fromEntries(results), null, 2));
  } else if (args.format === 'markdown') {
    console.log(formatEvalMarkdown(results));
  } else {
    console.log(formatEvalText(results, args.verbose));
  }
}
