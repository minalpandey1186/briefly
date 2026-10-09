import React from 'react';
import { Shield, RotateCcw, PlusCircle } from 'lucide-react';
import { Button } from './Button';
import { ConversationMeta } from '../features/conversation/conversationTypes';

interface HeaderProps {
  meta?: ConversationMeta;
  onReset?: () => void;
  onImportAnother?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ meta, onReset, onImportAnother }) => {
  return (
    <header className="border-b border-stone-200 bg-white sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="font-bold text-stone-900 tracking-tight text-lg">BRIEFLY</span>
          {meta && (
            <span className="text-stone-400 text-sm hidden sm:block truncate max-w-xs">— {meta.title}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden md:flex items-center gap-1 text-xs text-stone-400">
            <Shield className="h-3 w-3" />
            Local processing
          </span>
          {onImportAnother && (
            <Button variant="secondary" size="sm" icon={<PlusCircle className="h-3.5 w-3.5" />} onClick={onImportAnother}>
              New
            </Button>
          )}
          {onReset && (
            <Button variant="ghost" size="sm" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={onReset}>
              Reset
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
