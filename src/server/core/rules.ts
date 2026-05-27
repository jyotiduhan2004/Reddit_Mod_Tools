import { redis, reddit, context } from '@devvit/web/server';
import { keys } from '../storage/keys';
import type { RuleInfo } from '../../shared/api';

const CACHE_TTL = 3600;

export async function getRules(): Promise<RuleInfo[]> {
  const cached = await redis.get(keys.cachedRules());
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // fall through to fetch
    }
  }

  return await fetchAndCacheRules();
}

export async function fetchAndCacheRules(): Promise<RuleInfo[]> {
  try {
    const subredditName = context.subredditName;
    if (!subredditName) return getDefaultRules();

    const rulesResponse = await reddit.getRules(subredditName);
    if (!rulesResponse || rulesResponse.length === 0) return getDefaultRules();

    const rules: RuleInfo[] = rulesResponse.map((r) => ({
      shortName: r.shortName,
      description: r.description ?? '',
      kind: r.kind ?? 'all',
      priority: r.priority ?? 0,
      violationReason: r.violationReason ?? r.shortName,
    }));

    await redis.set(keys.cachedRules(), JSON.stringify(rules));
    await redis.expire(keys.cachedRules(), CACHE_TTL);
    return rules;
  } catch (error) {
    console.error('Error fetching rules:', error);
    return getDefaultRules();
  }
}

function getDefaultRules(): RuleInfo[] {
  return [
    { shortName: 'No spam or self-promotion', description: '', kind: 'all', priority: 0, violationReason: 'No spam or self-promotion' },
    { shortName: 'Be civil and respectful', description: '', kind: 'all', priority: 1, violationReason: 'Be civil and respectful' },
    { shortName: 'Use descriptive titles', description: '', kind: 'all', priority: 2, violationReason: 'Use descriptive titles' },
    { shortName: 'No reposts within 30 days', description: '', kind: 'all', priority: 3, violationReason: 'No reposts within 30 days' },
    { shortName: 'Flair your posts', description: '', kind: 'all', priority: 4, violationReason: 'Flair your posts' },
    { shortName: 'No low-effort content', description: '', kind: 'all', priority: 5, violationReason: 'No low-effort content' },
  ];
}
