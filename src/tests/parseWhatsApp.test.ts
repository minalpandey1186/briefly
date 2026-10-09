import { describe, it, expect } from 'vitest';
import { parseWhatsApp } from '../features/conversation/parseWhatsApp';

describe('parseWhatsApp', () => {
  it('parses a 12-hour AM/PM format message', () => {
    const input = '[09/10/2024, 9:02 AM] Alice: Hello everyone!';
    const result = parseWhatsApp(input);
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].sender).toBe('Alice');
    expect(result.messages[0].text).toBe('Hello everyone!');
    expect(result.messages[0].isSystem).toBe(false);
  });

  it('parses a 24-hour format message', () => {
    const input = '[09/10/2024, 14:30] Bob: Good afternoon';
    const result = parseWhatsApp(input);
    expect(result.messages[0].sender).toBe('Bob');
    expect(result.messages[0].text).toBe('Good afternoon');
  });

  it('handles multiline messages', () => {
    const input = `[09/10/2024, 9:00 AM] Alice: First line\nSecond line\nThird line`;
    const result = parseWhatsApp(input);
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].text).toContain('Second line');
    expect(result.messages[0].text).toContain('Third line');
  });

  it('handles system messages without a sender', () => {
    const input = '[09/10/2024, 9:00 AM] Messages and calls are end-to-end encrypted.';
    const result = parseWhatsApp(input);
    expect(result.messages[0].isSystem).toBe(true);
  });

  it('parses multiple participants and builds meta', () => {
    const input = `[09/10/2024, 9:00 AM] Alice: Hi\n[09/10/2024, 9:01 AM] Bob: Hello\n[09/10/2024, 9:02 AM] Charlie: Hey`;
    const result = parseWhatsApp(input);
    expect(result.meta.participants).toContain('Alice');
    expect(result.meta.participants).toContain('Bob');
    expect(result.meta.participants).toContain('Charlie');
  });

  it('returns a warning for empty input', () => {
    const result = parseWhatsApp('');
    expect(result.messages).toHaveLength(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('preserves media omitted placeholder', () => {
    const input = '[09/10/2024, 9:00 AM] Alice: <Media omitted>';
    const result = parseWhatsApp(input);
    expect(result.messages[0].text).toContain('Media omitted');
  });

  it('assigns unique ids to messages', () => {
    const input = `[09/10/2024, 9:00 AM] Alice: First\n[09/10/2024, 9:01 AM] Bob: Second`;
    const result = parseWhatsApp(input);
    const ids = result.messages.map(m => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
