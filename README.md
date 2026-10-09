# BRIEFLY — Conversation Intelligence

BRIEFLY transforms long WhatsApp conversations into structured, evidence-backed briefings: decisions, deadlines, personal mentions, unresolved discussions, and conversation highlights — all processed locally in the browser, no API keys required.

## Quick Start

```bash
npm install
npm run dev
```

Open **http://localhost:5173**

## Features

- **Import** — Upload `.txt` WhatsApp exports, paste text directly, or load a realistic sample
- **Parse** — Handles 12h/24h timestamps, multiline messages, system notifications, media placeholders
- **Analyze** — Extracts decisions, deadlines, mentions, unresolved questions, updates, highlights using deterministic local rules
- **Briefing** — Categorized findings with urgency levels, evidence snippets, and source message links
- **Explore** — Filter by category/urgency, search all messages, open source viewer, copy briefing as text, reset session

## Architecture

```
src/
  app/                    # App entry + state machine
  features/
    import/               # ImportPanel, FileDropzone, useConversationInput
    conversation/         # parseWhatsApp, normalizeMessages, conversationTypes
    analysis/             # analyzeConversation, extractFindings, prioritizeFindings, sourceMatcher
    briefing/             # BriefingView, OverviewSection, FindingsList, Timeline
    sources/              # SourceViewer, MessageSearch
  components/             # Button, EmptyState, Header, StatusMessage
  lib/                    # sampleConversation, exportBriefing, validation
  styles/                 # globals.css
  tests/                  # Vitest unit tests
```

## Data Flow

```
ImportPanel → parseWhatsApp → normalizeMessages → analyzeConversation
  → extractFindings → prioritizeFindings → sourceMatcher → BriefingView → SourceViewer
```

## Tests

```bash
npm test
```

Covers: parsing (12h/24h formats, multiline, system messages, empty input), analysis (decisions, deadlines, source linking, overview), and prioritization (urgency ordering, category ordering, immutability).

## Privacy

All processing happens in the browser. No conversation data is sent to any external server, analytics service, or API. There is no backend. The reset action clears all state from memory.

## Stack

- React 19 + TypeScript + Vite 6
- Tailwind CSS v4
- Lucide React icons
- Vitest for unit testing

## Known Limitations

- Analysis is rule-based (pattern matching + heuristics), not ML. Implicit or ambiguous decisions may not always be detected.
- Relative date expressions (e.g., "next Monday") are labeled tentative since they cannot be resolved without knowing the conversation date.
- Very long conversations (2000+ messages) may produce many findings; the cap per category keeps the briefing scannable.
- The parser expects standard WhatsApp `.txt` export format. Non-standard exports may produce fewer structured findings.