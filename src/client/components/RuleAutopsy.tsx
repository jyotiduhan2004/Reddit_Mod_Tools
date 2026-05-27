import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip as ChartTooltip,
  Filler,
} from 'chart.js';
import type { AutopsyData } from '../../shared/api';
import { Tooltip } from './Tooltip';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ChartTooltip, Filler);

const MOD_COLORS = ['#ea580c', '#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626', '#0891b2', '#4f46e5'];

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const days = Math.floor(diff / 86400000);
  if (days > 30) return `${Math.floor(days / 30)}mo ago`;
  if (days > 0) return `${days}d ago`;
  const hours = Math.floor(diff / 3600000);
  if (hours > 0) return `${hours}h ago`;
  return 'just now';
}

const SEVERITY_STYLES = {
  critical: 'border-l-red-500 bg-red-50 dark:bg-red-900/20',
  warning: 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',
  info: 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20',
};

export function RuleAutopsy({ data, onBack }: { data: AutopsyData; onBack: () => void }) {
  const overridePct = Math.round(data.overrideRate * 100);

  const modChartData = {
    labels: data.modBreakdown.map((m) => m.mod),
    datasets: [
      {
        label: 'Actions',
        data: data.modBreakdown.map((m) => m.count),
        backgroundColor: data.modBreakdown.map((_, i) => MOD_COLORS[i % MOD_COLORS.length]),
        borderRadius: 4,
      },
    ],
  };

  const modChartOptions = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#9ca3af' } },
      y: { grid: { display: false }, ticks: { color: '#9ca3af' } },
    },
  };

  const trendChartData = {
    labels: data.trendPoints.map((p) => p.week),
    datasets: [
      {
        label: 'Removals',
        data: data.trendPoints.map((p) => p.removals),
        borderColor: '#ea580c',
        backgroundColor: 'rgba(234,88,12,0.1)',
        fill: true,
        tension: 0.3,
      },
      {
        label: 'Overrides',
        data: data.trendPoints.map((p) => p.overrides),
        borderColor: '#dc2626',
        backgroundColor: 'rgba(220,38,38,0.1)',
        fill: true,
        tension: 0.3,
      },
    ],
  };

  const trendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true, position: 'top' as const, labels: { boxWidth: 12, color: '#9ca3af' } } },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#9ca3af', maxRotation: 45 } },
      y: { grid: { color: 'rgba(156,163,175,0.2)' }, ticks: { color: '#9ca3af' } },
    },
  };

  const stdDevColor = data.consistencyStdDev <= 5 ? 'text-green-600' : data.consistencyStdDev <= 10 ? 'text-yellow-600' : 'text-red-600';
  const stdDevBg = data.consistencyStdDev <= 5 ? 'bg-green-100 dark:bg-green-900/30' : data.consistencyStdDev <= 10 ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-red-100 dark:bg-red-900/30';

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={onBack}
          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-lg"
        >
          ←
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">{data.rule}</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${data.healthy ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'}`}>
              {data.healthy ? 'Healthy' : 'Needs Attention'}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Compare */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">Rule Text</div>
          <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
            {data.description || 'No description available'}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <StatMini label="Removals" value={data.removals} color="text-orange-600" />
          <StatMini label="Approvals" value={data.approvals} color="text-blue-600" />
          <StatMini label="Overrides" value={data.overrides} color="text-red-600" />
          <StatMini label="Override %" value={`${overridePct}%`} color={overridePct > 25 ? 'text-red-600' : 'text-green-600'} />
        </div>
      </div>

      {/* Impact Ranking */}
      {data.impactPct > 0 && !data.healthy && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4 text-sm text-red-700 dark:text-red-300">
          Accounts for <span className="font-bold">{data.impactPct}%</span> of all overrides — fix this rule first for maximum impact
        </div>
      )}

      {/* Mod Breakdown */}
      {data.modBreakdown.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
            Per-Mod Enforcement
            <Tooltip text="How many times each mod enforced this rule this month" />
          </h3>
          <div className="h-32">
            <Bar data={modChartData} options={modChartOptions} />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${stdDevBg} ${stdDevColor}`}>
              σ = {data.consistencyStdDev}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {data.consistencyStdDev <= 5 ? 'Consistent' : data.consistencyStdDev <= 10 ? 'Some variation' : 'Inconsistent'}
            </span>
            <Tooltip text="Standard deviation — lower means mods enforce this rule more consistently" />
          </div>
        </div>
      )}

      {/* Trend */}
      {data.trendPoints.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
            12-Week Trend
          </h3>
          <div className="h-40">
            <Line data={trendChartData} options={trendOptions} />
          </div>
        </div>
      )}

      {/* Annotations */}
      {data.annotations.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
            Mod Annotations ({data.annotations.length})
          </h3>
          <div className="space-y-2">
            {data.annotations.map((a, i) => (
              <div key={i} className="flex gap-2 text-sm p-2 rounded bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                <span className="font-medium text-gray-700 dark:text-gray-300 flex-shrink-0">{a.mod}</span>
                <span className="text-gray-600 dark:text-gray-400 flex-1">"{a.text}"</span>
                <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">{timeAgo(a.ts)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
            Recommendations
          </h3>
          <div className="space-y-2">
            {data.recommendations.map((rec, i) => (
              <div
                key={i}
                className={`border-l-4 rounded-lg p-3 ${SEVERITY_STYLES[rec.severity]}`}
              >
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{rec.title}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{rec.body}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatMini({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-center">
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-gray-500 dark:text-gray-400">{label}</div>
    </div>
  );
}
