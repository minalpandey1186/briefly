import { AnalysisResult } from '../features/analysis/analysisTypes';
import { ConversationMeta } from '../features/conversation/conversationTypes';

export function exportBriefingAsText(result: AnalysisResult, meta: ConversationMeta): string {
  const lines: string[] = [];
  const divider = '─'.repeat(60);

  lines.push('BRIEFLY — Conversation Briefing');
  lines.push(`Conversation: ${meta.title}`);
  lines.push(`Generated: ${result.analyzedAt.toLocaleString()}`);
  lines.push(divider);
  lines.push('');
  lines.push('OVERVIEW');
  lines.push(result.overview);
  lines.push('');

  const cats = [
    { key: 'decision', label: 'DECISIONS & AGREEMENTS' },
    { key: 'deadline', label: 'DEADLINES & TIME-SENSITIVE' },
    { key: 'mention', label: 'PERSONAL MENTIONS & COMMITMENTS' },
    { key: 'unresolved', label: 'STILL UNRESOLVED' },
    { key: 'update', label: 'IMPORTANT UPDATES' },
    { key: 'highlight', label: 'CONVERSATION HIGHLIGHTS' },
  ] as const;

  for (const { key, label } of cats) {
    const items = result.findings.filter(f => f.category === key);
    lines.push(label);
    if (items.length === 0) {
      lines.push('  No items identified.');
    } else {
      for (const f of items) {
        lines.push(`  • [${f.urgency.toUpperCase()}] ${f.title}`);
        if (f.person) lines.push(`    → ${f.person}`);
        if (f.extractedDate) lines.push(`    📅 ${f.extractedDate}`);
        lines.push(`    ${f.evidenceSnippets[0]?.slice(0, 120) ?? ''}`);
      }
    }
    lines.push('');
  }

  lines.push(divider);
  lines.push('Processed locally by BRIEFLY. No conversation data was sent to external servers.');

  return lines.join('\n');
}
