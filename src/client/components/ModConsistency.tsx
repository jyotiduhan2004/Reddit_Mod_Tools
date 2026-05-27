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
  '#d93900', '#2563eb', '#16a34a', '#9333ea', '#ca8a04', '#dc2626', '#0891b2', '#c026d3',
];

export function ModConsistency({ data, onSelectRule }: { data: ConsistencyData[]; onSelectRule?: (rule: string) => void }) {
  if (data.length === 0) {
    return <p className="text-gray-500 dark:text-gray-400 text-sm">No consistency data yet.</p>;
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
        labels: { color: '#9ca3af', font: { size: 10 }, boxWidth: 12 },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#9ca3af', font: { size: 10 } } },
      y: { grid: { color: '#374151' }, ticks: { color: '#9ca3af' } },
    },
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3">
        Mod Consistency — Actions Per Rule Per Mod (This Month)
      </h3>
      <div className="h-64">
        <Bar data={chartData} options={options} />
      </div>

      <div className="mt-4 space-y-2">
        {data.map((d) => (
          <div key={d.rule} className="flex items-center justify-between text-xs">
            <span
              className="text-gray-700 dark:text-gray-300 truncate max-w-[200px] cursor-pointer hover:text-orange-600"
              onClick={() => onSelectRule?.(d.rule)}
            >
              {d.rule}
            </span>
            <span
              className={`font-mono px-2 py-0.5 rounded ${
                d.stdDev > 10
                  ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                  : d.stdDev > 5
                    ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300'
                    : 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
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
