import { ParsedMessage } from '../conversation/conversationTypes';
import { Finding } from './analysisTypes';

export function getSourceMessages(finding: Finding, messages: ParsedMessage[]): ParsedMessage[] {
  const ids = new Set(finding.sourceMessageIds);
  return messages.filter(m => ids.has(m.id));
}

export function findMessageById(id: string, messages: ParsedMessage[]): ParsedMessage | undefined {
  return messages.find(m => m.id === id);
}

export function searchMessages(query: string, messages: ParsedMessage[]): ParsedMessage[] {
  if (!query.trim()) return messages;
  const q = query.toLowerCase();
  return messages.filter(
    m =>
      m.text.toLowerCase().includes(q) ||
      (m.sender && m.sender.toLowerCase().includes(q))
  );
}
