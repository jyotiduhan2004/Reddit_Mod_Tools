import './index.css';

import { StrictMode, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { useDashboard } from './hooks/useDashboard';
import { TabNav } from './components/TabNav';
import type { Tab } from './components/TabNav';
import { Overview } from './components/Overview';
import { RuleHeatmap } from './components/RuleHeatmap';
import { ModConsistency } from './components/ModConsistency';
import { ProblemRules } from './components/ProblemRules';
import { TrendLines } from './components/TrendLines';
import { WorkloadBalance } from './components/WorkloadBalance';
import { RuleAutopsy } from './components/RuleAutopsy';

function Dashboard() {
  const {
    loading, error, overview, heatmap, consistency, problems, trends, workload,
    milestone, untaggedCount,
    autopsy, selectedRule, autopsyLoading, loadAutopsy, clearAutopsy,
    refresh,
  } = useDashboard();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const handleSelectRule = useCallback((rule: string) => {
    loadAutopsy(rule);
  }, [loadAutopsy]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-[#1A1A1B]">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-[#FF4500] border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-[#818384] text-sm">Loading RuleForge analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-[#1A1A1B]">
        <div className="text-[#FF585B] text-sm text-center p-4">
          <p className="font-semibold mb-1">Error loading dashboard</p>
          <p className="text-xs">{error}</p>
        </div>
      </div>
    );
  }

  const problemCount = problems.filter((p) => p.flagged).length;

  return (
    <div className="min-h-screen bg-white dark:bg-[#1A1A1B] text-gray-900 dark:text-[#D7DADC]">
      <div className="max-w-3xl mx-auto px-4 py-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-[#FF4500] rounded-lg flex items-center justify-center text-white font-bold text-sm">
            RF
          </div>
          <div>
            <h1 className="text-lg font-bold">RuleForge</h1>
            <p className="text-xs text-[#818384]">Rule Enforcement Analytics</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {untaggedCount > 0 && (
              <span
                className="text-xs px-2 py-1 rounded-full bg-[#FF4500]/10 text-[#FF4500]"
                title="Mod actions that couldn't be auto-matched to a rule"
              >
                {untaggedCount} untagged
              </span>
            )}
            <button
              onClick={refresh}
              className="text-xs px-3 py-1.5 rounded-full bg-[#272729] text-[#D7DADC] hover:bg-[#343536] transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {milestone && (
          <div className="bg-[#46D160]/10 border border-[#46D160]/30 rounded-lg p-3 mb-3 text-sm text-[#46D160] flex items-center gap-2">
            <span className="text-lg font-bold">+{milestone.delta}</span>
            <span>{milestone.message}</span>
          </div>
        )}

        {selectedRule ? (
          autopsyLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-6 h-6 border-3 border-[#FF4500] border-t-transparent rounded-full mx-auto mb-2" />
              <p className="text-sm text-[#818384]">Loading rule autopsy...</p>
            </div>
          ) : autopsy ? (
            <RuleAutopsy data={autopsy} onBack={clearAutopsy} />
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-[#FF585B]">Failed to load autopsy data</p>
              <button onClick={clearAutopsy} className="text-xs text-[#818384] mt-2 underline">Go back</button>
            </div>
          )
        ) : (
          <>
            <TabNav active={activeTab} onChange={setActiveTab} problemCount={problemCount} />

            <div className="mt-2">
              {activeTab === 'overview' && overview && <Overview stats={overview} onSelectRule={handleSelectRule} />}
              {activeTab === 'heatmap' && <RuleHeatmap cells={heatmap} onSelectRule={handleSelectRule} />}
              {activeTab === 'consistency' && <ModConsistency data={consistency} onSelectRule={handleSelectRule} />}
              {activeTab === 'problems' && <ProblemRules data={problems} onSelectRule={handleSelectRule} />}
              {activeTab === 'trends' && <TrendLines data={trends} onSelectRule={handleSelectRule} />}
              {activeTab === 'workload' && <WorkloadBalance data={workload} />}
            </div>
          </>
        )}

        <footer className="mt-6 pt-4 border-t border-[#343536] text-center text-xs text-[#818384]">
          RuleForge v1.0 — Built for the Reddit Mod Tools Hackathon 2026
        </footer>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Dashboard />
  </StrictMode>
);
