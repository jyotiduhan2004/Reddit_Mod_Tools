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
    <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-4 overflow-x-auto">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors relative ${
            active === tab.id
              ? 'text-orange-600 dark:text-orange-400 border-b-2 border-orange-600 dark:border-orange-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          {tab.label}
          {tab.id === 'problems' && problemCount > 0 && (
            <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
              {problemCount}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export type { Tab };
