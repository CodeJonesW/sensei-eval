import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseArgs } from '../../src/cli/args.js';

describe('parseArgs', () => {
  const originalEnv = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.ANTHROPIC_API_KEY = originalEnv;
    } else {
      delete process.env.ANTHROPIC_API_KEY;
    }
  });

  it('parses command from first arg', () => {
    expect(parseArgs(['node', 'cli', 'eval']).command).toBe('eval');
    expect(parseArgs(['node', 'cli', 'baseline']).command).toBe('baseline');
    expect(parseArgs(['node', 'cli', 'compare']).command).toBe('compare');
    expect(parseArgs(['node', 'cli', 'help']).command).toBe('help');
  });

  it('defaults to help for unknown commands', () => {
    expect(parseArgs(['node', 'cli', 'unknown']).command).toBe('help');
    expect(parseArgs(['node', 'cli']).command).toBe('help');
  });

  it('parses --config flag', () => {
    const args = parseArgs(['node', 'cli', 'eval', '--config', 'my.config.ts']);
    expect(args.config).toBe('my.config.ts');
  });

  it('parses -c shorthand', () => {
    const args = parseArgs(['node', 'cli', 'eval', '-c', 'my.config.ts']);
    expect(args.config).toBe('my.config.ts');
  });

  it('parses --baseline flag', () => {
    const args = parseArgs(['node', 'cli', 'compare', '--baseline', 'custom.json']);
    expect(args.baseline).toBe('custom.json');
  });

  it('parses --quick flag', () => {
    const args = parseArgs(['node', 'cli', 'eval', '--quick']);
    expect(args.quick).toBe(true);
  });

  it('parses -q shorthand', () => {
    const args = parseArgs(['node', 'cli', 'eval', '-q']);
    expect(args.quick).toBe(true);
  });

  it('parses --verbose flag', () => {
    const args = parseArgs(['node', 'cli', 'eval', '--verbose']);
    expect(args.verbose).toBe(true);
  });

  it('parses --api-key flag', () => {
    const args = parseArgs(['node', 'cli', 'eval', '--api-key', 'sk-test']);
    expect(args.apiKey).toBe('sk-test');
  });

  it('reads ANTHROPIC_API_KEY from env', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-env';
    const args = parseArgs(['node', 'cli', 'eval']);
    expect(args.apiKey).toBe('sk-env');
  });

  it('--api-key flag overrides env', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-env';
    const args = parseArgs(['node', 'cli', 'eval', '--api-key', 'sk-flag']);
    expect(args.apiKey).toBe('sk-flag');
  });

  it('parses --model flag', () => {
    const args = parseArgs(['node', 'cli', 'eval', '--model', 'claude-opus-4-20250514']);
    expect(args.model).toBe('claude-opus-4-20250514');
  });

  it('parses --threshold flag', () => {
    const args = parseArgs(['node', 'cli', 'compare', '--threshold', '0.05']);
    expect(args.threshold).toBe(0.05);
  });

  it('parses --format flag', () => {
    const args = parseArgs(['node', 'cli', 'eval', '--format', 'json']);
    expect(args.format).toBe('json');
  });

  it('ignores invalid format values', () => {
    const args = parseArgs(['node', 'cli', 'eval', '--format', 'yaml']);
    expect(args.format).toBe('text');
  });

  it('defaults output to baseline path', () => {
    const args = parseArgs(['node', 'cli', 'baseline']);
    expect(args.output).toBe(args.baseline);
  });

  it('parses --output flag', () => {
    const args = parseArgs(['node', 'cli', 'baseline', '--output', 'out.json']);
    expect(args.output).toBe('out.json');
  });

  it('handles all defaults', () => {
    const args = parseArgs(['node', 'cli', 'eval']);
    expect(args.config).toBe('sensei-eval.config.ts');
    expect(args.baseline).toBe('sensei-eval.baseline.json');
    expect(args.quick).toBe(false);
    expect(args.verbose).toBe(false);
    expect(args.format).toBe('text');
    expect(args.threshold).toBe(0);
    expect(args.model).toBe('');
  });
});
