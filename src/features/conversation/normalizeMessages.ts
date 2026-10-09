import { ParsedMessage } from './conversationTypes';

export function normalizeMessages(messages: ParsedMessage[]): ParsedMessage[] {
  return messages
    .map(msg => ({
      ...msg,
      text: msg.text.replace(/<Media omitted>/gi, '[Media]').replace(/\u200e/g, '').trim(),
      sender: msg.sender ? msg.sender.replace(/^~/, '').trim() : null,
    }))
    .sort((a, b) => a.order - b.order);
}
