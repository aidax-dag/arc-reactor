import { loadConfig } from '@arc-reactor/core';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function showConfig(setOption?: string) {
  if (setOption) {
    const eqIndex = setOption.indexOf('=');
    if (eqIndex === -1) {
      console.error('Usage: arc-reactor config --set key=value');
      process.exitCode = 1;
      return;
    }
    const key = setOption.slice(0, eqIndex);
    const value = setOption.slice(eqIndex + 1);

    const configPath = join(process.cwd(), '.arc-reactor.json');
    let existing: Record<string, unknown> = {};
    if (existsSync(configPath)) {
      existing = JSON.parse(readFileSync(configPath, 'utf-8'));
    }
    existing[key] = value;
    writeFileSync(configPath, JSON.stringify(existing, null, 2) + '\n');
    console.log(`✅ Set ${key} = ${value} in .arc-reactor.json`);
    return;
  }

  const config = loadConfig();
  console.log('⚙️  Arc-Reactor Configuration');
  console.log('━'.repeat(30));
  for (const [key, value] of Object.entries(config)) {
    console.log(`  ${key}: ${JSON.stringify(value)}`);
  }
}
