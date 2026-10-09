import { Finding, UrgencyLevel } from './analysisTypes';

const URGENCY_ORDER: Record<UrgencyLevel, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const CATEGORY_ORDER: Record<string, number> = {
  deadline: 0,
  decision: 1,
  unresolved: 2,
  mention: 3,
  highlight: 4,
  update: 5,
};

export function prioritizeFindings(findings: Finding[]): Finding[] {
  return [...findings].sort((a, b) => {
    const urgencyDiff = URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency];
    if (urgencyDiff !== 0) return urgencyDiff;
    const categoryDiff = (CATEGORY_ORDER[a.category] ?? 9) - (CATEGORY_ORDER[b.category] ?? 9);
    if (categoryDiff !== 0) return categoryDiff;
    // Then by recency (most recent first)
    if (a.timestamp && b.timestamp) return b.timestamp.getTime() - a.timestamp.getTime();
    return 0;
  });
}
