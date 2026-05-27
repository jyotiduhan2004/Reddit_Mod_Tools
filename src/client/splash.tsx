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
      ? 'text-[#46D160]'
      : healthScore >= 60
        ? 'text-[#FFB000]'
        : 'text-[#FF585B]';

  const ringColor =
    healthScore >= 80
      ? 'border-[#46D160]'
      : healthScore >= 60
        ? 'border-[#FFB000]'
        : 'border-[#FF585B]';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-white dark:bg-[#1A1A1B] p-4">
        <div className="animate-spin w-6 h-6 border-3 border-[#FF4500] border-t-transparent rounded-full" />
        <p className="text-sm text-[#818384]">Loading RuleForge...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-white dark:bg-[#1A1A1B] p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 bg-[#FF4500] rounded-lg flex items-center justify-center text-white font-bold text-sm">
          RF
        </div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-[#D7DADC]">RuleForge</h1>
      </div>

      <p className="text-sm text-[#818384] text-center">
        Rule Enforcement Analytics
      </p>

      {stats && (
        <div className="flex items-center gap-6 my-2">
          <div className="flex flex-col items-center">
            <div className={`w-16 h-16 rounded-full border-4 ${ringColor} flex items-center justify-center`}>
              <span className={`text-xl font-bold ${healthColor}`}>{healthScore}</span>
            </div>
            <span className="text-xs text-[#818384] mt-1">Health</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xl font-bold text-[#FF4500]">{stats.totalRemovals}</span>
            <span className="text-xs text-[#818384]">Removals</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xl font-bold text-[#24A0ED]">{stats.totalOverrides}</span>
            <span className="text-xs text-[#818384]">Overrides</span>
          </div>
        </div>
      )}

      <button
        className="flex items-center justify-center bg-[#FF4500] text-white w-auto h-10 rounded-full cursor-pointer transition-colors px-6 hover:bg-[#e03d00] font-medium"
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
