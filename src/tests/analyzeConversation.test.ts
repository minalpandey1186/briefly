import { describe, it, expect } from 'vitest';
import { parseWhatsApp } from '../features/conversation/parseWhatsApp';
import { normalizeMessages } from '../features/conversation/normalizeMessages';
import { analyzeConversation } from '../features/analysis/analyzeConversation';

const SAMPLE = `[09/10/2024, 9:02 AM] Priya: We decided to go with the freemium model. It's confirmed.
[09/10/2024, 9:05 AM] Rahul: The QA sign-off is due by October 10 EOD. That's a hard deadline.
[09/10/2024, 9:10 AM] Ananya: Has anyone confirmed the support email address?
[09/10/2024, 9:12 AM] Priya: FYI — the payment gateway fix is live on staging.
[09/10/2024, 9:15 AM] Rahul: @Ananya can you finalize the landing page copy by 5 PM today?`;

describe('analyzeConversation', () => {
  const msgs = normalizeMessages(parseWhatsApp(SAMPLE).messages);
  const result = analyzeConversation(msgs);

  it('produces at least one finding', () => {
    expect(result.findings.length).toBeGreaterThan(0);
  });

  it('includes at least one decision finding', () => {
    const decisions = result.findings.filter(f => f.category === 'decision');
    expect(decisions.length).toBeGreaterThan(0);
  });

  it('includes at least one deadline finding', () => {
    const deadlines = result.findings.filter(f => f.category === 'deadline');
    expect(deadlines.length).toBeGreaterThan(0);
  });

  it('all findings have at least one source message ID', () => {
    result.findings.forEach(f => {
      expect(f.sourceMessageIds.length).toBeGreaterThan(0);
    });
  });

  it('all source message IDs refer to real messages', () => {
    const ids = new Set(msgs.map(m => m.id));
    result.findings.forEach(f => {
      f.sourceMessageIds.forEach(sid => {
        expect(ids.has(sid)).toBe(true);
      });
    });
  });

  it('produces a non-empty overview', () => {
    expect(result.overview.length).toBeGreaterThan(10);
  });

  it('each finding has non-empty evidence snippets', () => {
    result.findings.forEach(f => {
      expect(f.evidenceSnippets.length).toBeGreaterThan(0);
      expect(f.evidenceSnippets[0].length).toBeGreaterThan(0);
    });
  });
});
