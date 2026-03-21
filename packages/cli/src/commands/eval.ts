import { loadAllEvaluations, computeCumulativeEvaluation } from '@arc-reactor/core';

export function showEvaluation(options: { cumulative?: boolean }) {
  if (options.cumulative) {
    const cum = computeCumulativeEvaluation();

    console.log('📊 Cumulative Evaluation');
    console.log('━'.repeat(40));
    console.log(`Total Runs: ${cum.totalRuns}`);
    console.log(`Overall Avg Score: ${cum.overallAvgScore}/100`);
    console.log();

    if (Object.keys(cum.teamAverages).length > 0) {
      console.log('Team Averages:');
      for (const [team, stats] of Object.entries(cum.teamAverages)) {
        const trend = stats.trend === 'improving' ? '📈' : stats.trend === 'declining' ? '📉' : '➡️';
        const grade = stats.avgOverallScore >= 80 ? '🟢' : stats.avgOverallScore >= 60 ? '🟡' : '🔴';
        console.log(`  ${grade} [${team}] ${stats.avgOverallScore}/100 ${trend}`);
        console.log(`     Plan: ${stats.avgPlanAccuracy} | Quality: ${stats.avgCodeQuality} | Speed: ${stats.avgDeliverySpeed} | Tokens: ${stats.avgTokenEfficiency}`);
        console.log(`     Tasks: ${stats.totalTasks} | Issues: ${stats.totalIssues}`);
      }
    }

    if (cum.improvementSuggestions.length > 0) {
      console.log();
      console.log('💡 Improvement Suggestions:');
      for (const s of cum.improvementSuggestions) {
        console.log(`  - ${s}`);
      }
    }

    return;
  }

  // Show recent evaluations
  const evals = loadAllEvaluations();

  if (evals.length === 0) {
    console.log('No evaluations yet. Run arc-reactor ignite to generate data.');
    return;
  }

  console.log(`📊 Recent Evaluations (${evals.length} total)`);
  console.log('━'.repeat(50));

  for (const eval_ of evals.slice(0, 10)) {
    const icon = eval_.overallScore >= 80 ? '🟢' : eval_.overallScore >= 60 ? '🟡' : '🔴';
    const date = new Date(eval_.timestamp).toLocaleDateString();
    console.log(`  ${icon} ${eval_.overallScore}/100 — ${eval_.goal.slice(0, 50)} (${date})`);
    console.log(`     Plan: ${eval_.planVsResult.accuracy}% | Quality: ${eval_.qualityMetrics.qualityScore}% | Files: ${eval_.filesGenerated} | Tokens: ${eval_.totalTokensUsed.toLocaleString()}`);
  }

  console.log();
  console.log('Run: arc-reactor eval --cumulative  for team analysis');
}
