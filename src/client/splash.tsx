import './index.css';

import { requestExpandedMode } from '@devvit/web/client';
import { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import type { OverviewStats } from '../shared/api';

function Splash() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/overview')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load');
        return r.json();
      })
      .then((data) => setStats(data))
      .catch((err) => console.warn('Splash load error:', err))
      .finally(() => setLoading(false));
  }, []);

  const healthScore = stats?.healthScore ?? 0;
  const healthColor =
    healthScore >= 80
      ? 'text-green-500'
      : healthScore >= 60
        ? 'text-yellow-500'
        : 'text-red-500';

  const ringColor =
    healthScore >= 80
      ? 'border-green-500'
      : healthScore >= 60
        ? 'border-yellow-500'
        : 'border-red-500';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-white dark:bg-gray-900 p-4">
        <div className="animate-spin w-6 h-6 border-3 border-orange-500 border-t-transparent rounded-full" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading RuleForge...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-white dark:bg-gray-900 p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
          RF
        </div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">RuleForge</h1>
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
        Rule Enforcement Analytics
      </p>

      {stats && (
        <div className="flex items-center gap-6 my-2">
          <div className="flex flex-col items-center">
            <div className={`w-16 h-16 rounded-full border-4 ${ringColor} flex items-center justify-center`}>
              <span className={`text-xl font-bold ${healthColor}`}>{healthScore}</span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Health</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xl font-bold text-orange-600">{stats.totalRemovals}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">Removals</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xl font-bold text-purple-600">{stats.totalOverrides}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">Overrides</span>
          </div>
        </div>
      )}

      <button
        className="flex items-center justify-center bg-[#d93900] dark:bg-orange-600 text-white w-auto h-10 rounded-full cursor-pointer transition-colors px-6 hover:bg-[#c23300] dark:hover:bg-orange-700 font-medium"
        onClick={(e) => requestExpandedMode(e.nativeEvent, 'dashboard')}
      >
        Open Dashboard
      </button>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
