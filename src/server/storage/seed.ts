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

  // Override rates: all rules 5-12%, last rule 30-38% (the "problem rule")
  const overrideRates: number[] = ruleNames.map((_, i) =>
    i === ruleNames.length - 1 ? 0.30 + Math.random() * 0.08 : 0.05 + Math.random() * 0.07
  );

  const now = Date.now();
  const DAY = 86400000;

  // 14 days × 10 rules × 50% chance of 1 removal = ~70 total removals
  for (let d = 14; d >= 0; d--) {
    const date = new Date(now - d * DAY);
    const monthKey = formatMonth(date);

    for (let ri = 0; ri < ruleNames.length; ri++) {
      const rule = ruleNames[ri];
      const removals = Math.random() < 0.5 ? 1 : 0;
      const approvals = Math.random() < 0.2 ? 1 : 0;
      const overrides = removals > 0 && Math.random() < overrideRates[ri] ? 1 : 0;

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
        if (removals > 0 && Math.random() < 0.6) {
          await redis.hIncrBy(keys.modRuleCounts(monthKey), `${mod}:${rule}`, 1);
        }
      }
    }
  }

  // Annotations on the "problem rule" (last rule)
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

  // Trend data: 13 weeks, small numbers per rule
  for (let w = 12; w >= 0; w--) {
    const weekDate = new Date(now - w * 7 * DAY);
    const weekLabel = getWeekLabel(weekDate);

    for (let ri = 0; ri < ruleNames.length; ri++) {
      const rule = ruleNames[ri];
      const removals = Math.floor(2 + Math.random() * 4);
      const approvals = Math.floor(Math.random() * 2);
      const overrides = Math.random() < overrideRates[ri] * 3 ? Math.floor(1 + Math.random() * 2) : 0;

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
