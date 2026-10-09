import { ParsedMessage, ParseResult, ConversationMeta } from './conversationTypes';

// WhatsApp export timestamp patterns
// 12-hour: [1/15/24, 2:30 PM] or [15/1/2024, 2:30:45 PM]
// 24-hour: [15/01/2024, 14:30] or [1/15/24, 14:30:45]
// Android: [2024-01-15 14:30] Sender: ...
const WA_LINE_PATTERN = /^\[?(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}),?\s*(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)\]?\s*[-–]?\s*(.+)$/;

function parseTimestamp(datePart: string, timePart: string): Date | null {
  try {
    const cleaned = `${datePart.replace(/\//g, '/')} ${timePart.trim()}`;
    const d = new Date(cleaned);
    if (!isNaN(d.getTime())) return d;
    // Try DD/MM/YYYY
    const parts = datePart.split(/[\/-]/);
    if (parts.length === 3) {
      const [a, b, c] = parts;
      const year = c.length === 2 ? `20${c}` : c;
      const isoDate = `${year}-${b.padStart(2, '0')}-${a.padStart(2, '0')} ${timePart.trim()}`;
      const d2 = new Date(isoDate);
      if (!isNaN(d2.getTime())) return d2;
    }
    return null;
  } catch {
    return null;
  }
}

function extractSenderAndText(rest: string): { sender: string | null; text: string; isSystem: boolean } {
  const colonIdx = rest.indexOf(': ');
  if (colonIdx === -1 || colonIdx > 60) {
    return { sender: null, text: rest.trim(), isSystem: true };
  }
  const potentialSender = rest.slice(0, colonIdx).trim();
  // System messages rarely have short alpha-only senders after timestamp
  if (potentialSender.includes('~') || /^[A-Z][a-z]/.test(potentialSender) || /\+\d/.test(potentialSender) || potentialSender.length < 40) {
    return { sender: potentialSender, text: rest.slice(colonIdx + 2).trim(), isSystem: false };
  }
  return { sender: null, text: rest.trim(), isSystem: true };
}

export function parseWhatsApp(raw: string): ParseResult {
  const warnings: string[] = [];
  const messages: ParsedMessage[] = [];
  const lines = raw.split('\n');
  let order = 0;
  let current: Omit<ParsedMessage, 'id'> | null = null;

  function flush() {
    if (current) {
      messages.push({ ...current, id: `msg-${current.order}`, text: current.text.trim() });
    }
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = WA_LINE_PATTERN.exec(trimmed);
    if (match) {
      flush();
      const [, datePart, timePart, rest] = match;
      const timestamp = parseTimestamp(datePart, timePart);
      const { sender, text, isSystem } = extractSenderAndText(rest);
      current = { timestamp, sender, text, isSystem, order, raw: trimmed };
      order++;
    } else if (current) {
      // Continuation of previous message (multiline)
      current.text += '\n' + trimmed;
      current.raw += '\n' + trimmed;
    } else {
      // Unmatched line at start
      warnings.push(`Could not parse line: ${trimmed.slice(0, 60)}`);
      messages.push({
        id: `msg-${order}`,
        timestamp: null,
        sender: null,
        text: trimmed,
        isSystem: true,
        order,
        raw: trimmed,
      });
      order++;
    }
  }
  flush();

  const participants = Array.from(
    new Set(messages.map(m => m.sender).filter((s): s is string => s !== null && !m_isSystem(messages, s)))
  );

  function m_isSystem(msgs: ParsedMessage[], sender: string): boolean {
    return msgs.some(m => m.sender === sender && m.isSystem);
  }

  const timestamps = messages.map(m => m.timestamp).filter((t): t is Date => t !== null);
  const dateRange = {
    start: timestamps.length ? timestamps[0] : null,
    end: timestamps.length ? timestamps[timestamps.length - 1] : null,
  };

  const meta: ConversationMeta = {
    participants,
    messageCount: messages.length,
    dateRange,
    title: participants.length >= 2 ? `${participants.slice(0, 3).join(', ')}${participants.length > 3 ? ` +${participants.length - 3} more` : ''}` : 'Conversation',
  };

  if (messages.length === 0) {
    warnings.push('No messages could be parsed from the input.');
  }

  return { messages, meta, warnings };
}
