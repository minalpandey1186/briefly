import React, { useState, useMemo } from 'react';
import { Copy, Check, Filter } from 'lucide-react';
import { AnalysisResult, Finding, FindingCategory, UrgencyLevel } from '../analysis/analysisTypes';
import { ParseResult, ParsedMessage } from '../conversation/conversationTypes';
import { OverviewSection } from './OverviewSection';
import { FindingsList } from './FindingsList';
import { Timeline } from './Timeline';
import { SourceViewer } from '../sources/SourceViewer';
import { MessageSearch } from '../sources/MessageSearch';
import { exportBriefingAsText } from '../../lib/exportBriefing';
import { Button } from '../../components/Button';

interface BriefingViewProps {
  result: AnalysisResult;
  parseResult: ParseResult;
}

type ViewTab = 'briefing' | 'messages' | 'timeline';

const CATEGORIES: Array<{ value: FindingCategory | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'deadline', label: 'Deadlines' },
  { value: 'decision', label: 'Decisions' },
  { value: 'unresolved', label: 'Unresolved' },
  { value: 'mention', label: 'Mentions' },
  { value: 'update', label: 'Updates' },
  { value: 'highlight', label: 'Highlights' },
];

const URGENCIES: Array<{ value: UrgencyLevel | 'all'; label: string }> = [
  { value: 'all', label: 'All urgency' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

export const BriefingView: React.FC<BriefingViewProps> = ({ result, parseResult }) => {
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<ParsedMessage | null>(null);
  const [activeTab, setActiveTab] = useState<ViewTab>('briefing');
  const [catFilter, setCatFilter] = useState<FindingCategory | 'all'>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyLevel | 'all'>('all');
  const [copied, setCopied] = useState(false);
  const [showSourcePanel, setShowSourcePanel] = useState(false);

  const filteredFindings = useMemo(() => {
    return result.findings.filter(f => {
      if (catFilter !== 'all' && f.category !== catFilter) return false;
      if (urgencyFilter !== 'all' && f.urgency !== urgencyFilter) return false;
      return true;
    });
  }, [result.findings, catFilter, urgencyFilter]);

  const handleSelectFinding = (f: Finding) => {
    setSelectedFinding(f);
    setShowSourcePanel(true);
    setActiveTab('briefing');
  };

  const handleCopy = async () => {
    const text = exportBriefingAsText(result, parseResult.meta);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback: create a textarea and copy
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleNavigateToMessage = (msg: ParsedMessage) => {
    setSelectedMessage(msg);
    setActiveTab('messages');
    setShowSourcePanel(false);
  };

  return (
    <div className="flex-1 max-w-6xl mx-auto px-4 py-6 w-full">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div className="flex gap-1 p-1 bg-stone-100 rounded-lg">
          {(['briefing', 'messages', 'timeline'] as ViewTab[]).map(t => (
            <button
              key={t}
              onClick={() => {
                setActiveTab(t);
                if (t !== 'briefing') setShowSourcePanel(false);
              }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
                activeTab === t
                  ? 'bg-white text-stone-800 shadow-sm'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleCopy}
          icon={
            copied ? (
              <Check className="h-3.5 w-3.5 text-green-600" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )
          }
        >
          {copied ? 'Copied!' : 'Copy briefing'}
        </Button>
      </div>

      {/* Briefing tab */}
      {activeTab === 'briefing' && (
        <div className={showSourcePanel ? 'lg:grid lg:grid-cols-[1fr_380px] lg:gap-6' : ''}>
          <div className="min-w-0">
            <OverviewSection result={result} meta={parseResult.meta} />

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <div className="flex items-center gap-1 text-xs text-stone-500">
                <Filter className="h-3.5 w-3.5" />
                Filter:
              </div>
              <div className="flex flex-wrap gap-1">
                {CATEGORIES.map(c => (
                  <button
                    key={c.value}
                    onClick={() => setCatFilter(c.value as FindingCategory | 'all')}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      catFilter === c.value
                        ? 'bg-stone-800 text-white'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              <select
                value={urgencyFilter}
                onChange={e => setUrgencyFilter(e.target.value as UrgencyLevel | 'all')}
                className="text-xs border border-stone-200 rounded-lg px-2 py-1 text-stone-600 bg-white focus:outline-none focus:ring-2 focus:ring-stone-400"
              >
                {URGENCIES.map(u => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>

            <FindingsList
              findings={filteredFindings}
              onSelect={handleSelectFinding}
              selectedId={selectedFinding?.id}
            />
          </div>

          {/* Source panel — desktop sidebar */}
          {showSourcePanel && selectedFinding && (
            <aside className="hidden lg:block">
              <div className="sticky top-20 bg-white border border-stone-200 rounded-2xl p-5 overflow-y-auto max-h-[calc(100vh-120px)]">
                <SourceViewer
                  finding={selectedFinding}
                  messages={parseResult.messages}
                  onClose={() => setShowSourcePanel(false)}
                  onNavigateToMessage={handleNavigateToMessage}
                />
              </div>
            </aside>
          )}
        </div>
      )}

      {/* Source panel — mobile, below findings */}
      {showSourcePanel && selectedFinding && activeTab === 'briefing' && (
        <div className="lg:hidden mt-6 bg-white border border-stone-200 rounded-2xl p-5">
          <SourceViewer
            finding={selectedFinding}
            messages={parseResult.messages}
            onClose={() => setShowSourcePanel(false)}
            onNavigateToMessage={handleNavigateToMessage}
          />
        </div>
      )}

      {/* Messages tab */}
      {activeTab === 'messages' && (
        <div className="bg-white border border-stone-200 rounded-2xl p-5 min-h-[400px]">
          <h3 className="text-sm font-semibold text-stone-700 mb-4">Search Original Messages</h3>
          <MessageSearch
            messages={parseResult.messages}
            onSelect={msg => setSelectedMessage(msg)}
            highlightedId={selectedMessage?.id}
          />
        </div>
      )}

      {/* Timeline tab */}
      {activeTab === 'timeline' && (
        <div className="bg-white border border-stone-200 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-stone-700 mb-6">
            Conversation Highlights Timeline
          </h3>
          <Timeline findings={result.findings} onSelect={handleSelectFinding} />
        </div>
      )}
    </div>
  );
};
