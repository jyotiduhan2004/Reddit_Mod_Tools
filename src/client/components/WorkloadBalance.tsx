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

const BAR_COLORS = ['#FF4500', '#24A0ED', '#46D160', '#FFB000', '#7193FF', '#FF6AC1', '#00D5AB', '#CC4545'];

function burnoutBadge(pct: number) {
  if (pct > 40) return { label: 'High Load', cls: 'bg-[#CC4545]/15 text-[#CC4545]' };
  if (pct > 30) return { label: 'Moderate', cls: 'bg-[#FFB000]/15 text-[#FFB000]' };
  return { label: 'Balanced', cls: 'bg-[#46D160]/15 text-[#46D160]' };
}

export function WorkloadBalance({ data }: { data: WorkloadEntry[] }) {
  if (data.length === 0) {
    return (
      <div className="text-center text-[#818384] py-8 text-sm">
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
      x: { grid: { display: false }, ticks: { color: '#818384' } },
      y: { grid: { display: false }, ticks: { color: '#818384' } },
    },
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-[#818384] mb-3">
        Mod Workload Distribution
        <Tooltip text="Shows how mod actions are distributed across your team. High load on one mod may indicate burnout risk." />
      </h3>

      <div className="text-xs text-[#818384] mb-3">
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
              className="flex items-center gap-3 p-3 rounded-lg border border-[#343536] bg-[#272729]"
            >
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }}
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-[#D7DADC]">{entry.mod}</div>
                <div className="text-xs text-[#818384]">
                  {entry.ruleBreakdown.slice(0, 3).map((r) => r.rule).join(', ')}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-sm font-bold text-[#D7DADC]">
                  {entry.totalActions} <span className="font-normal text-xs text-[#818384]">({entry.percentage}%)</span>
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
