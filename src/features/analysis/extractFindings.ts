import { ParsedMessage } from '../conversation/conversationTypes';
import { Finding, FindingCategory, ConfidenceLevel, UrgencyLevel } from './analysisTypes';

let _idCounter = 0;
function nextId(prefix: string): string {
  return `${prefix}-${++_idCounter}`;
}

const STOP_WORDS = new Set([
  'what', 'when', 'where', 'which', 'who', 'whom', 'whose', 'why', 'how',
  'are', 'was', 'were', 'been', 'being', 'have', 'has', 'had', 'having',
  'does', 'did', 'doing', 'should', 'could', 'would', 'the', 'and', 'for',
  'that', 'this', 'with', 'from', 'about', 'can', 'will', 'any', 'anyone',
  'you', 'all', 'our', 'out', 'just', 'some', 'someone', 'there', 'they',
]);

export function isCasualChatter(text: string): boolean {
  const t = text.trim();
  if (/^(good\s*morning|morning|good\s*night|gm|gn|hey\s*all|hello\s*everyone|hi\s*all)[!.,\s]*$/i.test(t)) {
    return true;
  }
  if (/^(haha+|hehe+|lol+|lmao+|rofl+|😂+|🤣+|🎉+|👍+|thanks[!.]*|thank\s*you[!.]*)$/i.test(t)) {
    return true;
  }
  const hasFoodOrChitChat = /\b(pizza|burger|lunch|dinner|coffee|tea|snacks|hungry|dominos|swiggy|zomato|hahaha|lmao|rofl)\b/i.test(t);
  const hasWork = /\b(deadline|due|task|code|repo|review|submit|submission|test|testing|qa|deploy|fix|bug|launch|release|doc|docs|api|meeting|demo|client|legal|prod|staging|milestone)\b/i.test(t);
  if (hasFoodOrChitChat && !hasWork) {
    return true;
  }
  return false;
}

export function extractDateTimeString(text: string): string | null {
  // 1. Date + Time: "15 June, 11:59 PM", "11 June, 8 PM", "11 June at 8 PM", "12 June by 6 PM"
  const dateTime1 = /\b(\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*(?:,?\s+\d{4})?(?:,?\s+(?:at\s+|by\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm|eod))?)\b/i;
  const match1 = text.match(dateTime1);
  if (match1 && match1[1]) return match1[1].trim();

  // 2. Month + Day + Time: "Oct 10 EOD", "Oct 12, 4 PM", "Oct 12 at 4 PM", "Oct 14", "June 15"
  const dateTime2 = /\b((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?(?:,?\s+(?:at\s+|by\s+)?(?:\d{1,2}(?::\d{2})?\s*(?:am|pm)|eod))?)\b/i;
  const match2 = text.match(dateTime2);
  if (match2 && match2[1]) return match2[1].trim();

  // 3. Relative Day + Time: "tomorrow at 6 PM", "tomorrow EOD", "today by 5 PM", "today 5 PM", "by 5 PM today"
  const relativeTime = /\b((?:today|tomorrow|tonight)(?:,?\s+(?:at\s+|by\s+)?(?:\d{1,2}(?::\d{2})?\s*(?:am|pm)|eod))?)\b/i;
  const match3 = text.match(relativeTime);
  if (match3 && match3[1]) return match3[1].trim();

  // 4. Standalone by/at time: "by 5 PM", "by noon", "by 8 PM"
  const byTime = /\b(?:by|before|at)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)|end of day|eod|noon)\b/i;
  const match4 = text.match(byTime);
  if (match4 && match4[1]) return match4[1].trim();

  // 5. Day of week + Time: "Friday 6 PM", "Monday 11:59 PM"
  const weekdayTime = /\b((?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:,?\s+(?:at\s+|by\s+)?(?:\d{1,2}(?::\d{2})?\s*(?:am|pm)|eod))?)\b/i;
  const match5 = text.match(weekdayTime);
  if (match5 && match5[1]) return match5[1].trim();

  // 6. Numeric date format: "10/06/2024", "15/06"
  const numDate = /\b(\d{1,2}[\/-]\d{1,2}(?:[\/-]\d{2,4})?(?:,?\s+(?:at\s+|by\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm))?)\b/i;
  const match6 = text.match(numDate);
  if (match6 && match6[1]) return match6[1].trim();

  return null;
}

