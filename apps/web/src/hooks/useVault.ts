import { useCallback, useEffect, useState } from "react";
import { vaultService } from "../services/vault";
import type { SyncStatus, Vault, VaultFile } from "../types/vault";

export function useVault() {
  const [vault, setVault] = useState<Vault | null>(null);
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [activeFilePath, setActiveFilePath] = useState<string>("README.md");
  const [activeFile, setActiveFile] = useState<VaultFile | null>(null);
  const [content, setContent] = useState<string>("");
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [hasConflict, setHasConflict] = useState<boolean>(false);

  // Sync pending offline mutations when online
  const sync = useCallback(async () => {
    try {
      setSyncStatus((prev) =>
        prev
          ? { ...prev, status: "running" }
          : { status: "running", lastSyncAt: null },
      );
      const result = await vaultService.syncPendingMutations();
      const status = await vaultService.getSyncStatus();
      setSyncStatus(status);

      if (result.errors && result.errors.length > 0) {
        setError(`Sync completed with ${result.errors.length} error(s)`);
      } else {
        setError(null);
      }

      // Refresh files list
      const filesData = await vaultService.listFiles();
      setFiles(filesData.entries);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error?.message || "Sync failed");
    }
  }, []);

  // Network online/offline event listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      sync();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus({
        status: "idle",
        lastSyncAt: null,
        message: "Offline mode",
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [sync]);

  // Load vault metadata & file list
  const refreshVault = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [vaultData, filesData, syncData] = await Promise.all([
        vaultService.getVault(),
        vaultService.listFiles(),
        vaultService.getSyncStatus(),
      ]);
      setVault(vaultData);
      setFiles(filesData.entries);
      setSyncStatus(syncData);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error?.message || "Failed to load vault");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshVault();
  }, [refreshVault]);

  const loadActiveFile = useCallback(async (path: string) => {
    if (!path) return;

    try {
      setError(null);
      setHasConflict(false);
      const file = await vaultService.getFile(path);
      setActiveFile(file);
      setContent(file.content || "");
      setIsDirty(false);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(`File not found or failed to load: ${path}`);
      console.error("loadActiveFile error:", error?.message);
    }
  }, []);

  // Load active file on path change
  useEffect(() => {
    if (activeFilePath) {
      loadActiveFile(activeFilePath);
    }
  }, [activeFilePath, loadActiveFile]);

  // Dirty file guard: prompt before switching if unsaved changes exist
  const selectFile = useCallback(
    (path: string) => {
      if (isDirty) {
        const confirmed = window.confirm(
          "You have unsaved changes. Are you sure you want to switch files? Your changes will be lost.",
        );
        if (!confirmed) return;
      }
      setActiveFilePath(path);
    },
    [isDirty],
  );

  const updateContent = useCallback((newContent: string) => {
    setContent(newContent);
    setIsDirty(true);
  }, []);

  const saveActiveFile = useCallback(async () => {
    if (!activeFilePath || !activeFile) return;

    try {
      setError(null);
      setHasConflict(false);
      const updated = await vaultService.updateFile(activeFilePath, {
        content,
        expectedSha: activeFile.sha,
        commitMessage: `Update ${activeFile.name}`,
      });
      setActiveFile(updated);
      setIsDirty(false);

      // Update file list info
      const filesData = await vaultService.listFiles();
      setFiles(filesData.entries);
    } catch (err: unknown) {
      const error = err as { message?: string; code?: string };
      const isConflict =
        error?.message?.toLowerCase().includes("conflict") ||
        error?.message?.includes("409") ||
        error?.code === "CONFLICT";
      if (isConflict) {
        setHasConflict(true);
        setError(
          "Conflict detected: This file was modified remotely on GitHub. Reload the file or resolve changes before saving.",
        );
      } else {
        setError(error?.message || "Failed to save file");
      }
    }
  }, [activeFilePath, activeFile, content]);

  const reloadActiveFile = useCallback(async () => {
    if (activeFilePath) {
      await loadActiveFile(activeFilePath);
      setHasConflict(false);
    }
  }, [activeFilePath, loadActiveFile]);

  const createFile = useCallback(
    async (
      path: string,
      initialContent: string = "# New Note\n\nStart typing...",
    ) => {
      try {
        const newFile = await vaultService.createFile({
          path,
          content: initialContent,
          commitMessage: `Create ${path}`,
        });
        const filesData = await vaultService.listFiles();
        setFiles(filesData.entries);
        setActiveFilePath(newFile.path);
        return newFile;
      } catch (err: unknown) {
        const error = err as { message?: string };
        setError(error?.message || "Failed to create file");
        throw err;
      }
    },
    [],
  );

  const deleteFile = useCallback(
    async (path: string) => {
      const fileToDelete = files.find((f) => f.path === path);

      try {
        await vaultService.deleteFile(path, fileToDelete?.sha);
        const filesData = await vaultService.listFiles();
        setFiles(filesData.entries);
        if (activeFilePath === path) {
          setActiveFilePath("README.md");
        }
      } catch (err: unknown) {
        const error = err as { message?: string };
        setError(error?.message || "Failed to delete file");
        throw err;
      }
    },
    [activeFilePath, files],
  );

  return {
    vault,
    files,
    activeFilePath,
    activeFile,
    content,
    isDirty,
    isOnline,
    hasConflict,
    syncStatus,
    isLoading,
    error,
    selectFile,
    updateContent,
    saveActiveFile,
    reloadActiveFile,
    createFile,
    deleteFile,
    sync,
    refreshVault,
  };
}
