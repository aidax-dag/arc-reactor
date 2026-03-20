import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { ArcReactorConfig } from './types/config.js';
import { DEFAULT_CONFIG } from './types/config.js';

export function loadConfig(overrides: Partial<ArcReactorConfig> = {}): ArcReactorConfig {
  const globalPath = join(homedir(), '.arc-reactor', 'config.json');
  const projectPath = join(process.cwd(), '.arc-reactor.json');

  let globalConfig: Partial<ArcReactorConfig> = {};
  let projectConfig: Partial<ArcReactorConfig> = {};

  if (existsSync(globalPath)) {
    globalConfig = JSON.parse(readFileSync(globalPath, 'utf-8'));
  }

  if (existsSync(projectPath)) {
    projectConfig = JSON.parse(readFileSync(projectPath, 'utf-8'));
  }

  const merged = { ...DEFAULT_CONFIG, ...globalConfig, ...projectConfig, ...overrides };
  // Ensure outputDir is always resolved at call time, not module load time
  if (!overrides.outputDir && !projectConfig.outputDir && !globalConfig.outputDir) {
    merged.outputDir = process.cwd();
  }
  return merged;
}
