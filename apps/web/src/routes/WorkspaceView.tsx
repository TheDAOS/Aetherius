import { Plus, X } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NoteEditor } from "../components/editor/NoteEditor";
import { NotePreview } from "../components/editor/NotePreview";
import { NoteToolbar, type ViewMode } from "../components/editor/NoteToolbar";
import { GraphModal } from "../components/graph/GraphModal";
import { AppShell } from "../components/layout/AppShell";
import { useVault } from "../hooks/useVault";
import { buildGraphIndex } from "../services/intelligence/graphIndexer";
import { linkMention } from "../services/intelligence/linkMention";
import {
  parseMarkdown,
  resolveWikilinkPath,
} from "../services/intelligence/markdownParser";
import { vaultService } from "../services/vault";
import { ConflictModal } from "./ConflictModal";
import { CreateVaultView } from "./CreateVaultView";
import { NewNoteModal } from "./NewNoteModal";
import { SearchModal } from "./SearchModal";
import { SettingsModal } from "./SettingsModal";

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
    () =>
      buildGraphIndex(
        vaultState.files.map((f) =>
          f.path === vaultState.activeFilePath && vaultState.activeFile
            ? { ...f, content: vaultState.content }
            : f,
        ),
      ),
    [
      vaultState.files,
      vaultState.activeFilePath,
      vaultState.activeFile,
      vaultState.content,
    ],
  );

  const allFilePaths = useMemo(
    () => vaultState.files.map((f) => f.path),
    [vaultState.files],
  );

  const titlePaths = useMemo(() => {
    const paths = new Map<string, string>();
    for (const file of vaultState.files) {
      if (file.type !== "file" || !/\.md$/i.test(file.path)) continue;
      const parsed = parseMarkdown(file.content ?? "", file.path);
      paths.set(parsed.title.toLowerCase(), file.path);
      for (const alias of parsed.aliases)
        paths.set(alias.toLowerCase(), file.path);
    }
    return paths;
  }, [vaultState.files]);
  const assetUrls = useRef(new Map<string, string>());
  useEffect(
    () => () => {
      for (const url of assetUrls.current.values()) URL.revokeObjectURL(url);
    },
    [],
  );
  const resolveAsset = useCallback(async (path: string) => {
    const file = await vaultService.getFile(path);
    const extension = path.split(".").pop()?.toLowerCase();
    const mime: Record<string, string> = {
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      gif: "image/gif",
      webp: "image/webp",
      avif: "image/avif",
    };
    if (!extension || !mime[extension] || file.encoding !== "base64")
      throw new Error("Unsupported image format");
    const key = `${path}:${file.sha ?? file.content}`;
    const cached = assetUrls.current.get(key);
    if (cached) return cached;
    const bytes = Uint8Array.from(atob(file.content ?? ""), (c) =>
      c.charCodeAt(0),
    );
    const url = URL.createObjectURL(
      new Blob([bytes], { type: mime[extension] }),
    );
    assetUrls.current.set(key, url);
    return url;
  }, []);
  if (!vaultState.isLoading && !vaultState.vault && vaultState.error) {
    return (
      <main role="alert" className="p-8">
        <p>{vaultState.error}</p>
        <button type="button" onClick={vaultState.refreshVault}>
          Retry loading vault
        </button>
      </main>
    );
  }
  if (!vaultState.isLoading && !vaultState.vault) {
    return <CreateVaultView onVaultCreated={vaultState.refreshVault} />;
  }

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
            const targetFile = await vaultService.getFile(targetPath);
            const updatedContent = linkMention(
              sourceFile.content ?? "",
              targetFile,
            );

            await vaultService.updateFile(sourcePath, {
              content: updatedContent,
              expectedSha: sourceFile.sha,
              commitMessage: `Link [[${targetPath}]] in ${sourcePath}`,
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
            const remoteFile = await vaultService.getRemoteFile(
              vaultState.conflict?.path ?? vaultState.activeFilePath,
            );
            setRemoteConflictContent(remoteFile.content || "");
            setIsConflictOpen(true);
          } catch (err) {
            alert(`Could not load remote changes: ${(err as Error).message}`);
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
                const notePath = vaultState.activeFilePath;
                if (!/\.(png|jpe?g|gif|webp|avif)$/i.test(file.name)) {
                  alert("Use PNG, JPEG, GIF, WebP, or AVIF images.");
                  return;
                }
                try {
                  const bytes = new Uint8Array(await file.arrayBuffer());
                  let binary = "";
                  for (let i = 0; i < bytes.length; i += 8192)
                    binary += String.fromCharCode(
                      ...bytes.subarray(i, i + 8192),
                    );
                  const imagePath = `assets/images/${crypto.randomUUID()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
                  await vaultService.createFile({
                    path: imagePath,
                    content: btoa(binary),
                    encoding: "base64",
                    commitMessage: `Attach ${file.name}`,
                  });
                  vaultState.appendToFile(
                    notePath,
                    `\n\n![${file.name.replace(/[[\]\n]/g, "_")}](/${imagePath})\n\n`,
                  );
                } catch (err) {
                  alert(`Failed to attach image: ${(err as Error).message}`);
                }
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
                </div>
              </div>
            )}

            {vaultState.error && !vaultState.hasConflict && (
              <div className="px-4 py-2 bg-accent-orange text-white font-mono text-xs border-b-2 border-ink-primary flex items-center justify-between">
                <span className="font-bold flex-1 truncate mr-4">
                  ⚠️ Error: {vaultState.error}
                </span>
                <button
                  onClick={vaultState.clearError}
                  className="p-1 hover:bg-white/20 rounded transition-colors"
                  title="Dismiss"
                >
                  <X size={14} />
                </button>
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
                    readOnly={
                      !vaultState.activeFile || vaultState.isChangingBranch
                    }
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
                    allFilePaths={allFilePaths}
                    resolveAsset={resolveAsset}
                    onSelectFile={(path) =>
                      vaultState.selectFile(
                        resolveWikilinkPath(path, allFilePaths, titlePaths) ??
                          path,
                      )
                    }
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
              filePath={vaultState.conflict?.path ?? vaultState.activeFilePath}
              localContent={
                vaultState.conflict?.path === vaultState.activeFilePath
                  ? vaultState.content
                  : (vaultState.conflict?.content ?? "")
              }
              remoteContent={remoteConflictContent}
              onAcceptRemote={() => vaultState.resolveConflict("remote")}
              onForceOverwrite={() => vaultState.resolveConflict("overwrite")}
              onSaveAsCopy={() => vaultState.resolveConflict("copy")}
            />

            <SettingsModal
              isOpen={isSettingsOpen}
              onClose={() => setIsSettingsOpen(false)}
              vault={vaultState.vault}
              syncStatus={vaultState.syncStatus}
              isDirty={vaultState.isDirty}
              onChangeBranch={vaultState.changeBranch}
            />

            <NewNoteModal
              isOpen={isNewNoteOpen}
              onClose={() => setIsNewNoteOpen(false)}
              files={vaultState.files}
              onCreateNote={async (path, content) => {
                await vaultState.createFile(path, content);
              }}
            />
          </div>
        );
      })()}
    </AppShell>
  );
};
