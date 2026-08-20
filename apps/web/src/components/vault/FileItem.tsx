import React from 'react';
import { FileText, Folder, Trash2 } from 'lucide-react';
import { VaultFile } from '../../types/vault';

interface FileItemProps {
  file: VaultFile;
  isActive: boolean;
  onSelect: (path: string) => void;
  onDelete?: (path: string) => void;
}

export const FileItem: React.FC<FileItemProps> = ({
  file,
  isActive,
  onSelect,
  onDelete
}) => {
  const isDirectory = file.type === 'directory';

  return (
    <div
      onClick={() => onSelect(file.path)}
      className={`group flex items-center justify-between px-3 py-2 cursor-pointer font-mono text-xs transition-all border-b border-cream-border ${
        isActive
          ? 'bg-accent-acid/30 text-ink-primary font-bold border-l-4 border-l-ink-primary'
          : 'text-ink-secondary hover:bg-cream-muted/60 hover:text-ink-primary'
      }`}
    >
      <div className="flex items-center gap-2 truncate">
        {isDirectory ? (
          <Folder size={14} className="text-accent-cobalt flex-shrink-0" />
        ) : (
          <FileText size={14} className={isActive ? 'text-accent-orange' : 'text-ink-muted'} />
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
