'use client';

const phases = [
  {
    id: 1, name: 'Analysis & Design', color: 'blue',
    steps: [
      { id: '1-1', name: 'Business Logic Analysis', team: 'Product', deps: [] },
      { id: '1-2', name: 'System Architecture', team: 'Architect', deps: ['1-1'] },
      { id: '1-3', name: 'Module Software Design', team: 'Architect', deps: ['1-2'] },
      { id: '1-4', name: 'UI/UX Design', team: 'Design', deps: ['1-1'] },
    ],
  },
  {
    id: 2, name: 'Data & Protocol Design', color: 'purple',
    steps: [
      { id: '2-1', name: 'DB + ORM Design', team: 'Backend', deps: ['1-3'] },
      { id: '2-2', name: 'Protocol + Error Codes', team: 'Backend', deps: ['2-1'] },
      { id: '2-3', name: 'Mock API Generation', team: 'Backend', deps: ['2-2'] },
      { id: '2-4', name: 'Legal / Compliance', team: 'Product', deps: ['1-1'] },
    ],
  },
  {
    id: 3, name: 'Core Implementation', color: 'green',
    steps: [
      { id: '3-1', name: 'Frontend UI', team: 'Frontend', deps: ['1-4', '2-3'] },
      { id: '3-2', name: 'Backend API', team: 'Backend', deps: ['2-2'] },
      { id: '3-3', name: 'Infrastructure', team: 'DevOps', deps: ['1-2'] },
    ],
  },
  {
    id: 3.5, name: 'Integration', color: 'cyan',
    steps: [
      { id: '3.5-1', name: 'Contract Test', team: 'QA', deps: ['3-1', '3-2'] },
    ],
  },
  {
    id: 4, name: 'Commercial Features', color: 'yellow',
    steps: [
      { id: '4-1', name: 'Payment System', team: 'Backend+FE', deps: ['3-2'] },
      { id: '4-2', name: 'Email System', team: 'Backend', deps: ['3-2'] },
      { id: '4-3', name: 'Notifications', team: 'Backend+FE', deps: ['3-1', '3-2'] },
      { id: '4-4', name: 'Analytics/Tracking', team: 'Frontend', deps: ['3-1'] },
      { id: '4-5', name: 'SEO & Social', team: 'Frontend', deps: ['3-1'] },
      { id: '4-6', name: 'i18n', team: 'FE+BE', deps: ['3-1', '3-2'] },
    ],
  },
  {
    id: 5, name: 'Operations Tools', color: 'orange',
    steps: [
      { id: '5-1', name: 'Admin Dashboard', team: 'Backend+FE', deps: ['3-2'] },
      { id: '5-2', name: 'CS Tools', team: 'Backend+FE', deps: ['3-2'] },
      { id: '5-3', name: 'Data Management', team: 'Backend+DevOps', deps: ['2-1'] },
    ],
  },
  {
    id: 6, name: 'QA Verification', color: 'teal',
    steps: [
      { id: '6-1', name: 'Code Verification', team: 'QA', deps: ['3-1', '3-2', '4-1', '5-1'] },
      { id: '6-2', name: 'Design Compliance', team: 'QA', deps: ['1-4', '3-1'] },
      { id: '6-3', name: 'Payment Test', team: 'QA', deps: ['4-1'] },
      { id: '6-4', name: 'API Docs + Guide', team: 'Docs', deps: ['3-2'] },
    ],
  },
  {
    id: 7, name: 'Security', color: 'red',
    steps: [
      { id: '7-1', name: 'Communication Security', team: 'Security', deps: ['3-1', '3-2'] },
      { id: '7-2', name: 'Auth Audit', team: 'Security', deps: ['3-2'] },
      { id: '7-3', name: 'Payment Security', team: 'Security', deps: ['4-1'] },
      { id: '7-4', name: 'Data Protection', team: 'Security', deps: ['5-3'] },
    ],
  },
  {
    id: 8, name: 'Operations & Deploy', color: 'gray',
    steps: [
      { id: '8-1', name: 'Monitoring/Alerts', team: 'DevOps', deps: ['7-1'] },
      { id: '8-2', name: 'CI/CD Pipeline', team: 'DevOps', deps: ['7-1'] },
      { id: '8-3', name: 'Rollback Strategy', team: 'DevOps', deps: ['7-1'] },
      { id: '8-4', name: 'SSL + Domain', team: 'DevOps', deps: ['7-1'] },
      { id: '8-5', name: 'Rate Limiting', team: 'DevOps', deps: ['7-1'] },
      { id: '8-6', name: 'Legal Pages Deploy', team: 'Product', deps: ['2-4'] },
      { id: '8-7', name: 'Ops Guide', team: 'Docs', deps: ['8-1'] },
    ],
  },
];

const phaseColors: Record<string, string> = {
  blue: 'border-blue-600 bg-blue-950/30',
  purple: 'border-purple-600 bg-purple-950/30',
  green: 'border-green-600 bg-green-950/30',
  cyan: 'border-cyan-600 bg-cyan-950/30',
  yellow: 'border-yellow-600 bg-yellow-950/30',
  orange: 'border-orange-600 bg-orange-950/30',
  teal: 'border-teal-600 bg-teal-950/30',
  red: 'border-red-600 bg-red-950/30',
  gray: 'border-gray-600 bg-gray-900/30',
};

export default function PhasesPage() {
  return (
    <div>
      <h1 className="mb-2 text-3xl font-bold">Execution Phase DAG</h1>
      <p className="mb-8 text-sm text-gray-500">
        8 phases of production-grade product development. Each phase completes before the next starts.
      </p>

      <div className="space-y-6">
        {phases.map((phase) => (
          <div key={phase.id} className={`rounded-xl border p-5 ${phaseColors[phase.color]}`}>
            <div className="mb-3 flex items-center gap-3">
              <span className="rounded-full bg-gray-800 px-3 py-1 text-xs font-bold">Phase {phase.id}</span>
              <h2 className="text-lg font-semibold text-white">{phase.name}</h2>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {phase.steps.map((step) => (
                <div key={step.id} className="rounded-lg border border-gray-700/50 bg-gray-900/50 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white">{step.name}</span>
                    <span className="text-[10px] text-gray-500">{step.id}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-xs text-gray-400">{step.team}</span>
                    {step.deps.length > 0 && (
                      <span className="text-[10px] text-gray-600">← {step.deps.join(', ')}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Arrow to next phase */}
            {phase.id < 8 && (
              <div className="mt-3 text-center text-gray-600">↓</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
