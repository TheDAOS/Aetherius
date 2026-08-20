import { useState, useEffect, useCallback } from 'react';
import { Vault, VaultFile, SyncStatus } from '../types/vault';
import { mockVaultService } from '../services/mockVault';

export function useVault() {
  const [vault, setVault] = useState<Vault | null>(null);
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [activeFilePath, setActiveFilePath] = useState<string>('README.md');
  const [activeFile, setActiveFile] = useState<VaultFile | null>(null);
  const [content, setContent] = useState<string>('');
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load vault metadata & file list
  const refreshVault = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [vaultData, filesData, syncData] = await Promise.all([
        mockVaultService.getVault(),
        mockVaultService.listFiles(),
        mockVaultService.getSyncStatus()
      ]);
      setVault(vaultData);
      setFiles(filesData.entries);
      setSyncStatus(syncData);
    } catch (err: any) {
      setError(err?.message || 'Failed to load vault');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshVault();
  }, [refreshVault]);

  // Load active file
  useEffect(() => {
    if (!activeFilePath) return;

    let mounted = true;
    const fetchFile = async () => {
      try {
        const file = await mockVaultService.getFile(activeFilePath);
        if (mounted) {
          setActiveFile(file);
          setContent(file.content || '');
          setIsDirty(false);
        }
      } catch (err: any) {
        if (mounted) {
          setError(`File not found: ${activeFilePath}`);
        }
      }
    };

    fetchFile();
    return () => {
      mounted = false;
    };
  }, [activeFilePath]);

  const selectFile = useCallback((path: string) => {
    setActiveFilePath(path);
  }, []);

  const updateContent = useCallback((newContent: string) => {
    setContent(newContent);
    setIsDirty(true);
  }, []);

  const saveActiveFile = useCallback(async () => {
    if (!activeFilePath || !activeFile) return;

    try {
      const updated = await mockVaultService.updateFile(activeFilePath, {
        content,
        expectedSha: activeFile.sha,
        commitMessage: `Update ${activeFile.name}`
      });
      setActiveFile(updated);
      setIsDirty(false);
      
      // Update file list info
      const filesData = await mockVaultService.listFiles();
      setFiles(filesData.entries);
    } catch (err: any) {
      setError(err?.message || 'Failed to save file');
    }
  }, [activeFilePath, activeFile, content]);

  const createFile = useCallback(async (path: string, initialContent: string = '# New Note\n\nStart typing...') => {
    try {
      const newFile = await mockVaultService.createFile({
        path,
        content: initialContent,
        commitMessage: `Create ${path}`
      });
      const filesData = await mockVaultService.listFiles();
      setFiles(filesData.entries);
      setActiveFilePath(newFile.path);
      return newFile;
    } catch (err: any) {
      setError(err?.message || 'Failed to create file');
      throw err;
    }
  }, []);

  const deleteFile = useCallback(async (path: string) => {
    try {
      await mockVaultService.deleteFile(path);
      const filesData = await mockVaultService.listFiles();
      setFiles(filesData.entries);
      if (activeFilePath === path) {
        setActiveFilePath('README.md');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to delete file');
      throw err;
    }
  }, [activeFilePath]);

  const sync = useCallback(async () => {
    try {
      await mockVaultService.syncVault();
      const status = await mockVaultService.getSyncStatus();
      setSyncStatus(status);
    } catch (err: any) {
      setError(err?.message || 'Sync failed');
    }
  }, []);

  return {
    vault,
    files,
    activeFilePath,
    activeFile,
    content,
    isDirty,
    syncStatus,
    isLoading,
    error,
    selectFile,
    updateContent,
    saveActiveFile,
    createFile,
    deleteFile,
    sync,
    refreshVault
  };
}
