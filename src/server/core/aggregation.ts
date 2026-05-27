import { redis } from '@devvit/web/server';
import { keys, formatMonth } from '../storage/keys';

export async function runAggregation(ruleNames: string[]): Promise<void> {
  const monthKey = formatMonth(new Date());

  let totalRemovals = 0;
  let totalApprovals = 0;
  let totalOverrides = 0;

  const ruleStats = await Promise.all(
    ruleNames.map(async (rule) => {
      const [removals, approvals, overrides, annotationCount] = await Promise.all([
        redis.zScore(keys.ruleRemovals(monthKey), rule).then((v) => v ?? 0),
        redis.zScore(keys.ruleApprovals(monthKey), rule).then((v) => v ?? 0),
        redis.zScore(keys.ruleOverrides(monthKey), rule).then((v) => v ?? 0),
        redis.zCard(keys.annotations(rule)),
      ]);

      return { rule, removals, approvals, overrides, annotationCount };
    })
  );

  for (const rs of ruleStats) {
    totalRemovals += rs.removals;
    totalApprovals += rs.approvals;
    totalOverrides += rs.overrides;

    const overrideRate = rs.removals > 0 ? rs.overrides / rs.removals : 0;
    const flagged = overrideRate > 0.25 && rs.removals >= 5;

    await redis.hSet(keys.problemRules(), {
      [rs.rule]: JSON.stringify({
        overrideRate,
        removalCount: rs.removals,
        annotationCount: rs.annotationCount,
        flagged,
      }),
    });
  }

  const total = totalRemovals + totalApprovals;
  const healthScore = total > 10 ? Math.round(100 - (totalOverrides / total) * 100) : (total > 0 ? 95 : -1);

  const currentScore = healthScore === -1 ? 100 : healthScore;

  const prevScoreStr = await redis.get(keys.healthPrev());
  const prevScore = prevScoreStr ? parseInt(prevScoreStr) : 0;
  if (prevScore > 0 && currentScore - prevScore >= 5) {
    await redis.set(
      keys.milestone(),
      JSON.stringify({
        message: `Health score improved from ${prevScore} to ${currentScore}!`,
        ts: Date.now(),
        delta: currentScore - prevScore,
      })
    );
    await redis.expire(keys.milestone(), 604800);
  }
  await redis.set(keys.healthPrev(), String(currentScore));

  await redis.hSet(keys.aggStats(), {
    totalActions: String(total),
    totalRemovals: String(totalRemovals),
    totalApprovals: String(totalApprovals),
    totalOverrides: String(totalOverrides),
    healthScore: String(currentScore),
    insufficientData: healthScore === -1 ? '1' : '0',
    updatedAt: String(Date.now()),
  });
}
