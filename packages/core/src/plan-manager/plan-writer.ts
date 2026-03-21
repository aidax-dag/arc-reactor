import { writeFileSync, readFileSync, existsSync, mkdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import type { ExecutionPlan, TaskResult, QualityReport } from '../types/task.js';

/**
 * Plan Manager — 작업 진행상황을 문서로 관리
 *
 * 구조:
 *   .arc-reactor/
 *   ├── plan.md              # 인덱스 (Phase 체크리스트만, ~50줄)
 *   ├── current-phase.md     # 현재 Phase 상세
 *   └── archive/
 *       ├── phase-1.md       # 완료된 Phase (안 읽음)
 *       └── ...
 */

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function arcDir(projectRoot: string): string {
  return join(projectRoot, '.arc-reactor');
}

// --- plan.md (Index) ---

export function createPlanIndex(projectRoot: string, plan: ExecutionPlan): void {
  const dir = arcDir(projectRoot);
  ensureDir(dir);
  ensureDir(join(dir, 'archive'));

  const lines = [
    `# Arc-Reactor Execution Plan`,
    ``,
    `**Goal:** ${plan.goal}`,
    `**Complexity:** ${plan.estimatedComplexity}`,
    `**Components:** ${plan.analysis.components.join(', ')}`,
    `**Phases:** ${plan.waves.length}`,
    `**Started:** ${new Date().toISOString()}`,
    ``,
    `---`,
    ``,
    `## Progress`,
    ``,
  ];

  for (const wave of plan.waves) {
    const tasks = wave.taskIds.map(id => {
      const task = plan.tasks.find(t => t.id === id);
      return task ? `${task.team}: ${task.title}` : id;
    });
    lines.push(`- [ ] **Phase ${wave.order}** (${tasks.length} tasks)`);
    for (const t of tasks) {
      lines.push(`  - ${t}`);
    }
  }

  lines.push('', '---', '', '## Summary', '', '_Updating as phases complete..._');

  writeFileSync(join(dir, 'plan.md'), lines.join('\n'));
}

export function updatePlanIndex(
  projectRoot: string,
  completedPhase: number,
  totalPhases: number,
  filesCreated: string[],
  duration: number,
): void {
  const planPath = join(arcDir(projectRoot), 'plan.md');
  if (!existsSync(planPath)) return;

  let content = readFileSync(planPath, 'utf-8');

  // Check the completed phase
  const pattern = `- [ ] **Phase ${completedPhase}**`;
  const replacement = `- [x] **Phase ${completedPhase}**`;
  content = content.replace(pattern, replacement);

  // Update summary
  const summaryMarker = '## Summary';
  const summaryIdx = content.indexOf(summaryMarker);
  if (summaryIdx !== -1) {
    const before = content.slice(0, summaryIdx + summaryMarker.length);
    const completedCount = (content.match(/- \[x\]/g) || []).length;

    const summaryLines = [
      '',
      ``,
      `| Metric | Value |`,
      `|--------|-------|`,
      `| Completed | ${completedCount}/${totalPhases} phases |`,
      `| Files Created | ${filesCreated.length} |`,
      `| Last Phase Duration | ${Math.round(duration / 1000)}s |`,
      `| Updated | ${new Date().toISOString()} |`,
    ];

    content = before + summaryLines.join('\n');
  }

  writeFileSync(planPath, content);
}

export function finalizePlanIndex(
  projectRoot: string,
  totalFiles: number,
  totalTokens: number,
  totalDuration: number,
  qualityReport: QualityReport,
): void {
  const planPath = join(arcDir(projectRoot), 'plan.md');
  if (!existsSync(planPath)) return;

  let content = readFileSync(planPath, 'utf-8');

  const summaryMarker = '## Summary';
  const summaryIdx = content.indexOf(summaryMarker);
  if (summaryIdx !== -1) {
    const before = content.slice(0, summaryIdx + summaryMarker.length);
    const icon = qualityReport.passed ? '✅' : '❌';

    const summaryLines = [
      '',
      ``,
      `${icon} **${qualityReport.passed ? 'Mission Complete' : 'Mission Failed'}**`,
      ``,
      `| Metric | Value |`,
      `|--------|-------|`,
      `| Status | ${qualityReport.passed ? 'Success' : 'Failed'} |`,
      `| Total Duration | ${Math.round(totalDuration / 1000)}s |`,
      `| Total Files | ${totalFiles} |`,
      `| Total Tokens | ${totalTokens.toLocaleString()} |`,
      `| Quality Gate | ${qualityReport.summary} |`,
      `| Completed | ${new Date().toISOString()} |`,
    ];

    content = before + summaryLines.join('\n');
  }

  writeFileSync(planPath, content);
}

// --- current-phase.md (Active Phase Detail) ---

export function writeCurrentPhase(
  projectRoot: string,
  plan: ExecutionPlan,
  phaseNumber: number,
): void {
  const dir = arcDir(projectRoot);
  const wave = plan.waves.find(w => w.order === phaseNumber);
  if (!wave) return;

  const lines = [
    `# Phase ${phaseNumber}`,
    ``,
    `**Status:** 🔄 Running`,
    `**Started:** ${new Date().toISOString()}`,
    ``,
    `## Tasks`,
    ``,
  ];

  for (const taskId of wave.taskIds) {
    const task = plan.tasks.find(t => t.id === taskId);
    if (!task) continue;
    lines.push(`### ${task.team}: ${task.title}`);
    lines.push(`- **ID:** ${task.id}`);
    lines.push(`- **Priority:** ${task.priority}`);
    if (task.featureId) lines.push(`- **Feature:** ${task.featureId}`);
    lines.push(`- **Acceptance Criteria:**`);
    for (const ac of task.acceptanceCriteria) {
      lines.push(`  - [ ] ${ac}`);
    }
    lines.push(`- **Status:** ⬜ Pending`);
    lines.push(``);
  }

  lines.push(`## Files Created`, ``, `_None yet_`, ``);
  lines.push(`## Results`, ``, `_Pending..._`);

  writeFileSync(join(dir, 'current-phase.md'), lines.join('\n'));
}

export function updateCurrentPhaseTask(
  projectRoot: string,
  taskId: string,
  status: 'success' | 'failure',
  summary: string,
  filesCreated: string[],
  duration: number,
): void {
  const phasePath = join(arcDir(projectRoot), 'current-phase.md');
  if (!existsSync(phasePath)) return;

  let content = readFileSync(phasePath, 'utf-8');

  // Update task status
  const icon = status === 'success' ? '✅' : '❌';
  content = content.replace(
    new RegExp(`(- \\*\\*ID:\\*\\* ${taskId}[\\s\\S]*?- \\*\\*Status:\\*\\*) ⬜ Pending`),
    `$1 ${icon} ${status} (${Math.round(duration / 1000)}s)`
  );

  // Update files section
  if (filesCreated.length > 0) {
    const filesSection = filesCreated.map(f => `- \`${f}\``).join('\n');
    content = content.replace('_None yet_', filesSection);
  }

  writeFileSync(phasePath, content);
}

export function completeCurrentPhase(
  projectRoot: string,
  phaseNumber: number,
  results: TaskResult[],
): void {
  const dir = arcDir(projectRoot);
  const phasePath = join(dir, 'current-phase.md');
  if (!existsSync(phasePath)) return;

  let content = readFileSync(phasePath, 'utf-8');

  // Update status
  content = content.replace('**Status:** 🔄 Running', '**Status:** ✅ Completed');

  // Update results
  const totalFiles = results.flatMap(r => r.outputs).length;
  const totalTokens = results.reduce((sum, r) => sum + r.tokensUsed, 0);
  const resultLines = [
    `**Completed:** ${new Date().toISOString()}`,
    `**Files:** ${totalFiles}`,
    `**Tokens:** ${totalTokens.toLocaleString()}`,
  ];
  content = content.replace('_Pending..._', resultLines.join('\n'));

  // Write final version
  writeFileSync(phasePath, content);

  // Move to archive
  const archivePath = join(dir, 'archive', `phase-${phaseNumber}.md`);
  renameSync(phasePath, archivePath);
}
