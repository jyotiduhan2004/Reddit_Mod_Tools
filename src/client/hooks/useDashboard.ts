import { useState, useEffect, useCallback } from 'react';
import type {
  InitResponse,
  OverviewStats,
  HeatmapCell,
  ConsistencyData,
  ProblemRule,
  TrendData,
  WorkloadEntry,
  AutopsyData,
  MilestoneInfo,
} from '../../shared/api';

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error');
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export function useDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapCell[]>([]);
  const [consistency, setConsistency] = useState<ConsistencyData[]>([]);
  const [problems, setProblems] = useState<ProblemRule[]>([]);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [workload, setWorkload] = useState<WorkloadEntry[]>([]);
  const [username, setUsername] = useState('');
  const [milestone, setMilestone] = useState<MilestoneInfo>(null);
  const [untaggedCount, setUntaggedCount] = useState(0);
  const [autopsy, setAutopsy] = useState<AutopsyData | null>(null);
  const [selectedRule, setSelectedRule] = useState<string | null>(null);
  const [autopsyLoading, setAutopsyLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const initRes = await fetchJson<InitResponse>('/api/init');
      setOverview(initRes.overview);
      setUsername(initRes.username);
      setMilestone(initRes.milestone);
      setUntaggedCount(initRes.untaggedCount);

      const [heatmapRes, consistencyRes, problemsRes, trendsRes, workloadRes] = await Promise.all([
        fetchJson<HeatmapCell[]>('/api/heatmap'),
        fetchJson<ConsistencyData[]>('/api/consistency'),
        fetchJson<ProblemRule[]>('/api/problems'),
        fetchJson<TrendData[]>('/api/trends'),
        fetchJson<WorkloadEntry[]>('/api/workload'),
      ]);

      setHeatmap(heatmapRes);
      setConsistency(consistencyRes);
      setProblems(problemsRes);
      setTrends(trendsRes);
      setWorkload(workloadRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAutopsy = useCallback(async (rule: string) => {
    try {
      setAutopsyLoading(true);
      setSelectedRule(rule);
      const data = await fetchJson<AutopsyData>(`/api/autopsy?rule=${encodeURIComponent(rule)}`);
      setAutopsy(data);
    } catch (err) {
      console.error('Autopsy load error:', err);
      setAutopsy(null);
    } finally {
      setAutopsyLoading(false);
    }
  }, []);

  const clearAutopsy = useCallback(() => {
    setSelectedRule(null);
    setAutopsy(null);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    loading, error, overview, heatmap, consistency, problems, trends, workload,
    username, milestone, untaggedCount,
    autopsy, selectedRule, autopsyLoading, loadAutopsy, clearAutopsy,
    refresh: loadData,
  };
}
