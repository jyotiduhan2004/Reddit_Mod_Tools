import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { context } from '@devvit/web/server';
import { getRules } from '../core/rules';
import { createDashboardPost, getDashboardPostId } from '../core/post';
import { forceSeed } from '../storage/seed';
import type { RuleInfo } from '../../shared/api';

export const menu = new Hono();

function buildTagFormResponse(targetId: string, rules: RuleInfo[]): UiResponse {
  const ruleOptions = rules.map((r, i) => ({
    label: `Rule ${i + 1}: ${r.shortName}`,
    value: r.shortName,
  }));

  return {
    showForm: {
      name: 'tagRuleForm',
      form: {
        title: 'RuleForge: Tag Rule Violation',
        acceptLabel: 'Log Action',
        cancelLabel: 'Cancel',
        fields: [
          {
            name: 'targetId',
            label: 'Target',
            type: 'string',
            defaultValue: targetId,
            disabled: true,
          },
          {
            name: 'actionType',
            label: 'Action Type',
            type: 'select',
            required: true,
            options: [
              { label: 'Removal', value: 'removal' },
              { label: 'Approval', value: 'approval' },
              { label: 'Warning', value: 'warning' },
            ],
          },
          {
            name: 'ruleShortName',
            label: 'Rule Violated',
            type: 'select',
            required: true,
            options: ruleOptions,
          },
          {
            name: 'annotation',
            label: 'Notes (optional)',
            type: 'paragraph',
            required: false,
            helpText: 'Add notes if this rule is unclear or the case was borderline (max 500 chars)',
          },
        ],
      },
    },
  };
}

menu.post('/tag-post', async (c) => {
  try {
    const rules = await getRules();
    return c.json<UiResponse>(buildTagFormResponse(context.postId ?? '', rules), 200);
  } catch (error) {
    console.error('Tag post error:', error);
    return c.json<UiResponse>({ showToast: `Error: ${error}` }, 400);
  }
});

menu.post('/tag-comment', async (c) => {
  try {
    const rules = await getRules();
    return c.json<UiResponse>(buildTagFormResponse(context.commentId ?? '', rules), 200);
  } catch (error) {
    console.error('Tag comment error:', error);
    return c.json<UiResponse>({ showToast: `Error: ${error}` }, 400);
  }
});

menu.post('/open-dashboard', async (c) => {
  try {
    let postId = await getDashboardPostId();
    if (!postId) {
      postId = await createDashboardPost();
    }
    return c.json<UiResponse>({
      navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${postId}`,
    }, 200);
  } catch (error) {
    console.error('Open dashboard error:', error);
    return c.json<UiResponse>({ showToast: `Error: ${error}` }, 400);
  }
});

menu.post('/reseed', async (c) => {
  try {
    await forceSeed();
    return c.json<UiResponse>({ showToast: 'RuleForge: Data reseeded successfully!' }, 200);
  } catch (error) {
    console.error('Reseed error:', error);
    return c.json<UiResponse>({ showToast: `Reseed failed: ${error}` }, 400);
  }
});
