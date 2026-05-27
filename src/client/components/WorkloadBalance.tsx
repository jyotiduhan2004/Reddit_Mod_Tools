import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip as ChartTooltip,
} from 'chart.js';
import type { WorkloadEntry } from '../../shared/api';
import { Tooltip } from './Tooltip';

ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTooltip);

const BAR_COLORS = ['#ea580c', '#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626', '#0891b2', '#4f46e5'];

function burnoutBadge(pct: number) {
  if (pct > 40) return { label: 'High Load', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' };
  if (pct > 30) return { label: 'Moderate', cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' };
  return { label: 'Balanced', cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' };
}

export function WorkloadBalance({ data }: { data: WorkloadEntry[] }) {
  if (data.length === 0) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 py-8 text-sm">
        No workload data available yet
      </div>
    );
  }

  const chartData = {
    labels: data.map((d) => d.mod),
    datasets: [
      {
        label: 'Actions',
        data: data.map((d) => d.totalActions),
        backgroundColor: data.map((_, i) => BAR_COLORS[i % BAR_COLORS.length]),
        borderRadius: 4,
      },
    ],
  };

  const options = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#9ca3af' } },
      y: { grid: { display: false }, ticks: { color: '#9ca3af' } },
    },
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3">
        Mod Workload Distribution
        <Tooltip text="Shows how mod actions are distributed across your team. High load on one mod may indicate burnout risk." />
      </h3>

      <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        {data.length} mods active this month
      </div>

      <div className="h-48 mb-4">
        <Bar data={chartData} options={options} />
      </div>

      <div className="space-y-2">
        {data.map((entry, i) => {
          const badge = burnoutBadge(entry.percentage);
          return (
            <div
              key={entry.mod}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
            >
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }}
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-gray-800 dark:text-gray-200">{entry.mod}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {entry.ruleBreakdown.slice(0, 3).map((r) => r.rule).join(', ')}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-sm font-bold text-gray-800 dark:text-gray-200">
                  {entry.totalActions} <span className="font-normal text-xs text-gray-500">({entry.percentage}%)</span>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${badge.cls}`}>
                  {badge.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
