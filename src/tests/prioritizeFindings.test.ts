import { describe, it, expect } from 'vitest';
import { prioritizeFindings } from '../features/analysis/prioritizeFindings';
import { Finding } from '../features/analysis/analysisTypes';

const makeFinding = (overrides: Partial<Finding>): Finding => ({
  id: 'test-1',
  category: 'update',
  title: 'Test finding',
  summary: 'Summary text',
  urgency: 'low',
  person: null,
  extractedDate: null,
  confidence: 'confirmed',
  sourceMessageIds: ['msg-1'],
  evidenceSnippets: ['evidence text'],
  timestamp: null,
  ...overrides,
});

describe('prioritizeFindings', () => {
  it('places critical findings before low ones', () => {
    const findings = [
      makeFinding({ id: 'a', urgency: 'low' }),
      makeFinding({ id: 'b', urgency: 'critical' }),
    ];
    const sorted = prioritizeFindings(findings);
    expect(sorted[0].id).toBe('b');
  });

  it('places deadlines before updates at the same urgency', () => {
    const findings = [
      makeFinding({ id: 'a', category: 'update', urgency: 'medium' }),
      makeFinding({ id: 'b', category: 'deadline', urgency: 'medium' }),
    ];
    const sorted = prioritizeFindings(findings);
    expect(sorted[0].id).toBe('b');
  });

  it('places decisions before mentions at same urgency', () => {
    const findings = [
      makeFinding({ id: 'a', category: 'mention', urgency: 'high' }),
      makeFinding({ id: 'b', category: 'decision', urgency: 'high' }),
    ];
    const sorted = prioritizeFindings(findings);
    expect(sorted[0].id).toBe('b');
  });

  it('returns an empty array for empty input', () => {
    expect(prioritizeFindings([])).toHaveLength(0);
  });

  it('does not mutate the original array', () => {
    const findings = [
      makeFinding({ id: 'a', urgency: 'low' }),
      makeFinding({ id: 'b', urgency: 'high' }),
    ];
    const original = [...findings];
    prioritizeFindings(findings);
    expect(findings[0].id).toBe(original[0].id);
  });

  it('handles a single finding without error', () => {
    const sorted = prioritizeFindings([makeFinding({ id: 'only' })]);
    expect(sorted).toHaveLength(1);
    expect(sorted[0].id).toBe('only');
  });
});
