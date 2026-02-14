#!/usr/bin/env node

import { parseArgs, printHelp } from './args.js';
import { loadConfig } from './config.js';
import { runEval } from './commands/eval.js';
import { runBaseline } from './commands/baseline.js';
import { runCompare } from './commands/compare.js';

async function main(): Promise<void> {
  const args = parseArgs(process.argv);

  if (args.command === 'help') {
    printHelp();
    return;
  }

  const config = await loadConfig(args.config);

  switch (args.command) {
    case 'eval':
      await runEval(args, config);
      break;
    case 'baseline':
      await runBaseline(args, config);
      break;
    case 'compare':
      await runCompare(args, config);
      break;
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