export function isQuestion(text: string): boolean {
  if (/\?\s*$/m.test(text.trim())) return true;
  return /\b(are we|should we|could we|can we|what about|what is|what will|who is|who will|who's|where is|when will|when is|how does|how about|anyone know|has anyone|did anyone)\b/i.test(text);
}

export function isSuggestionOrTentative(text: string): boolean {
  return /\b(we could|could record|maybe we can|what if we|how about we|just a thought|suggest|thinking we could|might finish|don't count on it|not sure yet|subject to|tentative)\b/i.test(text);
}

export function isNegativeOrUncertain(text: string): boolean {
  return /\b(haven't confirmed|not confirmed|haven't decided|not decided|unconfirmed|pending|still waiting|on hold|don't count on it|not yet)\b/i.test(text);
}

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
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

  // Deduplicate findings that share the exact same source message and category
  const seen = new Set<string>();
  return findings.filter(f => {
    const key = `${f.category}:${f.sourceMessageIds.join(',')}:${f.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractDecisions(messages: ParsedMessage[]): Finding[] {
  const findings: Finding[] = [];
  for (const msg of messages) {
    if (isCasualChatter(msg.text)) continue;
    if (isQuestion(msg.text)) continue;
    if (isSuggestionOrTentative(msg.text)) continue;
    if (isNegativeOrUncertain(msg.text)) continue;

    // Positive decision triggers
    const isExplicitDecision =
      /\b(final decision:\s*|decision:\s*|confirmed:\s*|approved:\s*|locked in|settled on)/i.test(msg.text) ||
      /\b(we('ve| have)? decided|we decided|we agreed|agreed to)\b/i.test(msg.text) ||
      /\b(let's do \d+(?::\d+)?\s*(?:am|pm) then|let's do .* then)\b/i.test(msg.text) ||
      /\b(we will go with|we'll go with|going with the|let's go with)\b/i.test(msg.text) ||
      /\b(everyone agreed|sounds good to everyone|consensus is)\b/i.test(msg.text);

    if (!isExplicitDecision) continue;

    const title = summarizeDecision(msg.text);
    if (!title) continue;

    const confidence: ConfidenceLevel =
      /\b(final decision|we decided|approved|confirmed:|locked in|settled on)\b/i.test(msg.text)
        ? 'confirmed'
        : 'likely';

    findings.push({
      id: nextId('decision'),
      category: 'decision',
      title,
      summary: `${msg.sender || 'Team'} agreed/decided: "${msg.text.slice(0, 160)}"`,
      urgency: 'high',
      person: msg.sender,
      extractedDate: extractDateTimeString(msg.text),
      confidence,
      sourceMessageIds: [msg.id],
      evidenceSnippets: [msg.text.slice(0, 250)],
      timestamp: msg.timestamp,
    });
  }
  return findings.slice(0, 10);
}

function summarizeDecision(text: string): string | null {
  const truncated = text.replace(/\n/g, ' ').slice(0, 80);
  if (truncated.length < 5) return null;
  return truncated.length < 60 ? truncated : truncated.slice(0, 57) + '...';
}

function extractDeadlines(messages: ParsedMessage[]): Finding[] {
  const findings: Finding[] = [];
  for (const msg of messages) {
    if (isCasualChatter(msg.text)) continue;
    const hasDeadlineContext = /\b(deadline|due|due date|submit|submission|deliver|sign-off|expire|expires|launch|release|prod|hard deadline|no extensions|eod|cut-off|by \d+|before \d+)\b/i.test(msg.text);
    if (!hasDeadlineContext) continue;

    const dateStr = extractDateTimeString(msg.text);
    if (!dateStr) continue;

    const isCritical =
      /\b(critical|urgent|asap|immediately|hard deadline|final deadline|no extension|blocking|cannot delay|no extensions)\b/i.test(msg.text) ||
      /\b(today|tonight|tomorrow)\b/i.test(msg.text);

    findings.push({
      id: nextId('deadline'),
      category: 'deadline',
      title: buildDeadlineTitle(msg.text, dateStr),
      summary: msg.text.slice(0, 200),
      urgency: isCritical ? 'critical' : 'high',
      person: msg.sender,
      extractedDate: dateStr,
      confidence: 'confirmed',
      sourceMessageIds: [msg.id],
      evidenceSnippets: [msg.text.slice(0, 250)],
      timestamp: msg.timestamp,
    });
  }
  return findings.slice(0, 10);
}

function buildDeadlineTitle(text: string, dateStr: string | null): string {
  const short = text.replace(/\n/g, ' ').slice(0, 70);
  return dateStr ? `Deadline: ${dateStr} — ${short.slice(0, 50)}...` : short.slice(0, 60) + (short.length > 60 ? '...' : '');
}

function summarizeCommitment(text: string): string {
  const short = text.replace(/\n/g, ' ').slice(0, 60);
  return short + (text.length > 60 ? '...' : '');
}

function extractMentions(messages: ParsedMessage[]): Finding[] {
  const findings: Finding[] = [];
  for (const msg of messages) {
    if (isCasualChatter(msg.text)) continue;

    // 1. Availability constraints & conflicts
    const isAvailability = /\b(I have a conflict|I'm not available|won't be available|I am out of office|conflict at \d+)\b/i.test(msg.text);
    if (isAvailability) {
      findings.push({
        id: nextId('mention'),
        category: 'mention',
        title: `${msg.sender}: Availability constraint`,
        summary: `${msg.sender || 'Team member'} reported a schedule constraint: "${msg.text.slice(0, 140)}"`,
        urgency: 'medium',
        person: msg.sender,
        extractedDate: extractDateTimeString(msg.text),
        confidence: 'confirmed',
        sourceMessageIds: [msg.id],
        evidenceSnippets: [msg.text.slice(0, 250)],
        timestamp: msg.timestamp,
      });
      continue;
    }

    // 2. Personal commitments: "I'll / I will / I can take / I'll handle / I'll review / I'll push"
    const isCommitment =
      /\b(I('ll| will| can| am going to|'m going to)\s+(push|review|handle|take|write|own|send|deploy|test|check|finish|complete|fix|update|start|follow up|share|draft))\b/i.test(msg.text) ||
      /\b(I can take it|I'll take it|I'll start QA|I'll handle the cert|I'll write it|I'll update)\b/i.test(msg.text) ||
      /\b(I might finish|don't count on it until I confirm)\b/i.test(msg.text);

    if (isCommitment && !isQuestion(msg.text)) {
      const isTentative = /\b(might|maybe|don't count on it|if possible|try to|tentative|not sure)\b/i.test(msg.text);
      const dateStr = extractDateTimeString(msg.text);
      findings.push({
        id: nextId('mention'),
        category: 'mention',
        title: `${msg.sender}: ${summarizeCommitment(msg.text)}`,
        summary: `${msg.sender || 'Someone'} committed: "${msg.text.slice(0, 140)}"`,
        urgency: /urgent|critical|today|tonight|tomorrow/i.test(msg.text) ? 'high' : 'medium',
        person: msg.sender,
        extractedDate: dateStr,
        confidence: isTentative ? 'tentative' : 'confirmed',
        sourceMessageIds: [msg.id],
        evidenceSnippets: [msg.text.slice(0, 250)],
        timestamp: msg.timestamp,
      });
      continue;
    }

    // 3. Requests directed to someone (@mention or "can you / please")
    const atMentions = [...msg.text.matchAll(/@([\w]+)/g)].map(m => m[1]);
    const isDirectRequest = /\b(can you|could you|please|you need to|you should|your task|assigned to|make sure you|let .+ know)\b/i.test(msg.text);
    if (atMentions.length > 0 || isDirectRequest) {
      const targetPerson = atMentions[0] || (isDirectRequest ? null : msg.sender);
      const dateStr = extractDateTimeString(msg.text);
      findings.push({
        id: nextId('mention'),
        category: 'mention',
        title: buildMentionTitle(msg.text, atMentions),
        summary: `${msg.sender || 'Someone'} assigned or requested: "${msg.text.slice(0, 140)}"`,
        urgency: /urgent|asap|critical|today|tonight/i.test(msg.text) ? 'high' : 'medium',
        person: targetPerson,
        extractedDate: dateStr,
        confidence: 'likely',
        sourceMessageIds: [msg.id],
        evidenceSnippets: [msg.text.slice(0, 250)],
        timestamp: msg.timestamp,
      });
    }
  }
  return findings.slice(0, 12);
}

function buildMentionTitle(text: string, people: string[]): string {
  const person = people.length > 0 ? `@${people[0]} — ` : '';
  const short = text.replace(/\n/g, ' ').slice(0, 60);
  return `${person}${short}${text.length > 60 ? '...' : ''}`;
}

function extractUnresolved(messages: ParsedMessage[]): Finding[] {
  const findings: Finding[] = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (isCasualChatter(msg.text)) continue;

    // Case 1: Explicit unconfirmed statements / pending / on hold
    const isExplicitPending =
      /\b(haven't confirmed|not confirmed yet|haven't decided|not decided yet|still evaluating|on hold for now|remains unconfirmed|still waiting on)\b/i.test(msg.text) ||
      /\b(I have drafts but not finalized|not sure what time works yet)\b/i.test(msg.text);

    if (isExplicitPending) {
      findings.push({
        id: nextId('unresolved'),
        category: 'unresolved',
        title: buildUnresolvedTitle(msg.text),
        summary: `Unconfirmed or pending topic from ${msg.sender || 'unknown'}: "${msg.text.slice(0, 140)}"`,
        urgency: 'high',
        person: msg.sender,
        extractedDate: null,
        confidence: 'confirmed',
        sourceMessageIds: [msg.id],
        evidenceSnippets: [msg.text.slice(0, 250)],
        timestamp: msg.timestamp,
      });
      continue;
    }

    // Case 2: Questions asked in the conversation
    if (!isQuestion(msg.text)) continue;

    const keywords = extractKeywords(msg.text);
    if (keywords.length === 0) continue;

    // Check subsequent messages within 10 turns
    const subsequent = messages.slice(i + 1, i + 10);
    let resolved = false;
    let explicitFollowUpUnresolved: ParsedMessage | null = null;

    for (const sub of subsequent) {
      const subLower = sub.text.toLowerCase();
      // Check keyword overlap
      const matchCount = keywords.filter(k => subLower.includes(k)).length;
      if (matchCount >= 1) {
        // If the reply itself says "not sure / not decided / let me confirm / drafts"
        if (/\b(not decided|let me confirm|not sure|pending|drafts|waiting)\b/i.test(sub.text)) {
          explicitFollowUpUnresolved = sub;
          break;
        }
        // Direct answer resolving the question
        if (/\b(I am handling|I will take|launch requirement|confirmed|we decided|support@|works for everyone|done|sorted)\b/i.test(sub.text)) {
          resolved = true;
          break;
        }
        if (sub.text.includes(':') && !sub.text.includes('?')) {
          resolved = true;
          break;
        }
      }
    }

    if (resolved) continue;

    const sourceIds = [msg.id];
    const evidenceSnippets = [msg.text.slice(0, 250)];
    if (explicitFollowUpUnresolved) {
      sourceIds.push(explicitFollowUpUnresolved.id);
      evidenceSnippets.push(explicitFollowUpUnresolved.text.slice(0, 250));
    }

    findings.push({
      id: nextId('unresolved'),
      category: 'unresolved',
      title: buildUnresolvedTitle(msg.text),
      summary: `Open question from ${msg.sender || 'unknown'}: "${msg.text.slice(0, 140)}"`,
      urgency: 'medium',
      person: msg.sender,
      extractedDate: null,
      confidence: 'tentative',
      sourceMessageIds: sourceIds,
      evidenceSnippets,
      timestamp: msg.timestamp,
    });
  }

  return findings.slice(0, 10);
}

function buildUnresolvedTitle(text: string): string {
  const short = text.replace(/\n/g, ' ').slice(0, 65);
  return short + (text.length > 65 ? '...' : '');
}

const UPDATE_PATTERNS = [
  /\b(update|fyi|heads.?up|announcement|just (pushed|deployed|released|shared|sent|uploaded)|finished|completed|done with|ready for prod|live on staging|shipped)\b/i,
  /\b(we('ve| have) (finished|completed|launched|released|submitted|deployed|fixed|resolved)|it's (live|working))\b/i,
];

function extractUpdates(messages: ParsedMessage[]): Finding[] {
  const findings: Finding[] = [];
  for (const msg of messages) {
    if (isCasualChatter(msg.text)) continue;
    if (isQuestion(msg.text)) continue;
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
      evidenceSnippets: [msg.text.slice(0, 250)],
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
  /\b(blockers?|launch|release|breaking|crisis|milestone|shipped|go.?live|approved|hard deadline|cannot delay)\b/i,
];

function extractHighlights(messages: ParsedMessage[], _all: ParsedMessage[]): Finding[] {
  const findings: Finding[] = [];
  const candidates = messages.filter(msg =>
    !isCasualChatter(msg.text) &&
    (HIGHLIGHT_PATTERNS.some(p => p.test(msg.text)) || /\b(summarize the blockers|launch requirement)\b/i.test(msg.text))
  );

  const step = Math.max(1, Math.floor(candidates.length / 6));
  const selected = candidates.filter((_, i) => i % step === 0).slice(0, 6);

  for (const msg of selected) {
    findings.push({
      id: nextId('highlight'),
      category: 'highlight',
      title: msg.text.replace(/\n/g, ' ').slice(0, 65) + (msg.text.length > 65 ? '...' : ''),
      summary: `Key development from ${msg.sender || 'unknown'}: "${msg.text.slice(0, 150)}"`,
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
