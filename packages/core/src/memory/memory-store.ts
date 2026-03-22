import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { createHash } from 'node:crypto';

const MEMORY_DIR = join(homedir(), '.arc-reactor', 'memory');

// --- Types ---

export interface ExecutionPattern {
  id: string;
  type: 'success' | 'failure' | 'warning';
  team: string;
  pattern: string;           // What happened
  lesson: string;            // What to do differently
  context: string;           // When this applies
  occurrences: number;
  lastSeen: string;
}

export interface ProjectContext {
  projectHash: string;
  projectPath: string;
  techStack: string[];        // ["react", "next.js", "typescript", "tailwind"]
  architecture: string;       // "monorepo" | "single" | "microservices"
  conventions: string[];      // ["vitest for testing", "src/ directory structure"]
  decisions: Decision[];      // Architecture decisions made
  lastUpdated: string;
}

export interface Decision {
  date: string;
  description: string;
  reason: string;
}

export interface UserPreferences {
  preferredTeams: string[];
  preferredModel: string;
  testRunner?: string;        // Learned from past runs
  packageManager?: string;    // npm, pnpm, yarn, bun
  styleFramework?: string;    // tailwind, css-modules, styled-components
}

// --- Helpers ---

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function readJson<T>(path: string, fallback: T): T {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return fallback;
  }
}

function writeJson(path: string, data: unknown): void {
  ensureDir(join(path, '..'));
  writeFileSync(path, JSON.stringify(data, null, 2));
}

export function projectHash(projectPath: string): string {
  return createHash('sha256').update(projectPath).digest('hex').slice(0, 12);
}

// --- Global Patterns ---

function globalPatternsPath(): string {
  return join(MEMORY_DIR, 'global', 'patterns.json');
}

export function loadGlobalPatterns(): ExecutionPattern[] {
  return readJson(globalPatternsPath(), []);
}

export function saveGlobalPattern(pattern: Omit<ExecutionPattern, 'id' | 'occurrences' | 'lastSeen'>): void {
  const patterns = loadGlobalPatterns();

  // Check for existing similar pattern
  const existing = patterns.find(p =>
    p.team === pattern.team && p.pattern === pattern.pattern
  );

  if (existing) {
    existing.occurrences++;
    existing.lastSeen = new Date().toISOString();
    existing.lesson = pattern.lesson; // Update with latest lesson
  } else {
    patterns.push({
      ...pattern,
      id: `pat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      occurrences: 1,
      lastSeen: new Date().toISOString(),
    });
  }

  // Keep top 100 patterns by occurrence
  patterns.sort((a, b) => b.occurrences - a.occurrences);
  writeJson(globalPatternsPath(), patterns.slice(0, 100));
}

// --- User Preferences ---

function preferencesPath(): string {
  return join(MEMORY_DIR, 'global', 'preferences.json');
}

export function loadPreferences(): UserPreferences {
  return readJson(preferencesPath(), {
    preferredTeams: [],
    preferredModel: 'claude-sonnet-4-6',
  });
}

export function updatePreferences(updates: Partial<UserPreferences>): void {
  const prefs = loadPreferences();
  Object.assign(prefs, updates);
  writeJson(preferencesPath(), prefs);
}

// --- Project Context ---

function projectContextPath(hash: string): string {
  return join(MEMORY_DIR, 'projects', hash, 'context.json');
}

function projectLearningsPath(hash: string): string {
  return join(MEMORY_DIR, 'projects', hash, 'learnings.json');
}

export function loadProjectContext(projectPath: string): ProjectContext | null {
  const hash = projectHash(projectPath);
  return readJson(projectContextPath(hash), null);
}

export function saveProjectContext(projectPath: string, context: Omit<ProjectContext, 'projectHash' | 'lastUpdated'>): void {
  const hash = projectHash(projectPath);
  writeJson(projectContextPath(hash), {
    ...context,
    projectHash: hash,
    lastUpdated: new Date().toISOString(),
  });
}

export function updateProjectContext(projectPath: string, updates: Partial<ProjectContext>): void {
  const existing = loadProjectContext(projectPath) || {
    projectPath,
    projectHash: projectHash(projectPath),
    techStack: [],
    architecture: 'single',
    conventions: [],
    decisions: [],
    lastUpdated: new Date().toISOString(),
  };
  Object.assign(existing, updates, { lastUpdated: new Date().toISOString() });
  writeJson(projectContextPath(existing.projectHash), existing);
}

export function addDecision(projectPath: string, description: string, reason: string): void {
  const ctx = loadProjectContext(projectPath);
  if (!ctx) return;
  ctx.decisions.push({ date: new Date().toISOString(), description, reason });
  // Keep last 50 decisions
  if (ctx.decisions.length > 50) ctx.decisions = ctx.decisions.slice(-50);
  writeJson(projectContextPath(ctx.projectHash), { ...ctx, lastUpdated: new Date().toISOString() });
}

export function loadProjectLearnings(projectPath: string): ExecutionPattern[] {
  const hash = projectHash(projectPath);
  return readJson(projectLearningsPath(hash), []);
}

export function saveProjectLearning(projectPath: string, pattern: Omit<ExecutionPattern, 'id' | 'occurrences' | 'lastSeen'>): void {
  const hash = projectHash(projectPath);
  const learnings = loadProjectLearnings(projectPath);

  const existing = learnings.find(l =>
    l.team === pattern.team && l.pattern === pattern.pattern
  );

  if (existing) {
    existing.occurrences++;
    existing.lastSeen = new Date().toISOString();
  } else {
    learnings.push({
      ...pattern,
      id: `learn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      occurrences: 1,
      lastSeen: new Date().toISOString(),
    });
  }

  writeJson(projectLearningsPath(hash), learnings.slice(0, 100));
}

