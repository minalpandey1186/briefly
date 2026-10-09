import React, { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { ParsedMessage } from '../conversation/conversationTypes';
import { searchMessages } from '../analysis/sourceMatcher';

interface MessageSearchProps {
  messages: ParsedMessage[];
  onSelect: (msg: ParsedMessage) => void;
  highlightedId?: string;
}

export const MessageSearch: React.FC<MessageSearchProps> = ({ messages, onSelect, highlightedId }) => {
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchMessages(query, messages), [query, messages]);
  const displayed = results.slice(0, 80);

  return (
    <div className="flex flex-col h-full">
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search messages…"
          className="w-full pl-9 pr-8 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400 bg-white"
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="h-3.5 w-3.5 text-stone-400 hover:text-stone-600" />
          </button>
        )}
      </div>
      <p className="text-xs text-stone-400 mb-2">
        {query ? `${results.length} result${results.length !== 1 ? 's' : ''}` : `${messages.length} messages`}
      </p>
      <div className="overflow-y-auto flex-1 space-y-1.5 max-h-[60vh]">
        {displayed.map(msg => (
          <button
            key={msg.id}
            onClick={() => onSelect(msg)}
            className={`w-full text-left p-2.5 rounded-lg border text-xs transition-colors ${
              highlightedId === msg.id
                ? 'border-stone-400 bg-stone-100'
                : 'border-transparent hover:bg-stone-50 hover:border-stone-200'
            }`}
          >
            <div className="flex items-baseline gap-1.5 mb-0.5">
              <span className="font-medium text-stone-700">{msg.sender || 'System'}</span>
              {msg.timestamp && (
                <span className="text-stone-400 text-[10px]">
                  {msg.timestamp.toLocaleString(undefined, {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              )}
            </div>
            <p className="text-stone-600 line-clamp-2">{msg.text}</p>
          </button>
        ))}
        {results.length === 0 && query && (
          <p className="text-center text-stone-400 text-xs py-6">No messages match &ldquo;{query}&rdquo;</p>
        )}
      </div>
    </div>
  );
};
