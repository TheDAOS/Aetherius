import type React from "react";
import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopHeader } from "./TopHeader";
import type { useVault } from "../../hooks/useVault";

interface AppShellProps {
  children: React.ReactNode;
  vaultState: ReturnType<typeof useVault>;
  onOpenSearch: () => void;
  onOpenGraph?: () => void;
  onOpenSettings: () => void;
  onNewNote: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  vaultState,
  onOpenSearch,
  onOpenGraph,
  onOpenSettings,
  onNewNote,
}) => {
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
        branch={vaultState.vault?.branch || "main"}
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
          {children}
        </main>
      </div>
    </div>
  );
};
