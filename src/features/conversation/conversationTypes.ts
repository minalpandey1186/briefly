export interface ParsedMessage {
  id: string;
  timestamp: Date | null;
  sender: string | null;
  text: string;
  isSystem: boolean;
  order: number;
  raw: string;
}

export interface ConversationMeta {
  participants: string[];
  messageCount: number;
  dateRange: { start: Date | null; end: Date | null };
  title: string;
}

export interface ParseResult {
  messages: ParsedMessage[];
  meta: ConversationMeta;
  warnings: string[];
}
