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

export async function forceSeed(): Promise<void> {
  await redis.del(keys.seeded());
  await seedSampleData();
}

export async function seedSampleData(): Promise<void> {
  const alreadySeeded = await redis.get(keys.seeded());
  if (alreadySeeded) return;

  const fetchedRules = await getRules();
  const ruleNames = fetchedRules.length > 0
    ? fetchedRules.map((r) => r.shortName)
    : FALLBACK_RULES;

  const weights: number[] = [];
  const overrideRates: number[] = [];
  for (let i = 0; i < ruleNames.length; i++) {
    weights.push(0.5 + Math.random() * 2);
    overrideRates.push(i === ruleNames.length - 1 ? 0.35 : 0.03 + Math.random() * 0.12);
  }
  // Make the last rule the "problem rule" with high override rate

  const now = Date.now();
  const DAY = 86400000;

  for (let d = 90; d >= 0; d--) {
    const date = new Date(now - d * DAY);
    const monthKey = formatMonth(date);

    for (let ri = 0; ri < ruleNames.length; ri++) {
      const rule = ruleNames[ri];
      const weight = weights[ri];
      const removals = Math.floor(Math.random() * 8 * weight) + 1;
      const approvals = Math.floor(Math.random() * 3 * weight);
      const overrides = Math.floor(removals * overrideRates[ri] * (0.5 + Math.random()));

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

  // Annotations on the "problem rule" (last rule)
  const problemRule = ruleNames[ruleNames.length - 1];
  const problemAnnotations = [
    { mod: 'mod_alpha', text: 'This rule is too subjective — needs clearer criteria' },
    { mod: 'mod_beta', text: 'Mods disagree on how to enforce this one' },
    { mod: 'mod_gamma', text: 'Users keep appealing removals under this rule' },
    { mod: 'mod_delta', text: 'Should we split this into more specific rules?' },
  ];
  for (let i = 0; i < problemAnnotations.length; i++) {
    await redis.zAdd(keys.annotations(problemRule), {
      score: now - i * DAY * 5,
      member: JSON.stringify({ ...problemAnnotations[i], ts: now - i * DAY * 5 }),
    });
  }

  // Annotations on the first rule
  if (ruleNames.length > 1) {
    const firstRule = ruleNames[0];
    const firstAnnotations = [
      { mod: 'mod_beta', text: 'Where is the line for this rule?' },
      { mod: 'mod_gamma', text: 'Gets flagged too often — consider adding examples' },
      { mod: 'mod_alpha', text: 'Consider adding examples of what IS and IS NOT a violation' },
    ];
    for (let i = 0; i < firstAnnotations.length; i++) {
      await redis.zAdd(keys.annotations(firstRule), {
        score: now - i * DAY * 7,
        member: JSON.stringify({ ...firstAnnotations[i], ts: now - i * DAY * 7 }),
      });
    }
  }

  // Trend data
  for (let w = 12; w >= 0; w--) {
    const weekDate = new Date(now - w * 7 * DAY);
    const weekLabel = getWeekLabel(weekDate);

    for (let ri = 0; ri < ruleNames.length; ri++) {
      const rule = ruleNames[ri];
      const weight = weights[ri];
      const removals = Math.floor(20 * weight + Math.random() * 15);
      const approvals = Math.floor(5 * weight + Math.random() * 5);
      const overrides = Math.floor(removals * overrideRates[ri] * (0.5 + Math.random()));

      await redis.zAdd(keys.trend(rule), {
        score: w,
        member: JSON.stringify({ week: weekLabel, removals, approvals, overrides }),
      });
    }
  }

  await runAggregation(ruleNames);

  await redis.set(keys.healthPrev(), '78');
  await redis.set(
    keys.milestone(),
    JSON.stringify({ message: 'Health score improved from 78 to 84!', ts: now, delta: 6 })
  );
  await redis.expire(keys.milestone(), 604800);

  const monthKey = formatMonth(new Date(now));
  await redis.hSet(keys.untagged(monthKey), { count: '14' });

  await redis.set(keys.seeded(), '1');
  console.log('RuleForge: Sample data seeded successfully');
}
