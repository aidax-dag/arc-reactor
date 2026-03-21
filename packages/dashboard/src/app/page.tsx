import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

interface RunSummary {
  id: string;
  goal: string;
  status: 'running' | 'success' | 'failed';
  startedAt: string;
  completedAt?: string;
}

function loadRuns(): RunSummary[] {
  const dir = join(homedir(), '.arc-reactor', 'runs');
  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .sort()
    .reverse()
    .slice(0, 50)
    .map(f => {
      const data = JSON.parse(readFileSync(join(dir, f), 'utf-8'));
      return {
        id: data.id,
        goal: data.goal,
        status: data.status,
        startedAt: data.startedAt,
        completedAt: data.completedAt,
      };
    });
}

export default function RunsPage() {
  const runs = loadRuns();

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Execution History</h1>

      {runs.length === 0 ? (
        <div className="rounded-xl border border-gray-800 p-8 text-center">
          <p className="text-gray-500">No runs yet. Run <code className="text-blue-400">arc-reactor ignite</code> to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {runs.map((run) => {
            const statusIcon = run.status === 'success' ? '✅' : run.status === 'failed' ? '❌' : '🔄';
            const statusColor = run.status === 'success' ? 'border-green-800' : run.status === 'failed' ? 'border-red-800' : 'border-blue-800';
            const duration = run.completedAt
              ? `${Math.round((new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)}s`
              : 'running...';

            return (
              <a
                key={run.id}
                href={`/runs/${run.id}`}
                className={`block rounded-xl border ${statusColor} p-4 transition hover:bg-gray-900/50`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{statusIcon}</span>
                    <div>
                      <p className="font-medium text-white">{run.goal}</p>
                      <p className="text-xs text-gray-500">{run.id}</p>
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-400">
                    <p>{new Date(run.startedAt).toLocaleString()}</p>
                    <p>{duration}</p>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
