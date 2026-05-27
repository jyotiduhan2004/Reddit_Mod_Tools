import { Hono } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';
import { keys, formatMonth } from '../storage/keys';
import { getRules } from '../core/rules';
import { generateRecommendations } from '../core/recommendations';
import type {
  InitResponse,
  OverviewStats,
  HeatmapCell,
  ConsistencyData,
  ProblemRule,
  TrendData,
  TrendPoint,
  Annotation,
  WorkloadEntry,
  AutopsyData,
  MilestoneInfo,
} from '../../shared/api';

export const api = new Hono();

api.get('/init', async (c) => {
  const { postId } = context;
  if (!postId) {
    return c.json({ status: 'error', message: 'postId missing' }, 400);
  }

  try {
    const monthKey = formatMonth(new Date());
    const [rules, username, overview, milestoneRaw, untaggedRaw] = await Promise.all([
      getRules(),
      reddit.getCurrentUsername(),
      getOverview(),
      redis.get(keys.milestone()),
      redis.hGet(keys.untagged(monthKey), 'count'),
    ]);

    let milestone: MilestoneInfo = null;
    if (milestoneRaw) {
      try { milestone = JSON.parse(milestoneRaw); } catch { /* ignore */ }
    }

    return c.json<InitResponse>({
      type: 'init',
      postId,
      username: username ?? 'anonymous',
      rules,
      overview,
      milestone,
      untaggedCount: parseInt(untaggedRaw ?? '0') || 0,
    });
  } catch (error) {
    console.error('Init error:', error);
    return c.json({ status: 'error', message: String(error) }, 400);
  }
});

api.get('/overview', async (c) => {
  try {
    return c.json(await getOverview());
  } catch (error) {
    return c.json({ status: 'error', message: String(error) }, 400);
  }
});

api.get('/heatmap', async (c) => {
  try {
    const rules = await getRules();
    const now = new Date();

    const monthPromises = Array.from({ length: 3 }, (_, m) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (2 - m), 1);
      const monthKey = formatMonth(d);
      const monthLabel = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      return redis.zRange(keys.ruleRemovals(monthKey), 0, -1).then((entries) => ({
        monthLabel,
        entries,
      }));
    });

    const months = await Promise.all(monthPromises);
    const cells: HeatmapCell[] = [];

    for (const { monthLabel, entries } of months) {
      const entryMap = new Map(entries.map((e) => [e.member, e.score]));
      for (const rule of rules) {
        cells.push({
          rule: rule.shortName,
          period: monthLabel,
          count: entryMap.get(rule.shortName) ?? 0,
        });
      }
    }

    return c.json(cells);
  } catch (error) {
    return c.json({ status: 'error', message: String(error) }, 400);
  }
});

api.get('/consistency', async (c) => {
  try {
    const rules = await getRules();
    const monthKey = formatMonth(new Date());
    const allData = await redis.hGetAll(keys.modRuleCounts(monthKey));
    const result: ConsistencyData[] = [];

    for (const rule of rules) {
      const mods: { name: string; count: number }[] = [];

      for (const [field, value] of Object.entries(allData)) {
        const colonIdx = field.indexOf(':');
        if (colonIdx === -1) continue;
        const modName = field.slice(0, colonIdx);
        const ruleName = field.slice(colonIdx + 1);
        if (ruleName === rule.shortName) {
          mods.push({ name: modName, count: parseInt(value) || 0 });
        }
      }

      if (mods.length > 0) {
        const counts = mods.map((m) => m.count);
        const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
        const variance = counts.reduce((sum, val) => sum + (val - mean) ** 2, 0) / counts.length;
        const stdDev = Math.round(Math.sqrt(variance) * 10) / 10;
        result.push({ rule: rule.shortName, mods, stdDev });
      }
    }

    result.sort((a, b) => b.stdDev - a.stdDev);
    return c.json(result);
  } catch (error) {
    return c.json({ status: 'error', message: String(error) }, 400);
  }
});

