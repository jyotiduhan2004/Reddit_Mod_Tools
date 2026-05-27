import type { Recommendation } from '../../shared/api';

const VAGUE_KEYWORDS = ['vague', 'unclear', 'subjective', 'confusing', 'ambiguous', 'broad', 'inconsistent'];

export function generateRecommendations(
  overrideRate: number,
  removalCount: number,
  annotationCount: number,
  consistencyStdDev: number,
  annotations: { text: string }[]
): Recommendation[] {
  const recs: Recommendation[] = [];

  if (overrideRate > 0.4) {
    recs.push({
      severity: 'critical',
      title: 'Very high override rate',
      body: 'Over 40% of removals under this rule get overridden. Consider rewriting with specific examples of what violates it.',
    });
  } else if (overrideRate > 0.25) {
    recs.push({
      severity: 'warning',
      title: 'High override rate',
      body: 'Consider rewording this rule with specific examples to reduce ambiguity and false positives.',
    });
  }

  if (consistencyStdDev > 10) {
    recs.push({
      severity: 'warning',
      title: 'Inconsistent enforcement',
      body: 'Mods enforce this rule at very different rates. Consider adding enforcement guidelines or holding a calibration discussion.',
    });
  }

  const vagueCount = annotations.filter((a) =>
    VAGUE_KEYWORDS.some((k) => a.text.toLowerCase().includes(k))
  ).length;
  if (vagueCount >= 2) {
    recs.push({
      severity: 'warning',
      title: 'Multiple mods flagged as vague',
      body: `${vagueCount} annotations mention vagueness. Compile feedback and start a team discussion to clarify this rule.`,
    });
  }

  if (annotationCount >= 3 && overrideRate > 0.15) {
    recs.push({
      severity: 'info',
      title: 'Active discussion warranted',
      body: 'Multiple annotations plus a notable override rate suggest this rule would benefit from a mod discussion thread.',
    });
  }

  if (removalCount < 3 && overrideRate === 0) {
    recs.push({
      severity: 'info',
      title: 'Low activity rule',
      body: 'This rule sees very few enforcement actions. Consider whether it is still needed or if it can be merged with another rule.',
    });
  }

  return recs;
}
