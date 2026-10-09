import React from 'react';
import { Finding, FindingCategory, UrgencyLevel } from '../analysis/analysisTypes';
import { EmptyState } from '../../components/EmptyState';
import { CheckCircle, Clock, AlertCircle, User, HelpCircle, Zap, ChevronRight } from 'lucide-react';

interface FindingsListProps {
  findings: Finding[];
  onSelect: (f: Finding) => void;
  selectedId?: string;
}

const CAT_CONFIG: Record<
  FindingCategory,
  { label: string; icon: React.ReactNode; color: string; bg: string }
> = {
  decision: {
    label: 'Decisions & Agreements',
    icon: <CheckCircle className="h-4 w-4" />,
    color: 'text-green-700',
    bg: 'bg-green-50 border-green-200',
  },
  deadline: {
    label: 'Deadlines & Time-sensitive',
    icon: <Clock className="h-4 w-4" />,
    color: 'text-amber-700',
    bg: 'bg-amber-50 border-amber-200',
  },
  mention: {
    label: 'Personal Mentions & Commitments',
    icon: <User className="h-4 w-4" />,
    color: 'text-blue-700',
    bg: 'bg-blue-50 border-blue-200',
  },
  unresolved: {
    label: 'Still Unresolved',
    icon: <HelpCircle className="h-4 w-4" />,
    color: 'text-purple-700',
    bg: 'bg-purple-50 border-purple-200',
  },
  update: {
    label: 'Important Updates',
    icon: <AlertCircle className="h-4 w-4" />,
    color: 'text-stone-700',
    bg: 'bg-stone-50 border-stone-200',
  },
  highlight: {
    label: 'Conversation Highlights',
    icon: <Zap className="h-4 w-4" />,
    color: 'text-rose-700',
    bg: 'bg-rose-50 border-rose-200',
  },
};

const URGENCY_BADGE: Record<UrgencyLevel, string> = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-amber-100 text-amber-700',
  medium: 'bg-blue-50 text-blue-600',
  low: 'bg-stone-100 text-stone-500',
};

const CATEGORY_ORDER: FindingCategory[] = [
  'deadline',
  'decision',
  'unresolved',
  'mention',
  'update',
  'highlight',
];

export const FindingsList: React.FC<FindingsListProps> = ({ findings, onSelect, selectedId }) => {
  if (findings.length === 0) {
    return (
      <EmptyState
        title="No findings match the current filter"
        description="Try adjusting the category or urgency filter, or load a different conversation."
      />
    );
  }

  const grouped = CATEGORY_ORDER.map(cat => ({
    cat,
    items: findings.filter(f => f.category === cat),
  })).filter(g => g.items.length > 0);

  return (
    <div className="space-y-6">
      {grouped.map(({ cat, items }) => {
        const cfg = CAT_CONFIG[cat];
        return (
          <section key={cat}>
            <div className={`flex items-center gap-2 mb-3 text-sm font-semibold ${cfg.color}`}>
              {cfg.icon}
              {cfg.label}
              <span className="ml-auto text-xs font-normal text-stone-400">{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.map(f => (
                <button
                  key={f.id}
                  onClick={() => onSelect(f)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selectedId === f.id
                      ? `${cfg.bg} shadow-sm`
                      : 'bg-white border-stone-200 hover:border-stone-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${URGENCY_BADGE[f.urgency]}`}
                        >
                          {f.urgency}
                        </span>
                        {f.confidence !== 'confirmed' && (
                          <span className="text-xs text-stone-400 border border-stone-200 px-1.5 py-0.5 rounded-full">
                            {f.confidence}
                          </span>
                        )}
                        {f.person && (
                          <span className="text-xs text-stone-500">{f.person}</span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-stone-800 leading-snug">{f.title}</p>
                      {f.extractedDate && (
                        <p className="text-xs text-amber-600 mt-1">📅 {f.extractedDate}</p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-stone-300 flex-shrink-0 mt-1" />
                  </div>
                  {f.evidenceSnippets[0] && (
                    <p className="text-xs text-stone-500 mt-2 line-clamp-2">
                      &ldquo;{f.evidenceSnippets[0].slice(0, 140)}
                      {f.evidenceSnippets[0].length > 140 ? '…' : ''}&rdquo;
                    </p>
                  )}
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
};