api.get('/problems', async (c) => {
  try {
    const monthKey = formatMonth(new Date());
    const [data, overrideEntries] = await Promise.all([
      redis.hGetAll(keys.problemRules()),
      redis.zRange(keys.ruleOverrides(monthKey), 0, -1),
    ]);
    const ruleNames = Object.keys(data);

    const overrideMap = new Map(overrideEntries.map((e) => [e.member, e.score]));
    const totalOverrides = overrideEntries.reduce((sum, e) => sum + e.score, 0);

    const annotationResults = await Promise.all(
      ruleNames.map((rule) =>
        redis.zRange(keys.annotations(rule), 0, 4, { reverse: true }).then((raw) => ({
          rule,
          annotations: raw.map((a): Annotation => {
            try { return JSON.parse(a.member); }
            catch { return { mod: 'unknown', text: a.member, ts: 0 }; }
          }),
        }))
      )
    );

    const annotationMap = new Map(annotationResults.map((a) => [a.rule, a.annotations]));

    const result: ProblemRule[] = ruleNames.map((rule) => {
      const parsed = JSON.parse(data[rule]);
      const ruleOverrides = overrideMap.get(rule) ?? 0;
      return {
        rule,
        overrideRate: parsed.overrideRate ?? 0,
        removalCount: parsed.removalCount ?? 0,
        annotationCount: parsed.annotationCount ?? 0,
        flagged: parsed.flagged ?? false,
        annotations: annotationMap.get(rule) ?? [],
        impactPct: totalOverrides > 0 ? Math.round((ruleOverrides / totalOverrides) * 100) : 0,
      };
    });

    result.sort((a, b) => {
      if (a.flagged !== b.flagged) return a.flagged ? -1 : 1;
      return b.impactPct - a.impactPct || b.overrideRate - a.overrideRate;
    });

    return c.json(result);
  } catch (error) {
    return c.json({ status: 'error', message: String(error) }, 400);
  }
});

api.get('/trends', async (c) => {
  try {
    const rules = await getRules();

    const results = await Promise.all(
      rules.map((rule) =>
        redis.zRange(keys.trend(rule.shortName), 0, 12).then((raw) => ({
          rule: rule.shortName,
          points: raw.map((r) => {
            try { return JSON.parse(r.member); }
            catch { return { week: '', removals: 0, approvals: 0, overrides: 0 }; }
          }),
        }))
      )
    );

    return c.json(results as TrendData[]);
  } catch (error) {
    return c.json({ status: 'error', message: String(error) }, 400);
  }
});

api.get('/workload', async (c) => {
  try {
    const monthKey = formatMonth(new Date());
    const allData = await redis.hGetAll(keys.modRuleCounts(monthKey));

    const modMap = new Map<string, { total: number; rules: Map<string, number> }>();

    for (const [field, value] of Object.entries(allData)) {
      const colonIdx = field.indexOf(':');
      if (colonIdx === -1) continue;
      const modName = field.slice(0, colonIdx);
      const ruleName = field.slice(colonIdx + 1);
      const count = parseInt(value) || 0;

      if (!modMap.has(modName)) {
        modMap.set(modName, { total: 0, rules: new Map() });
      }
      const entry = modMap.get(modName)!;
      entry.total += count;
      entry.rules.set(ruleName, (entry.rules.get(ruleName) ?? 0) + count);
    }

    const grandTotal = Array.from(modMap.values()).reduce((s, e) => s + e.total, 0);

    const result: WorkloadEntry[] = Array.from(modMap.entries())
      .map(([mod, data]) => ({
        mod,
        totalActions: data.total,
        percentage: grandTotal > 0 ? Math.round((data.total / grandTotal) * 100) : 0,
        ruleBreakdown: Array.from(data.rules.entries())
          .map(([rule, count]) => ({ rule, count }))
          .sort((a, b) => b.count - a.count),
      }))
      .sort((a, b) => b.totalActions - a.totalActions);

    return c.json(result);
  } catch (error) {
    return c.json({ status: 'error', message: String(error) }, 400);
  }
});

