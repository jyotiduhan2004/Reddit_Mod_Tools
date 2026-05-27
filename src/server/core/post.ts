import { reddit, redis } from '@devvit/web/server';
import { keys } from '../storage/keys';

export async function createDashboardPost(): Promise<string> {
  const existingId = await redis.get(keys.dashboardPostId());
  if (existingId) return existingId;

  const post = await reddit.submitCustomPost({
    title: 'RuleForge — Rule Enforcement Analytics',
  });

  await redis.set(keys.dashboardPostId(), post.id);
  return post.id;
}

export async function getDashboardPostId(): Promise<string | null> {
  return await redis.get(keys.dashboardPostId());
}
