import React, { useRef } from 'react';
import { Eye, Edit3, Columns, Save, Code, CheckSquare, Image as ImageIcon, WifiOff } from 'lucide-react';
import { Button } from '../common/Button';

export type ViewMode = 'edit' | 'preview' | 'split';

interface NoteToolbarProps {
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
  isDirty: boolean;
  isOnline?: boolean;
  sha?: string;
  onSave: () => void;
  onInsertMarkdown?: (snippet: string) => void;
  onAttachImage?: (file: File) => void;
}

export const NoteToolbar: React.FC<NoteToolbarProps> = ({
  viewMode,
  onChangeViewMode,
  isDirty,
  isOnline = true,
  sha,
  onSave,
  onInsertMarkdown,
  onAttachImage
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onAttachImage) {
      onAttachImage(file);
    }
    if (e.target) e.target.value = '';
  };

  return (
    <div className="border-b-2 border-ink-primary bg-cream-muted px-3 py-2 flex flex-wrap items-center justify-between gap-2 select-none">
      {/* Left: View Mode Switcher */}
      <div className="flex items-center gap-1">
        <div className="neo-box-sm flex bg-white p-0.5">
          <button
            onClick={() => onChangeViewMode('edit')}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-bold transition-colors ${
              viewMode === 'edit'
                ? 'bg-accent-acid text-ink-primary border border-ink-primary'
                : 'text-ink-muted hover:text-ink-primary'
            }`}
            title="Edit Mode"
          >
            <Edit3 size={13} />
            <span className="hidden sm:inline">EDIT</span>
          </button>
          <button
            onClick={() => onChangeViewMode('preview')}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-bold transition-colors ${
              viewMode === 'preview'
                ? 'bg-accent-acid text-ink-primary border border-ink-primary'
                : 'text-ink-muted hover:text-ink-primary'
            }`}
            title="Preview Mode"
          >
            <Eye size={13} />
            <span className="hidden sm:inline">PREVIEW</span>
          </button>
          <button
            onClick={() => onChangeViewMode('split')}
            className={`hidden md:flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-bold transition-colors ${
              viewMode === 'split'
                ? 'bg-accent-acid text-ink-primary border border-ink-primary'
                : 'text-ink-muted hover:text-ink-primary'
            }`}
            title="Split Mode"
          >
            <Columns size={13} />
            <span>SPLIT</span>
          </button>
        </div>

        {/* Markdown Formatting Helpers */}
        {onInsertMarkdown && viewMode !== 'preview' && (
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={() => onInsertMarkdown('## ')}
              className="neo-btn px-2 py-1 bg-white text-xs font-mono font-bold text-ink-primary"
              title="Heading 2"
            >
              H2
            </button>
            <button
              onClick={() => onInsertMarkdown('- [ ] ')}
              className="neo-btn p-1 bg-white text-ink-primary"
              title="Task Checkbox"
            >
              <CheckSquare size={13} />
            </button>
            <button
              onClick={() => onInsertMarkdown('```\n\n```')}
              className="neo-btn p-1 bg-white text-ink-primary"
              title="Code Block"
            >
              <Code size={13} />
            </button>
            {onAttachImage && (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="neo-btn p-1 bg-white text-ink-primary"
                  title="Attach Image"
                >
                  <ImageIcon size={13} />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Right: Commit SHA, Offline state & Save Action */}
      <div className="flex items-center gap-2">
        {!isOnline && (
          <span className="neo-box-sm px-2 py-0.5 text-[10px] font-mono text-accent-pink bg-white flex items-center gap-1" title="Working in offline mode">
            <WifiOff size={11} /> OFFLINE
          </span>
        )}

        {sha && (
          <span className="neo-box-sm px-2 py-0.5 text-[10px] font-mono text-ink-muted bg-white hidden sm:inline" title={`Commit SHA: ${sha}`}>
            SHA: {sha.slice(0, 7)}
          </span>
        )}

        <Button
          variant={isDirty ? 'primary' : 'secondary'}
          size="sm"
          icon={<Save size={13} />}
          onClick={onSave}
          disabled={!isDirty}
        >
          {isDirty ? (isOnline ? 'Commit (Ctrl+S)' : 'Save Offline') : 'Saved'}
        </Button>
      </div>
    </div>
  );
};
