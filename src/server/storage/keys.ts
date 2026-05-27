export const keys = {
  ruleRemovals: (period: string) => `rf:removals:${period}`,
  ruleApprovals: (period: string) => `rf:approvals:${period}`,
  ruleOverrides: (period: string) => `rf:overrides:${period}`,
  modRuleCounts: (period: string) => `rf:modrule:${period}`,
  annotations: (rule: string) => `rf:annotations:${rule}`,
  aggStats: () => `rf:agg:stats`,
  problemRules: () => `rf:problemrules`,
  trend: (rule: string) => `rf:trend:${rule}`,
  cachedRules: () => `rf:rules`,
  settings: () => `rf:settings`,
  dashboardPostId: () => `rf:dashboard`,
  seeded: () => `rf:seeded`,
  untagged: (period: string) => `rf:untagged:${period}`,
  healthPrev: () => `rf:health:prev`,
  milestone: () => `rf:milestone`,
};

export function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function formatMonth(d: Date): string {
  return d.toISOString().slice(0, 7);
}

export function getISOWeek(d: Date): number {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
    )
  );
}

export function getWeekLabel(d: Date): string {
  return `${d.getFullYear()}-W${String(getISOWeek(d)).padStart(2, '0')}`;
}
