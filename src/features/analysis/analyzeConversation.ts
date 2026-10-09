import { ParsedMessage } from '../conversation/conversationTypes';
import { AnalysisResult } from './analysisTypes';
import { extractFindings } from './extractFindings';
import { prioritizeFindings } from './prioritizeFindings';

export function analyzeConversation(messages: ParsedMessage[]): AnalysisResult {
  const rawFindings = extractFindings(messages);
  const findings = prioritizeFindings(rawFindings);

  const participants = Array.from(
    new Set(messages.filter(m => !m.isSystem && m.sender).map(m => m.sender as string))
  );

  // Build overview from message content themes
  const totalMessages = messages.filter(m => !m.isSystem).length;
  const hasDecisions = findings.some(f => f.category === 'decision');
  const hasDeadlines = findings.some(f => f.category === 'deadline');
  const hasUnresolved = findings.some(f => f.category === 'unresolved');

  const themes = detectThemes(messages);

  const overviewParts: string[] = [];
  overviewParts.push(
    `This conversation involves ${participants.length} participant${participants.length !== 1 ? 's' : ''} (${participants.slice(0, 3).join(', ')}${participants.length > 3 ? ` and ${participants.length - 3} more` : ''}) across ${totalMessages} messages.`
  );
  if (themes.length > 0) {
    overviewParts.push(`Key themes include ${themes.slice(0, 3).join(', ')}.`);
  }
  if (hasDecisions) overviewParts.push('Several decisions were reached.');
  if (hasDeadlines) overviewParts.push('There are time-sensitive items requiring attention.');
  if (hasUnresolved) overviewParts.push('Some questions and topics remain unresolved.');

  return {
    findings,
    overview: overviewParts.join(' '),
    themes,
    participantCount: participants.length,
    analyzedAt: new Date(),
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
