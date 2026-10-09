import React from 'react';
import { Finding } from '../analysis/analysisTypes';
import { EmptyState } from '../../components/EmptyState';
import { Clock } from 'lucide-react';

interface TimelineProps {
  findings: Finding[];
  onSelect: (f: Finding) => void;
}

const CAT_DOT: Record<string, string> = {
  decision: 'bg-green-400',
  deadline: 'bg-amber-400',
  mention: 'bg-blue-400',
  unresolved: 'bg-purple-400',
  update: 'bg-stone-400',
  highlight: 'bg-rose-400',
};

export const Timeline: React.FC<TimelineProps> = ({ findings, onSelect }) => {
  const sorted = [...findings]
    .filter(f => f.timestamp)
    .sort((a, b) => a.timestamp!.getTime() - b.timestamp!.getTime());

  if (sorted.length === 0) {
    return (
      <EmptyState
        icon={<Clock className="h-8 w-8" />}
        title="No timestamped highlights"
        description="Timeline requires messages with parseable timestamps."
      />
    );
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-3 top-2 bottom-2 w-px bg-stone-200" />
      <div className="space-y-4">
        {sorted.map(f => (
          <button
            key={f.id}
            onClick={() => onSelect(f)}
            className="relative flex items-start gap-4 pl-9 w-full text-left group"
          >
            {/* Dot */}
            <div
              className={`absolute left-1.5 top-1.5 w-3 h-3 rounded-full border-2 border-white shadow-sm ${
                CAT_DOT[f.category] ?? 'bg-stone-300'
              }`}
            />
            <div className="flex-1 pb-3 border-b border-stone-100 last:border-0">
              {f.timestamp && (
                <p className="text-[10px] text-stone-400 mb-0.5">
                  {f.timestamp.toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              )}
              <p className="text-xs font-medium text-stone-700 group-hover:text-stone-900 leading-snug transition-colors">
                {f.title}
              </p>
              <span className="text-[10px] text-stone-400 capitalize">{f.category}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
