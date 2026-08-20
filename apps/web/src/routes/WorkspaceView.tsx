import React, { useState, useEffect } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { NoteToolbar, ViewMode } from '../components/editor/NoteToolbar';
import { NoteEditor } from '../components/editor/NoteEditor';
import { NotePreview } from '../components/editor/NotePreview';
import { SearchModal } from './SearchModal';
import { SettingsModal } from './SettingsModal';
import { NewNoteModal } from './NewNoteModal';
import { Plus } from 'lucide-react';

export const WorkspaceView: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNewNoteOpen, setIsNewNoteOpen] = useState(false);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        setIsNewNoteOpen(true);
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault();
        setViewMode((prev) => (prev === 'edit' ? 'preview' : prev === 'preview' ? 'split' : 'edit'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <AppShell
      onOpenSearch={() => setIsSearchOpen(true)}
      onOpenSettings={() => setIsSettingsOpen(true)}
      onNewNote={() => setIsNewNoteOpen(true)}
    >
      {(vaultState) => (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-cream-shell">
          {/* Note Action Toolbar */}
          <NoteToolbar
            viewMode={viewMode}
            onChangeViewMode={setViewMode}
            isDirty={vaultState.isDirty}
            sha={vaultState.activeFile?.sha}
            onSave={vaultState.saveActiveFile}
            onInsertMarkdown={(snippet) => {
              vaultState.updateContent(vaultState.content + snippet);
            }}
          />

          {/* Breadcrumb Path Bar */}
          <div className="px-4 py-1.5 bg-paper-canvas border-b border-cream-border flex items-center justify-between text-xs font-mono text-ink-muted">
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-accent-cobalt font-bold">vault://</span>
              <span className="text-ink-primary font-bold">{vaultState.activeFilePath}</span>
            </div>
            {vaultState.activeFile?.lastModified && (
              <span className="text-[10px] hidden sm:inline">
                Last modified: {new Date(vaultState.activeFile.lastModified).toLocaleTimeString()}
              </span>
            )}
          </div>

          {/* Workspace Content Canvas */}
          <div className="flex-1 flex overflow-hidden relative">
            {(viewMode === 'edit' || viewMode === 'split') && (
              <div className={`h-full flex flex-col ${viewMode === 'split' ? 'w-full md:w-1/2 border-r-2 border-ink-primary' : 'w-full'}`}>
                <NoteEditor
                  content={vaultState.content}
                  onChange={vaultState.updateContent}
                  onSave={vaultState.saveActiveFile}
                />
              </div>
            )}

            {(viewMode === 'preview' || viewMode === 'split') && (
              <div className={`h-full overflow-y-auto ${viewMode === 'split' ? 'hidden md:flex md:w-1/2' : 'w-full flex'}`}>
                <NotePreview content={vaultState.content} />
              </div>
            )}
          </div>

          {/* Mobile Floating Action Button (FAB) */}
          <button
            onClick={() => setIsNewNoteOpen(true)}
            className="md:hidden fixed bottom-6 right-6 z-30 neo-btn w-12 h-12 rounded-full bg-accent-orange text-white flex items-center justify-center shadow-neo-lg"
            title="Create Note"
          >
            <Plus size={22} />
          </button>

          {/* Modals */}
          <SearchModal
            isOpen={isSearchOpen}
            onClose={() => setIsSearchOpen(false)}
            onSelectFile={vaultState.selectFile}
          />

          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            vault={vaultState.vault}
            syncStatus={vaultState.syncStatus}
            onResetVault={vaultState.refreshVault}
          />

          <NewNoteModal
            isOpen={isNewNoteOpen}
            onClose={() => setIsNewNoteOpen(false)}
            onCreateNote={async (path) => {
              await vaultState.createFile(path);
            }}
          />
        </div>
      )}
    </AppShell>
  );
};
