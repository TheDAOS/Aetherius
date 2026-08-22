import { useState, useEffect, useCallback } from 'react';
import { Vault, VaultFile, SyncStatus } from '../types/vault';
import { vaultService } from '../services/vault';
import { useAuth } from '../contexts/AuthContext';

export function useVault() {
  const { providerToken } = useAuth();
  
  const [vault, setVault] = useState<Vault | null>(null);
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [activeFilePath, setActiveFilePath] = useState<string>('README.md');
  const [activeFile, setActiveFile] = useState<VaultFile | null>(null);
  const [content, setContent] = useState<string>('');
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [hasConflict, setHasConflict] = useState<boolean>(false);

  // Load vault metadata & file list
  const refreshVault = useCallback(async () => {
    if (!providerToken) return;
    try {
      setIsLoading(true);
      setError(null);
      const [vaultData, filesData, syncData] = await Promise.all([
        vaultService.getVault(providerToken),
        vaultService.listFiles(providerToken),
        vaultService.getSyncStatus(providerToken)
      ]);
      setVault(vaultData);
      setFiles(filesData.entries);
      setSyncStatus(syncData);
    } catch (err: any) {
      setError(err?.message || 'Failed to load vault');
    } finally {
      setIsLoading(false);
    }
  }, [providerToken]);

  useEffect(() => {
    refreshVault();
  }, [refreshVault]);

  const loadActiveFile = useCallback(async (path: string) => {
    if (!path || !providerToken) return;

    try {
      setError(null);
      setHasConflict(false);
      const file = await vaultService.getFile(providerToken, path);
      setActiveFile(file);
      setContent(file.content || '');
      setIsDirty(false);
    } catch (err: any) {
      setError(`File not found or failed to load: ${path}`);
    }
  }, [providerToken]);

  // Load active file on path change
  useEffect(() => {
    if (activeFilePath && providerToken) {
      loadActiveFile(activeFilePath);
    }
  }, [activeFilePath, providerToken, loadActiveFile]);

  const selectFile = useCallback((path: string) => {
    setActiveFilePath(path);
  }, []);

  const updateContent = useCallback((newContent: string) => {
    setContent(newContent);
    setIsDirty(true);
  }, []);

  const saveActiveFile = useCallback(async () => {
    if (!activeFilePath || !activeFile || !providerToken) return;

    try {
      setError(null);
      setHasConflict(false);
      const updated = await vaultService.updateFile(providerToken, activeFilePath, {
        content,
        expectedSha: activeFile.sha!,
        commitMessage: `Update ${activeFile.name}`
      });
      setActiveFile(updated);
      setIsDirty(false);
      
      // Update file list info
      const filesData = await vaultService.listFiles(providerToken);
      setFiles(filesData.entries);
    } catch (err: any) {
      const isConflict = err?.message?.toLowerCase().includes('conflict') || err?.message?.includes('409') || err?.code === 'CONFLICT';
      if (isConflict) {
        setHasConflict(true);
        setError('Conflict detected: This file was modified remotely on GitHub. Reload the file or resolve changes before saving.');
      } else {
        setError(err?.message || 'Failed to save file');
      }
    }
  }, [activeFilePath, activeFile, content, providerToken]);

  const reloadActiveFile = useCallback(async () => {
    if (activeFilePath) {
      await loadActiveFile(activeFilePath);
      setHasConflict(false);
    }
  }, [activeFilePath, loadActiveFile]);

  const createFile = useCallback(async (path: string, initialContent: string = '# New Note\n\nStart typing...') => {
    if (!providerToken) throw new Error("Not authenticated");
    try {
      const newFile = await vaultService.createFile(providerToken, {
        path,
        content: initialContent,
        commitMessage: `Create ${path}`
      });
      const filesData = await vaultService.listFiles(providerToken);
      setFiles(filesData.entries);
      setActiveFilePath(newFile.path);
      return newFile;
    } catch (err: any) {
      setError(err?.message || 'Failed to create file');
      throw err;
    }
  }, [providerToken]);

  const deleteFile = useCallback(async (path: string) => {
    if (!providerToken) throw new Error("Not authenticated");
    const fileToDelete = files.find(f => f.path === path);
    if (!fileToDelete?.sha) throw new Error("File missing SHA");

    try {
      await vaultService.deleteFile(providerToken, path, fileToDelete.sha);
      const filesData = await vaultService.listFiles(providerToken);
      setFiles(filesData.entries);
      if (activeFilePath === path) {
        setActiveFilePath('README.md');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to delete file');
      throw err;
    }
  }, [activeFilePath, files, providerToken]);

  const sync = useCallback(async () => {
    if (!providerToken) return;
    try {
      await vaultService.syncVault(providerToken);
      const status = await vaultService.getSyncStatus(providerToken);
      setSyncStatus(status);
    } catch (err: any) {
      setError(err?.message || 'Sync failed');
    }
  }, [providerToken]);

  return {
    vault,
    files,
    activeFilePath,
    activeFile,
    content,
    isDirty,
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
    refreshVault
  };
}
