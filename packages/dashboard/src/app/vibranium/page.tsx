const VIBRANIUM_URL = process.env.VIBRANIUM_API_URL || 'http://localhost:3001';

async function fetchVibranium(path: string) {
  try {
    const res = await fetch(`${VIBRANIUM_URL}${path}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

export default async function VibraniumPage() {
  const [searchData, analyticsData] = await Promise.all([
    fetchVibranium('/api/features/search?q=&limit=20'),
    fetchVibranium('/api/analytics'),
  ]);

  const features = searchData?.features || [];
  const analytics = analyticsData || {};

  return (
    <div>
      <h1 className="mb-2 text-3xl font-bold">Vibranium Integration</h1>
      <p className="mb-6 text-sm text-gray-500">Feature library stats and lifecycle tracking</p>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-purple-800/50 p-5">
          <p className="text-xs text-gray-500">Total Features</p>
          <p className="mt-1 text-2xl font-bold text-purple-400">{analytics.totalFeatures || 0}</p>
        </div>
        <div className="rounded-xl border border-purple-800/50 p-5">
          <p className="text-xs text-gray-500">Reusable</p>
          <p className="mt-1 text-2xl font-bold text-green-400">{analytics.reusableCount || 0}</p>
        </div>
        <div className="rounded-xl border border-purple-800/50 p-5">
          <p className="text-xs text-gray-500">Total Reuses</p>
          <p className="mt-1 text-2xl font-bold text-blue-400">{analytics.totalReuses || 0}</p>
        </div>
        <div className="rounded-xl border border-purple-800/50 p-5">
          <p className="text-xs text-gray-500">Tokens Saved</p>
          <p className="mt-1 text-2xl font-bold text-yellow-400">{(analytics.totalTokensSaved || 0).toLocaleString()}</p>
        </div>
      </div>

      {/* Feature List */}
      <h2 className="mb-4 text-xl font-semibold text-gray-200">Recent Features</h2>
      {features.length === 0 ? (
        <p className="text-gray-500">No features in Vibranium. Connect API at {VIBRANIUM_URL}</p>
      ) : (
        <div className="space-y-2">
          {features.map((f: any) => {
            const statusColors: Record<string, string> = {
              draft: 'text-gray-400', registered: 'text-blue-400',
              implementing: 'text-yellow-400', merged: 'text-green-400', reusable: 'text-purple-400',
            };
            return (
              <div key={f.slug} className="flex items-center justify-between rounded-lg border border-gray-800 px-4 py-3">
                <div>
                  <span className="font-medium text-white">{f.name}</span>
                  <span className="ml-2 rounded bg-gray-800 px-2 py-0.5 text-xs">{f.type}</span>
                  <span className="ml-2 rounded bg-gray-800 px-2 py-0.5 text-xs">{f.category}</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className={statusColors[f.status] || 'text-gray-400'}>{f.status}</span>
                  <span className="text-gray-500">{f.useCount} uses</span>
                  {f.mergeUrl && <a href={f.mergeUrl} className="text-blue-400 hover:underline" target="_blank">PR</a>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
