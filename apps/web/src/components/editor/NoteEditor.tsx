import React, { useRef, useEffect, useState } from 'react';
import { FileText } from 'lucide-react';

interface NoteEditorProps {
  content: string;
  allFilePaths?: string[];
  onChange: (content: string) => void;
  onSave?: () => void;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({
  content,
  allFilePaths = [],
  onChange,
  onSave
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteQuery, setAutocompleteQuery] = useState('');
  const [cursorPos, setCursorPos] = useState<number>(0);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        onSave?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSave]);

  const filteredPaths = allFilePaths
    .filter(p => p.endsWith('.md'))
    .filter(p => {
      const q = autocompleteQuery.toLowerCase();
      return p.toLowerCase().includes(q) || p.split('/').pop()?.toLowerCase().includes(q);
    });

  const insertWikilink = (targetPath: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const text = content;
    const triggerIndex = text.lastIndexOf('[[', cursorPos);
    if (triggerIndex === -1) return;

    const noteName = targetPath.replace(/\.md$/, '').split('/').pop() || targetPath;
    const replacement = `[[${noteName}]]`;
    const newText = text.slice(0, triggerIndex) + replacement + text.slice(cursorPos);
    onChange(newText);

    setShowAutocomplete(false);
    setAutocompleteQuery('');

    // Restore focus and position
    setTimeout(() => {
      textarea.focus();
      const newPos = triggerIndex + replacement.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 10);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    if (showAutocomplete && filteredPaths.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredPaths.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredPaths.length) % filteredPaths.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertWikilink(filteredPaths[selectedIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowAutocomplete(false);
        return;
      }
    }

    // Tab key indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      if (e.shiftKey) {
        // Shift+Tab: Remove 2 leading spaces if present
        const before = content.slice(0, start);
        const selected = content.slice(start, end);
        const after = content.slice(end);

        if (before.endsWith('  ')) {
          onChange(before.slice(0, -2) + selected + after);
          setTimeout(() => textarea.setSelectionRange(start - 2, end - 2), 0);
        }
      } else {
        // Tab: Insert 2 spaces
        const newText = content.slice(0, start) + '  ' + content.slice(end);
        onChange(newText);
        setTimeout(() => textarea.setSelectionRange(start + 2, start + 2), 0);
      }
      return;
    }

    // Auto-closing quotes, brackets
    const pairs: Record<string, string> = {
      '(': ')',
      '[': ']',
      '{': '}',
      '`': '`',
      '"': '"'
    };

    if (pairs[e.key]) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const closing = pairs[e.key];

      if (start !== end) {
        // Wrap selection
        e.preventDefault();
        const selected = content.slice(start, end);
        const newText = content.slice(0, start) + e.key + selected + closing + content.slice(end);
        onChange(newText);
        setTimeout(() => textarea.setSelectionRange(start + 1, end + 1), 0);
        return;
      }
    }
  };

  const handleKeyUp = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const pos = textarea.selectionStart;
    setCursorPos(pos);

    // Detect [[ trigger
    const textBeforeCursor = content.slice(0, pos);
    const triggerMatch = textBeforeCursor.match(/\[\[([^\]\n]*)$/);

    if (triggerMatch) {
      setShowAutocomplete(true);
      setAutocompleteQuery(triggerMatch[1]);
      setSelectedIndex(0);
    } else {
      setShowAutocomplete(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-paper-canvas relative">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onClick={() => textareaRef.current && setCursorPos(textareaRef.current.selectionStart)}
        placeholder="Start writing markdown notes... (Type [[ to link notes)"
        className="w-full h-full p-6 bg-transparent text-ink-primary font-mono text-sm leading-relaxed outline-none resize-none selection:bg-accent-acid selection:text-ink-primary"
        spellCheck="false"
      />

      {/* Floating [[ Autocomplete Popup */}
      {showAutocomplete && (
        <div className="absolute bottom-6 left-6 z-20 w-80 max-h-60 overflow-y-auto neo-box bg-white border-2 border-ink-primary shadow-neo-lg flex flex-col font-mono text-xs">
          <div className="px-3 py-1.5 bg-accent-acid/40 border-b border-ink-primary font-bold text-[10px] text-ink-muted">
            LINK TO NOTE (Tab / Enter to select)
          </div>
          {filteredPaths.length === 0 ? (
            <div className="p-3 text-ink-muted text-center text-[11px]">
              No notes match "{autocompleteQuery}"
            </div>
          ) : (
            filteredPaths.map((path, idx) => (
              <div
                key={path}
                onClick={() => insertWikilink(path)}
                className={`p-2 flex items-center gap-2 cursor-pointer transition-colors border-b border-cream-border/50 ${
                  idx === selectedIndex ? 'bg-accent-acid text-ink-primary font-bold' : 'hover:bg-cream-shell'
                }`}
              >
                <FileText size={13} className="text-accent-cobalt flex-shrink-0" />
                <span className="truncate">{path}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
