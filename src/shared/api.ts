export type RuleInfo = {
  shortName: string;
  description: string;
  kind: string;
  priority: number;
  violationReason: string;
};

export type OverviewStats = {
  totalActions: number;
  totalRemovals: number;
  totalApprovals: number;
  totalOverrides: number;
  healthScore: number;
  topRules: { rule: string; count: number }[];
};

export type HeatmapCell = {
  rule: string;
  period: string;
  count: number;
};

export type ModRuleCount = {
  mod: string;
  rule: string;
  count: number;
};

export type ConsistencyData = {
  rule: string;
  mods: { name: string; count: number }[];
  stdDev: number;
};

export type ProblemRule = {
  rule: string;
  overrideRate: number;
  removalCount: number;
  annotationCount: number;
  flagged: boolean;
  annotations: Annotation[];
  impactPct: number;
};

export type Annotation = {
  mod: string;
  text: string;
  ts: number;
};

export type TrendPoint = {
  week: string;
  removals: number;
  approvals: number;
  overrides: number;
};

export type TrendData = {
  rule: string;
  points: TrendPoint[];
};

export type InitResponse = {
  type: 'init';
  postId: string;
  username: string;
  rules: RuleInfo[];
  overview: OverviewStats;
  milestone: MilestoneInfo;
  untaggedCount: number;
};

export type Recommendation = {
  severity: 'info' | 'warning' | 'critical';
  title: string;
  body: string;
};

export type WorkloadEntry = {
  mod: string;
  totalActions: number;
  percentage: number;
  ruleBreakdown: { rule: string; count: number }[];
};

export type AutopsyData = {
  rule: string;
  description: string;
  removals: number;
  approvals: number;
  overrides: number;
  overrideRate: number;
  modBreakdown: { mod: string; count: number }[];
  annotations: Annotation[];
  consistencyStdDev: number;
  trendPoints: TrendPoint[];
  recommendations: Recommendation[];
  impactPct: number;
  healthy: boolean;
};

export type MilestoneInfo = {
  message: string;
  ts: number;
  delta: number;
} | null;

export type TagRuleFormValues = {
  targetId: string;
  actionType: string;
  ruleShortName: string;
  annotation?: string;
};
