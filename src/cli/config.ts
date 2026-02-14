import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { SenseiEvalConfig } from '../types.js';

export async function loadConfig(configPath: string): Promise<SenseiEvalConfig> {
  const absolute = resolve(configPath);

  if (!existsSync(absolute)) {
    throw new Error(`Config file not found: ${absolute}`);
  }

  const ext = absolute.split('.').pop() ?? '';
  let config: SenseiEvalConfig;

  if (ext === 'ts') {
    config = loadTsConfig(absolute);
  } else if (ext === 'js' || ext === 'mjs') {
    config = await loadJsConfig(absolute);
  } else {
    throw new Error(`Unsupported config extension: .${ext} (use .ts, .js, or .mjs)`);
  }

  validateConfig(config);
  return config;
}

function loadTsConfig(absolute: string): SenseiEvalConfig {
  // Spawn tsx to evaluate the config file and print JSON to stdout
  const script = `
    import(process.argv[1]).then(m => {
      const config = m.default ?? m;
      process.stdout.write(JSON.stringify(config));
    }).catch(e => {
      process.stderr.write(e.message);
      process.exit(1);
    });
  `;

  try {
    const result = execFileSync('npx', ['tsx', '-e', script, absolute], {
      encoding: 'utf-8',
      timeout: 30_000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return JSON.parse(result) as SenseiEvalConfig;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('ENOENT') || msg.includes('not found')) {
      throw new Error(
        `Failed to load TypeScript config. Make sure "tsx" is installed:\n  npm install -D tsx\n\nOriginal error: ${msg}`,
      );
    }
    throw new Error(`Failed to load config ${absolute}: ${msg}`);
  }
}

async function loadJsConfig(absolute: string): Promise<SenseiEvalConfig> {
  const url = pathToFileURL(absolute).href;
  const mod = (await import(url)) as { default?: SenseiEvalConfig } & SenseiEvalConfig;
  return mod.default ?? mod;
}

function validateConfig(config: unknown): asserts config is SenseiEvalConfig {
  if (!config || typeof config !== 'object') {
    throw new Error('Config must export an object');
  }

  const c = config as Record<string, unknown>;
  if (!Array.isArray(c.prompts)) {
    throw new Error('Config must have a "prompts" array');
  }

  for (let i = 0; i < c.prompts.length; i++) {
    const p = c.prompts[i] as Record<string, unknown>;
    if (typeof p.name !== 'string' || !p.name) {
      throw new Error(`prompts[${i}] must have a "name" string`);
    }
    if (typeof p.content !== 'string' || !p.content) {
      throw new Error(`prompts[${i}] must have a "content" string`);
    }
    if (typeof p.contentType !== 'string' || !p.contentType) {
      throw new Error(`prompts[${i}] must have a "contentType" string`);
    }
  }
}
