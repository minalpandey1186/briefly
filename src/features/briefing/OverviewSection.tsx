import React from 'react';
import { AnalysisResult } from '../analysis/analysisTypes';
import { ConversationMeta } from '../conversation/conversationTypes';

interface OverviewSectionProps {
  result: AnalysisResult;
  meta: ConversationMeta;
}

export const OverviewSection: React.FC<OverviewSectionProps> = ({ result, meta }) => {
  const stats = [
    { label: 'Messages', value: meta.messageCount },
    { label: 'Participants', value: meta.participants.length },
    { label: 'Findings', value: result.findings.length },
  ];

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-6 mb-6">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">
            Conversation Overview
          </p>
          <h2 className="text-xl font-bold text-stone-900">{meta.title}</h2>
          {meta.dateRange.start && meta.dateRange.end && (
            <p className="text-xs text-stone-400 mt-1">
              {meta.dateRange.start.toLocaleDateString()} –{' '}
              {meta.dateRange.end.toLocaleDateString()}
            </p>
          )}
        </div>
        <div className="flex gap-6">
          {stats.map(s => (
            <div key={s.label} className="text-center">
              <div className="text-2xl font-bold text-stone-900">{s.value}</div>
              <div className="text-xs text-stone-400">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
      <p className="text-sm text-stone-600 leading-relaxed">{result.overview}</p>
      {result.themes.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-4">
          {result.themes.map(t => (
            <span key={t} className="text-xs bg-stone-100 text-stone-600 px-2.5 py-1 rounded-full">
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
