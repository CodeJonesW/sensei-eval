import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CliArgs } from '../../src/cli/args.js';
import type { EvalResult, SenseiEvalConfig, CompareResult, BaselineFile } from '../../src/types.js';

// Mock evaluatePrompts and createRunner from shared
vi.mock('../../src/cli/commands/shared.js', () => ({
  createRunner: vi.fn(() => ({})),
  evaluatePrompts: vi.fn(),
}));

// Mock node:fs
vi.mock('node:fs', () => ({
  writeFileSync: vi.fn(),
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
}));

import { runEval } from '../../src/cli/commands/eval.js';
import { runBaseline } from '../../src/cli/commands/baseline.js';
import { runCompare } from '../../src/cli/commands/compare.js';
import { evaluatePrompts, createRunner } from '../../src/cli/commands/shared.js';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';

function makeArgs(overrides: Partial<CliArgs> = {}): CliArgs {
  return {
    command: 'eval',
    config: 'sensei-eval.config.ts',
    baseline: 'sensei-eval.baseline.json',
    output: 'sensei-eval.baseline.json',
    quick: false,
    apiKey: 'test-key',
    model: '',
    threshold: 0,
    verbose: false,
    format: 'text',
    resultFile: '',
    ...overrides,
  };
}

function makeEvalResult(overrides: Partial<EvalResult> = {}): EvalResult {
  return {
    overallScore: 0.85,
    passed: true,
    scores: [
      { criterion: 'format_compliance', score: 0.9, rawScore: 0.9, maxScore: 1, passed: true, reasoning: 'Good' },
    ],
    feedback: { failedCriteria: [], strengths: ['Good'], suggestions: [] },
    contentType: 'lesson',
    evaluatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeConfig(): SenseiEvalConfig {
  return {
    prompts: [
      { name: 'test-prompt', content: '# Test\n\nContent', contentType: 'lesson' },
    ],
  };
}

function makeResultsMap(): Map<string, EvalResult> {
  return new Map([['test-prompt', makeEvalResult()]]);
}

describe('runEval', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.mocked(evaluatePrompts).mockResolvedValue(makeResultsMap());
  });

  afterEach(() => {
    logSpy.mockRestore();
    vi.clearAllMocks();
  });

  it('outputs text format by default', async () => {
    await runEval(makeArgs(), makeConfig());

    expect(logSpy).toHaveBeenCalledTimes(1);
    const output = logSpy.mock.calls[0][0] as string;
    expect(output).toContain('PASS');
    expect(output).toContain('test-prompt');
  });

  it('outputs JSON when --format json', async () => {
    await runEval(makeArgs({ format: 'json' }), makeConfig());

    const output = logSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);
    expect(parsed['test-prompt']).toBeDefined();
    expect(parsed['test-prompt'].overallScore).toBe(0.85);
  });

  it('outputs markdown when --format markdown', async () => {
    await runEval(makeArgs({ format: 'markdown' }), makeConfig());

    const output = logSpy.mock.calls[0][0] as string;
    expect(output).toContain('## sensei-eval Results');
    expect(output).toContain('| Prompt |');
  });

  it('passes quick flag to evaluatePrompts', async () => {
    await runEval(makeArgs({ quick: true }), makeConfig());

    expect(evaluatePrompts).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      true,
    );
  });
});

describe('runBaseline', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.mocked(evaluatePrompts).mockResolvedValue(makeResultsMap());
  });

  afterEach(() => {
    logSpy.mockRestore();
    vi.clearAllMocks();
  });

  it('writes baseline JSON to correct path', async () => {
    await runBaseline(makeArgs({ output: '/tmp/test-baseline.json' }), makeConfig());

    expect(writeFileSync).toHaveBeenCalledTimes(1);
    const [path, content] = vi.mocked(writeFileSync).mock.calls[0];
    expect(path).toContain('test-baseline.json');
    const parsed = JSON.parse(content as string);
    expect(parsed.version).toBe(1);
    expect(parsed.entries).toHaveLength(1);
    expect(parsed.entries[0].name).toBe('test-prompt');
  });

  it('logs confirmation with prompt count and mode', async () => {
    await runBaseline(makeArgs(), makeConfig());

    const output = logSpy.mock.calls[0][0] as string;
    expect(output).toContain('1 prompts');
    expect(output).toContain('mode: full');
  });

  it('records mode as quick when --quick', async () => {
    await runBaseline(makeArgs({ quick: true }), makeConfig());

    const [, content] = vi.mocked(writeFileSync).mock.calls[0];
    const parsed = JSON.parse(content as string);
    expect(parsed.mode).toBe('quick');

    const output = logSpy.mock.calls[0][0] as string;
    expect(output).toContain('mode: quick');
  });
});

describe('runCompare', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  const baselineFile: BaselineFile = {
    version: 1,
    generatedAt: '2025-01-01T00:00:00.000Z',
    mode: 'full',
    entries: [
      {
        name: 'test-prompt',
        contentType: 'lesson',
        overallScore: 0.85,
        scores: { format_compliance: 0.9 },
        evaluatedAt: '2025-01-01T00:00:00.000Z',
      },
    ],
  };

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify(baselineFile));
    vi.mocked(evaluatePrompts).mockResolvedValue(makeResultsMap());
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    exitSpy.mockRestore();
    vi.clearAllMocks();
    delete process.env.GITHUB_STEP_SUMMARY;
  });

  it('does not exit on pass', async () => {
    await runCompare(makeArgs({ command: 'compare' }), makeConfig());

    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('calls process.exit(1) on regression', async () => {
    // Return a result with lower score to trigger regression
    vi.mocked(evaluatePrompts).mockResolvedValue(
      new Map([['test-prompt', makeEvalResult({ overallScore: 0.3 })]])
    );

    await runCompare(makeArgs({ command: 'compare' }), makeConfig());

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('writes to GITHUB_STEP_SUMMARY when env var set', async () => {
    process.env.GITHUB_STEP_SUMMARY = '/tmp/gh-summary.md';

    await runCompare(makeArgs({ command: 'compare' }), makeConfig());

    const calls = vi.mocked(writeFileSync).mock.calls;
    const summaryCall = calls.find(([path]) => path === '/tmp/gh-summary.md');
    expect(summaryCall).toBeDefined();
    expect(summaryCall![1]).toContain('## sensei-eval Results');
  });

  it('writes to --result-file when specified', async () => {
    await runCompare(
      makeArgs({ command: 'compare', resultFile: '/tmp/result.json' }),
      makeConfig(),
    );

    const calls = vi.mocked(writeFileSync).mock.calls;
    const resultCall = calls.find(([path]) => (path as string).includes('result.json'));
    expect(resultCall).toBeDefined();
    const parsed = JSON.parse(resultCall![1] as string);
    expect(parsed.passed).toBeDefined();
    expect(parsed.prompts).toBeDefined();
  });

  it('exits with error when baseline file missing', async () => {
    vi.mocked(existsSync).mockReturnValue(false);

    await runCompare(makeArgs({ command: 'compare' }), makeConfig());

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Baseline file not found'));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('outputs JSON when --format json', async () => {
    await runCompare(makeArgs({ command: 'compare', format: 'json' }), makeConfig());

    const output = logSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output) as CompareResult;
    expect(parsed.passed).toBe(true);
    expect(parsed.summary).toBeDefined();
  });

  it('outputs markdown when --format markdown', async () => {
    await runCompare(makeArgs({ command: 'compare', format: 'markdown' }), makeConfig());

    const output = logSpy.mock.calls[0][0] as string;
    expect(output).toContain('## sensei-eval Results');
    expect(output).toContain('| Prompt |');
  });
});
