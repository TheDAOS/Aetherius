import React from 'react';
import { Plus, Search, Settings, Menu } from 'lucide-react';
import { Button } from '../common/Button';
import { GitStatusBadge } from '../vault/GitStatusBadge';
import { SyncStatus } from '../../types/vault';

interface TopHeaderProps {
  onNewNote: () => void;
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  onToggleSidebar: () => void;
  syncStatus: SyncStatus | null;
  branch: string;
  isDirty: boolean;
  onSync: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  onNewNote,
  onOpenSearch,
  onOpenSettings,
  onToggleSidebar,
  syncStatus,
  branch,
  isDirty,
  onSync
}) => {
  return (
    <header className="h-14 border-b-2 border-ink-primary bg-cream-shell px-3 sm:px-4 flex items-center justify-between z-30 select-none">
      {/* Left: Branding & Mobile Toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="neo-btn p-1.5 bg-white text-ink-primary md:hidden"
          title="Toggle Navigation"
        >
          <Menu size={16} />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 neo-box-sm bg-accent-acid flex items-center justify-center font-display font-black text-sm text-ink-primary">
            Æ
          </div>
          <span className="font-display font-extrabold text-base tracking-tight text-ink-primary hidden sm:inline">
            AETHERIUS
          </span>
          <span className="neo-box-sm px-1.5 py-0.2 text-[9px] font-mono font-bold bg-accent-cobalt text-white hidden md:inline">
            VAULT v1
          </span>
        </div>
      </div>

      {/* Middle / Right: Git Status & Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={onOpenSearch}
          className="neo-btn flex items-center gap-2 px-2.5 py-1.5 bg-white text-xs font-mono text-ink-secondary hover:text-ink-primary"
          title="Quick Search (Ctrl+K)"
        >
          <Search size={14} className="text-ink-muted" />
          <span className="hidden md:inline">Search...</span>
          <kbd className="hidden md:inline px-1 py-0.2 text-[10px] bg-cream-muted border border-ink-primary/30">
            ⌘K
          </kbd>
        </button>

        <div className="hidden sm:block">
          <GitStatusBadge
            status={syncStatus}
            branch={branch}
            isDirty={isDirty}
            onSync={onSync}
          />
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus size={14} />}
          onClick={onNewNote}
        >
          <span className="hidden sm:inline">New Note</span>
        </Button>

        <button
          onClick={onOpenSettings}
          className="neo-btn p-1.5 bg-cream-card hover:bg-white text-ink-primary"
          title="Vault Settings"
        >
          <Settings size={16} />
        </button>
      </div>
    </header>
  );
};
