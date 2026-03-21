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
  sendNotification,
  createPlanIndex,
  updatePlanIndex,
  finalizePlanIndex,
  writeCurrentPhase,
  updateCurrentPhaseTask,
  completeCurrentPhase,
  createPhaseTracker,
  updatePhaseStatus,
  completeExecution as completeTrackerExecution,
  isShutdownRequested,
  generateDesignDoc,
  evaluateRun,
  generateDebugReport,
  formatDebugReport,
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
  const run = createRun(goal, config.projectId);
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

  // Create plan documents + Design Doc + phase tracker
  createPlanIndex(config.outputDir, plan);
  const designDocPath = generateDesignDoc(config.outputDir, plan);
  createPhaseTracker(run.id, goal, config.outputDir, plan);
  console.log(`📄 Plan: .arc-reactor/plan.md`);
  console.log(`📐 Design Doc: .arc-reactor/design-doc.md`);

  // Phase 2: Execute waves
  const executor = selectExecutor(config, logger);

  let currentWave = 0;
  const waveExecutor = new WaveExecutor(config, teamRegistry, {
    onWaveStart: (wave: number, count: number) => {
      currentWave = wave;
      const label = count > 1 ? 'parallel' : `${count} task`;
      logger.info('wave', 'wave_started', { wave, taskCount: count });
      console.log(`⚡ Wave ${wave} (${label}):`);

      // Write current phase doc + update tracker
      writeCurrentPhase(config.outputDir, plan, wave);
      updatePhaseStatus(wave, 'running');
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

      // Update current-phase.md with task result
      updateCurrentPhaseTask(config.outputDir, taskId, status as 'success' | 'failure', '', [], duration);
    },
    onDryRunConflict: (original: number, split: number, conflicts: string[]) => {
      logger.warn('wave', 'dry_run_conflict', { original, split, conflicts });
      console.log(`   ⚠️  Dry Run: ${original} tasks split into ${split} sub-waves to avoid file conflicts`);
    },
  });

  const execTimer = logger.startTimer();
  const result = await waveExecutor.execute(plan, executor);

  logger.info('wave', 'all_waves_complete', {
    durationMs: execTimer(),
    totalTokensUsed: result.totalTokensUsed,
  });

  // Update plan docs for each completed wave
  for (const wave of plan.waves) {
    const waveResults = wave.taskIds
      .map(id => result.results.find(r => r.taskId === id))
      .filter(Boolean) as typeof result.results;
    const filesCreated = waveResults.flatMap(r => r.outputs.map(o => o.path));

    completeCurrentPhase(config.outputDir, wave.order, waveResults);
    updatePlanIndex(config.outputDir, wave.order, plan.waves.length, filesCreated, result.durationMs);
    updatePhaseStatus(wave.order, 'completed');

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

  // Finalize plan.md
  const totalFiles = result.results.flatMap(r => r.outputs).length;
  finalizePlanIndex(config.outputDir, totalFiles, result.totalTokensUsed, result.durationMs, report);
  completeTrackerExecution();

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

  // Phase 7: Evaluation (team scoring)
  const evaluation = evaluateRun(result);
  console.log();
  console.log(`📊 Evaluation: Overall Score ${evaluation.overallScore}/100`);
  for (const ts of evaluation.teamScores) {
    const grade = ts.overallScore >= 80 ? '🟢' : ts.overallScore >= 60 ? '🟡' : '🔴';
    console.log(`   ${grade} [${ts.team}] ${ts.overallScore}/100 (plan: ${ts.planAccuracy}, quality: ${ts.codeQuality}, speed: ${ts.deliverySpeed}, tokens: ${ts.tokenEfficiency})`);
  }
  console.log(`   Plan accuracy: ${evaluation.planVsResult.accuracy}% (${evaluation.planVsResult.completedTasks}/${evaluation.planVsResult.plannedTasks} tasks)`);

  // Phase 8: Debug report (if issues found)
  const failedResults = result.results.filter(r => r.status === 'failure');
  const failedChecks = report.checks.filter(c => !c.passed && c.severity !== 'warning');
  if (failedResults.length > 0 || failedChecks.length > 0) {
    const debugReport = generateDebugReport(run.id, goal, failedResults, report.checks, plan.tasks);
    console.log(formatDebugReport(debugReport));
  }

  // Save run result
  completeRun(run.id, result, report.passed);
  console.log();
  console.log(`📝 Run saved: ${run.id} (learnings + evaluation captured)`);
  console.log(`📊 Logs: ~/.arc-reactor/logs/`);
  console.log(`📊 Evaluations: ~/.arc-reactor/evaluations/`);

  // Phase 9: Notifications
  const notifEvent = report.passed ? 'run_complete' : 'run_failed';
  await sendNotification(notifEvent, run.id, result, config);
  if (!report.passed && report.checks.some((c: { passed: boolean; severity?: string }) => !c.passed && c.severity !== 'warning')) {
    await sendNotification('quality_gate_failed', run.id, result, config);
  }

  if (!report.passed) {
    process.exitCode = 1;
  }
}
