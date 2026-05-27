import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip as ChartTooltip,
  Legend,
} from 'chart.js';
import type { ConsistencyData } from '../../shared/api';
import { Tooltip } from './Tooltip';

ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTooltip, Legend);

const MOD_COLORS = [
  '#FF4500', '#24A0ED', '#46D160', '#FF585B', '#FFB000', '#7193FF', '#FF6AC1', '#00D5AB',
];

export function ModConsistency({ data, onSelectRule }: { data: ConsistencyData[]; onSelectRule?: (rule: string) => void }) {
  if (data.length === 0) {
    return <p className="text-[#818384] text-sm">No consistency data yet.</p>;
  }

  const allMods = [...new Set(data.flatMap((d) => d.mods.map((m) => m.name)))];

  const chartData = {
    labels: data.map((d) => d.rule.length > 18 ? d.rule.slice(0, 18) + '...' : d.rule),
    datasets: allMods.map((mod, i) => ({
      label: mod,
      data: data.map((d) => d.mods.find((m) => m.name === mod)?.count ?? 0),
      backgroundColor: MOD_COLORS[i % MOD_COLORS.length],
      borderRadius: 3,
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { color: '#818384', font: { size: 10 }, boxWidth: 12 },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#818384', font: { size: 10 } } },
      y: { grid: { color: '#343536' }, ticks: { color: '#818384' } },
    },
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-[#818384] mb-3">
        Mod Consistency — Actions Per Rule Per Mod (This Month)
      </h3>
      <div className="h-64">
        <Bar data={chartData} options={options} />
      </div>

      <div className="mt-4 space-y-2">
        {data.map((d) => (
          <div key={d.rule} className="flex items-center justify-between text-xs">
            <span
              className="text-[#D7DADC] truncate max-w-[200px] cursor-pointer hover:text-[#FF4500]"
              onClick={() => onSelectRule?.(d.rule)}
            >
              {d.rule}
            </span>
            <span
              className={`font-mono px-2 py-0.5 rounded ${
                d.stdDev > 10
                  ? 'bg-[#FF585B]/15 text-[#FF585B]'
                  : d.stdDev > 5
                    ? 'bg-[#FFB000]/15 text-[#FFB000]'
                    : 'bg-[#46D160]/15 text-[#46D160]'
              }`}
            >
              StdDev: {d.stdDev}
              <Tooltip text="Standard deviation — lower means more consistent enforcement across mods" />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
