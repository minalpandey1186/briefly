import { describe, it, expect } from 'vitest';
import { runAnalysisPipeline } from '../features/analysis/analysisPipeline';
import { validateFindingsIntegrity } from '../features/analysis/validateFindings';
import {
  createMessageIndex,
  getSourceMessages,
  findMessageById,
} from '../features/analysis/sourceMatcher';
import { ParsedMessage } from '../features/conversation/conversationTypes';
import { Finding } from '../features/analysis/analysisTypes';
import { parseWhatsApp } from '../features/conversation/parseWhatsApp';
import { normalizeMessages } from '../features/conversation/normalizeMessages';

const SAMPLE_RAW = `[09/10/2024, 9:00 AM] Alice: Let's finalize the launch date.
[09/10/2024, 9:01 AM] Bob: I'll prepare the release notes by 12 October, 5 PM.
[09/10/2024, 9:02 AM] Alice: Final decision: release on Oct 14. Confirmed.`;

describe('Architecture & Orchestration Boundary', () => {
  it('runs analysis pipeline successfully and returns valid structured output', () => {
    const msgs = normalizeMessages(parseWhatsApp(SAMPLE_RAW).messages);
    const result = runAnalysisPipeline(msgs);

    expect(result).toBeDefined();
    expect(result.analysis).toBeDefined();
    expect(result.messageIndex).toBeInstanceOf(Map);
    expect(result.messageIndex.size).toBe(msgs.length);
    expect(result.validationReport).toBeDefined();
    expect(result.validationReport.validCount).toBeGreaterThan(0);
    expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    expect(result.analysis.findings.length).toBe(result.validationReport.validCount);
  });

  it('validates finding integrity and discards findings with non-existent source message IDs', () => {
    const msgs: ParsedMessage[] = [
      {
        id: 'msg-1',
        sender: 'Alice',
        text: 'Valid source message.',
        timestamp: new Date(),
        isSystem: false,
        order: 1,
        raw: '',
      },
    ];

    const findings: Finding[] = [
      {
        id: 'finding-valid',
        category: 'decision',
        title: 'Valid Decision',
        summary: 'A valid decision.',
        urgency: 'high',
        person: 'Alice',
        extractedDate: null,
        confidence: 'confirmed',
        sourceMessageIds: ['msg-1'],
        evidenceSnippets: ['Valid source message.'],
        timestamp: new Date(),
      },
      {
        id: 'finding-invalid-id',
        category: 'decision',
        title: 'Ghost Decision',
        summary: 'Points to a non-existent message ID.',
        urgency: 'high',
        person: 'Ghost',
        extractedDate: null,
        confidence: 'confirmed',
        sourceMessageIds: ['non-existent-msg-999'],
        evidenceSnippets: ['Fake evidence.'],
        timestamp: new Date(),
      },
      {
        id: 'finding-empty-title',
        category: 'update',
        title: '',
        summary: 'Missing title',
        urgency: 'low',
        person: null,
        extractedDate: null,
        confidence: 'confirmed',
        sourceMessageIds: ['msg-1'],
        evidenceSnippets: ['Valid source message.'],
        timestamp: new Date(),
      },
    ];

    const { validFindings, report } = validateFindingsIntegrity(findings, msgs);

    expect(validFindings).toHaveLength(1);
    expect(validFindings[0].id).toBe('finding-valid');
    expect(report.totalInput).toBe(3);
    expect(report.validCount).toBe(1);
    expect(report.rejectedCount).toBe(2);
    expect(report.rejections.some(r => r.findingId === 'finding-invalid-id')).toBe(true);
    expect(report.rejections.some(r => r.findingId === 'finding-empty-title')).toBe(true);
  });

  it('provides O(1) indexed lookup and preserves original chronological message order', () => {
    const msgs: ParsedMessage[] = [
      {
        id: 'msg-0',
        sender: 'Alice',
        text: 'First message',
        timestamp: new Date(2024, 0, 1, 10, 0),
        isSystem: false,
        order: 0,
        raw: '',
      },
      {
        id: 'msg-1',
        sender: 'Bob',
        text: 'Second message',
        timestamp: new Date(2024, 0, 1, 10, 5),
        isSystem: false,
        order: 1,
        raw: '',
      },
      {
        id: 'msg-2',
        sender: 'Charlie',
        text: 'Third message',
        timestamp: new Date(2024, 0, 1, 10, 10),
        isSystem: false,
        order: 2,
        raw: '',
      },
    ];

    const index = createMessageIndex(msgs);
    expect(index.get('msg-1')?.sender).toBe('Bob');
    expect(findMessageById('msg-2', index)?.sender).toBe('Charlie');
    expect(findMessageById('missing-id', index)).toBeUndefined();

    // Source message ordering should sort chronologically regardless of sourceMessageIds order
    const finding: Finding = {
      id: 'f-1',
      category: 'decision',
      title: 'Multi-source decision',
      summary: 'Summary',
      urgency: 'medium',
      person: null,
      extractedDate: null,
      confidence: 'confirmed',
      sourceMessageIds: ['msg-2', 'msg-0'], // Reverse order in finding
      evidenceSnippets: ['Third message', 'First message'],
      timestamp: null,
    };

    const sources = getSourceMessages(finding, index);
    expect(sources).toHaveLength(2);
    expect(sources[0].id).toBe('msg-0'); // Chronologically first
    expect(sources[1].id).toBe('msg-2'); // Chronologically second
  });

  it('optimizes participant discovery in parseWhatsApp in a single pass', () => {
    const raw = `[09/10/2024, 9:00 AM] Alice: Hi
[09/10/2024, 9:01 AM] Bob: Hello
[09/10/2024, 9:02 AM] Alice: How are you?
[09/10/2024, 9:03 AM] Messages and calls are end-to-end encrypted.`;

    const result = parseWhatsApp(raw);
    expect(result.meta.participants).toEqual(['Alice', 'Bob']);
    expect(result.meta.participants).not.toContain('Messages and calls are end-to-end encrypted.');
  });
});
