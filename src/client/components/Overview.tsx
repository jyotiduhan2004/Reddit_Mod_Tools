import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip as ChartTooltip,
  Legend,
} from 'chart.js';
import type { OverviewStats } from '../../shared/api';
import { Tooltip } from './Tooltip';

ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTooltip, Legend);

function StatCard({ label, value, color, tooltip }: { label: string; value: string | number; color: string; tooltip?: string }) {
  return (
    <div className={`rounded-lg p-4 ${color} flex flex-col items-center justify-center`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs mt-1 opacity-80">
        {label}
        {tooltip && <Tooltip text={tooltip} />}
      </div>
    </div>
  );
}

function healthColor(score: number): string {
  if (score >= 80) return 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300';
  if (score >= 60) return 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300';
  return 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300';
}

export function Overview({ stats, onSelectRule }: { stats: OverviewStats; onSelectRule?: (rule: string) => void }) {
  const barData = {
    labels: stats.topRules.map((r) => r.rule.length > 20 ? r.rule.slice(0, 20) + '...' : r.rule),
    datasets: [
      {
        label: 'Removals',
        data: stats.topRules.map((r) => r.count),
        backgroundColor: '#d93900',
        borderRadius: 4,
      },
    ],
  };

  const barOptions = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#9ca3af' } },
      y: { grid: { display: false }, ticks: { color: '#9ca3af', font: { size: 11 } } },
    },
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <StatCard label="Health Score" value={stats.healthScore} color={healthColor(stats.healthScore)} tooltip="0-100 score based on overall override rate. Higher is better." />
        <StatCard label="Total Actions" value={stats.totalActions} color="bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300" tooltip="Total removals + approvals this month" />
        <StatCard label="Removals" value={stats.totalRemovals} color="bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300" tooltip="Content removed by mods under any rule" />
        <StatCard label="Overrides" value={stats.totalOverrides} color="bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300" tooltip="Removals later approved by another mod" />
      </div>

      <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
        Top Enforced Rules (This Month)
      </h3>
      <div className="h-48">
        <Bar data={barData} options={barOptions} />
      </div>

      {stats.topRules.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {stats.topRules.map((r) => (
            <span
              key={r.rule}
              onClick={() => onSelectRule?.(r.rule)}
              className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/30 hover:text-orange-600 transition-colors"
            >
              {r.rule}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
