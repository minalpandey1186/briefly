import { ParsedMessage } from '../conversation/conversationTypes';
import { Finding, FindingCategory, ConfidenceLevel } from './analysisTypes';

let _idCounter = 0;
function nextId(prefix: string): string {
  return `${prefix}-${++_idCounter}`;
}

export function extractFindings(messages: ParsedMessage[]): Finding[] {
  _idCounter = 0;
  const findings: Finding[] = [];
  const nonSystem = messages.filter(m => !m.isSystem && m.text.length > 0);

  findings.push(...extractDecisions(nonSystem));
  findings.push(...extractDeadlines(nonSystem));
  findings.push(...extractMentions(nonSystem));
  findings.push(...extractUnresolved(nonSystem));
  findings.push(...extractUpdates(nonSystem));
  findings.push(...extractHighlights(nonSystem, messages));

  return findings;
}

const DECISION_PATTERNS = [
  /\b(we('ve| have)? decided|we agreed|agreed to|going with|let's go with|we'll go with|confirmed:|decision:|it's decided|we're going|we will|let's do|sounds good to everyone|everyone agreed)\b/i,
  /\b(final(ly| decision| answer| call)?:|approved|confirmed|locked in|settled on|resolved)\b/i,
  /\b(yes[,.]? (let's|we'll|we can)|okay[,.]? (let's|we'll)|alright[,.]? (let's|we'll))\b/i,
];

function extractDecisions(messages: ParsedMessage[]): Finding[] {
  const findings: Finding[] = [];
  for (const msg of messages) {
    if (DECISION_PATTERNS.some(p => p.test(msg.text))) {
      const title = summarizeDecision(msg.text);
      if (title) {
        findings.push({
          id: nextId('decision'),
          category: 'decision',
          title,
          summary: `${msg.sender} made a decision: "${msg.text.slice(0, 120)}${msg.text.length > 120 ? '...' : ''}"`,
          urgency: 'high',
          person: msg.sender,
          extractedDate: null,
          confidence: 'confirmed',
          sourceMessageIds: [msg.id],
          evidenceSnippets: [msg.text.slice(0, 200)],
          timestamp: msg.timestamp,
        });
      }
    }
  }
  return findings.slice(0, 8); // cap
}

function summarizeDecision(text: string): string | null {
  const truncated = text.replace(/\n/g, ' ').slice(0, 80);
  if (truncated.length < 5) return null;
  return truncated.length < 60 ? truncated : truncated.slice(0, 57) + '...';
}

const DATE_PATTERNS = [
  /(by |before |on |due |deadline[:\s]+)?((monday|tuesday|wednesday|thursday|friday|saturday|sunday)|today|tomorrow|next\s+\w+)/i,
  /(by |before |due |deadline[:\s]+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(,?\s+\d{4})?/i,
  /(by |before |due |deadline[:\s]+)?\d{1,2}[\/-]\d{1,2}([\/-]\d{2,4})?/,
  /\d{1,2}\s*(am|pm)\b/i,
  /end of (day|week|month|sprint|quarter)/i,
  /(this|next) (week|month|quarter|year)/i,
];

const DEADLINE_CONTEXT = /(deadline|due|submit|send|deliver|complete|finish|by|before|launch|release|present|demo|meeting|call|appointment)/i;

function extractDeadlines(messages: ParsedMessage[]): Finding[] {
  const findings: Finding[] = [];
  for (const msg of messages) {
    if (!DEADLINE_CONTEXT.test(msg.text)) continue;
    const dateMatch = DATE_PATTERNS.find(p => p.test(msg.text));
    if (!dateMatch) continue;
    const rawMatch = msg.text.match(dateMatch);
    const dateStr = rawMatch ? rawMatch[0] : null;
    const urgency = /today|tomorrow|tonight|urgent|asap/i.test(msg.text) ? 'critical' : 'high';
    findings.push({
      id: nextId('deadline'),
      category: 'deadline',
      title: buildDeadlineTitle(msg.text, dateStr),
      summary: msg.text.slice(0, 200),
      urgency,
      person: msg.sender,
      extractedDate: dateStr,
      confidence: dateStr ? 'likely' : 'tentative',
      sourceMessageIds: [msg.id],
      evidenceSnippets: [msg.text.slice(0, 200)],
      timestamp: msg.timestamp,
    });
  }
  return findings.slice(0, 8);
}

function buildDeadlineTitle(text: string, dateStr: string | null): string {
  const short = text.replace(/\n/g, ' ').slice(0, 70);
  return dateStr ? `Deadline: ${dateStr} — ${short.slice(0, 50)}...` : short.slice(0, 60) + (short.length > 60 ? '...' : '');
}

const MENTION_PATTERNS = [
  /@([\w]+)/g,
  /\b(can you|could you|please|you need to|you should|your task|assigned to|remind|tell|ask|let .+ know)\b/i,
];

function extractMentions(messages: ParsedMessage[]): Finding[] {
  const findings: Finding[] = [];
  for (const msg of messages) {
    const atMentions = [...msg.text.matchAll(/@([\w]+)/g)].map(m => m[1]);
    const hasRequestPattern = /\b(can you|could you|please|you need to|you should|your task|assigned to|let .+ know|make sure you)\b/i.test(msg.text);
    if (atMentions.length === 0 && !hasRequestPattern) continue;
    const mentionedPeople = atMentions.length > 0 ? atMentions : (msg.sender ? [msg.sender] : []);
    findings.push({
      id: nextId('mention'),
      category: 'mention',
      title: buildMentionTitle(msg.text, mentionedPeople),
      summary: `${msg.sender || 'Someone'} directed a request or mention: "${msg.text.slice(0, 120)}"`,
      urgency: /urgent|asap|immediately|critical/i.test(msg.text) ? 'high' : 'medium',
      person: mentionedPeople[0] || msg.sender,
      extractedDate: null,
      confidence: 'likely',
      sourceMessageIds: [msg.id],
      evidenceSnippets: [msg.text.slice(0, 200)],
      timestamp: msg.timestamp,
    });
  }
  return findings.slice(0, 8);
}

function buildMentionTitle(text: string, people: string[]): string {
  const person = people.length > 0 ? `@${people[0]} — ` : '';
  const short = text.replace(/\n/g, ' ').slice(0, 60);
  return `${person}${short}${text.length > 60 ? '...' : ''}`;
}

const QUESTION_PATTERNS = [
  /\?\s*$/m,
  /\b(anyone know|has anyone|did (you|anyone|we)|what (about|happened|is the status)|where (are|is)|when (will|is|are)|who (is|will|can)|is (it|this|there|anyone)|are we|have we|do we|should we|can (someone|anyone)|not sure|unclear|pending|waiting for|follow.?up|no response|no update|let me know)\b/i,
];

const RESOLUTION_PATTERNS = /\b(yes|no|confirmed|done|completed|will do|on it|sorted|resolved|figured out|we decided|going with|it's done|already|taken care)\b/i;

function extractUnresolved(messages: ParsedMessage[]): Finding[] {
  const findings: Finding[] = [];
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (!QUESTION_PATTERNS.some(p => p.test(msg.text))) continue;
    // Check if any subsequent message (within 10) resolves this
    const subsequent = messages.slice(i + 1, i + 10);
    const resolved = subsequent.some(m => RESOLUTION_PATTERNS.test(m.text));
    if (resolved) continue;
    findings.push({
      id: nextId('unresolved'),
      category: 'unresolved',
      title: buildUnresolvedTitle(msg.text),
      summary: `Open question or pending item from ${msg.sender || 'unknown'}: "${msg.text.slice(0, 120)}"`,
      urgency: 'medium',
      person: msg.sender,
      extractedDate: null,
      confidence: 'tentative',
      sourceMessageIds: [msg.id],
      evidenceSnippets: [msg.text.slice(0, 200)],
      timestamp: msg.timestamp,
    });
  }
  return findings.slice(0, 8);
}

function buildUnresolvedTitle(text: string): string {
  const short = text.replace(/\n/g, ' ').slice(0, 65);
  return short + (text.length > 65 ? '...' : '');
}

const UPDATE_PATTERNS = [
  /\b(update|fyi|heads.?up|just (wanted|to let|checking)|quick note|announcement|just (pushed|deployed|released|shared|sent|uploaded)|finished|completed|done with|ready|available|live|shipped)\b/i,
  /\b(we('ve| have) (finished|completed|launched|released|submitted|deployed|fixed|resolved)|it's (done|live|ready|working))\b/i,
];

function extractUpdates(messages: ParsedMessage[]): Finding[] {
  const findings: Finding[] = [];
  for (const msg of messages) {
    if (!UPDATE_PATTERNS.some(p => p.test(msg.text))) continue;
    findings.push({
      id: nextId('update'),
      category: 'update',
      title: buildUpdateTitle(msg.text),
      summary: `${msg.sender || 'Someone'} shared an update: "${msg.text.slice(0, 120)}"`,
      urgency: /urgent|critical|breaking|blocking/i.test(msg.text) ? 'high' : 'low',
      person: msg.sender,
      extractedDate: null,
      confidence: 'confirmed',
      sourceMessageIds: [msg.id],
      evidenceSnippets: [msg.text.slice(0, 200)],
      timestamp: msg.timestamp,
    });
  }
  return findings.slice(0, 8);
}

function buildUpdateTitle(text: string): string {
  const short = text.replace(/\n/g, ' ').slice(0, 65);
  return short + (text.length > 65 ? '...' : '');
}

const HIGHLIGHT_PATTERNS = [
  /\b(important|critical|urgent|priority|blocker|escalat|launch|release|breaking|crisis|emergency|milestone|shipped|go.?live|approved|rejected|canceled|cancelled|resigned|joined|onboard)\b/i,
];

function extractHighlights(messages: ParsedMessage[], _all: ParsedMessage[]): Finding[] {
  const findings: Finding[] = [];
  // Pick up to 6 high-signal messages spread across the conversation
  const candidates = messages.filter(msg =>
    HIGHLIGHT_PATTERNS.some(p => p.test(msg.text)) ||
    msg.text.length > 100
  );
  // Sample evenly
  const step = Math.max(1, Math.floor(candidates.length / 6));
  const selected = candidates.filter((_, i) => i % step === 0).slice(0, 6);
  for (const msg of selected) {
    findings.push({
      id: nextId('highlight'),
      category: 'highlight',
      title: msg.text.replace(/\n/g, ' ').slice(0, 65) + (msg.text.length > 65 ? '...' : ''),
      summary: `Significant message from ${msg.sender || 'unknown'}: "${msg.text.slice(0, 150)}"`,
      urgency: HIGHLIGHT_PATTERNS.some(p => p.test(msg.text)) ? 'high' : 'medium',
      person: msg.sender,
      extractedDate: null,
      confidence: 'likely',
      sourceMessageIds: [msg.id],
      evidenceSnippets: [msg.text.slice(0, 250)],
      timestamp: msg.timestamp,
    });
  }
  return findings;
}
