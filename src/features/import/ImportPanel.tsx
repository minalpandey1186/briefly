import React, { useState } from 'react';
import { MessageSquare, FileText, ClipboardPaste, Sparkles } from 'lucide-react';
import { Button } from '../../components/Button';
import { StatusMessage } from '../../components/StatusMessage';
import { FileDropzone } from './FileDropzone';
import { SAMPLE_CONVERSATION, SAMPLE_CONVERSATION_NAME } from '../../lib/sampleConversation';
import { ParseResult } from '../conversation/conversationTypes';
import { parseWhatsApp } from '../conversation/parseWhatsApp';
import { normalizeMessages } from '../conversation/normalizeMessages';
import { validateConversationInput } from '../../lib/validation';

interface ImportPanelProps {
  onAnalyze: (result: ParseResult, rawText: string) => void;
}

type Tab = 'upload' | 'paste';

export const ImportPanel: React.FC<ImportPanelProps> = ({ onAnalyze }) => {
  const [tab, setTab] = useState<Tab>('upload');
  const [pasteText, setPasteText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string | null>(null);

  const handleFileContent = (content: string, name: string) => {
    setError(null);
    setWarning(null);
    const v = validateConversationInput(content);
    if (!v.valid) { setError(v.error!); return; }
    if (v.warning) setWarning(v.warning);
    setPreviewText(content);
    setPreviewName(name);
  };

  const doAnalyze = (text: string) => {
    setError(null);
    const v = validateConversationInput(text);
    if (!v.valid) { setError(v.error!); return; }
    if (v.warning) setWarning(v.warning);
    setIsAnalyzing(true);
    setTimeout(() => {
      try {
        const result = parseWhatsApp(text);
        result.messages = normalizeMessages(result.messages);
        onAnalyze(result, text);
      } catch {
        setError('Failed to parse. Please check the conversation format.');
        setIsAnalyzing(false);
      }
    }, 80);
  };

  const loadSample = () => {
    setError(null);
    setWarning(null);
    setPreviewText(null);
    setPreviewName(null);
    doAnalyze(SAMPLE_CONVERSATION);
  };

  const handleAnalyzeClick = () => {
    const text = previewText ?? (tab === 'paste' ? pasteText : '');
    if (!text.trim()) { setError('Please provide a conversation first.'); return; }
    doAnalyze(text);
  };

  const activeText = previewText ?? (tab === 'paste' ? pasteText : '');
  const canAnalyze = activeText.trim().length > 20;

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      {/* Header */}
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-stone-700" />
          <span className="font-bold text-stone-900 tracking-tight text-lg">BRIEFLY</span>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-2xl mx-auto px-4 pt-14 pb-6 text-center">
        <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Understand any conversation,<br /><span className="text-stone-500">in seconds.</span></h1>
        <p className="mt-3 text-stone-500 text-base max-w-md mx-auto">BRIEFLY turns long WhatsApp conversations into structured, evidence-backed briefings — decisions, deadlines, commitments, and open questions — all in one place.</p>
      </div>

      {/* Import card */}
      <div className="max-w-2xl mx-auto px-4 w-full pb-12">
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
          {/* Tabs */}
          <div className="flex gap-1 mb-5 p-1 bg-stone-100 rounded-lg w-fit">
            {(['upload', 'paste'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(null); setWarning(null); setPreviewText(null); }}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  tab === t ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                {t === 'upload' ? 'Upload file' : 'Paste text'}
              </button>
            ))}
          </div>

          {tab === 'upload' && !previewText && (
            <FileDropzone onFileContent={handleFileContent} onError={setError} />
          )}

          {tab === 'upload' && previewText && (
            <div className="border border-stone-200 rounded-xl bg-stone-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-stone-500" />
                <span className="text-sm font-medium text-stone-700">{previewName}</span>
                <button onClick={() => setPreviewText(null)} className="ml-auto text-xs text-stone-400 hover:text-stone-600 underline">Remove</button>
              </div>
              <p className="text-xs text-stone-400 line-clamp-3 font-mono">{previewText.slice(0, 300)}...</p>
            </div>
          )}

          {tab === 'paste' && (
            <textarea
              value={pasteText}
              onChange={e => { setPasteText(e.target.value); setError(null); setWarning(null); }}
              placeholder="Paste your WhatsApp export here...
Example:\n[09/10/2024, 9:02 AM] Alice: Good morning!"
              className="w-full h-44 text-xs font-mono border border-stone-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-stone-400 bg-stone-50 text-stone-700 placeholder-stone-300"
            />
          )}

          {error && <div className="mt-3"><StatusMessage type="error" message={error} /></div>}
          {warning && !error && <div className="mt-3"><StatusMessage type="warning" message={warning} /></div>}

          <div className="mt-5 flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleAnalyzeClick}
              disabled={!canAnalyze}
              loading={isAnalyzing}
              size="lg"
              className="flex-1"
              icon={<Sparkles className="h-4 w-4" />}
            >
              {isAnalyzing ? 'Analyzing…' : 'Analyze conversation'}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={loadSample}
              disabled={isAnalyzing}
              icon={<ClipboardPaste className="h-4 w-4" />}
            >
              Load sample
            </Button>
          </div>

          <p className="mt-4 text-xs text-stone-400 text-center">
            🔒 Your conversation is processed entirely in your browser. Nothing is sent to any server.
          </p>
        </div>
      </div>
    </div>
  );
};
