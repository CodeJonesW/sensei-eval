import type { CliArgs } from '../args.js';
import type { EvalResult, PromptEntry, SenseiEvalConfig } from '../../types.js';
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

export async function evaluatePrompts(
  runner: EvalRunner,
  prompts: PromptEntry[],
  quick: boolean,
  concurrency = 5,
): Promise<Map<string, EvalResult>> {
  const results = new Map<string, EvalResult>();
  let completed = 0;
  const total = prompts.length;

  for (let i = 0; i < prompts.length; i += concurrency) {
    const batch = prompts.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(async (prompt) => {
        const input = {
          content: prompt.content,
          contentType: prompt.contentType,
          topic: prompt.topic,
          difficulty: prompt.difficulty,
          previousContent: prompt.previousContent,
          metadata: prompt.metadata,
        };
        const result = quick
          ? await runner.quickCheck(input)
          : await runner.evaluate(input);
        completed++;
        const status = result.passed ? 'PASS' : 'FAIL';
        console.error(
          `  [${completed}/${total}] ${status}  ${prompt.name}  (${(result.overallScore * 100).toFixed(1)}%)`,
        );
        return [prompt.name, result] as const;
      }),
    );
    for (const [name, result] of batchResults) {
      results.set(name, result);
    }
  }

  return results;
}