api.get('/autopsy', async (c) => {
  try {
    const ruleName = c.req.query('rule');
    if (!ruleName) return c.json({ error: 'rule param required' }, 400);

    const monthKey = formatMonth(new Date());
    const rules = await getRules();
    const ruleInfo = rules.find((r) => r.shortName === ruleName);

    const [removals, approvals, overrides, modData, annotationsRaw, trendRaw, problemsData, allOverrides] =
      await Promise.all([
        redis.zScore(keys.ruleRemovals(monthKey), ruleName).then((v) => v ?? 0),
        redis.zScore(keys.ruleApprovals(monthKey), ruleName).then((v) => v ?? 0),
        redis.zScore(keys.ruleOverrides(monthKey), ruleName).then((v) => v ?? 0),
        redis.hGetAll(keys.modRuleCounts(monthKey)),
        redis.zRange(keys.annotations(ruleName), 0, -1, { reverse: true }),
        redis.zRange(keys.trend(ruleName), 0, 12),
        redis.hGet(keys.problemRules(), ruleName),
        redis.zRange(keys.ruleOverrides(monthKey), 0, -1),
      ]);

    const modBreakdown: { mod: string; count: number }[] = [];
    for (const [field, value] of Object.entries(modData)) {
      const colonIdx = field.indexOf(':');
      if (colonIdx === -1) continue;
      const modName = field.slice(0, colonIdx);
      const rName = field.slice(colonIdx + 1);
      if (rName === ruleName) {
        modBreakdown.push({ mod: modName, count: parseInt(value) || 0 });
      }
    }
    modBreakdown.sort((a, b) => b.count - a.count);

    const annotations: Annotation[] = annotationsRaw.map((a) => {
      try { return JSON.parse(a.member); }
      catch { return { mod: 'unknown', text: a.member, ts: 0 }; }
    });

    const trendPoints: TrendPoint[] = trendRaw.map((r) => {
      try { return JSON.parse(r.member); }
      catch { return { week: '', removals: 0, approvals: 0, overrides: 0 }; }
    });

    const counts = modBreakdown.map((m) => m.count);
    let consistencyStdDev = 0;
    if (counts.length > 1) {
      const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
      const variance = counts.reduce((sum, val) => sum + (val - mean) ** 2, 0) / counts.length;
      consistencyStdDev = Math.round(Math.sqrt(variance) * 10) / 10;
    }

    const overrideRate = removals > 0 ? overrides / removals : 0;
    const totalOverrides = allOverrides.reduce((sum, e) => sum + e.score, 0);
    const impactPct = totalOverrides > 0 ? Math.round((overrides / totalOverrides) * 100) : 0;

    const parsedProblem = problemsData ? JSON.parse(problemsData) : {};
    const flagged = parsedProblem.flagged ?? false;

    const recommendations = generateRecommendations(
      overrideRate,
      removals,
      parsedProblem.annotationCount ?? annotations.length,
      consistencyStdDev,
      annotations
    );

    const result: AutopsyData = {
      rule: ruleName,
      description: ruleInfo?.description ?? '',
      removals,
      approvals,
      overrides,
      overrideRate,
      modBreakdown,
      annotations,
      consistencyStdDev,
      trendPoints,
      recommendations,
      impactPct,
      healthy: !flagged,
    };

    return c.json(result);
  } catch (error) {
    return c.json({ status: 'error', message: String(error) }, 400);
  }
});

api.post('/start-discussion', async (c) => {
  try {
    const { rule } = await c.req.json<{ rule: string }>();
    if (!rule) return c.json({ error: 'rule required' }, 400);

    const [problemsData, annotationsRaw] = await Promise.all([
      redis.hGet(keys.problemRules(), rule),
      redis.zRange(keys.annotations(rule), 0, -1, { reverse: true }),
    ]);

    const parsed = problemsData ? JSON.parse(problemsData) : {};
    const annotations: Annotation[] = annotationsRaw.map((a) => {
      try { return JSON.parse(a.member); }
      catch { return { mod: 'unknown', text: a.member, ts: 0 }; }
    });

    let body = `# Rule Discussion: ${rule}\n\n`;
    body += `**Override Rate:** ${Math.round((parsed.overrideRate ?? 0) * 100)}%\n`;
    body += `**Removals:** ${parsed.removalCount ?? 0}\n`;
    body += `**Annotations:** ${annotations.length}\n\n`;

    if (annotations.length > 0) {
      body += `## Mod Feedback\n\n`;
      for (const a of annotations) {
        body += `- **${a.mod}:** "${a.text}"\n`;
      }
      body += '\n';
    }

    body += `## Discussion Points\n\n`;
    body += `1. Is this rule clear enough for consistent enforcement?\n`;
    body += `2. Should we rewrite or split this rule?\n`;
    body += `3. What specific examples should we add to the rule text?\n`;
    body += `\n---\n*Generated by RuleForge*`;

    const subredditName = context.subredditName;
    if (subredditName) {
      await reddit.submitPost({
        subredditName,
        title: `[RuleForge Discussion] ${rule}`,
        text: body,
      });
    }

    return c.json({ success: true });
  } catch (error) {
    return c.json({ status: 'error', message: String(error) }, 400);
  }
});

async function getOverview(): Promise<OverviewStats> {
  const monthKey = formatMonth(new Date());

  const [stats, topRulesRaw] = await Promise.all([
    redis.hGetAll(keys.aggStats()),
    redis.zRange(keys.ruleRemovals(monthKey), 0, 4, { reverse: true }),
  ]);

  return {
    totalActions: parseInt(stats.totalActions ?? '0'),
    totalRemovals: parseInt(stats.totalRemovals ?? '0'),
    totalApprovals: parseInt(stats.totalApprovals ?? '0'),
    totalOverrides: parseInt(stats.totalOverrides ?? '0'),
    healthScore: parseInt(stats.healthScore ?? '100'),
    topRules: topRulesRaw.map((r) => ({ rule: r.member, count: r.score })),
  };
}
