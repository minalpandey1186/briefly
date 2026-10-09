import { Finding, FindingCategory, UrgencyLevel, ConfidenceLevel } from './analysisTypes';
import { ParsedMessage } from '../conversation/conversationTypes';

const VALID_CATEGORIES = new Set<FindingCategory>([
  'update',
  'decision',
  'deadline',
  'mention',
  'unresolved',
  'highlight',
]);

const VALID_URGENCIES = new Set<UrgencyLevel>(['critical', 'high', 'medium', 'low']);
const VALID_CONFIDENCES = new Set<ConfidenceLevel>(['confirmed', 'likely', 'tentative']);

export interface FindingValidationReport {
  totalInput: number;
  validCount: number;
  rejectedCount: number;
  rejections: Array<{ findingId: string; reason: string }>;
}

export function validateFindingsIntegrity(
  findings: Finding[],
  messagesOrIndex: ParsedMessage[] | Map<string, ParsedMessage>
): { validFindings: Finding[]; report: FindingValidationReport } {
  const messageIndex =
    messagesOrIndex instanceof Map
      ? messagesOrIndex
      : new Map(messagesOrIndex.map(m => [m.id, m]));

  const validFindings: Finding[] = [];
  const rejections: Array<{ findingId: string; reason: string }> = [];

  for (const finding of findings) {
    if (!finding.id || typeof finding.id !== 'string') {
      rejections.push({ findingId: 'unknown', reason: 'Missing finding id' });
      continue;
    }

    if (!finding.title || !finding.title.trim()) {
      rejections.push({ findingId: finding.id, reason: 'Empty or missing title' });
      continue;
    }

    if (!VALID_CATEGORIES.has(finding.category)) {
      rejections.push({ findingId: finding.id, reason: `Invalid category: ${finding.category}` });
      continue;
    }

    if (!VALID_URGENCIES.has(finding.urgency)) {
      rejections.push({ findingId: finding.id, reason: `Invalid urgency: ${finding.urgency}` });
      continue;
    }

    if (!VALID_CONFIDENCES.has(finding.confidence)) {
      rejections.push({ findingId: finding.id, reason: `Invalid confidence: ${finding.confidence}` });
      continue;
    }

    if (!Array.isArray(finding.sourceMessageIds) || finding.sourceMessageIds.length === 0) {
      rejections.push({ findingId: finding.id, reason: 'No source message IDs specified' });
      continue;
    }

    // Verify all source IDs exist in conversation
    const validSourceIds = finding.sourceMessageIds.filter(id => messageIndex.has(id));
    if (validSourceIds.length === 0) {
      rejections.push({
        findingId: finding.id,
        reason: 'None of the referenced source message IDs exist in conversation',
      });
      continue;
    }

    // Verify non-empty evidence snippets
    const hasValidEvidence =
      Array.isArray(finding.evidenceSnippets) &&
      finding.evidenceSnippets.some(s => s && s.trim().length > 0);

    if (!hasValidEvidence) {
      rejections.push({ findingId: finding.id, reason: 'Empty or missing evidence snippets' });
      continue;
    }

    // Pass sanitized finding with only validated source IDs
    validFindings.push({
      ...finding,
      sourceMessageIds: validSourceIds,
    });
  }

  return {
    validFindings,
    report: {
      totalInput: findings.length,
      validCount: validFindings.length,
      rejectedCount: rejections.length,
      rejections,
    },
  };
}
