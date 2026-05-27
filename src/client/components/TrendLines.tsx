import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import type { TrendData } from '../../shared/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const COLORS = [
  '#FF4500', '#24A0ED', '#46D160', '#CC4545', '#FFB000', '#7193FF', '#FF6AC1', '#00D5AB',
];

export function TrendLines({ data, onSelectRule }: { data: TrendData[]; onSelectRule?: (rule: string) => void }) {
  if (data.length === 0 || data[0].points.length === 0) {
    return <p className="text-[#818384] text-sm">No trend data yet.</p>;
  }

  const labels = data[0].points.map((p) => p.week);

  const chartData = {
    labels,
    datasets: data.map((d, i) => ({
      label: d.rule.length > 20 ? d.rule.slice(0, 20) + '...' : d.rule,
      data: d.points.map((p) => p.removals),
      borderColor: COLORS[i % COLORS.length],
      backgroundColor: COLORS[i % COLORS.length] + '20',
      tension: 0.3,
      pointRadius: 2,
      borderWidth: 2,
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
        Enforcement Trends — Removals Per Rule (Last 12 Weeks)
      </h3>
      <div className="h-72">
        <Line data={chartData} options={options} />
      </div>

      {onSelectRule && data.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {data.map((d, i) => (
            <span
              key={d.rule}
              onClick={() => onSelectRule(d.rule)}
              className="text-xs px-2 py-1 rounded-full cursor-pointer hover:opacity-80 transition-opacity"
              style={{ backgroundColor: COLORS[i % COLORS.length] + '20', color: COLORS[i % COLORS.length] }}
            >
              {d.rule}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
