'use client';

import { useState, useEffect } from 'react';

interface RunEvent {
  type: 'wave_start' | 'task_complete' | 'quality_gate' | 'done';
  timestamp: string;
  data: Record<string, unknown>;
}

export default function LivePage() {
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // SSE connection to Arc-Reactor (future implementation)
    // For now, poll the runs directory for the latest running task
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/live');
        if (res.ok) {
          const data = await res.json();
          if (data.events) {
            setEvents(data.events);
            setConnected(true);
          }
        }
      } catch {
        setConnected(false);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Live Monitor</h1>
        <div className="flex items-center gap-2">
          <span className={`h-3 w-3 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-600'}`} />
          <span className="text-sm text-gray-400">{connected ? 'Connected' : 'Waiting for execution...'}</span>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="rounded-xl border border-gray-800 p-12 text-center">
          <p className="text-4xl mb-4">🔵</p>
          <p className="text-lg text-gray-400">Waiting for Arc-Reactor execution...</p>
          <p className="mt-2 text-sm text-gray-600">
            Run <code className="text-blue-400">arc-reactor ignite "your goal"</code> to see live progress
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((event, i) => {
            const icon = event.type === 'wave_start' ? '⚡'
              : event.type === 'task_complete' ? (event.data.status === 'success' ? '✅' : '❌')
              : event.type === 'quality_gate' ? '🔍'
              : '🏁';

            return (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-gray-800 px-4 py-3">
                <span className="text-xl">{icon}</span>
                <div className="flex-1">
                  <p className="text-sm text-white">
                    {event.type === 'wave_start' && `Wave ${event.data.wave} started (${event.data.taskCount} tasks)`}
                    {event.type === 'task_complete' && `[${event.data.team}] ${event.data.title} — ${event.data.status}`}
                    {event.type === 'quality_gate' && `Quality Gate: ${event.data.summary}`}
                    {event.type === 'done' && `Execution complete`}
                  </p>
                </div>
                <span className="text-xs text-gray-600">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
