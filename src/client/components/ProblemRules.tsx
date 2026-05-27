import { useState } from 'react';
import type { ProblemRule } from '../../shared/api';
import { Tooltip } from './Tooltip';

export function ProblemRules({ data, onSelectRule }: { data: ProblemRule[]; onSelectRule?: (rule: string) => void }) {
  const flagged = data.filter((d) => d.flagged);
  const healthy = data.filter((d) => !d.flagged);

  return (
    <div>
      <h3 className="text-sm font-semibold text-[#818384] mb-3">
        Rule Health Analysis
        <Tooltip text="Rules are flagged when their override rate exceeds 25% with at least 5 removals" />
      </h3>

      {flagged.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-semibold text-[#CC4545] mb-2 uppercase tracking-wide">
            Needs Attention
          </div>
          {flagged.map((rule) => (
            <RuleCard key={rule.rule} rule={rule} onSelectRule={onSelectRule} />
          ))}
        </div>
      )}

      {flagged.length === 0 && (
        <div className="bg-[#46D160]/10 rounded-lg p-4 mb-4 text-center">
          <div className="text-[#46D160] font-medium">All rules are healthy</div>
          <div className="text-xs text-[#46D160]/70 mt-1">
            No rules exceed the override threshold
          </div>
        </div>
      )}

      {healthy.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-[#818384] mb-2 uppercase tracking-wide">
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
          ? 'border-[#CC4545]/30 bg-[#CC4545]/10'
          : 'border-[#343536] bg-[#272729]'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {rule.flagged && (
            <span className="bg-[#CC4545] text-white text-xs font-bold rounded-full px-2 py-0.5">!</span>
          )}
          <span
            className="font-medium text-sm text-[#D7DADC] cursor-pointer hover:underline hover:text-[#FF4500]"
            onClick={() => onSelectRule?.(rule.rule)}
          >
            {rule.rule}
          </span>
        </div>
        <span className={`text-xs font-mono ${rule.flagged ? 'text-[#CC4545]' : 'text-[#818384]'}`}>
          {overridePct}% override
          <Tooltip text="Percentage of removals later approved by another mod" />
        </span>
      </div>

      {rule.flagged && rule.impactPct > 0 && (
        <div className="mt-1 text-xs font-semibold text-[#CC4545]">
          Fix first — {rule.impactPct}% of all overrides
        </div>
      )}

      <div className="flex gap-4 mt-2 text-xs text-[#818384]">
        <span>{rule.removalCount} removals</span>
        <span>{rule.annotationCount} annotations</span>
      </div>

      {hasSuggestion && (
        <div className="mt-2 bg-[#FFB000]/10 rounded p-2 border border-[#FFB000]/30">
          <div className="text-xs font-semibold text-[#FFB000] mb-1">
            Mods suggest this rule needs work
          </div>
          {rule.annotations.slice(0, 3).map((a, i) => (
            <div key={i} className="text-xs text-[#FFB000]/80 mt-1">
              <span className="font-medium">{a.mod}:</span> "{a.text}"
            </div>
          ))}
        </div>
      )}

      {!hasSuggestion && rule.annotations.length > 0 && (
        <div className="mt-2">
          {rule.annotations.slice(0, 2).map((a, i) => (
            <div key={i} className="text-xs text-[#818384] mt-1">
              <span className="font-medium">{a.mod}:</span> "{a.text}"
            </div>
          ))}
        </div>
      )}

      {rule.flagged && (
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => onSelectRule?.(rule.rule)}
            className="text-xs px-3 py-1 rounded bg-[#FF4500] text-white hover:bg-[#e03d00] transition-colors"
          >
            View Autopsy
          </button>
          <button
            onClick={handleDiscussion}
            disabled={discussionSent || discussionLoading}
            className={`text-xs px-3 py-1 rounded transition-colors ${
              discussionSent
                ? 'bg-[#46D160]/15 text-[#46D160]'
                : discussionError
                  ? 'bg-[#CC4545]/15 text-[#CC4545]'
                  : 'bg-[#24A0ED] text-white hover:bg-[#1a8cd8]'
            }`}
          >
            {discussionLoading ? 'Posting...' : discussionSent ? 'Discussion Posted' : discussionError ? 'Failed — Retry' : 'Start Discussion'}
          </button>
        </div>
      )}
    </div>
  );
}
