import { useCallback, useEffect, useRef, useState } from "react";
import { VaultApiError, vaultService } from "../services/vault";
import type { SyncStatus, Vault, VaultFile } from "../types/vault";

export function useVault() {
  const [vault, setVault] = useState<Vault | null>(null);
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [activeFilePath, setActiveFilePath] = useState(
    () =>
      new URLSearchParams(window.location.hash.slice(1)).get("note") ??
      "README.md",
  );
  const [activeFile, setActiveFile] = useState<VaultFile | null>(null);
  const [content, setContent] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isChangingBranch, setIsChangingBranch] = useState(false);
  const branchChanging = useRef(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [conflict, setConflict] = useState<{
    path: string;
    content: string;
  } | null>(null);
  const current = useRef({ path: activeFilePath, content, dirty: isDirty });
  const loadVersion = useRef(0);
  const saving = useRef(false);
  const mounted = useRef(true);

  const updateContent = useCallback((value: string) => {
    if (branchChanging.current) return;
    current.current.content = value;
    current.current.dirty = true;
    setContent(value);
    setIsDirty(true);
  }, []);
  const loadActiveFile = useCallback(async (path: string) => {
    if (current.current.dirty) return;
    const initialContent = current.current.content;
    const version = ++loadVersion.current;
    try {
      const file = await vaultService.getFile(path);
      if (
        !mounted.current ||
        version !== loadVersion.current ||
        current.current.path !== path
      )
        return;
      if (current.current.dirty || current.current.content !== initialContent) {
        setActiveFile((previous) =>
          previous?.path === path ? previous : file,
        );
        return;
      }
      setActiveFile(file);
      setContent(file.content ?? "");
      setIsDirty(false);
      current.current.content = file.content ?? "";
      current.current.dirty = false;
    } catch (err) {
      if (mounted.current && version === loadVersion.current)
        setError(
          err instanceof VaultApiError && err.code === "BRANCH_CHANGED"
            ? "The vault branch changed on another device. Open Settings and restore the original branch to synchronize this device’s pending notes."
            : (err as Error).message,
        );
    }
  }, []);
  const selectFile = useCallback((path: string, recordHistory = true) => {
    if (branchChanging.current) return;
    if (path === current.current.path) return;
    if (
      current.current.dirty &&
      !window.confirm(
        "You have unsaved changes. Switch files and discard this editor draft?",
      )
    )
      return;
    ++loadVersion.current;
    current.current = { path, content: "", dirty: false };
    setActiveFile(null);
    setContent("");
    setIsDirty(false);
    setActiveFilePath(path);
    if (
      recordHistory &&
      new URLSearchParams(window.location.hash.slice(1)).get("note") !== path
    )
      window.history.pushState(null, "", `#note=${encodeURIComponent(path)}`);
  }, []);

  // Bound downloads so the derived graph can consume real note bodies without
  // issuing an unbounded burst of GitHub requests. Offline uncached notes remain metadata.
  const refreshFiles = useCallback(async () => {
    const { entries } = await vaultService.listFiles();
    const hydrated = [...entries];
    let cursor = 0;
    await Promise.all(
      Array.from({ length: Math.min(4, entries.length) }, async () => {
        for (let i = cursor++; i < entries.length; i = cursor++) {
          const file = entries[i];
          if (
            file.type === "file" &&
            /\.md$/i.test(file.path) &&
            file.content === undefined
          ) {
            try {
              hydrated[i] = await vaultService.getFile(file.path);
            } catch (err) {
              if (navigator.onLine) throw err;
            }
          }
        }
      }),
    );
    if (mounted.current) setFiles(hydrated);
    return hydrated;
  }, []);
  const sync = useCallback(async () => {
    setSyncStatus({ status: "running", lastSyncAt: null });
    try {
      const result = await vaultService.syncPendingMutations();
      if (!mounted.current) return;
      const failed = result.errors[0];
      if (failed) {
        setError(failed.error);
        if (failed.code === "CONFLICT")
          setConflict({
            path: failed.mutation.path,
            content: failed.mutation.content ?? "",
          });
        setSyncStatus({
          status: failed.code === "CONFLICT" ? "conflict" : "failed",
          lastSyncAt: null,
          message: failed.error,
        });
      } else {
        setError(null);
        setSyncStatus(await vaultService.getSyncStatus());
      }
      await refreshFiles();
      // Reload only a clean editor. Unsaved typing always wins over refreshes.
      if (!current.current.dirty && current.current.path)
        await loadActiveFile(current.current.path);
    } catch (err) {
      if (mounted.current) {
        setError(
          err instanceof VaultApiError && err.code === "BRANCH_CHANGED"
            ? "The vault branch changed on another device. Open Settings and restore the original branch to synchronize this device’s pending notes."
            : (err as Error).message,
        );
        setSyncStatus({
          status: "failed",
          lastSyncAt: null,
          message: (err as Error).message,
        });
      }
    }
  }, [refreshFiles, loadActiveFile]);
  const refreshVault = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const metadata = await vaultService.getVault();
      if (!mounted.current) return;
      setVault((previous) =>
        previous?.id === metadata?.id && previous?.branch === metadata?.branch
          ? previous
          : metadata,
      );
      if (!metadata) return;
      const loaded = await refreshFiles();
      setSyncStatus(await vaultService.getSyncStatus());
      if (!loaded.some((f) => f.path === current.current.path)) {
        const first = loaded.find(
          (f) => f.type === "file" && /\.md$/i.test(f.path),
        );
        current.current.path = first?.path ?? "";
        setActiveFilePath(first?.path ?? "");
      }
    } catch (err) {
      if (mounted.current)
        setError(
          err instanceof VaultApiError && err.code === "BRANCH_CHANGED"
            ? "The vault branch changed on another device. Open Settings and restore the original branch to synchronize this device’s pending notes."
            : (err as Error).message,
        );
    } finally {
      if (mounted.current) setIsLoading(false);
    }
  }, [refreshFiles]);
  useEffect(() => {
    mounted.current = true;
    void refreshVault().then(async () => {
      if (mounted.current && navigator.onLine) {
        // A null vault has no operations to synchronize.
        if (await vaultService.getVault().catch(() => null)) await sync();
      }
    });
    return () => {
      mounted.current = false;
      ++loadVersion.current;
    };
  }, [refreshVault, sync]);
  useEffect(() => {
    if (vault && activeFilePath) void loadActiveFile(activeFilePath);
  }, [vault, activeFilePath, loadActiveFile]);
  useEffect(() => {
    const online = () => {
      setIsOnline(true);
      void sync();
    };
    const offline = () => {
      setIsOnline(false);
      setSyncStatus({
        status: "idle",
        lastSyncAt: null,
        message: "Offline — changes stay on this device",
      });
    };
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (current.current.dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [sync]);
  const saveActiveFile = useCallback(async () => {
    if (
      branchChanging.current ||
      saving.current ||
      !activeFile ||
      activeFile.path !== current.current.path
    )
      return;
    const path = current.current.path;
    const draft = current.current.content;
    saving.current = true;
    try {
      setError(null);
      const updated = await vaultService.updateFile(path, {
        content: draft,
        expectedSha: activeFile.sha,
        commitMessage: `Update ${activeFile.name}`,
      });
      if (current.current.path === path) {
        setActiveFile(updated);
        const dirty = current.current.content !== draft;
        setIsDirty(dirty);
        current.current.dirty = dirty;
      }
      setSyncStatus(await vaultService.getSyncStatus());
      await refreshFiles();
    } catch (err) {
      if (err instanceof VaultApiError && err.code === "CONFLICT")
        setConflict({ path, content: draft });
      setError(
        err instanceof VaultApiError && err.code === "BRANCH_CHANGED"
          ? "The vault branch changed on another device. Open Settings and restore the original branch to synchronize this device’s pending notes."
          : (err as Error).message,
      );
    } finally {
      saving.current = false;
    }
  }, [activeFile, refreshFiles]);
  const createFile = useCallback(
    async (path: string, initialContent = "# New Note\n\nStart typing...") => {
      if (branchChanging.current)
        throw new Error("Wait for the branch change to finish");
      if (
        current.current.dirty &&
        !window.confirm(
          "You have unsaved changes. Create a note and discard this editor draft?",
        )
      )
        throw new Error("Note creation cancelled");
      const initialContentSnapshot = current.current.content;
      const created = await vaultService.createFile({
        path,
        content: initialContent,
        commitMessage: `Create ${path}`,
      });
      await refreshFiles();
      if (
        current.current.content !== initialContentSnapshot &&
        current.current.dirty
      )
        throw new Error(
          `Created ${path}; your current editor draft was preserved. Select the new note after saving.`,
        );
      current.current.dirty = false;
      selectFile(path);
      setSyncStatus(await vaultService.getSyncStatus());
      return created;
    },
    [refreshFiles, selectFile],
  );
  const deleteFile = useCallback(
    async (path: string) => {
      if (
        current.current.path === path &&
        current.current.dirty &&
        !window.confirm("Delete this note and its unsaved editor draft?")
      )
        return;
      try {
        await vaultService.deleteFile(
          path,
          files.find((f) => f.path === path)?.sha,
        );
        const remaining = await refreshFiles();
        if (current.current.path === path) {
          current.current.dirty = false;
          selectFile(
            remaining.find((f) => f.type === "file" && /\.md$/i.test(f.path))
              ?.path ?? "",
          );
        }
        setSyncStatus(await vaultService.getSyncStatus());
      } catch (err) {
        setError(
          err instanceof VaultApiError && err.code === "BRANCH_CHANGED"
            ? "The vault branch changed on another device. Open Settings and restore the original branch to synchronize this device’s pending notes."
            : (err as Error).message,
        );
      }
    },
    [files, refreshFiles, selectFile],
  );
  const resolveConflict = useCallback(
    async (action: "remote" | "overwrite" | "copy") => {
      if (!conflict) return;
      const draft =
        current.current.path === conflict.path
          ? current.current.content
          : conflict.content;
      await vaultService.resolveConflict(conflict.path, action, draft);
      setConflict(null);
      setError(null);
      await refreshFiles();
      if (current.current.path === conflict.path) {
        if (current.current.content !== draft)
          setActiveFile(await vaultService.getFile(conflict.path));
        else {
          current.current.dirty = false;
          await loadActiveFile(conflict.path);
        }
      }
      setSyncStatus(await vaultService.getSyncStatus());
    },
    [conflict, refreshFiles, loadActiveFile],
  );
  const appendToFile = useCallback(
    (path: string, snippet: string) => {
      if (current.current.path !== path)
        throw new Error(
          "The attachment was uploaded, but the active note changed. Insert its vault path into the intended note.",
        );
      updateContent(current.current.content + snippet);
    },
    [updateContent],
  );
  const changeBranch = useCallback(
    async (branch: string) => {
      if (branchChanging.current) return;
      if (current.current.dirty)
        throw new Error(
          "Save or discard the editor draft before changing branches",
        );
      branchChanging.current = true;
      setIsChangingBranch(true);
      try {
        await vaultService.changeBranch(branch);
        ++loadVersion.current;
        setActiveFile(null);
        setContent("");
        current.current.content = "";
        await refreshVault();
        await loadActiveFile(current.current.path);
      } finally {
        branchChanging.current = false;
        setIsChangingBranch(false);
      }
    },
    [refreshVault, loadActiveFile],
  );
  const moveFile = useCallback(
    async (path: string) => {
      const destination = window.prompt(
        "New vault path (including filename)",
        path,
      );
      if (!destination || destination === path) return;
      if (current.current.path === path && current.current.dirty) {
        setError("Save this editor draft before moving the note");
        return;
      }
      try {
        await vaultService.moveFile(
          path,
          destination,
          files.find((f) => f.path === path)?.sha,
        );
        await refreshFiles();
        if (current.current.path === path) selectFile(destination);
      } catch (err) {
        setError(
          err instanceof VaultApiError && err.code === "BRANCH_CHANGED"
            ? "The vault branch changed on another device. Open Settings and restore the original branch to synchronize this device’s pending notes."
            : (err as Error).message,
        );
      }
    },
    [files, refreshFiles, selectFile],
  );
  useEffect(() => {
    const navigate = () => {
      const path =
        new URLSearchParams(window.location.hash.slice(1)).get("note") ??
        files.find((f) => f.path === "README.md")?.path ??
        files.find((f) => f.type === "file" && /\.md$/i.test(f.path))?.path ??
        "";
      if (path) selectFile(path, false);
      if (path !== current.current.path)
        window.history.replaceState(
          null,
          "",
          `#note=${encodeURIComponent(current.current.path)}`,
        );
    };
    window.addEventListener("hashchange", navigate);
    return () => window.removeEventListener("hashchange", navigate);
  }, [selectFile, files]);
  const clearError = useCallback(() => setError(null), []);
  return {
    vault,
    files,
    activeFilePath,
    activeFile,
    content,
    isDirty,
    isOnline,
    hasConflict: conflict !== null,
    conflict,
    isChangingBranch,
    syncStatus,
    isLoading,
    error,
    selectFile,
    updateContent,
    saveActiveFile,
    createFile,
    deleteFile,
    sync,
    refreshVault,
    clearError,
    resolveConflict,
    appendToFile,
    changeBranch,
    moveFile,
  };
}
