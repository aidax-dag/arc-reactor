import {
  loadConfig,
  CEOAgent,
  TeamRegistry,
  WaveExecutor,
  APIExecutor,
  SubagentExecutor,
  isClaudeCodeEnvironment,
  runQualityGate,
  validateTaskRouting,
  autoGit,
} from '@arc-reactor/core';
import type { ArcReactorConfig } from '@arc-reactor/core';
import type { Executor } from '@arc-reactor/core';

function selectExecutor(config: ArcReactorConfig): Executor {
  if (config.mode === 'api') {
    if (!config.apiKey && !process.env.ANTHROPIC_API_KEY) {
      throw new Error('API mode requires an API key. Set ANTHROPIC_API_KEY or apiKey in config.');
    }
    return new APIExecutor(config);
  }
  if (config.mode === 'subagent') {
    if (!isClaudeCodeEnvironment()) {
      throw new Error('Subagent mode requires Claude Code CLI. Install it or use --mode api with an API key.');
    }
    return new SubagentExecutor(config);
  }
  // auto: prefer subagent, fallback to api
  if (isClaudeCodeEnvironment()) return new SubagentExecutor(config);
  if (config.apiKey || process.env.ANTHROPIC_API_KEY) return new APIExecutor(config);
  throw new Error('No executor available. Install Claude Code CLI or set ANTHROPIC_API_KEY.');
}

export async function ignite(goal: string, cliOptions: Partial<ArcReactorConfig>) {
  console.log('🔵 Arc-Reactor v0.1 "Ignition"');
  console.log('━'.repeat(28));
  console.log();
  console.log(`📋 Goal: ${goal}`);
  console.log();

  const config = loadConfig(cliOptions);
  const teamRegistry = new TeamRegistry(config.enabledTeams);

  // Phase 1: CEO Analysis
  console.log('🧠 CEO Agent analyzing goal...');
  const ceo = new CEOAgent(config);
  const plan = await ceo.analyze(goal);

  console.log(`   Components: ${plan.analysis.components.join(', ')}`);
  console.log(`   Complexity: ${plan.estimatedComplexity}`);
  console.log(`   Waves: ${plan.waves.length}`);
  console.log();

  validateTaskRouting(plan.tasks, teamRegistry);

  // Phase 2: Execute waves
  const executor = selectExecutor(config);

  const waveExecutor = new WaveExecutor(config, teamRegistry, {
    onWaveStart: (wave: number, count: number) => {
      const label = count > 1 ? 'parallel' : `${count} task`;
      console.log(`⚡ Wave ${wave} (${label}):`);
    },
    onTaskComplete: (taskId: string, status: string, duration: number) => {
      const task = plan.tasks.find((t: { id: string }) => t.id === taskId)!;
      const icon = status === 'success' ? '✅' : '❌';
      console.log(`   ├─ [${task.team}] ${task.title}  ${icon} (${Math.round(duration / 1000)}s)`);
    },
  });

  const result = await waveExecutor.execute(plan, executor);

  // Phase 3: Quality Gate
  console.log();
  console.log('🔍 Quality Gate:');
  const report = await runQualityGate(result, config);
  result.qualityReport = report;

  for (const check of report.checks) {
    const icon = check.severity === 'warning' ? '⚠️' : check.passed ? '✅' : '❌';
    console.log(`   ├─ ${check.name}: ${icon} ${check.details}`);
  }

  // Phase 4: Summary
  console.log();
  const statusIcon = report.passed ? '✅' : '❌';
  console.log(`${statusIcon} ${report.passed ? 'Mission Complete' : 'Mission Failed'} (${Math.round(result.durationMs / 1000)}s total, ${result.totalTokensUsed.toLocaleString()} tokens)`);

  if (result.results.some((r: { outputs: { path: string }[] }) => r.outputs.length > 0)) {
    console.log();
    console.log('📁 Files created:');
    for (const r of result.results) {
      for (const f of r.outputs) {
        console.log(`   ├─ ${f.path}`);
      }
    }
  }

  // Phase 5: Git operations (feature branch → commit → push → PR)
  if (report.passed && (config.autoCommit || config.autoBranch)) {
    const gitResult = autoGit(config.outputDir, result, {
      autoCommit: config.autoCommit,
      autoBranch: config.autoBranch,
      branchPrefix: config.branchPrefix,
      createPR: config.createPR,
    }, config.featureId);

    if (gitResult.branch || gitResult.commit || gitResult.prUrl) {
      console.log();
      console.log('📦 Git:');
      if (gitResult.branch) console.log(`   ├─ Branch: ${gitResult.branch}`);
      if (gitResult.commit) console.log(`   ├─ Commit: ${gitResult.commit}`);
      if (gitResult.pushed) console.log(`   ├─ Pushed: ✅`);
      if (gitResult.prUrl) console.log(`   ├─ PR: ${gitResult.prUrl}`);
    }
  }

  if (!report.passed) {
    process.exitCode = 1;
  }
}
