import React from 'react';
import { X, ExternalLink } from 'lucide-react';
import { Finding } from '../analysis/analysisTypes';
import { ParsedMessage } from '../conversation/conversationTypes';
import { getSourceMessages } from '../analysis/sourceMatcher';

interface SourceViewerProps {
  finding: Finding;
  messages: ParsedMessage[];
  onClose: () => void;
  onNavigateToMessage: (msg: ParsedMessage) => void;
}

const CAT_LABELS: Record<string, string> = {
  decision: 'Decision',
  deadline: 'Deadline',
  mention: 'Mention',
  unresolved: 'Unresolved',
  update: 'Update',
  highlight: 'Highlight',
};

const URGENCY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-amber-100 text-amber-700',
  medium: 'bg-blue-100 text-blue-600',
  low: 'bg-stone-100 text-stone-500',
};

export const SourceViewer: React.FC<SourceViewerProps> = ({
  finding,
  messages,
  onClose,
  onNavigateToMessage,
}) => {
  const sources = getSourceMessages(finding, messages);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">
              {CAT_LABELS[finding.category] ?? finding.category}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${URGENCY_COLORS[finding.urgency]}`}>
              {finding.urgency}
            </span>
            {finding.confidence !== 'confirmed' && (
              <span className="text-xs px-2 py-0.5 bg-stone-50 text-stone-400 rounded-full border border-stone-200">
                {finding.confidence}
              </span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-stone-900 leading-snug">{finding.title}</h3>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 rounded hover:bg-stone-100 transition-colors"
          aria-label="Close source viewer"
        >
          <X className="h-4 w-4 text-stone-400" />
        </button>
      </div>

      {/* Summary */}
      <p className="text-xs text-stone-600 mb-4 leading-relaxed">{finding.summary}</p>

      {/* Date badge */}
      {finding.extractedDate && (
        <div className="mb-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-700">
            📅 Date reference: <strong>{finding.extractedDate}</strong>
          </p>
        </div>
      )}

      {/* Source messages */}
      <div>
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
          Source messages ({sources.length})
        </p>
        {sources.length === 0 ? (
          <p className="text-xs text-stone-400">No linked source messages.</p>
        ) : (
          <div className="space-y-2">
            {sources.map(msg => (
              <div key={msg.id} className="border border-stone-200 rounded-lg p-3 bg-stone-50">
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <span className="text-xs font-medium text-stone-700">{msg.sender || 'System'}</span>
                  {msg.timestamp && (
                    <span className="text-[10px] text-stone-400 flex-shrink-0">
                      {msg.timestamp.toLocaleString(undefined, {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-700 leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                <button
                  onClick={() => onNavigateToMessage(msg)}
                  className="mt-2 flex items-center gap-1 text-[10px] text-stone-400 hover:text-stone-600 transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  View in conversation
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
