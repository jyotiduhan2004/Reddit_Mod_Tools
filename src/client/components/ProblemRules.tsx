import { useState } from 'react';
import type { ProblemRule } from '../../shared/api';
import { Tooltip } from './Tooltip';

export function ProblemRules({ data, onSelectRule }: { data: ProblemRule[]; onSelectRule?: (rule: string) => void }) {
  const flagged = data.filter((d) => d.flagged);
  const healthy = data.filter((d) => !d.flagged);

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3">
        Rule Health Analysis
        <Tooltip text="Rules are flagged when their override rate exceeds 25% with at least 5 removals" />
      </h3>

      {flagged.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-semibold text-red-600 dark:text-red-400 mb-2 uppercase tracking-wide">
            Needs Attention
          </div>
          {flagged.map((rule) => (
            <RuleCard key={rule.rule} rule={rule} onSelectRule={onSelectRule} />
          ))}
        </div>
      )}

      {flagged.length === 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 mb-4 text-center">
          <div className="text-green-700 dark:text-green-300 font-medium">All rules are healthy</div>
          <div className="text-xs text-green-600 dark:text-green-400 mt-1">
            No rules exceed the override threshold
          </div>
        </div>
      )}

      {healthy.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
            Healthy Rules
          </div>
          {healthy.map((rule) => (
            <RuleCard key={rule.rule} rule={rule} onSelectRule={onSelectRule} />
          ))}
        </div>
      )}
    </div>
  );
}

function RuleCard({ rule, onSelectRule }: { rule: ProblemRule; onSelectRule?: (rule: string) => void }) {
  const [discussionSent, setDiscussionSent] = useState(false);
  const overridePct = Math.round(rule.overrideRate * 100);
  const hasSuggestion = rule.annotationCount >= 3;

  const [discussionLoading, setDiscussionLoading] = useState(false);
  const [discussionError, setDiscussionError] = useState(false);

  const handleDiscussion = async () => {
    try {
      setDiscussionLoading(true);
      setDiscussionError(false);
      const res = await fetch('/api/start-discussion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rule: rule.rule }),
      });
      if (!res.ok) throw new Error('Failed');
      setDiscussionSent(true);
    } catch (err) {
      console.error('Discussion post failed:', err);
      setDiscussionError(true);
    } finally {
      setDiscussionLoading(false);
    }
  };

  return (
    <div
      className={`rounded-lg p-3 mb-2 border ${
        rule.flagged
          ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20'
          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {rule.flagged && (
            <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5">!</span>
          )}
          <span
            className="font-medium text-sm text-gray-800 dark:text-gray-200 cursor-pointer hover:underline hover:text-orange-600"
            onClick={() => onSelectRule?.(rule.rule)}
          >
            {rule.rule}
          </span>
        </div>
        <span className={`text-xs font-mono ${rule.flagged ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
          {overridePct}% override
          <Tooltip text="Percentage of removals later approved by another mod" />
        </span>
      </div>

      {rule.flagged && rule.impactPct > 0 && (
        <div className="mt-1 text-xs font-semibold text-red-600 dark:text-red-400">
          Fix first — {rule.impactPct}% of all overrides
        </div>
      )}

      <div className="flex gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
        <span>{rule.removalCount} removals</span>
        <span>{rule.annotationCount} annotations</span>
      </div>

      {hasSuggestion && (
        <div className="mt-2 bg-amber-50 dark:bg-amber-900/20 rounded p-2 border border-amber-200 dark:border-amber-700">
          <div className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-1">
            Mods suggest this rule needs work
          </div>
          {rule.annotations.slice(0, 3).map((a, i) => (
            <div key={i} className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              <span className="font-medium">{a.mod}:</span> "{a.text}"
            </div>
          ))}
        </div>
      )}

      {!hasSuggestion && rule.annotations.length > 0 && (
        <div className="mt-2">
          {rule.annotations.slice(0, 2).map((a, i) => (
            <div key={i} className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span className="font-medium">{a.mod}:</span> "{a.text}"
            </div>
          ))}
        </div>
      )}

      {rule.flagged && (
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => onSelectRule?.(rule.rule)}
            className="text-xs px-3 py-1 rounded bg-orange-600 text-white hover:bg-orange-700 transition-colors"
          >
            View Autopsy
          </button>
          <button
            onClick={handleDiscussion}
            disabled={discussionSent || discussionLoading}
            className={`text-xs px-3 py-1 rounded transition-colors ${
              discussionSent
                ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                : discussionError
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {discussionLoading ? 'Posting...' : discussionSent ? 'Discussion Posted' : discussionError ? 'Failed — Retry' : 'Start Discussion'}
          </button>
        </div>
      )}
    </div>
  );
}
