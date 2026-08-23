import { Plus } from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { NoteEditor } from "../components/editor/NoteEditor";
import { NotePreview } from "../components/editor/NotePreview";
import { NoteToolbar, type ViewMode } from "../components/editor/NoteToolbar";
import { GraphModal } from "../components/graph/GraphModal";
import { AppShell } from "../components/layout/AppShell";
import { buildGraphIndex } from "../services/intelligence/graphIndexer";
import { vaultService } from "../services/vault";
import { ConflictModal } from "./ConflictModal";
import { NewNoteModal } from "./NewNoteModal";
import { SearchModal } from "./SearchModal";
import { SettingsModal } from "./SettingsModal";
import { useVault } from "../hooks/useVault";

export const WorkspaceView: React.FC = () => {
  const vaultState = useVault();
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isGraphOpen, setIsGraphOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNewNoteOpen, setIsNewNoteOpen] = useState(false);
  const [isConflictOpen, setIsConflictOpen] = useState(false);
  const [remoteConflictContent, setRemoteConflictContent] =
    useState<string>("");

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.key === "g") {
        e.preventDefault();
        setIsGraphOpen((prev) => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        setIsNewNoteOpen(true);
      } else if ((e.metaKey || e.ctrlKey) && e.key === "e") {
        e.preventDefault();
        setViewMode((prev) =>
          prev === "edit" ? "preview" : prev === "preview" ? "split" : "edit",
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Build live graph index from files
  const graphIndex = useMemo(
    () => buildGraphIndex(vaultState.files),
    [vaultState.files],
  );

  const allFilePaths = useMemo(
    () => vaultState.files.map((f) => f.path),
    [vaultState.files],
  );

  return (
    <AppShell
      vaultState={vaultState}
      onOpenSearch={() => setIsSearchOpen(true)}
      onOpenGraph={() => setIsGraphOpen(true)}
      onOpenSettings={() => setIsSettingsOpen(true)}
      onNewNote={() => setIsNewNoteOpen(true)}
    >
      {(() => {
        const linkedReferences =
          graphIndex.backlinks.get(vaultState.activeFilePath) || [];
        const unlinkedMentions =
          graphIndex.unlinkedMentions.get(vaultState.activeFilePath) || [];

        const handleLinkMention = async (
          sourcePath: string,
          targetPath: string,
        ) => {
          try {
            const sourceFile = await vaultService.getFile(sourcePath);
            const targetNoteName =
              targetPath.replace(/\.md$/, "").split("/").pop() || targetPath;

            // Case-insensitive replacement of first occurrence of note title/name
            const regex = new RegExp(
              `\\b${targetNoteName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
              "i",
            );
            const updatedContent = (sourceFile.content || "").replace(
              regex,
              `[[${targetNoteName}]]`,
            );

            await vaultService.updateFile(sourcePath, {
              content: updatedContent,
              expectedSha: sourceFile.sha,
              commitMessage: `Link [[${targetNoteName}]] in ${sourcePath}`,
            });

            await vaultState.refreshVault();
          } catch (err: unknown) {
            const error = err as { message?: string };
            alert(`Could not convert mention: ${error?.message || "Error"}`);
          }
        };

        const handleOpenConflictDiff = async () => {
          if (!vaultState.activeFilePath) return;
          try {
            const remoteFile = await vaultService.getFile(
              vaultState.activeFilePath,
            );
            setRemoteConflictContent(remoteFile.content || "");
            setIsConflictOpen(true);
          } catch {
            vaultState.reloadActiveFile();
          }
        };

        return (
          <div className="flex-1 flex flex-col h-full overflow-hidden bg-cream-shell">
            {/* Note Action Toolbar */}
            <NoteToolbar
              viewMode={viewMode}
              onChangeViewMode={setViewMode}
              isDirty={vaultState.isDirty}
              isOnline={vaultState.isOnline}
              sha={vaultState.activeFile?.sha}
              onSave={vaultState.saveActiveFile}
              onInsertMarkdown={(snippet) => {
                vaultState.updateContent(vaultState.content + snippet);
              }}
              onAttachImage={async (file) => {
                const reader = new FileReader();
                reader.onload = async () => {
                  const base64Content =
                    (reader.result as string).split(",")[1] || "";
                  const sanitizedName = file.name.replace(
                    /[^a-zA-Z0-9._-]/g,
                    "_",
                  );
                  const imagePath = `assets/images/${Date.now()}_${sanitizedName}`;
                  try {
                    // Pass base64 directly — createFile handles encoding
                    // For binary files, we pass the base64 string as content
                    await vaultState.createFile(imagePath, base64Content);
                    vaultState.updateContent(
                      vaultState.content +
                        `\n\n![${file.name}](${imagePath})\n\n`,
                    );
                  } catch (e: unknown) {
                    const err = e as { message?: string };
                    alert(`Failed to attach image: ${err?.message || "Error"}`);
                  }
                };
                reader.readAsDataURL(file);
              }}
            />

            {/* Conflict / Error Banner */}
            {vaultState.hasConflict && (
              <div className="px-4 py-2 bg-accent-pink text-ink-primary font-mono text-xs border-b-2 border-ink-primary flex items-center justify-between">
                <span className="font-bold">
                  ⚠️ Conflict: Remote file changed on GitHub.
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleOpenConflictDiff}
                    className="neo-btn px-2 py-0.5 bg-accent-acid text-ink-primary text-xs font-bold"
                  >
                    View Diff & Resolve
                  </button>
                  <button
                    onClick={vaultState.reloadActiveFile}
                    className="neo-btn px-2 py-0.5 bg-white text-ink-primary text-xs hover:bg-cream-muted"
                  >
                    Reload
                  </button>
                </div>
              </div>
            )}

            {/* Breadcrumb Path Bar */}
            <div className="px-4 py-1.5 bg-paper-canvas border-b border-cream-border flex items-center justify-between text-xs font-mono text-ink-muted">
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-accent-cobalt font-bold">vault://</span>
                <span className="text-ink-primary font-bold">
                  {vaultState.activeFilePath}
                </span>
              </div>
              {vaultState.activeFile?.lastModified && (
                <span className="text-[10px] hidden sm:inline">
                  Last modified:{" "}
                  {new Date(
                    vaultState.activeFile.lastModified,
                  ).toLocaleTimeString()}
                </span>
              )}
            </div>

            {/* Workspace Content Canvas */}
            <div className="flex-1 flex overflow-hidden relative">
              {(viewMode === "edit" || viewMode === "split") && (
                <div
                  className={`h-full flex flex-col ${viewMode === "split" ? "w-full md:w-1/2 border-r-2 border-ink-primary" : "w-full"}`}
                >
                  <NoteEditor
                    content={vaultState.content}
                    allFilePaths={allFilePaths}
                    onChange={vaultState.updateContent}
                    onSave={vaultState.saveActiveFile}
                  />
                </div>
              )}

              {(viewMode === "preview" || viewMode === "split") && (
                <div
                  className={`h-full overflow-y-auto ${viewMode === "split" ? "hidden md:flex md:w-1/2" : "w-full flex"}`}
                >
                  <NotePreview
                    content={vaultState.content}
                    activeFilePath={vaultState.activeFilePath}
                    linkedReferences={linkedReferences}
                    unlinkedMentions={unlinkedMentions}
                    onSelectFile={(path) => {
                      // If it's a wikilink target without extension, search/resolve
                      const resolved =
                        allFilePaths.find((p) =>
                          p.toLowerCase().includes(path.toLowerCase()),
                        ) || path;
                      vaultState.selectFile(resolved);
                    }}
                    onLinkMention={handleLinkMention}
                  />
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

            <GraphModal
              isOpen={isGraphOpen}
              onClose={() => setIsGraphOpen(false)}
              graphIndex={graphIndex}
              activeFilePath={vaultState.activeFilePath}
              onSelectFile={vaultState.selectFile}
            />

            <ConflictModal
              isOpen={isConflictOpen}
              onClose={() => setIsConflictOpen(false)}
              filePath={vaultState.activeFilePath}
              localContent={vaultState.content}
              remoteContent={remoteConflictContent}
              onAcceptRemote={() => vaultState.reloadActiveFile()}
              onForceOverwrite={async () => {
                // Fetch fresh remote sha and overwrite
                if (!vaultState.activeFilePath) return;
                const freshRemote = await vaultService.getFile(
                  vaultState.activeFilePath,
                );
                await vaultService.updateFile(vaultState.activeFilePath, {
                  content: vaultState.content,
                  expectedSha: freshRemote.sha,
                  commitMessage: `Force update ${vaultState.activeFilePath} (resolved conflict)`,
                });
                await vaultState.refreshVault();
              }}
              onSaveAsCopy={async () => {
                const parts = vaultState.activeFilePath.split(".");
                const ext = parts.pop() || "md";
                const copyPath = `${parts.join(".")}.conflict-${Date.now()}.${ext}`;
                await vaultState.createFile(copyPath, vaultState.content);
                await vaultState.reloadActiveFile();
              }}
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
        );
      })()}
    </AppShell>
  );
};
