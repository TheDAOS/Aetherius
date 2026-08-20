import React, { useState } from 'react';
import { FolderTree, X } from 'lucide-react';
import { VaultFile } from '../../types/vault';
import { FileTree } from '../vault/FileTree';

interface SidebarProps {
  files: VaultFile[];
  activeFilePath: string;
  onSelectFile: (path: string) => void;
  onDeleteFile?: (path: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  files,
  activeFilePath,
  onSelectFile,
  onDeleteFile,
  isOpenMobile,
  onCloseMobile
}) => {
  const [filter, setFilter] = useState<'all' | 'notes' | 'templates'>('all');

  const filteredFiles = files.filter((f) => {
    if (filter === 'notes') return f.path.startsWith('notes/') || f.path === 'README.md';
    if (filter === 'templates') return f.path.startsWith('templates/');
    return true;
  });

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-ink-primary/50 backdrop-blur-xs md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 md:w-60 lg:w-64 bg-cream-shell border-r-2 border-ink-primary flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-3 border-b-2 border-ink-primary flex items-center justify-between bg-cream-muted">
          <div className="flex items-center gap-2">
            <FolderTree size={15} className="text-ink-primary" />
            <span className="font-display font-bold text-xs tracking-wider uppercase text-ink-primary">
              Explorer
            </span>
          </div>
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1 hover:text-accent-pink"
          >
            <X size={16} />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex border-b border-cream-border text-[11px] font-mono font-semibold bg-cream-shell">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 py-1.5 text-center border-r border-cream-border transition-colors ${
              filter === 'all'
                ? 'bg-paper-canvas text-ink-primary font-bold border-b-2 border-b-ink-primary'
                : 'text-ink-muted hover:text-ink-primary'
            }`}
          >
            ALL
          </button>
          <button
            onClick={() => setFilter('notes')}
            className={`flex-1 py-1.5 text-center border-r border-cream-border transition-colors ${
              filter === 'notes'
                ? 'bg-paper-canvas text-ink-primary font-bold border-b-2 border-b-ink-primary'
                : 'text-ink-muted hover:text-ink-primary'
            }`}
          >
            NOTES
          </button>
          <button
            onClick={() => setFilter('templates')}
            className={`flex-1 py-1.5 text-center transition-colors ${
              filter === 'templates'
                ? 'bg-paper-canvas text-ink-primary font-bold border-b-2 border-b-ink-primary'
                : 'text-ink-muted hover:text-ink-primary'
            }`}
          >
            TEMPLATES
          </button>
        </div>

        {/* File Tree List */}
        <div className="flex-1 overflow-y-auto bg-cream-shell">
          <FileTree
            files={filteredFiles}
            activeFilePath={activeFilePath}
            onSelectFile={(path) => {
              onSelectFile(path);
              onCloseMobile();
            }}
            onDeleteFile={onDeleteFile}
          />
        </div>

        {/* Bottom Metadata Info */}
        <div className="p-2.5 border-t-2 border-ink-primary bg-cream-muted text-[11px] font-mono text-ink-secondary flex items-center justify-between select-none">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-accent-mint border border-ink-primary" />
            GitHub Synced
          </span>
          <span className="text-ink-muted">{filteredFiles.length} files</span>
        </div>
      </aside>
    </>
  );
};
