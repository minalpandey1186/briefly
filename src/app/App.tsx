import React, { useState, useCallback } from 'react';
import { ImportPanel } from '../features/import/ImportPanel';
import { BriefingView } from '../features/briefing/BriefingView';
import { Header } from '../components/Header';
import { ParseResult } from '../features/conversation/conversationTypes';
import { AnalysisResult } from '../features/analysis/analysisTypes';
import { analyzeConversation } from '../features/analysis/analyzeConversation';

type AppState = 'import' | 'analyzing' | 'briefing';

export const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('import');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  const handleAnalyze = useCallback((result: ParseResult) => {
    setParseResult(result);
    setAppState('analyzing');
    // Small timeout so the "Analyzing…" state renders before the synchronous work
    setTimeout(() => {
      const analysis = analyzeConversation(result.messages);
      setAnalysisResult(analysis);
      setAppState('briefing');
    }, 150);
  }, []);

  const handleReset = useCallback(() => {
    setParseResult(null);
    setAnalysisResult(null);
    setAppState('import');
  }, []);

  if (appState === 'import') {
    return <ImportPanel onAnalyze={handleAnalyze} />;
  }

  if (appState === 'analyzing') {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <svg
            className="animate-spin h-8 w-8 text-stone-400"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
          <div className="text-center">
            <p className="text-stone-700 font-medium">Analyzing conversation…</p>
            <p className="text-stone-400 text-sm mt-1">
              Identifying findings and connecting evidence
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <Header
        meta={parseResult?.meta}
        onReset={handleReset}
        onImportAnother={handleReset}
      />
      {parseResult && analysisResult && (
        <BriefingView result={analysisResult} parseResult={parseResult} />
      )}
    </div>
  );
};
