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

const MOD_COLORS = ['#FF4500', '#24A0ED', '#46D160', '#FFB000', '#7193FF', '#FF6AC1', '#00D5AB', '#FF585B'];

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
  critical: 'border-l-[#FF585B] bg-[#FF585B]/10',
  warning: 'border-l-[#FFB000] bg-[#FFB000]/10',
  info: 'border-l-[#24A0ED] bg-[#24A0ED]/10',
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
      x: { grid: { display: false }, ticks: { color: '#818384' } },
      y: { grid: { display: false }, ticks: { color: '#818384' } },
    },
  };

  const trendChartData = {
    labels: data.trendPoints.map((p) => p.week),
    datasets: [
      {
        label: 'Removals',
        data: data.trendPoints.map((p) => p.removals),
        borderColor: '#FF4500',
        backgroundColor: 'rgba(255,69,0,0.1)',
        fill: true,
        tension: 0.3,
      },
      {
        label: 'Overrides',
        data: data.trendPoints.map((p) => p.overrides),
        borderColor: '#FF585B',
        backgroundColor: 'rgba(255,88,91,0.1)',
        fill: true,
        tension: 0.3,
      },
    ],
  };

  const trendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true, position: 'top' as const, labels: { boxWidth: 12, color: '#818384' } } },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#818384', maxRotation: 45 } },
      y: { grid: { color: '#343536' }, ticks: { color: '#818384' } },
    },
  };

  const stdDevColor = data.consistencyStdDev <= 5 ? 'text-[#46D160]' : data.consistencyStdDev <= 10 ? 'text-[#FFB000]' : 'text-[#FF585B]';
  const stdDevBg = data.consistencyStdDev <= 5 ? 'bg-[#46D160]/15' : data.consistencyStdDev <= 10 ? 'bg-[#FFB000]/15' : 'bg-[#FF585B]/15';

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={onBack}
          className="text-[#818384] hover:text-[#D7DADC] text-lg"
        >
          ←
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[#D7DADC]">{data.rule}</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${data.healthy ? 'bg-[#46D160]/15 text-[#46D160]' : 'bg-[#FF585B]/15 text-[#FF585B]'}`}>
              {data.healthy ? 'Healthy' : 'Needs Attention'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-lg border border-[#343536] bg-[#272729]">
          <div className="text-xs font-semibold text-[#818384] mb-1 uppercase tracking-wide">Rule Text</div>
          <p className="text-sm text-[#D7DADC] leading-relaxed">
            {data.description || 'No description available'}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <StatMini label="Removals" value={data.removals} color="text-[#FF4500]" />
          <StatMini label="Approvals" value={data.approvals} color="text-[#24A0ED]" />
          <StatMini label="Overrides" value={data.overrides} color="text-[#FF585B]" />
          <StatMini label="Override %" value={`${overridePct}%`} color={overridePct > 25 ? 'text-[#FF585B]' : 'text-[#46D160]'} />
        </div>
      </div>

      {data.impactPct > 0 && !data.healthy && (
        <div className="bg-[#FF585B]/10 border border-[#FF585B]/30 rounded-lg p-3 mb-4 text-sm text-[#FF585B]">
          Accounts for <span className="font-bold">{data.impactPct}%</span> of all overrides — fix this rule first for maximum impact
        </div>
      )}

      {data.modBreakdown.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-[#818384] mb-2 uppercase tracking-wide">
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
            <span className="text-xs text-[#818384]">
              {data.consistencyStdDev <= 5 ? 'Consistent' : data.consistencyStdDev <= 10 ? 'Some variation' : 'Inconsistent'}
            </span>
            <Tooltip text="Standard deviation — lower means mods enforce this rule more consistently" />
          </div>
        </div>
      )}

      {data.trendPoints.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-[#818384] mb-2 uppercase tracking-wide">
            12-Week Trend
          </h3>
          <div className="h-40">
            <Line data={trendChartData} options={trendOptions} />
          </div>
        </div>
      )}

      {data.annotations.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-[#818384] mb-2 uppercase tracking-wide">
            Mod Annotations ({data.annotations.length})
          </h3>
          <div className="space-y-2">
            {data.annotations.map((a, i) => (
              <div key={i} className="flex gap-2 text-sm p-2 rounded bg-[#272729] border border-[#343536]">
                <span className="font-medium text-[#D7DADC] flex-shrink-0">{a.mod}</span>
                <span className="text-[#818384] flex-1">"{a.text}"</span>
                <span className="text-xs text-[#818384] flex-shrink-0">{timeAgo(a.ts)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.recommendations.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-[#818384] mb-2 uppercase tracking-wide">
            Recommendations
          </h3>
          <div className="space-y-2">
            {data.recommendations.map((rec, i) => (
              <div
                key={i}
                className={`border-l-4 rounded-lg p-3 ${SEVERITY_STYLES[rec.severity]}`}
              >
                <div className="text-sm font-semibold text-[#D7DADC]">{rec.title}</div>
                <div className="text-xs text-[#818384] mt-1">{rec.body}</div>
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
    <div className="p-2 rounded-lg border border-[#343536] bg-[#272729] text-center">
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-[#818384]">{label}</div>
    </div>
  );
}
