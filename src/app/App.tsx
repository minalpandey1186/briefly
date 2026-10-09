import React, { useState, useCallback, useRef } from 'react';
import { ImportPanel } from '../features/import/ImportPanel';
import { BriefingView } from '../features/briefing/BriefingView';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { StatusMessage } from '../components/StatusMessage';
import { ParseResult } from '../features/conversation/conversationTypes';
import { AnalysisResult } from '../features/analysis/analysisTypes';
import { analyzeConversation } from '../features/analysis/analyzeConversation';

type AppState = 'import' | 'analyzing' | 'briefing' | 'error';

export const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('import');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Stale execution token prevents race conditions if user resets or re-analyzes
  const activeExecutionToken = useRef(0);

  const handleAnalyze = useCallback((result: ParseResult) => {
    const token = ++activeExecutionToken.current;
    setParseResult(result);
    setErrorMessage(null);
    setAppState('analyzing');

    // Slight timeout allows React to paint the analyzing progress state
    setTimeout(() => {
      // Abort if a newer execution or reset superseded this run
      if (token !== activeExecutionToken.current) return;

      try {
        const analysis = analyzeConversation(result.messages);
        if (token !== activeExecutionToken.current) return;

        setAnalysisResult(analysis);
        setAppState('briefing');
      } catch (err) {
        if (token !== activeExecutionToken.current) return;

        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'An unexpected error occurred during conversation analysis.'
        );
        setAppState('error');
      }
    }, 120);
  }, []);

  const handleReset = useCallback(() => {
    // Invalidate any in-flight analysis execution
    activeExecutionToken.current++;
    setParseResult(null);
    setAnalysisResult(null);
    setErrorMessage(null);
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

  if (appState === 'error') {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col">
        <Header onReset={handleReset} />
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="max-w-md w-full bg-white border border-stone-200 rounded-2xl p-6 text-center space-y-4 shadow-sm">
            <StatusMessage
              type="error"
              message={errorMessage || 'Analysis encountered an unexpected problem.'}
            />
            <p className="text-stone-500 text-sm">
              You can return to the import screen and try again or load another conversation.
            </p>
            <div className="flex justify-center pt-2">
              <Button onClick={handleReset} variant="primary">
                Return to Import
              </Button>
            </div>
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
