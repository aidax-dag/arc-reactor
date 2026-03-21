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
  createRun,
  completeRun,
  buildMemoryContext,
  learnFromExecution,
  ArcLogger,
} from '@arc-reactor/core';
import type { ArcReactorConfig } from '@arc-reactor/core';
import type { Executor } from '@arc-reactor/core';

function selectExecutor(config: ArcReactorConfig, logger: ArcLogger): Executor {
  if (config.mode === 'api') {
    if (!config.apiKey && !process.env.ANTHROPIC_API_KEY) {
      throw new Error('API mode requires an API key. Set ANTHROPIC_API_KEY or apiKey in config.');
    }
    logger.info('executor', 'selected_api_executor');
    return new APIExecutor(config);
  }
  if (config.mode === 'subagent') {
    if (!isClaudeCodeEnvironment()) {
      throw new Error('Subagent mode requires Claude Code CLI. Install it or use --mode api with an API key.');
    }
    logger.info('executor', 'selected_subagent_executor');
    return new SubagentExecutor(config);
  }
  if (isClaudeCodeEnvironment()) {
    logger.info('executor', 'auto_selected_subagent');
    return new SubagentExecutor(config);
  }
  if (config.apiKey || process.env.ANTHROPIC_API_KEY) {
    logger.info('executor', 'auto_selected_api');
    return new APIExecutor(config);
  }
  throw new Error('No executor available. Install Claude Code CLI or set ANTHROPIC_API_KEY.');
}

export async function ignite(goal: string, cliOptions: Partial<ArcReactorConfig>) {
  console.log('🔵 Arc-Reactor v0.1 "Ignition"');
  console.log('━'.repeat(28));
  console.log();
  console.log(`📋 Goal: ${goal}`);
  console.log();

  const config = loadConfig(cliOptions);
  const run = createRun(goal);
  const logger = new ArcLogger(run.id, config.verbose);
  const teamRegistry = new TeamRegistry(config.enabledTeams);

  logger.info('system', 'run_started', { goal, mode: config.mode, teams: config.enabledTeams });

  // Phase 0: Load memory context
  const memTimer = logger.startTimer();
  const memoryContext = buildMemoryContext(config.outputDir);
  if (memoryContext) {
    logger.info('memory', 'context_loaded', {
      durationMs: memTimer(),
      projectContextLoaded: true,
      patternsLoaded: memoryContext.split('\n').length,
    });
    console.log('🧠 Memory loaded (past learnings + project context)');
  }

  // Phase 1: CEO Analysis
  console.log('🧠 CEO Agent analyzing goal...');
  const ceoTimer = logger.startTimer();
  const ceo = new CEOAgent(config);
  const goalWithMemory = memoryContext
    ? `${goal}\n\n--- Context from past executions ---\n${memoryContext}`
    : goal;
  const plan = await ceo.analyze(goalWithMemory);

  logger.info('ceo', 'analysis_complete', {
    durationMs: ceoTimer(),
    complexity: plan.estimatedComplexity,
    taskCount: plan.tasks.length,
    waveCount: plan.waves.length,
    components: plan.analysis.components,
  });

  console.log(`   Components: ${plan.analysis.components.join(', ')}`);
  console.log(`   Complexity: ${plan.estimatedComplexity}`);
  console.log(`   Waves: ${plan.waves.length}`);
  console.log();

  validateTaskRouting(plan.tasks, teamRegistry);

  // Phase 2: Execute waves
  const executor = selectExecutor(config, logger);

  const waveExecutor = new WaveExecutor(config, teamRegistry, {
    onWaveStart: (wave: number, count: number) => {
      const label = count > 1 ? 'parallel' : `${count} task`;
      logger.info('wave', 'wave_started', { wave, taskCount: count });
      console.log(`⚡ Wave ${wave} (${label}):`);
    },
    onTaskComplete: (taskId: string, status: string, duration: number) => {
      const task = plan.tasks.find((t: { id: string }) => t.id === taskId)!;
      logger.info('team', 'task_complete', {
        team: task.team,
        taskId,
        title: task.title,
        status,
        durationMs: duration,
      });
      const icon = status === 'success' ? '✅' : '❌';
      console.log(`   ├─ [${task.team}] ${task.title}  ${icon} (${Math.round(duration / 1000)}s)`);
    },
  });

  const execTimer = logger.startTimer();
  const result = await waveExecutor.execute(plan, executor);

  logger.info('wave', 'all_waves_complete', {
    durationMs: execTimer(),
    totalTokensUsed: result.totalTokensUsed,
  });

  // Log wave completion metrics
  for (const wave of plan.waves) {
    const waveTasks = wave.taskIds.map(id => result.results.find(r => r.taskId === id)!);
    const waveDuration = Math.max(...waveTasks.map(t => 0)); // Approximation
    logger.info('wave', 'wave_complete', {
      wave: wave.order,
      taskCount: wave.taskIds.length,
    });
  }

  // Phase 3: Quality Gate
  console.log();
  console.log('🔍 Quality Gate:');
  const qgTimer = logger.startTimer();
  const report = await runQualityGate(result, config);
  result.qualityReport = report;

  for (const check of report.checks) {
    logger.info('quality', 'check_result', {
      name: check.name,
      passed: check.passed,
      severity: check.severity,
      details: check.details,
    });
    const icon = check.severity === 'warning' ? '⚠️' : check.passed ? '✅' : '❌';
    console.log(`   ├─ ${check.name}: ${icon} ${check.details}`);
  }

  logger.info('quality', 'gate_complete', {
    durationMs: qgTimer(),
    passed: report.passed,
    summary: report.summary,
  });

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

  // Phase 5: Git operations
  if (report.passed && (config.autoCommit || config.autoBranch)) {
    const gitTimer = logger.startTimer();
    const gitResult = autoGit(config.outputDir, result, {
      autoCommit: config.autoCommit,
      autoBranch: config.autoBranch,
      branchPrefix: config.branchPrefix,
      createPR: config.createPR,
    }, config.featureId);

    logger.info('git', 'operations_complete', {
      durationMs: gitTimer(),
      branch: gitResult.branch,
      commit: gitResult.commit,
      prUrl: gitResult.prUrl,
      pushed: gitResult.pushed,
    });

    if (gitResult.branch || gitResult.commit || gitResult.prUrl) {
      console.log();
      console.log('📦 Git:');
      if (gitResult.branch) console.log(`   ├─ Branch: ${gitResult.branch}`);
      if (gitResult.commit) console.log(`   ├─ Commit: ${gitResult.commit}`);
      if (gitResult.pushed) console.log(`   ├─ Pushed: ✅`);
      if (gitResult.prUrl) console.log(`   ├─ PR: ${gitResult.prUrl}`);
    }
  }

  // Phase 6: Learn from execution
  learnFromExecution(config.outputDir, result);
  logger.info('memory', 'learnings_saved', { learningsSaved: result.results.length });

  // Compute and log final metrics
  const metrics = logger.computeMetrics();
  logger.info('system', 'run_complete', {
    passed: report.passed,
    totalDurationMs: result.durationMs,
    totalTokensUsed: result.totalTokensUsed,
    teamCount: Object.keys(metrics.teamMetrics).length,
    errorCount: metrics.errorCount,
    retryCount: metrics.retryCount,
  });

  // Save run result
  completeRun(run.id, result, report.passed);
  console.log();
  console.log(`📝 Run saved: ${run.id} (learnings captured)`);
  console.log(`📊 Logs: ~/.arc-reactor/logs/`);

  if (!report.passed) {
    process.exitCode = 1;
  }
}
