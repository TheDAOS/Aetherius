import React, { useState, useEffect } from 'react';
import { Search, FileText, CornerDownLeft } from 'lucide-react';
import { Modal } from '../components/common/Modal';
import { SearchResult } from '../types/vault';
import { mockVaultService } from '../services/mockVault';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFile: (path: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectFile
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      return;
    }

    const timer = setTimeout(async () => {
      if (query.trim()) {
        const res = await mockVaultService.search(query);
        setResults(res.results);
        setSelectedIndex(0);
      } else {
        // Show recent / all files by default
        const list = await mockVaultService.listFiles();
        const initialResults: SearchResult[] = list.entries
          .filter(e => e.type === 'file')
          .map(e => ({
            path: e.path,
            title: e.name,
            snippet: 'Quick open file...'
          }));
        setResults(initialResults);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (results.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % (results.length || 1));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      onSelectFile(results[selectedIndex].path);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Quick Switcher / Search"
      badgeText="Ctrl+K"
      maxWidth="max-w-2xl"
    >
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-3 text-ink-muted" size={16} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type note title, folder, or keywords..."
            className="neo-box w-full pl-10 pr-4 py-2.5 bg-paper-canvas text-ink-primary font-mono text-sm outline-none focus:ring-2 focus:ring-accent-acid"
            autoFocus
          />
        </div>

        {/* Results List */}
        <div className="flex flex-col max-h-80 overflow-y-auto divide-y divide-cream-border border-2 border-ink-primary bg-white">
          {results.length === 0 ? (
            <div className="p-6 text-center text-xs font-mono text-ink-muted">
              No notes match your query.
            </div>
          ) : (
            results.map((item, idx) => (
              <div
                key={item.path}
                onClick={() => {
                  onSelectFile(item.path);
                  onClose();
                }}
                className={`p-3 flex items-start justify-between cursor-pointer transition-colors ${
                  idx === selectedIndex
                    ? 'bg-accent-acid/40 border-l-4 border-l-ink-primary'
                    : 'hover:bg-cream-shell'
                }`}
              >
                <div className="flex items-start gap-2.5 truncate">
                  <FileText size={15} className="text-accent-orange mt-0.5 flex-shrink-0" />
                  <div className="truncate">
                    <div className="font-mono text-xs font-bold text-ink-primary">
                      {item.path}
                    </div>
                    <div className="text-[11px] font-sans text-ink-muted truncate mt-0.5">
                      {item.snippet}
                    </div>
                  </div>
                </div>

                <CornerDownLeft size={12} className="text-ink-muted mt-1 flex-shrink-0" />
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
};
