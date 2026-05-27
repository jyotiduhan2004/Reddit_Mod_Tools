import { redis } from '@devvit/web/server';
import { keys, formatMonth, getWeekLabel } from './keys';
import { runAggregation } from '../core/aggregation';
import type { RuleInfo } from '../../shared/api';

const SAMPLE_RULES = [
  'No spam or self-promotion',
  'Be civil and respectful',
  'Use descriptive titles',
  'No reposts within 30 days',
  'Flair your posts',
  'No low-effort content',
];

const SAMPLE_RULE_INFOS: RuleInfo[] = SAMPLE_RULES.map((name, i) => ({
  shortName: name,
  description: `${name} — enforced by mod team`,
  kind: 'all',
  priority: i,
  violationReason: name,
}));

const SAMPLE_MODS = ['mod_alpha', 'mod_beta', 'mod_gamma', 'mod_delta'];

const RULE_WEIGHTS: Record<string, number> = {
  'No spam or self-promotion': 1.5,
  'Be civil and respectful': 2.0,
  'Use descriptive titles': 0.8,
  'No reposts within 30 days': 1.2,
  'Flair your posts': 0.5,
  'No low-effort content': 1.8,
};

const RULE_OVERRIDE_RATES: Record<string, number> = {
  'No spam or self-promotion': 0.05,
  'Be civil and respectful': 0.12,
  'Use descriptive titles': 0.08,
  'No reposts within 30 days': 0.10,
  'Flair your posts': 0.03,
  'No low-effort content': 0.38,
};

export async function forceSeed(): Promise<void> {
  await redis.del(keys.seeded());
  await seedSampleData();
}

export async function seedSampleData(): Promise<void> {
  const alreadySeeded = await redis.get(keys.seeded());
  if (alreadySeeded) return;

  await redis.set(keys.cachedRules(), JSON.stringify(SAMPLE_RULE_INFOS));

  const now = Date.now();
  const DAY = 86400000;

  for (let d = 90; d >= 0; d--) {
    const date = new Date(now - d * DAY);
    const monthKey = formatMonth(date);

    for (const rule of SAMPLE_RULES) {
      const weight = RULE_WEIGHTS[rule] ?? 1;
      const removals = Math.floor(Math.random() * 8 * weight) + 1;
      const approvals = Math.floor(Math.random() * 3 * weight);
      const overrideRate = RULE_OVERRIDE_RATES[rule] ?? 0.1;
      const overrides = Math.floor(removals * overrideRate * (0.5 + Math.random()));

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
        const modShare = rule === 'Be civil and respectful' && mod === 'mod_alpha' ? 2.5 : 1;
        const modCount = Math.floor((removals / SAMPLE_MODS.length) * modShare * (0.5 + Math.random()));
        if (modCount > 0) {
          await redis.hIncrBy(keys.modRuleCounts(monthKey), `${mod}:${rule}`, modCount);
        }
      }
    }
  }

  const annotationTexts = [
    { mod: 'mod_alpha', text: 'This rule is too subjective — what counts as "low effort"?' },
    { mod: 'mod_beta', text: 'Mods disagree on whether memes qualify as low-effort' },
    { mod: 'mod_gamma', text: 'Need clearer criteria — users keep appealing removals under this rule' },
    { mod: 'mod_delta', text: 'Should we split this into separate meme and text-post rules?' },
  ];
  for (let i = 0; i < annotationTexts.length; i++) {
    await redis.zAdd(keys.annotations('No low-effort content'), {
      score: now - i * DAY * 5,
      member: JSON.stringify({ ...annotationTexts[i], ts: now - i * DAY * 5 }),
    });
  }

  const civilAnnotations = [
    { mod: 'mod_beta', text: 'Where is the line between heated debate and incivility?' },
    { mod: 'mod_gamma', text: 'Sarcasm gets flagged too often under this rule' },
    { mod: 'mod_alpha', text: 'Consider adding examples of what IS and IS NOT civil' },
  ];
  for (let i = 0; i < civilAnnotations.length; i++) {
    await redis.zAdd(keys.annotations('Be civil and respectful'), {
      score: now - i * DAY * 7,
      member: JSON.stringify({ ...civilAnnotations[i], ts: now - i * DAY * 7 }),
    });
  }

  for (let w = 12; w >= 0; w--) {
    const weekDate = new Date(now - w * 7 * DAY);
    const weekLabel = getWeekLabel(weekDate);

    for (const rule of SAMPLE_RULES) {
      const weight = RULE_WEIGHTS[rule] ?? 1;
      const overrideRate = RULE_OVERRIDE_RATES[rule] ?? 0.1;
      const removals = Math.floor(20 * weight + Math.random() * 15);
      const approvals = Math.floor(5 * weight + Math.random() * 5);
      const overrides = Math.floor(removals * overrideRate * (0.5 + Math.random()));

      await redis.zAdd(keys.trend(rule), {
        score: w,
        member: JSON.stringify({ week: weekLabel, removals, approvals, overrides }),
      });
    }
  }

  await runAggregation(SAMPLE_RULES);

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
