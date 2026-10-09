import { ParsedMessage } from '../conversation/conversationTypes';
import { Finding } from './analysisTypes';

export type MessageIndex = Map<string, ParsedMessage>;

/**
 * Creates an O(1) indexed lookup map for parsed messages.
 */
export function createMessageIndex(messages: ParsedMessage[]): MessageIndex {
  const index = new Map<string, ParsedMessage>();
  for (const msg of messages) {
    index.set(msg.id, msg);
  }
  return index;
}

/**
 * Retrieves source messages for a finding in original chronological order.
 * Accepts either an indexed Map for O(1) efficiency or an array for backward compatibility.
 */
export function getSourceMessages(
  finding: Finding,
  messagesOrIndex: ParsedMessage[] | MessageIndex
): ParsedMessage[] {
  if (messagesOrIndex instanceof Map) {
    const result: ParsedMessage[] = [];
    for (const id of finding.sourceMessageIds) {
      const msg = messagesOrIndex.get(id);
      if (msg) {
        result.push(msg);
      }
    }
    // Maintain original chronological ordering
    return result.sort((a, b) => a.order - b.order);
  }

  // Array fallback
  const ids = new Set(finding.sourceMessageIds);
  return messagesOrIndex.filter(m => ids.has(m.id));
}

/**
 * Finds a specific message by ID using either an index or array.
 */
export function findMessageById(
  id: string,
  messagesOrIndex: ParsedMessage[] | MessageIndex
): ParsedMessage | undefined {
  if (messagesOrIndex instanceof Map) {
    return messagesOrIndex.get(id);
  }
  return messagesOrIndex.find(m => m.id === id);
}

/**
 * Case-insensitive search across messages and sender names.
 */
export function searchMessages(query: string, messages: ParsedMessage[]): ParsedMessage[] {
  if (!query.trim()) return messages;
  const q = query.toLowerCase();
  return messages.filter(
    m =>
      m.text.toLowerCase().includes(q) ||
      (m.sender !== null && m.sender.toLowerCase().includes(q))
  );
}
