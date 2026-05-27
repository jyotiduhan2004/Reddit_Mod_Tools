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
  if (score >= 80) return 'bg-[#46D160]/15 text-[#46D160]';
  if (score >= 60) return 'bg-[#FFB000]/15 text-[#FFB000]';
  return 'bg-[#FF585B]/15 text-[#FF585B]';
}

export function Overview({ stats, onSelectRule }: { stats: OverviewStats; onSelectRule?: (rule: string) => void }) {
  const barData = {
    labels: stats.topRules.map((r) => r.rule.length > 20 ? r.rule.slice(0, 20) + '...' : r.rule),
    datasets: [
      {
        label: 'Removals',
        data: stats.topRules.map((r) => r.count),
        backgroundColor: '#FF4500',
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
      x: { grid: { display: false }, ticks: { color: '#818384' } },
      y: { grid: { display: false }, ticks: { color: '#818384', font: { size: 11 } } },
    },
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <StatCard label="Health Score" value={stats.healthScore} color={healthColor(stats.healthScore)} tooltip="0-100 score based on overall override rate. Higher is better." />
        <StatCard label="Total Actions" value={stats.totalActions} color="bg-[#24A0ED]/15 text-[#24A0ED]" tooltip="Total removals + approvals this month" />
        <StatCard label="Removals" value={stats.totalRemovals} color="bg-[#FF4500]/15 text-[#FF4500]" tooltip="Content removed by mods under any rule" />
        <StatCard label="Overrides" value={stats.totalOverrides} color="bg-[#FF585B]/15 text-[#FF585B]" tooltip="Removals later approved by another mod" />
      </div>

      <h3 className="text-sm font-semibold text-[#818384] mb-2">
        Top Enforced Rules (This Month)
      </h3>
      {stats.topRules.length > 0 ? (
        <div className="h-48">
          <Bar data={barData} options={barOptions} />
        </div>
      ) : (
        <div className="text-center text-[#818384] py-8 text-sm">
          No enforcement data yet — start moderating to see results
        </div>
      )}

      {stats.topRules.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {stats.topRules.map((r) => (
            <span
              key={r.rule}
              onClick={() => onSelectRule?.(r.rule)}
              className="text-xs px-2 py-1 rounded-full bg-[#272729] text-[#D7DADC] cursor-pointer hover:bg-[#FF4500]/20 hover:text-[#FF4500] transition-colors"
            >
              {r.rule}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
