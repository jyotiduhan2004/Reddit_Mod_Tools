import { redis } from '@devvit/web/server';
import { keys, formatMonth, getWeekLabel } from './keys';
import { runAggregation } from '../core/aggregation';
import { getRules } from '../core/rules';

const FALLBACK_RULES = [
  'No spam or self-promotion',
  'Be civil and respectful',
  'Use descriptive titles',
  'No reposts within 30 days',
  'Flair your posts',
  'No low-effort content',
];

const SAMPLE_MODS = ['mod_alpha', 'mod_beta', 'mod_gamma', 'mod_delta'];

async function clearAllData(ruleNames: string[]): Promise<void> {
  const now = new Date();
  const delKeys: string[] = [
    keys.seeded(),
    keys.aggStats(),
    keys.problemRules(),
    keys.healthPrev(),
    keys.milestone(),
    keys.cachedRules(),
  ];

  for (const rule of ruleNames) {
    delKeys.push(keys.annotations(rule), keys.trend(rule));
  }

  for (let m = 0; m < 4; m++) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const mk = formatMonth(d);
    delKeys.push(
      keys.ruleRemovals(mk),
      keys.ruleApprovals(mk),
      keys.ruleOverrides(mk),
      keys.modRuleCounts(mk),
      keys.untagged(mk)
    );
  }

  for (const k of delKeys) {
    try { await redis.del(k); } catch { /* ignore */ }
  }
}

export async function forceSeed(): Promise<void> {
  const fetchedRules = await getRules();
  const ruleNames = fetchedRules.length > 0
    ? fetchedRules.map((r) => r.shortName)
    : FALLBACK_RULES;
  await clearAllData(ruleNames);
  await seedSampleData();
}

export async function seedSampleData(): Promise<void> {
  const alreadySeeded = await redis.get(keys.seeded());
  if (alreadySeeded) return;

  const fetchedRules = await getRules();
  const ruleNames = fetchedRules.length > 0
    ? fetchedRules.map((r) => r.shortName)
    : FALLBACK_RULES;

  await clearAllData(ruleNames);

  const weights: number[] = [];
  const overrideRates: number[] = [];
  for (let i = 0; i < ruleNames.length; i++) {
    weights.push(0.3 + Math.random() * 1.0);
    // All rules get some overrides (5-12%), last rule gets high (30-38%)
    overrideRates.push(i === ruleNames.length - 1 ? 0.30 + Math.random() * 0.08 : 0.05 + Math.random() * 0.07);
  }

  const now = Date.now();
  const DAY = 86400000;

  for (let d = 45; d >= 0; d--) {
    const date = new Date(now - d * DAY);
    const monthKey = formatMonth(date);

    for (let ri = 0; ri < ruleNames.length; ri++) {
      const rule = ruleNames[ri];
      const weight = weights[ri];
      const removals = Math.max(1, Math.floor(Math.random() * 2 * weight) + 1);
      const approvals = Math.floor(Math.random() * weight);
      const overrides = Math.max(
        d % 7 === 0 ? 1 : 0,
        Math.floor(removals * overrideRates[ri] * (0.5 + Math.random()))
      );

      if (removals > 0) {
        await redis.zIncrBy(keys.ruleRemovals(monthKey), rule, removals);
      }
      if (approvals > 0) {
        await redis.zIncrBy(keys.ruleApprovals(monthKey), rule, approvals);
      }
      if (overrides > 0) {
        await redis.zIncrBy(keys.ruleOverrides(monthKey), rule, overrides);
      }

      for (const mod of SAMPLE_MODS) {
        const modShare = ri === 0 && mod === 'mod_alpha' ? 2.5 : 1;
        const modCount = Math.floor((removals / SAMPLE_MODS.length) * modShare * (0.5 + Math.random()));
        if (modCount > 0) {
          await redis.hIncrBy(keys.modRuleCounts(monthKey), `${mod}:${rule}`, modCount);
        }
      }
    }
  }

  const problemRule = ruleNames[ruleNames.length - 1];
  const problemAnnotations = [
    { mod: 'mod_alpha', text: 'This rule is too subjective — needs clearer criteria' },
    { mod: 'mod_beta', text: 'Mods disagree on how to enforce this one' },
    { mod: 'mod_gamma', text: 'Users keep appealing removals under this rule' },
  ];
  for (let i = 0; i < problemAnnotations.length; i++) {
    await redis.zAdd(keys.annotations(problemRule), {
      score: now - i * DAY * 5,
      member: JSON.stringify({ ...problemAnnotations[i], ts: now - i * DAY * 5 }),
    });
  }

  if (ruleNames.length > 1) {
    const firstRule = ruleNames[0];
    const firstAnnotations = [
      { mod: 'mod_beta', text: 'Where is the line for this rule?' },
      { mod: 'mod_gamma', text: 'Consider adding examples of what counts as a violation' },
    ];
    for (let i = 0; i < firstAnnotations.length; i++) {
      await redis.zAdd(keys.annotations(firstRule), {
        score: now - i * DAY * 7,
        member: JSON.stringify({ ...firstAnnotations[i], ts: now - i * DAY * 7 }),
      });
    }
  }

  for (let w = 12; w >= 0; w--) {
    const weekDate = new Date(now - w * 7 * DAY);
    const weekLabel = getWeekLabel(weekDate);

    for (let ri = 0; ri < ruleNames.length; ri++) {
      const rule = ruleNames[ri];
      const weight = weights[ri];
      const removals = Math.floor(5 * weight + Math.random() * 4);
      const approvals = Math.floor(1.5 * weight + Math.random() * 2);
      const overrides = Math.max(1, Math.floor(removals * overrideRates[ri] * (0.5 + Math.random())));

      await redis.zAdd(keys.trend(rule), {
        score: w,
        member: JSON.stringify({ week: weekLabel, removals, approvals, overrides }),
      });
    }
  }

  await runAggregation(ruleNames);

  await redis.set(keys.healthPrev(), '82');
  await redis.set(
    keys.milestone(),
    JSON.stringify({ message: 'Health score improved from 82 to 88!', ts: now, delta: 6 })
  );
  await redis.expire(keys.milestone(), 604800);

  const monthKey = formatMonth(new Date(now));
  await redis.hSet(keys.untagged(monthKey), { count: '5' });

  await redis.set(keys.seeded(), '1');
  console.log('RuleForge: Sample data seeded successfully');
}
