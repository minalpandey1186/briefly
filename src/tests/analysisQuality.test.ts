import { describe, it, expect } from 'vitest';
import { parseWhatsApp } from '../features/conversation/parseWhatsApp';
import { normalizeMessages } from '../features/conversation/normalizeMessages';
import { analyzeConversation } from '../features/analysis/analyzeConversation';

describe('Analysis Quality Regressions', () => {
  it('distinguishes confirmed decisions from suggestions and questions', () => {
    const chat = `[10/06/2024, 10:00 AM] Arjun: Final decision: use WhatsApp TXT exports and pasted text only.
[10/06/2024, 10:01 AM] Meera: We could record a short demo video for backup.
[10/06/2024, 10:02 AM] Rahul: Are we meeting tomorrow at 6 PM?
[10/06/2024, 10:03 AM] Arjun: What's the final call on styling? Are we going with Tailwind or Vanilla CSS?
[10/06/2024, 10:04 AM] Meera: I haven't confirmed the styling choice yet.`;

    const msgs = normalizeMessages(parseWhatsApp(chat).messages);
    const result = analyzeConversation(msgs);

    const decisions = result.findings.filter(f => f.category === 'decision');

    // Should include Arjun's explicit final decision
    const confirmedDecision = decisions.find(d =>
      d.evidenceSnippets.some(s => s.includes('WhatsApp TXT exports'))
    );
    expect(confirmedDecision).toBeDefined();
    expect(confirmedDecision?.confidence).toBe('confirmed');

    // Should NOT classify Meera's suggestion ("We could record a short demo video") as a confirmed decision
    const demoDecision = decisions.find(d =>
      d.evidenceSnippets.some(s => s.toLowerCase().includes('demo video'))
    );
    expect(demoDecision).toBeUndefined();

    // Should NOT classify questions ("Are we meeting tomorrow at 6 PM?" or "Are we going with Tailwind...?") as decisions
    const questionDecisions = decisions.filter(d =>
      d.evidenceSnippets.some(s => s.includes('?') || s.toLowerCase().includes('meeting tomorrow'))
    );
    expect(questionDecisions).toHaveLength(0);

    // Should NOT classify "I haven't confirmed..." as a decision
    const unconfirmedDecision = decisions.find(d =>
      d.evidenceSnippets.some(s => s.includes("haven't confirmed"))
    );
    expect(unconfirmedDecision).toBeUndefined();
  });

  it('extracts named task owners and commitments with deadlines and confidence', () => {
    const chat = `[10/06/2024, 11:00 AM] Arjun: I'll push the parser code by 11 June, 8 PM.
[10/06/2024, 11:02 AM] Meera: I'll review the PPT on 12 June by 6 PM.
[10/06/2024, 11:05 AM] Rohan: I might finish my part early, but don't count on it until I confirm.`;

    const msgs = normalizeMessages(parseWhatsApp(chat).messages);
    const result = analyzeConversation(msgs);

    const commitments = result.findings.filter(
      f => f.category === 'mention' || f.category === 'deadline'
    );

    // Arjun's commitment
    const arjunCommitment = commitments.find(c => c.person === 'Arjun' || c.summary.includes('Arjun'));
    expect(arjunCommitment).toBeDefined();
    expect(arjunCommitment?.evidenceSnippets[0]).toContain("I'll push the parser code");
    expect(arjunCommitment?.extractedDate).toMatch(/11 June|8 PM/i);

    // Meera's commitment
    const meeraCommitment = commitments.find(c => c.person === 'Meera' || c.summary.includes('Meera'));
    expect(meeraCommitment).toBeDefined();
    expect(meeraCommitment?.evidenceSnippets[0]).toContain("I'll review the PPT");
    expect(meeraCommitment?.extractedDate).toMatch(/12 June|6 PM/i);

    // Rohan's tentative offer must have tentative confidence
    const rohanFinding = result.findings.find(f =>
      f.evidenceSnippets.some(s => s.includes("don't count on it"))
    );
    if (rohanFinding) {
      expect(rohanFinding.confidence).toBe('tentative');
    }
  });

  it('accurately identifies unresolved questions and does not falsely resolve with unrelated messages', () => {
    const chat = `[10/06/2024, 2:00 PM] Meera: What will our support email address be?
[10/06/2024, 2:01 PM] Arjun: Yes, I already deployed the database.
[10/06/2024, 2:02 PM] Rohan: Are we meeting tomorrow at 6 PM?
[10/06/2024, 2:03 PM] Meera: I have a conflict at 6. Not sure what time works yet.`;

    const msgs = normalizeMessages(parseWhatsApp(chat).messages);
    const result = analyzeConversation(msgs);

    const unresolved = result.findings.filter(f => f.category === 'unresolved');

    // Support email question should remain unresolved despite Arjun saying "Yes, I already deployed..."
    const emailUnresolved = unresolved.find(u =>
      u.evidenceSnippets.some(s => s.toLowerCase().includes('support email'))
    );
    expect(emailUnresolved).toBeDefined();

    // Meeting time should be unresolved
    const meetingUnresolved = unresolved.find(u =>
      u.evidenceSnippets.some(s => s.toLowerCase().includes('meeting tomorrow') || s.toLowerCase().includes('conflict at 6'))
    );
    expect(meetingUnresolved).toBeDefined();
  });

  it('marks questions as resolved when subsequent messages provide a direct answer', () => {
    const chat = `[10/06/2024, 3:00 PM] Rohan: Who is handling the QA testing?
[10/06/2024, 3:02 PM] Priya: I am handling the QA testing, I will take it.`;

    const msgs = normalizeMessages(parseWhatsApp(chat).messages);
    const result = analyzeConversation(msgs);

    const unresolved = result.findings.filter(f => f.category === 'unresolved');
    const qaUnresolved = unresolved.find(u =>
      u.evidenceSnippets.some(s => s.toLowerCase().includes('qa testing'))
    );
    expect(qaUnresolved).toBeUndefined();
  });

  it('extracts personal availability constraints', () => {
    const chat = `[10/06/2024, 4:00 PM] Priya: Let's do a demo tomorrow at 3 PM.
[10/06/2024, 4:01 PM] Rohan: I have a conflict at 3 PM. Can we do 4 PM instead?
[10/06/2024, 4:02 PM] Priya: Confirmed, 4 PM works for everyone.`;

    const msgs = normalizeMessages(parseWhatsApp(chat).messages);
    const result = analyzeConversation(msgs);

    // Either as mention or unresolved/decision, Rohan's availability constraint is captured
    const rohanFinding = result.findings.find(f =>
      f.evidenceSnippets.some(s => s.includes('conflict at 3 PM'))
    );
    expect(rohanFinding).toBeDefined();
    expect(rohanFinding?.person).toBe('Rohan');
  });

  it('filters out casual chatter and food orders from high-priority categories', () => {
    const chat = `[10/06/2024, 12:00 PM] Amit: Good morning guys! Anyone hungry?
[10/06/2024, 12:01 PM] Pooja: I ordered pizza from Dominos hahaha.
[10/06/2024, 12:02 PM] Amit: Awesome, let's grab coffee later too.
[10/06/2024, 12:05 PM] Priya: Critical: Project submission deadline is 15 June, 11:59 PM. No extensions.`;

    const msgs = normalizeMessages(parseWhatsApp(chat).messages);
    const result = analyzeConversation(msgs);

    // Pizza and coffee must NOT be in decisions, deadlines, or critical findings
    const chatterFindings = result.findings.filter(f =>
      f.evidenceSnippets.some(s => s.toLowerCase().includes('pizza') || s.toLowerCase().includes('coffee') || s.toLowerCase().includes('hungry'))
    );
    const criticalChatter = chatterFindings.filter(f => f.urgency === 'critical' || f.urgency === 'high');
    expect(criticalChatter).toHaveLength(0);

    // Project submission deadline must be critical/high
    const deadlineFinding = result.findings.find(f =>
      f.evidenceSnippets.some(s => s.includes('15 June'))
    );
    expect(deadlineFinding).toBeDefined();
    expect(deadlineFinding?.urgency).toBe('critical');
    expect(deadlineFinding?.extractedDate).toMatch(/15 June|11:59 PM/i);
  });

  it('ensures every finding links to real source message IDs and non-empty evidence snippets', () => {
    const chat = `[10/06/2024, 1:00 PM] Priya: We finalized the architecture yesterday.
[10/06/2024, 1:05 PM] Rahul: Due date for sprint 1 is 14 June.
[10/06/2024, 1:10 PM] Ananya: @Rahul please update the API docs.`;

    const msgs = normalizeMessages(parseWhatsApp(chat).messages);
    const result = analyzeConversation(msgs);
    const msgIds = new Set(msgs.map(m => m.id));

    expect(result.findings.length).toBeGreaterThan(0);
    for (const f of result.findings) {
      expect(f.sourceMessageIds.length).toBeGreaterThan(0);
      for (const sid of f.sourceMessageIds) {
        expect(msgIds.has(sid)).toBe(true);
      }
      expect(f.evidenceSnippets.length).toBeGreaterThan(0);
      expect(f.evidenceSnippets[0].trim().length).toBeGreaterThan(0);
    }
  });

  it('handles corrections by reflecting the updated agreement and linking evidence', () => {
    const chat = `[10/06/2024, 5:00 PM] Priya: How does Oct 12 at 3 PM work for the demo?
[10/06/2024, 5:01 PM] Rohan: I have a conflict at 3. Can we do 4 PM instead?
[10/06/2024, 5:02 PM] Priya: Let's do 4 PM then. Oct 12, 4 PM — internal demo.`;

    const msgs = normalizeMessages(parseWhatsApp(chat).messages);
    const result = analyzeConversation(msgs);

    const decisions = result.findings.filter(f => f.category === 'decision');
    const demoDecision = decisions.find(d =>
      d.evidenceSnippets.some(s => s.includes('4 PM') && s.toLowerCase().includes('internal demo'))
    );
    expect(demoDecision).toBeDefined();
  });

  it('accurately analyzes the realistic BRIEFLY sample conversation', async () => {
    const { SAMPLE_CONVERSATION } = await import('../lib/sampleConversation');
    const msgs = normalizeMessages(parseWhatsApp(SAMPLE_CONVERSATION).messages);
    const result = analyzeConversation(msgs);

    // Decisions must include freemium pricing and 4 PM demo
    const decisions = result.findings.filter(f => f.category === 'decision');
    expect(decisions.length).toBeGreaterThan(0);
    const pricingDecision = decisions.find(d =>
      d.evidenceSnippets.some(s => s.toLowerCase().includes('freemium'))
    );
    expect(pricingDecision).toBeDefined();

    // Deadlines must include Oct 10 EOD or Oct 14 or 5 PM
    const deadlines = result.findings.filter(f => f.category === 'deadline');
    expect(deadlines.length).toBeGreaterThan(0);
    const oct10Deadline = deadlines.find(d =>
      d.extractedDate && (d.extractedDate.includes('Oct 10') || d.extractedDate.includes('tomorrow'))
    );
    expect(oct10Deadline).toBeDefined();

    // Unresolved topics must include support email or soft launch or legal docs or twitter handle
    const unresolved = result.findings.filter(f => f.category === 'unresolved');
    expect(unresolved.length).toBeGreaterThan(0);
    const softLaunchOrEmail = unresolved.find(u =>
      u.evidenceSnippets.some(s =>
        s.toLowerCase().includes('soft launch') ||
        s.toLowerCase().includes('support email') ||
        s.toLowerCase().includes('legal') ||
        s.toLowerCase().includes('twitter')
      )
    );
    expect(softLaunchOrEmail).toBeDefined();

    // Mentions and commitments must include commitments
    const mentions = result.findings.filter(f => f.category === 'mention');
    expect(mentions.length).toBeGreaterThan(0);
    const personalCommitment = mentions.find(m =>
      m.evidenceSnippets.some(s =>
        s.includes("I'll send it over by 5 PM") ||
        s.includes("I'll handle the cert renewal") ||
        s.includes("conflict at 3")
      )
    );
    expect(personalCommitment).toBeDefined();
  });
});

