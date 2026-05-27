type Tab = 'overview' | 'heatmap' | 'consistency' | 'problems' | 'trends' | 'workload';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'heatmap', label: 'Heatmap' },
  { id: 'consistency', label: 'Consistency' },
  { id: 'problems', label: 'Problems' },
  { id: 'trends', label: 'Trends' },
  { id: 'workload', label: 'Workload' },
];

export function TabNav({
  active,
  onChange,
  problemCount,
}: {
  active: Tab;
  onChange: (tab: Tab) => void;
  problemCount: number;
}) {
  return (
    <div className="flex gap-1 border-b border-[#343536] mb-4 overflow-x-auto">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors relative ${
            active === tab.id
              ? 'text-[#FF4500] border-b-2 border-[#FF4500]'
              : 'text-[#818384] hover:text-[#D7DADC]'
          }`}
        >
          {tab.label}
          {tab.id === 'problems' && problemCount > 0 && (
            <span className="ml-1 bg-[#CC4545] text-white text-xs rounded-full px-1.5 py-0.5">
              {problemCount}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export type { Tab };
