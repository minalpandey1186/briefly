import { useState, useCallback } from 'react';
import { ParseResult } from '../conversation/conversationTypes';
import { parseWhatsApp } from '../conversation/parseWhatsApp';
import { normalizeMessages } from '../conversation/normalizeMessages';
import { validateConversationInput } from '../../lib/validation';

interface UseConversationInputReturn {
  rawText: string;
  setRawText: (t: string) => void;
  parseResult: ParseResult | null;
  error: string | null;
  warning: string | null;
  isParsing: boolean;
  parseInput: () => void;
  reset: () => void;
}

export function useConversationInput(): UseConversationInputReturn {
  const [rawText, setRawText] = useState('');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const parseInput = useCallback(() => {
    setError(null);
    setWarning(null);
    const v = validateConversationInput(rawText);
    if (!v.valid) { setError(v.error!); return; }
    if (v.warning) setWarning(v.warning);
    setIsParsing(true);
    // Use a minimal timeout to let the UI update
    setTimeout(() => {
      try {
        const result = parseWhatsApp(rawText);
        result.messages = normalizeMessages(result.messages);
        setParseResult(result);
      } catch (e) {
        setError('Failed to parse the conversation. Please check the format.');
      } finally {
        setIsParsing(false);
      }
    }, 50);
  }, [rawText]);

  const reset = useCallback(() => {
    setRawText('');
    setParseResult(null);
    setError(null);
    setWarning(null);
    setIsParsing(false);
  }, []);

  return { rawText, setRawText, parseResult, error, warning, isParsing, parseInput, reset };
}
