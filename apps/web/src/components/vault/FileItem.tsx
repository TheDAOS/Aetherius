import React from 'react';
import { FileText, Folder, FolderOpen, Trash2, ChevronRight, ChevronDown } from 'lucide-react';
import { VaultFile } from '../../types/vault';

interface FileItemProps {
  file: VaultFile;
  isActive: boolean;
  depth?: number;
  isOpen?: boolean;
  onToggleFolder?: (path: string) => void;
  onSelect: (path: string) => void;
  onDelete?: (path: string) => void;
}

export const FileItem: React.FC<FileItemProps> = ({
  file,
  isActive,
  depth = 0,
  isOpen = true,
  onToggleFolder,
  onSelect,
  onDelete
}) => {
  const isDirectory = file.type === 'directory';

  return (
    <div
      onClick={() => {
        if (isDirectory && onToggleFolder) {
          onToggleFolder(file.path);
        } else {
          onSelect(file.path);
        }
      }}
      style={{ paddingLeft: `${Math.max(12, depth * 14 + 12)}px` }}
      className={`group flex items-center justify-between pr-3 py-1.5 cursor-pointer font-mono text-xs transition-all border-b border-cream-border/50 ${
        isActive
          ? 'bg-accent-acid/30 text-ink-primary font-bold border-l-4 border-l-ink-primary'
          : 'text-ink-secondary hover:bg-cream-muted/60 hover:text-ink-primary'
      }`}
    >
      <div className="flex items-center gap-1.5 truncate">
        {isDirectory ? (
          <>
            {isOpen ? <ChevronDown size={12} className="text-ink-muted flex-shrink-0" /> : <ChevronRight size={12} className="text-ink-muted flex-shrink-0" />}
            {isOpen ? <FolderOpen size={14} className="text-accent-cobalt flex-shrink-0" /> : <Folder size={14} className="text-accent-cobalt flex-shrink-0" />}
          </>
        ) : (
          <>
            <span className="w-3" />
            <FileText size={14} className={isActive ? 'text-accent-orange flex-shrink-0' : 'text-ink-muted flex-shrink-0'} />
          </>
        )}
        <span className="truncate">{file.name}</span>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {onDelete && !isDirectory && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Delete ${file.name}?`)) {
                onDelete(file.path);
              }
            }}
            className="p-1 hover:text-accent-pink transition-colors"
            title="Delete file"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
    </div>
  );
};