// --- Memory Summary for Director ---

export function buildMemoryContext(projectPath: string): string {
  const globalPatterns = loadGlobalPatterns();
  const projectCtx = loadProjectContext(projectPath);
  const projectLearnings = loadProjectLearnings(projectPath);
  const prefs = loadPreferences();

  const sections: string[] = [];

  // Global patterns (top 10)
  if (globalPatterns.length > 0) {
    sections.push('## Learned Patterns (from past executions)');
    for (const p of globalPatterns.slice(0, 10)) {
      const icon = p.type === 'success' ? '✅' : p.type === 'failure' ? '❌' : '⚠️';
      sections.push(`${icon} [${p.team}] ${p.pattern} → ${p.lesson} (seen ${p.occurrences}x)`);
    }
  }

  // Project context
  if (projectCtx) {
    sections.push('## Project Context');
    sections.push(`Tech Stack: ${projectCtx.techStack.join(', ')}`);
    sections.push(`Architecture: ${projectCtx.architecture}`);
    if (projectCtx.conventions.length > 0) {
      sections.push(`Conventions: ${projectCtx.conventions.join(', ')}`);
    }
    if (projectCtx.decisions.length > 0) {
      sections.push('Recent decisions:');
      for (const d of projectCtx.decisions.slice(-5)) {
        sections.push(`  - ${d.description} (${d.reason})`);
      }
    }
  }

  // Project-specific learnings
  if (projectLearnings.length > 0) {
    sections.push('## Project-Specific Learnings');
    for (const l of projectLearnings.slice(0, 5)) {
      sections.push(`- [${l.team}] ${l.lesson}`);
    }
  }

  // User preferences
  if (prefs.testRunner || prefs.packageManager || prefs.styleFramework) {
    sections.push('## User Preferences');
    if (prefs.testRunner) sections.push(`Test runner: ${prefs.testRunner}`);
    if (prefs.packageManager) sections.push(`Package manager: ${prefs.packageManager}`);
    if (prefs.styleFramework) sections.push(`Style framework: ${prefs.styleFramework}`);
  }

  return sections.length > 0 ? sections.join('\n') : '';
}
