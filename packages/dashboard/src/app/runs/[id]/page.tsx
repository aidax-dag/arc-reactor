import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

function loadRun(id: string) {
  const path = join(homedir(), '.arc-reactor', 'runs', `${id}.json`);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf-8'));
}

export default async function RunDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const run = loadRun(params.id);

  if (!run) {
    return <p className="text-gray-500">Run not found.</p>;
  }

  const result = run.result;
  const statusIcon = run.status === 'success' ? '✅' : run.status === 'failed' ? '❌' : '🔄';

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">{statusIcon} {run.goal}</h1>
        <p className="mt-1 text-sm text-gray-500">{run.id} · {new Date(run.startedAt).toLocaleString()}</p>
      </div>

      {result && (
        <>
          {/* CEO Analysis */}
          <section className="mb-6 rounded-xl border border-gray-800 p-6">
            <h2 className="mb-3 text-xl font-semibold text-blue-400">CEO Analysis</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-500">Complexity</p>
                <p className="text-lg font-medium">{result.plan?.estimatedComplexity}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Waves</p>
                <p className="text-lg font-medium">{result.plan?.waves?.length}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Tasks</p>
                <p className="text-lg font-medium">{result.plan?.tasks?.length}</p>
              </div>
            </div>
            {result.plan?.analysis?.components?.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-gray-500">Components</p>
                <div className="mt-1 flex gap-2">
                  {result.plan.analysis.components.map((c: string) => (
                    <span key={c} className="rounded bg-gray-800 px-2 py-1 text-sm">{c}</span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Waves & Tasks */}
          <section className="mb-6 rounded-xl border border-gray-800 p-6">
            <h2 className="mb-3 text-xl font-semibold text-blue-400">Execution Waves</h2>
            {result.plan?.waves?.map((wave: any) => (
              <div key={wave.order} className="mb-4">
                <p className="mb-2 text-sm font-medium text-gray-300">
                  Wave {wave.order} ({wave.taskIds?.length > 1 ? 'parallel' : '1 task'})
                </p>
                <div className="space-y-2">
                  {wave.taskIds?.map((taskId: string) => {
                    const task = result.plan.tasks?.find((t: any) => t.id === taskId);
                    const taskResult = result.results?.find((r: any) => r.taskId === taskId);
                    const icon = taskResult?.status === 'success' ? '✅' : '❌';
                    return (
                      <div key={taskId} className="flex items-center justify-between rounded-lg bg-gray-900/50 px-4 py-2">
                        <div className="flex items-center gap-2">
                          <span>{icon}</span>
                          <span className="rounded bg-gray-800 px-2 py-0.5 text-xs">{task?.team}</span>
                          <span className="text-sm">{task?.title}</span>
                        </div>
                        <span className="text-xs text-gray-500">{taskResult?.tokensUsed?.toLocaleString() || '0'} tokens</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>

          {/* Quality Gate */}
          <section className="mb-6 rounded-xl border border-gray-800 p-6">
            <h2 className="mb-3 text-xl font-semibold text-blue-400">Quality Gate</h2>
            <div className="space-y-2">
              {result.qualityReport?.checks?.map((check: any) => {
                const icon = check.severity === 'warning' ? '⚠️' : check.passed ? '✅' : '❌';
                return (
                  <div key={check.name} className="flex items-center justify-between rounded-lg bg-gray-900/50 px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span>{icon}</span>
                      <span className="text-sm">{check.name}</span>
                    </div>
                    <span className="text-xs text-gray-400">{check.details}</span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Files */}
          {result.results?.some((r: any) => r.outputs?.length > 0) && (
            <section className="mb-6 rounded-xl border border-gray-800 p-6">
              <h2 className="mb-3 text-xl font-semibold text-blue-400">Generated Files</h2>
              <div className="space-y-1">
                {result.results.flatMap((r: any) =>
                  (r.outputs || []).map((f: any) => (
                    <p key={`${r.taskId}-${f.path}`} className="font-mono text-sm text-gray-300">
                      {f.path}
                    </p>
                  ))
                )}
              </div>
            </section>
          )}

          {/* Summary */}
          <section className="rounded-xl border border-gray-800 p-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Total Duration</p>
                <p className="text-lg font-medium">{Math.round((result.durationMs || 0) / 1000)}s</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Tokens</p>
                <p className="text-lg font-medium">{(result.totalTokensUsed || 0).toLocaleString()}</p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
