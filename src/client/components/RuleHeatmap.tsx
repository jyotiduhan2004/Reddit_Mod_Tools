import type { HeatmapCell } from '../../shared/api';
import { Tooltip } from './Tooltip';

function intensityColor(count: number, max: number): string {
  if (max === 0) return 'bg-[#272729]';
  const ratio = count / max;
  if (ratio === 0) return 'bg-[#272729]';
  if (ratio < 0.25) return 'bg-[#FF4500]/15';
  if (ratio < 0.5) return 'bg-[#FF4500]/30';
  if (ratio < 0.75) return 'bg-[#FF4500]/55';
  return 'bg-[#FF4500]/80';
}

export function RuleHeatmap({ cells, onSelectRule }: { cells: HeatmapCell[]; onSelectRule?: (rule: string) => void }) {
  if (cells.length === 0) {
    return (
      <div className="text-center text-[#818384] py-8 text-sm">
        No heatmap data yet — enforcement actions will appear here over time
      </div>
    );
  }

  const periods = [...new Set(cells.map((c) => c.period))];
  const rules = [...new Set(cells.map((c) => c.rule))];
  const max = Math.max(...cells.map((c) => c.count), 1);

  const getCount = (rule: string, period: string) =>
    cells.find((c) => c.rule === rule && c.period === period)?.count ?? 0;

  return (
    <div>
      <h3 className="text-sm font-semibold text-[#818384] mb-3">
        Rule Enforcement Heatmap (Last 3 Months)
        <Tooltip text="Monthly removal counts per rule — darker cells mean more removals" />
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left py-1 pr-2 text-[#818384] font-medium">Rule</th>
              {periods.map((p) => (
                <th key={p} className="text-center py-1 px-1 text-[#818384] font-medium">
                  {p}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule}>
                <td
                  className="py-1 pr-2 text-[#D7DADC] whitespace-nowrap max-w-[150px] truncate cursor-pointer hover:text-[#FF4500]"
                  onClick={() => onSelectRule?.(rule)}
                >
                  {rule}
                </td>
                {periods.map((period) => {
                  const count = getCount(rule, period);
                  return (
                    <td key={period} className="py-1 px-1">
                      <div
                        className={`w-full h-8 rounded flex items-center justify-center text-xs font-medium ${intensityColor(count, max)} text-[#D7DADC]`}
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

      <div className="flex items-center gap-2 mt-3 text-xs text-[#818384]">
        <span>Low</span>
        <div className="flex gap-0.5">
          <div className="w-4 h-3 rounded bg-[#272729]" />
          <div className="w-4 h-3 rounded bg-[#FF4500]/15" />
          <div className="w-4 h-3 rounded bg-[#FF4500]/30" />
          <div className="w-4 h-3 rounded bg-[#FF4500]/55" />
          <div className="w-4 h-3 rounded bg-[#FF4500]/80" />
        </div>
        <span>High</span>
      </div>
    </div>
  );
}
