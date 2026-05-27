import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { redis, reddit } from '@devvit/web/server';
import { keys, formatMonth } from '../storage/keys';
import { getRules } from '../core/rules';

const MAX_ANNOTATION_LENGTH = 500;
const REMOVED_KEY_TTL = 604800;

type TagFormValues = {
  targetId?: string;
  actionType?: string;
  ruleShortName?: string;
  annotation?: string;
};

export const forms = new Hono();

forms.post('/tag-rule-submit', async (c) => {
  try {
    const { targetId, actionType, ruleShortName, annotation } = await c.req.json<TagFormValues>();

    if (!actionType || !ruleShortName) {
      return c.json<UiResponse>({ showToast: 'Please select an action type and rule' }, 400);
    }

    if (!['removal', 'approval', 'warning'].includes(actionType)) {
      return c.json<UiResponse>({ showToast: 'Invalid action type' }, 400);
    }

    const rules = await getRules();
    const validRule = rules.find((r) => r.shortName === ruleShortName);
    if (!validRule) {
      return c.json<UiResponse>({ showToast: 'Invalid rule selected' }, 400);
    }

    const monthKey = formatMonth(new Date());
    const username = await reddit.getCurrentUsername();
    const mod = username ?? 'unknown';

    if (actionType === 'removal') {
      await redis.zIncrBy(keys.ruleRemovals(monthKey), ruleShortName, 1);
      if (targetId) {
        await redis.set(`rf:removed:${targetId}`, ruleShortName);
        await redis.expire(`rf:removed:${targetId}`, REMOVED_KEY_TTL);
      }
    } else if (actionType === 'approval') {
      await redis.zIncrBy(keys.ruleApprovals(monthKey), ruleShortName, 1);
    }

    await redis.hIncrBy(keys.modRuleCounts(monthKey), `${mod}:${ruleShortName}`, 1);

    if (annotation && annotation.trim()) {
      const trimmed = annotation.trim().slice(0, MAX_ANNOTATION_LENGTH);
      await redis.zAdd(keys.annotations(ruleShortName), {
        score: Date.now(),
        member: JSON.stringify({ mod, text: trimmed, ts: Date.now() }),
      });
      const count = await redis.zCard(keys.annotations(ruleShortName));
      if (count > 50) {
        await redis.zRemRangeByRank(keys.annotations(ruleShortName), 0, count - 51);
      }
    }

    const actionLabel = actionType === 'removal' ? 'Removal' : actionType === 'approval' ? 'Approval' : 'Warning';
    return c.json<UiResponse>({
      showToast: `Logged: ${actionLabel} — ${ruleShortName} by u/${mod}`,
    }, 200);
  } catch (error) {
    console.error('Form submit error:', error);
    return c.json<UiResponse>({ showToast: `Error logging action: ${error}` }, 400);
  }
});
