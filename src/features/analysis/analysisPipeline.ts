import { ParsedMessage } from '../conversation/conversationTypes';
import { AnalysisResult } from './analysisTypes';
import { extractFindings } from './extractFindings';
import { prioritizeFindings } from './prioritizeFindings';
import { validateFindingsIntegrity, FindingValidationReport } from './validateFindings';
import { createMessageIndex, MessageIndex } from './sourceMatcher';

export interface PipelineExecutionResult {
  analysis: AnalysisResult;
  messageIndex: MessageIndex;
  validationReport: FindingValidationReport;
  executionTimeMs: number;
}

export function runAnalysisPipeline(messages: ParsedMessage[]): PipelineExecutionResult {
  const startTime = performance.now();

  // 1. Build message index for fast O(1) lookups
  const messageIndex = createMessageIndex(messages);

  // 2. Extract findings using existing heuristic extractors
  const rawFindings = extractFindings(messages);

  // 3. Prioritize findings (urgency -> category -> timestamp)
  const prioritized = prioritizeFindings(rawFindings);

  // 4. Validate integrity before findings reach the presentation layer
  const { validFindings, report: validationReport } = validateFindingsIntegrity(
    prioritized,
    messageIndex
  );

  // 5. Compute participant metadata
  const participants = Array.from(
    new Set(messages.filter(m => !m.isSystem && m.sender !== null).map(m => m.sender as string))
  );

  // 6. Detect themes and generate overview
  const totalMessages = messages.filter(m => !m.isSystem).length;
  const hasDecisions = validFindings.some(f => f.category === 'decision');
  const hasDeadlines = validFindings.some(f => f.category === 'deadline');
  const hasUnresolved = validFindings.some(f => f.category === 'unresolved');

  const themes = detectThemes(messages);

  const overviewParts: string[] = [];
  overviewParts.push(
    `This conversation involves ${participants.length} participant${
      participants.length !== 1 ? 's' : ''
    } (${participants.slice(0, 3).join(', ')}${
      participants.length > 3 ? ` and ${participants.length - 3} more` : ''
    }) across ${totalMessages} messages.`
  );
  if (themes.length > 0) {
    overviewParts.push(`Key themes include ${themes.slice(0, 3).join(', ')}.`);
  }
  if (hasDecisions) overviewParts.push('Several decisions were reached.');
  if (hasDeadlines) overviewParts.push('There are time-sensitive items requiring attention.');
  if (hasUnresolved) overviewParts.push('Some questions and topics remain unresolved.');

  const analysis: AnalysisResult = {
    findings: validFindings,
    overview: overviewParts.join(' '),
    themes,
    participantCount: participants.length,
    analyzedAt: new Date(),
  };

  const executionTimeMs = Math.round(performance.now() - startTime);

  return {
    analysis,
    messageIndex,
    validationReport,
    executionTimeMs,
  };
}

function detectThemes(messages: ParsedMessage[]): string[] {
  const allText = messages.map(m => m.text.toLowerCase()).join(' ');
  const themePatterns: Array<[string, RegExp]> = [
    ['project planning', /\b(project|sprint|milestone|deliverable|roadmap)\b/],
    ['scheduling & meetings', /\b(meeting|call|schedule|appointment|calendar|zoom|teams|sync)\b/],
    ['deadlines & timelines', /\b(deadline|due|by (monday|friday|tomorrow|next week)|submit|launch)\b/],
    ['budget & finances', /\b(budget|cost|price|payment|invoice|expense|\$|rupee|₹)\b/],
    ['team coordination', /\b(team|assign|delegate|responsibility|owner|handoff)\b/],
    ['technical work', /\b(code|bug|fix|deploy|api|database|server|pull request|PR|repo)\b/],
    ['decisions', /\b(decide|agreed|confirmed|going with|we will|let's go with)\b/],
    ['client & stakeholders', /\b(client|customer|stakeholder|user|feedback)\b/],
  ];
  return themePatterns
    .filter(([, re]) => re.test(allText))
    .map(([label]) => label)
    .slice(0, 5);
}
