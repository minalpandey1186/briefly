export interface ValidationResult {
  valid: boolean;
  error?: string;
  warning?: string;
}

export function validateConversationInput(text: string): ValidationResult {
  if (!text || !text.trim()) {
    return { valid: false, error: 'Please provide a conversation to analyze.' };
  }
  if (text.trim().length < 20) {
    return { valid: false, error: 'The conversation is too short to analyze meaningfully.' };
  }
  // Heuristic: does it look like a WhatsApp export?
  const hasTimestampPattern = /\[?\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4},?\s*\d{1,2}:\d{2}/.test(text);
  if (!hasTimestampPattern) {
    return {
      valid: true,
      warning: "This doesn't look like a standard WhatsApp export. BRIEFLY will do its best, but some features may be limited.",
    };
  }
  return { valid: true };
}

export function validateFile(file: File): ValidationResult {
  if (!file.name.endsWith('.txt')) {
    return { valid: false, error: 'Please upload a .txt file exported from WhatsApp.' };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { valid: false, error: 'File is too large (max 10 MB). Please use a shorter conversation.' };
  }
  return { valid: true };
}
