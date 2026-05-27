import { Hono } from 'hono';
import type { OnAppInstallRequest, TriggerResponse } from '@devvit/web/shared';
import { redis } from '@devvit/web/server';
import { createDashboardPost } from '../core/post';
import { fetchAndCacheRules, getRules } from '../core/rules';
import { seedSampleData } from '../storage/seed';
import { keys, formatMonth } from '../storage/keys';
import type { RuleInfo } from '../../shared/api';

const DEDUP_TTL = 86400;
const REMOVED_KEY_TTL = 604800;
const STOPWORDS = new Set(['no', 'the', 'or', 'and', 'your', 'be', 'of', 'a', 'in', 'to', 'is', 'for', 'on', 'with', 'not', 'do']);

function matchRuleFromAction(description: string, rules: RuleInfo[]): string | null {
  if (!description) return null;
  const descTokens = new Set(
    description.toLowerCase().split(/\W+/).filter((w) => w.length > 2 && !STOPWORDS.has(w))
  );
  if (descTokens.size === 0) return null;

  let bestRule: string | null = null;
  let bestScore = 0;

  for (const rule of rules) {
    const ruleText = `${rule.shortName} ${rule.violationReason ?? ''}`.toLowerCase();
    const ruleTokens = ruleText.split(/\W+/).filter((w) => w.length > 2 && !STOPWORDS.has(w));
    let score = 0;
    for (const token of ruleTokens) {
      if (descTokens.has(token)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestRule = rule.shortName;
    }
  }

  return bestScore >= 1 ? bestRule : null;
}

export const triggers = new Hono();

triggers.post('/on-app-install', async (c) => {
  try {
    await c.req.json<OnAppInstallRequest>();

    await fetchAndCacheRules();
    await seedSampleData();
    await createDashboardPost();

    return c.json<TriggerResponse>({
      status: 'success',
      message: 'RuleForge installed. Sample data seeded. Dashboard created.',
    }, 200);
  } catch (error) {
    console.error('RuleForge install error:', error);
    return c.json<TriggerResponse>({
      status: 'error',
      message: `Install failed: ${error}`,
    }, 400);
  }
});

triggers.post('/on-mod-action', async (c) => {
  try {
    const event = await c.req.json<{
      action?: string;
      actionId?: string;
      moderator?: { name?: string };
      targetPost?: { id?: string };
      targetComment?: { id?: string };
      actionedAt?: string;
      description?: string;
    }>();

    const action = event.action;
    if (!action) return c.json<TriggerResponse>({ status: 'success', message: 'no action' }, 200);

    const isRemoval = action === 'removelink' || action === 'removecomment' ||
                      action === 'spamlink' || action === 'spamcomment';
    const isApproval = action === 'approvelink' || action === 'approvecomment';

    if (!isRemoval && !isApproval) {
      return c.json<TriggerResponse>({ status: 'success', message: 'irrelevant action' }, 200);
    }

    const targetId = event.targetPost?.id ?? event.targetComment?.id ?? '';
    if (!targetId) {
      return c.json<TriggerResponse>({ status: 'success', message: 'no target' }, 200);
    }

    const dedupKey = `rf:dedup:${action}:${targetId}:${event.actionedAt ?? ''}`;
    const alreadyProcessed = await redis.get(dedupKey);
    if (alreadyProcessed) {
      return c.json<TriggerResponse>({ status: 'success', message: 'duplicate, skipped' }, 200);
    }
    await redis.set(dedupKey, '1');
    await redis.expire(dedupKey, DEDUP_TTL);

    const monthKey = formatMonth(new Date());
    const modName = event.moderator?.name ?? 'unknown';

    if (isRemoval) {
      const rules = await getRules();
      const matchedRule = matchRuleFromAction(event.description ?? '', rules);

      if (matchedRule) {
        await Promise.all([
          redis.zIncrBy(keys.ruleRemovals(monthKey), matchedRule, 1),
          redis.hIncrBy(keys.modRuleCounts(monthKey), `${modName}:${matchedRule}`, 1),
        ]);
        await redis.set(`rf:removed:${targetId}`, matchedRule);
        await redis.expire(`rf:removed:${targetId}`, REMOVED_KEY_TTL);
      } else {
        await redis.hIncrBy(keys.untagged(monthKey), 'count', 1);
      }
    }

    if (isApproval) {
      const removedRuleKey = `rf:removed:${targetId}`;
      const previousRule = await redis.get(removedRuleKey);
      if (previousRule) {
        await redis.zIncrBy(keys.ruleOverrides(monthKey), previousRule, 1);
        await redis.del(removedRuleKey);
      }
    }

    return c.json<TriggerResponse>({ status: 'success', message: `tracked ${action}` }, 200);
  } catch (error) {
    console.error('ModAction trigger error:', error);
    return c.json<TriggerResponse>({ status: 'error', message: String(error) }, 400);
  }
});
