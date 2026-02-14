export interface CliArgs {
  command: 'eval' | 'baseline' | 'compare' | 'help';
  config: string;
  baseline: string;
  output: string;
  quick: boolean;
  apiKey: string;
  model: string;
  threshold: number;
  verbose: boolean;
  format: 'text' | 'json' | 'markdown';
  resultFile: string;
}

export function parseArgs(argv: string[]): CliArgs {
  const args = argv.slice(2); // strip node + script path

  const command = (['eval', 'baseline', 'compare', 'help'] as const).includes(
    args[0] as 'eval' | 'baseline' | 'compare' | 'help',
  )
    ? (args[0] as CliArgs['command'])
    : 'help';

  const defaults: CliArgs = {
    command,
    config: 'sensei-eval.config.ts',
    baseline: 'sensei-eval.baseline.json',
    output: '',
    quick: false,
    apiKey: process.env.ANTHROPIC_API_KEY ?? '',
    model: '',
    threshold: 0,
    verbose: false,
    format: 'text',
    resultFile: '',
  };

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--quick' || arg === '-q') {
      defaults.quick = true;
    } else if (arg === '--verbose' || arg === '-v') {
      defaults.verbose = true;
    } else if (arg === '--config' || arg === '-c') {
      defaults.config = args[++i] ?? defaults.config;
    } else if (arg === '--baseline' || arg === '-b') {
      defaults.baseline = args[++i] ?? defaults.baseline;
    } else if (arg === '--output' || arg === '-o') {
      defaults.output = args[++i] ?? defaults.output;
    } else if (arg === '--api-key') {
      defaults.apiKey = args[++i] ?? defaults.apiKey;
    } else if (arg === '--model' || arg === '-m') {
      defaults.model = args[++i] ?? defaults.model;
    } else if (arg === '--threshold' || arg === '-t') {
      defaults.threshold = parseFloat(args[++i] ?? '0') || 0;
    } else if (arg === '--format' || arg === '-f') {
      const fmt = args[++i];
      if (fmt === 'text' || fmt === 'json' || fmt === 'markdown') {
        defaults.format = fmt;
      }
    } else if (arg === '--result-file') {
      defaults.resultFile = args[++i] ?? defaults.resultFile;
    }
  }

  // Default output to baseline path if not specified
  if (!defaults.output) {
    defaults.output = defaults.baseline;
  }

  return defaults;
}

export function printHelp(): void {
  console.log(`sensei-eval — Evaluate AI-generated educational content

Usage:
  sensei-eval <command> [options]

Commands:
  eval       Evaluate all prompts and print results
  baseline   Evaluate all prompts and write baseline file
  compare    Evaluate prompts and compare against baseline
  help       Show this help message

Options:
  -c, --config <path>     Config file (default: sensei-eval.config.ts)
  -b, --baseline <path>   Baseline file (default: sensei-eval.baseline.json)
  -o, --output <path>     Output file (default: same as baseline)
  -q, --quick             Skip LLM criteria (deterministic only)
  -f, --format <fmt>      Output format: text, json, markdown (default: text)
  -m, --model <model>     LLM model to use
  -t, --threshold <n>     Regression threshold (default: 0)
  -v, --verbose           Verbose output
  --api-key <key>         Anthropic API key (or set ANTHROPIC_API_KEY)
  --result-file <path>    Write JSON result to file (compare command)
`);
}
