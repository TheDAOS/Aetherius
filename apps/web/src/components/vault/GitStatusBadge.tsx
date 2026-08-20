import React from 'react';
import { RefreshCw, GitBranch, CheckCircle2 } from 'lucide-react';
import { SyncStatus } from '../../types/vault';

interface GitStatusBadgeProps {
  status: SyncStatus | null;
  branch: string;
  isDirty?: boolean;
  onSync?: () => void;
}

export const GitStatusBadge: React.FC<GitStatusBadgeProps> = ({
  status,
  branch = 'main',
  isDirty = false,
  onSync
}) => {
  const isSyncing = status?.status === 'running' || status?.status === 'pending';

  return (
    <div className="flex items-center gap-1.5 select-none">
      <div className="neo-box-sm flex items-center gap-1.5 px-2.5 py-1 bg-cream-card text-ink-primary font-mono text-xs">
        <GitBranch size={13} className="text-accent-cobalt" />
        <span className="font-bold">{branch}</span>
        <span className="text-ink-muted">·</span>
        {isDirty ? (
          <span className="flex items-center gap-1 text-accent-orange font-bold">
            <span className="w-2 h-2 rounded-full bg-accent-orange animate-pulse" />
            UNCOMMITTED
          </span>
        ) : (
          <span className="flex items-center gap-1 text-ink-secondary font-semibold">
            <CheckCircle2 size={12} className="text-accent-mint" />
            CLEAN
          </span>
        )}
      </div>

      {onSync && (
        <button
          onClick={onSync}
          disabled={isSyncing}
          className="neo-btn p-1.5 bg-accent-acid hover:bg-[#d4f000] text-ink-primary"
          title="Trigger Git Sync"
        >
          <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
        </button>
      )}
    </div>
  );
};
