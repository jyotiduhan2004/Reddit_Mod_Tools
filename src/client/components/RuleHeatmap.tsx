import type { HeatmapCell } from '../../shared/api';
import { Tooltip } from './Tooltip';

function intensityColor(count: number, max: number): string {
  if (max === 0) return 'bg-gray-100 dark:bg-gray-800';
  const ratio = count / max;
  if (ratio === 0) return 'bg-gray-100 dark:bg-gray-800';
  if (ratio < 0.25) return 'bg-orange-100 dark:bg-orange-900/30';
  if (ratio < 0.5) return 'bg-orange-200 dark:bg-orange-800/50';
  if (ratio < 0.75) return 'bg-orange-400 dark:bg-orange-600/70';
  return 'bg-orange-600 dark:bg-orange-500';
}

export function RuleHeatmap({ cells, onSelectRule }: { cells: HeatmapCell[]; onSelectRule?: (rule: string) => void }) {
  const periods = [...new Set(cells.map((c) => c.period))];
  const rules = [...new Set(cells.map((c) => c.rule))];
  const max = Math.max(...cells.map((c) => c.count), 1);

  const getCount = (rule: string, period: string) =>
    cells.find((c) => c.rule === rule && c.period === period)?.count ?? 0;

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3">
        Rule Enforcement Heatmap (Last 3 Months)
        <Tooltip text="Monthly removal counts per rule — darker cells mean more removals" />
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left py-1 pr-2 text-gray-500 dark:text-gray-400 font-medium">Rule</th>
              {periods.map((p) => (
                <th key={p} className="text-center py-1 px-1 text-gray-500 dark:text-gray-400 font-medium">
                  {p}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule}>
                <td
                  className="py-1 pr-2 text-gray-700 dark:text-gray-300 whitespace-nowrap max-w-[150px] truncate cursor-pointer hover:text-orange-600"
                  onClick={() => onSelectRule?.(rule)}
                >
                  {rule}
                </td>
                {periods.map((period) => {
                  const count = getCount(rule, period);
                  return (
                    <td key={period} className="py-1 px-1">
                      <div
                        className={`w-full h-8 rounded flex items-center justify-center text-xs font-medium ${intensityColor(count, max)} ${
                          count > max * 0.5 ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                        }`}
                        title={`${rule} — ${period}: ${count} removals`}
                      >
                        {count}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2 mt-3 text-xs text-gray-500 dark:text-gray-400">
        <span>Low</span>
        <div className="flex gap-0.5">
          <div className="w-4 h-3 rounded bg-gray-100 dark:bg-gray-800" />
          <div className="w-4 h-3 rounded bg-orange-100 dark:bg-orange-900/30" />
          <div className="w-4 h-3 rounded bg-orange-200 dark:bg-orange-800/50" />
          <div className="w-4 h-3 rounded bg-orange-400 dark:bg-orange-600/70" />
          <div className="w-4 h-3 rounded bg-orange-600 dark:bg-orange-500" />
        </div>
        <span>High</span>
      </div>
    </div>
  );
}
