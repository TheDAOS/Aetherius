import React, { useRef, useEffect } from 'react';

interface NoteEditorProps {
  content: string;
  onChange: (content: string) => void;
  onSave?: () => void;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({
  content,
  onChange,
  onSave
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  return (
    <div className="flex-1 flex flex-col h-full bg-paper-canvas relative">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Start writing markdown notes..."
        className="w-full h-full p-6 bg-transparent text-ink-primary font-mono text-sm leading-relaxed outline-none resize-none selection:bg-accent-acid selection:text-ink-primary"
        spellCheck="false"
      />
    </div>
  );
};
