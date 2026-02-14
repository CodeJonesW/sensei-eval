import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { loadConfig } from '../../src/cli/config.js';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const testDir = join(tmpdir(), 'sensei-eval-config-test-' + Date.now());

function setup() {
  mkdirSync(testDir, { recursive: true });
}

function cleanup() {
  rmSync(testDir, { recursive: true, force: true });
}

describe('loadConfig', () => {
  beforeAll(() => setup());
  afterAll(() => cleanup());

  it('throws for missing config file', async () => {
    await expect(loadConfig('/nonexistent/config.ts')).rejects.toThrow('Config file not found');
  });

  it('throws for unsupported extension', async () => {
    const path = join(testDir, 'config.yaml');
    writeFileSync(path, 'prompts: []');
    await expect(loadConfig(path)).rejects.toThrow('Unsupported config extension');
  });

  it('loads .js config file', async () => {
    const path = join(testDir, 'config.mjs');
    writeFileSync(
      path,
      `export default {
        prompts: [
          { name: 'test', content: 'Hello world', contentType: 'lesson' }
        ]
      };`,
    );
    const config = await loadConfig(path);
    expect(config.prompts).toHaveLength(1);
    expect(config.prompts[0].name).toBe('test');
  });

  it('validates missing prompts array', async () => {
    const path = join(testDir, 'bad.mjs');
    writeFileSync(path, 'export default {};');
    await expect(loadConfig(path)).rejects.toThrow('must have a "prompts" array');
  });

  it('validates prompt entries have required fields', async () => {
    const path = join(testDir, 'bad-prompts.mjs');
    writeFileSync(
      path,
      `export default { prompts: [{ name: '', content: 'x', contentType: 'lesson' }] };`,
    );
    await expect(loadConfig(path)).rejects.toThrow('prompts[0] must have a "name" string');
  });

  it('validates prompt content is required', async () => {
    const path = join(testDir, 'no-content.mjs');
    writeFileSync(
      path,
      `export default { prompts: [{ name: 'test', content: '', contentType: 'lesson' }] };`,
    );
    await expect(loadConfig(path)).rejects.toThrow('prompts[0] must have a "content" string');
  });

  it('validates prompt contentType is required', async () => {
    const path = join(testDir, 'no-type.mjs');
    writeFileSync(
      path,
      `export default { prompts: [{ name: 'test', content: 'hello', contentType: '' }] };`,
    );
    await expect(loadConfig(path)).rejects.toThrow('prompts[0] must have a "contentType" string');
  });
});
