import React, { useState } from 'react';
import { TopHeader } from './TopHeader';
import { Sidebar } from './Sidebar';
import { useVault } from '../../hooks/useVault';

interface AppShellProps {
  children: (vaultState: ReturnType<typeof useVault>) => React.ReactNode;
  onOpenSearch: () => void;
  onOpenGraph?: () => void;
  onOpenSettings: () => void;
  onNewNote: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  onOpenSearch,
  onOpenGraph,
  onOpenSettings,
  onNewNote
}) => {
  const vaultState = useVault();
  const [isSidebarMobileOpen, setIsSidebarMobileOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-cream-shell font-sans">
      {/* Top Header */}
      <TopHeader
        onNewNote={onNewNote}
        onOpenSearch={onOpenSearch}
        onOpenGraph={onOpenGraph}
        onOpenSettings={onOpenSettings}
        onToggleSidebar={() => setIsSidebarMobileOpen(!isSidebarMobileOpen)}
        syncStatus={vaultState.syncStatus}
        branch={vaultState.vault?.branch || 'main'}
        isDirty={vaultState.isDirty}
        onSync={vaultState.sync}
      />

      {/* Main Workspace Area (Sidebar + Content Canvas) */}
      <div className="flex-1 flex overflow-hidden relative">
        <Sidebar
          files={vaultState.files}
          activeFilePath={vaultState.activeFilePath}
          onSelectFile={vaultState.selectFile}
          onDeleteFile={vaultState.deleteFile}
          isOpenMobile={isSidebarMobileOpen}
          onCloseMobile={() => setIsSidebarMobileOpen(false)}
        />

        <main className="flex-1 flex flex-col h-full overflow-hidden bg-cream-shell relative">
          {children(vaultState)}
        </main>
      </div>
    </div>
  );
};
