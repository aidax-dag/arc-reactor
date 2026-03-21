'use client';

import { useState, useEffect } from 'react';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

// Note: This runs on the server in Next.js SSR, client-side state for form interactions

const defaultConfig = {
  mode: 'subagent',
  model: 'claude-sonnet-4-6',
  ceoModel: 'claude-opus-4-6',
  enabledTeams: ['frontend', 'backend', 'qa', 'design', 'devops', 'security', 'docs', 'product'],
  maxTaskRetries: 1,
  maxApiRetries: 3,
  runTests: true,
  maxTokensPerTask: 50000,
  maxTotalTokens: 200000,
  maxParallelTasks: 3,
  autoCommit: false,
  autoBranch: false,
  branchPrefix: 'feature/',
  createPR: false,
  verbose: false,
};

export default function SettingsPage() {
  const [config, setConfig] = useState(defaultConfig);
  const [saved, setSaved] = useState(false);

  const inputClass = 'w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none';
  const labelClass = 'block mb-1 text-xs font-medium text-gray-400';

  function handleChange(key: string, value: unknown) {
    setConfig(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-3xl font-bold">Settings</h1>
      <p className="mb-6 text-sm text-gray-500">
        Edit .arc-reactor.json configuration. Changes apply to the next arc-reactor ignite run.
      </p>

      <div className="space-y-6 rounded-xl border border-gray-800 p-6">

        {/* Execution */}
        <div>
          <h2 className="mb-3 text-lg font-semibold text-blue-400">Execution</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Mode</label>
              <select value={config.mode} onChange={e => handleChange('mode', e.target.value)} className={inputClass}>
                <option value="subagent">Subagent (Claude CLI)</option>
                <option value="api">API (Anthropic SDK)</option>
                <option value="auto">Auto</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>CEO Model</label>
              <input type="text" value={config.ceoModel} onChange={e => handleChange('ceoModel', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Team Model</label>
              <input type="text" value={config.model} onChange={e => handleChange('model', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Max Parallel Tasks</label>
              <input type="number" value={config.maxParallelTasks} onChange={e => handleChange('maxParallelTasks', Number(e.target.value))} className={inputClass} />
            </div>
          </div>
        </div>

        {/* Quality */}
        <div>
          <h2 className="mb-3 text-lg font-semibold text-blue-400">Quality</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Task Retries</label>
              <input type="number" value={config.maxTaskRetries} onChange={e => handleChange('maxTaskRetries', Number(e.target.value))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>API Retries</label>
              <input type="number" value={config.maxApiRetries} onChange={e => handleChange('maxApiRetries', Number(e.target.value))} className={inputClass} />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input type="checkbox" checked={config.runTests} onChange={e => handleChange('runTests', e.target.checked)} className="rounded" />
                Run Tests
              </label>
            </div>
          </div>
        </div>

        {/* Tokens */}
        <div>
          <h2 className="mb-3 text-lg font-semibold text-blue-400">Token Limits</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Per Task</label>
              <input type="number" value={config.maxTokensPerTask} onChange={e => handleChange('maxTokensPerTask', Number(e.target.value))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Total</label>
              <input type="number" value={config.maxTotalTokens} onChange={e => handleChange('maxTotalTokens', Number(e.target.value))} className={inputClass} />
            </div>
          </div>
        </div>

        {/* Git */}
        <div>
          <h2 className="mb-3 text-lg font-semibold text-blue-400">Git Workflow</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Branch Prefix</label>
              <input type="text" value={config.branchPrefix} onChange={e => handleChange('branchPrefix', e.target.value)} className={inputClass} />
            </div>
            <div className="flex flex-col gap-2 pt-5">
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input type="checkbox" checked={config.autoCommit} onChange={e => handleChange('autoCommit', e.target.checked)} />
                Auto Commit
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input type="checkbox" checked={config.autoBranch} onChange={e => handleChange('autoBranch', e.target.checked)} />
                Auto Branch
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input type="checkbox" checked={config.createPR} onChange={e => handleChange('createPR', e.target.checked)} />
                Create PR
              </label>
            </div>
          </div>
        </div>

        {/* Teams */}
        <div>
          <h2 className="mb-3 text-lg font-semibold text-blue-400">Enabled Teams</h2>
          <div className="grid grid-cols-4 gap-2">
            {['frontend', 'backend', 'qa', 'design', 'devops', 'security', 'docs', 'product'].map(team => (
              <label key={team} className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={config.enabledTeams.includes(team)}
                  onChange={e => {
                    const teams = e.target.checked
                      ? [...config.enabledTeams, team]
                      : config.enabledTeams.filter(t => t !== team);
                    handleChange('enabledTeams', teams);
                  }}
                />
                {team}
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-gray-600">Saves to .arc-reactor.json in current project</p>
          {saved && <span className="text-sm text-green-400">Saved!</span>}
        </div>
      </div>

      <p className="mt-4 text-xs text-gray-600">
        Note: This UI shows the configuration form. To save, copy the config and run:
        <code className="ml-1 text-blue-400">arc-reactor config --set key=value</code>
      </p>
    </div>
  );
}
