'use client';

import { useState } from 'react';

export default function ComparePage() {
  const [runA, setRunA] = useState('');
  const [runB, setRunB] = useState('');

  return (
    <div>
      <h1 className="mb-2 text-3xl font-bold">Compare Runs</h1>
      <p className="mb-6 text-sm text-gray-500">Compare two execution results side-by-side</p>

      <div className="mb-6 grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-xs text-gray-400">Run A (ID)</label>
          <input
            type="text"
            value={runA}
            onChange={e => setRunA(e.target.value)}
            placeholder="run-1234567890-abc123"
            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-400">Run B (ID)</label>
          <input
            type="text"
            value={runB}
            onChange={e => setRunB(e.target.value)}
            placeholder="run-1234567890-def456"
            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {runA && runB ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-gray-800 p-4">
            <h3 className="mb-2 font-medium text-blue-400">Run A</h3>
            <p className="text-sm text-gray-400">
              View at: <a href={`/runs/${runA}`} className="text-blue-400 hover:underline">/runs/{runA}</a>
            </p>
          </div>
          <div className="rounded-xl border border-gray-800 p-4">
            <h3 className="mb-2 font-medium text-blue-400">Run B</h3>
            <p className="text-sm text-gray-400">
              View at: <a href={`/runs/${runB}`} className="text-blue-400 hover:underline">/runs/{runB}</a>
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-800 p-8 text-center">
          <p className="text-gray-500">Enter two run IDs to compare their results</p>
          <p className="mt-2 text-xs text-gray-600">Find run IDs on the Runs page</p>
        </div>
      )}
    </div>
  );
}
