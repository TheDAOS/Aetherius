import { supabase } from './supabaseClient';
import { Vault, VaultFile, SyncStatus } from '../types/vault';
import { offlineDb } from './storage/offlineDb';

export class VaultService {
  private getHeaders(providerToken?: string | null) {
    const headers: Record<string, string> = {};
    if (providerToken) {
      headers['x-github-token'] = providerToken;
    }
    return headers;
  }

  private async invoke<T>(path: string, options: { method: 'GET' | 'POST' | 'PUT' | 'DELETE', body?: any, providerToken?: string | null }): Promise<T> {
    const { data, error } = await supabase.functions.invoke(`api-v1${path}`, {
      method: options.method,
      body: options.body,
      headers: this.getHeaders(options.providerToken),
    });

    if (error) {
      throw new Error(error.message || 'API request failed');
    }
    
    return data;
  }

  async getVault(providerToken: string | null): Promise<Vault> {
    try {
      if (navigator.onLine && providerToken) {
        const vault = await this.invoke<Vault>('/v1/vault', { method: 'GET', providerToken });
        await offlineDb.setMetadata('vault', vault);
        return vault;
      }
    } catch (_err) {
      // Fallback to offline storage
    }

    const cachedVault = await offlineDb.getMetadata<Vault>('vault');
    if (cachedVault) return cachedVault;
    throw new Error('Vault not available offline and not yet cached');
  }

  async createVault(providerToken: string | null, repository: string, description?: string): Promise<Vault> {
    const vault = await this.invoke<Vault>('/v1/vault', { 
      method: 'POST', 
      body: { repository, description },
      providerToken 
    });
    await offlineDb.setMetadata('vault', vault);
    return vault;
  }

  async listFiles(providerToken: string | null): Promise<{ entries: VaultFile[] }> {
    try {
      if (navigator.onLine && providerToken) {
        const res = await this.invoke<any>('/v1/files', { method: 'GET', providerToken });
        const rawEntries = Array.isArray(res) ? res : (res?.entries || res?.files || []);
        const entries: VaultFile[] = rawEntries.map((f: any) => ({
          path: f.path,
          name: f.name || f.path.split('/').pop() || f.path,
          type: f.type === 'directory' || f.type === 'dir' || f.type === 'tree' ? 'directory' : 'file',
          size: f.size || 0,
          lastModified: f.lastModified || new Date().toISOString(),
          sha: f.sha
        }));

        // Cache files list to IndexedDB
        await offlineDb.saveFiles(entries);
        return { entries };
      }
    } catch (_err) {
      // Fallback to IndexedDB
    }

    const cached = await offlineDb.getAllFiles();
    return { entries: cached };
  }

  async getFile(providerToken: string | null, path: string): Promise<VaultFile> {
    try {
      if (navigator.onLine && providerToken) {
        const f = await this.invoke<any>(`/v1/files/${path}`, { method: 'GET', providerToken });
        const file: VaultFile = {
          path: f.path,
          name: f.name || f.path.split('/').pop() || f.path,
          type: f.type === 'directory' || f.type === 'dir' ? 'directory' : 'file',
          size: f.size,
          lastModified: f.lastModified || new Date().toISOString(),
          sha: f.sha,
          content: f.content ? atob(f.content.replace(/\s/g, '')) : ''
        };
        await offlineDb.saveFile(file);
        return file;
      }
    } catch (_err) {
      // Fallback to IndexedDB
    }

    const cached = await offlineDb.getFile(path);
    if (cached) return cached;
    throw new Error(`File ${path} not found in offline cache`);
  }

  async createFile(providerToken: string | null, params: { path: string; content: string; commitMessage?: string }): Promise<VaultFile> {
    const filename = params.path.split('/').pop() || params.path;
    const optimisticFile: VaultFile = {
      path: params.path,
      name: filename,
      type: 'file',
      content: params.content,
      lastModified: new Date().toISOString()
    };

    if (navigator.onLine && providerToken) {
      try {
        const res = await this.invoke<any>('/v1/files', {
          method: 'POST',
          body: {
            path: params.path,
            content: btoa(params.content),
            commitMessage: params.commitMessage
          },
          providerToken
        });
        const saved = await this.getFile(providerToken, res.path);
        return saved;
      } catch (err) {
        console.warn('Online create failed, queuing offline mutation:', err);
      }
    }

    // Save optimistically to offline cache & queue mutation
    await offlineDb.saveFile(optimisticFile);
    await offlineDb.queueMutation({
      action: 'create',
      path: params.path,
      content: params.content,
      commitMessage: params.commitMessage
    });

    return optimisticFile;
  }

  async updateFile(providerToken: string | null, path: string, params: { content: string; expectedSha?: string; commitMessage?: string }): Promise<VaultFile> {
    const filename = path.split('/').pop() || path;
    const optimisticFile: VaultFile = {
      path,
      name: filename,
      type: 'file',
      content: params.content,
      sha: params.expectedSha,
      lastModified: new Date().toISOString()
    };

    if (navigator.onLine && providerToken) {
      try {
        const res = await this.invoke<any>(`/v1/files/${path}`, {
          method: 'PUT',
          body: {
            content: btoa(params.content),
            sha: params.expectedSha,
            commitMessage: params.commitMessage
          },
          providerToken
        });
        const saved = await this.getFile(providerToken, res.path);
        return saved;
      } catch (err: any) {
        // If conflict, propagate error so user is notified
        if (err?.message?.includes('conflict') || err?.message?.includes('409') || err?.code === 'CONFLICT') {
          throw err;
        }
        console.warn('Online update failed, queuing offline mutation:', err);
      }
    }

    // Save optimistically to offline cache & queue mutation
    await offlineDb.saveFile(optimisticFile);
    await offlineDb.queueMutation({
      action: 'update',
      path,
      content: params.content,
      expectedSha: params.expectedSha,
      commitMessage: params.commitMessage
    });

    return optimisticFile;
  }

  async deleteFile(providerToken: string | null, path: string, sha?: string): Promise<void> {
    if (navigator.onLine && providerToken && sha) {
      try {
        await this.invoke<void>(`/v1/files/${path}?sha=${encodeURIComponent(sha)}`, { method: 'DELETE', providerToken });
        await offlineDb.deleteFile(path);
        return;
      } catch (err) {
        console.warn('Online delete failed, queuing offline mutation:', err);
      }
    }

    await offlineDb.deleteFile(path);
    await offlineDb.queueMutation({
      action: 'delete',
      path,
      expectedSha: sha
    });
  }

  async syncPendingMutations(providerToken: string | null): Promise<{ syncedCount: number; errors: any[] }> {
    if (!navigator.onLine || !providerToken) {
      return { syncedCount: 0, errors: ['Offline / No token'] };
    }

    const mutations = await offlineDb.getPendingMutations();
    if (mutations.length === 0) {
      // Trigger cloud sync status ping
      try {
        await this.invoke('/v1/sync', { method: 'POST', providerToken });
      } catch (_e) {
        // Ignore ping error
      }
      return { syncedCount: 0, errors: [] };
    }

    let syncedCount = 0;
    const errors: any[] = [];

    for (const m of mutations) {
      try {
        if (m.action === 'create' && m.content !== undefined) {
          await this.invoke('/v1/files', {
            method: 'POST',
            body: {
              path: m.path,
              content: btoa(m.content),
              commitMessage: m.commitMessage || `Create note: ${m.path} (offline sync)`
            },
            providerToken
          });
        } else if (m.action === 'update' && m.content !== undefined) {
          await this.invoke(`/v1/files/${m.path}`, {
            method: 'PUT',
            body: {
              content: btoa(m.content),
              sha: m.expectedSha,
              commitMessage: m.commitMessage || `Update note: ${m.path} (offline sync)`
            },
            providerToken
          });
        } else if (m.action === 'delete') {
          await this.invoke(`/v1/files/${m.path}${m.expectedSha ? `?sha=${encodeURIComponent(m.expectedSha)}` : ''}`, {
            method: 'DELETE',
            providerToken
          });
        }

        if (m.id !== undefined) {
          await offlineDb.deleteMutation(m.id);
        }
        syncedCount++;
      } catch (err: any) {
        console.error(`Sync error on mutation ${m.path}:`, err);
        errors.push({ mutation: m, error: err?.message || err });
        // Stop batch on conflict or critical error
        break;
      }
    }

    // Refresh file cache from GitHub after sync
    await this.listFiles(providerToken);

    return { syncedCount, errors };
  }

  async getSyncStatus(providerToken: string | null): Promise<SyncStatus> {
    const mutations = await offlineDb.getPendingMutations();
    if (mutations.length > 0) {
      return {
        status: 'pending',
        lastSyncAt: null,
        message: `${mutations.length} change(s) queued for sync`
      };
    }

    if (navigator.onLine && providerToken) {
      try {
        return await this.invoke<SyncStatus>('/v1/sync/status', { method: 'GET', providerToken });
      } catch (_e) {
        // Fallback
      }
    }

    return {
      lastSyncAt: new Date().toISOString(),
      status: 'idle',
      message: navigator.onLine ? 'Vault synchronized' : 'Offline mode'
    };
  }

  async search(providerToken: string | null, query: string, pathPrefix?: string): Promise<{ query: string; results: any[] }> {
    const q = query.trim();
    if (!q) return { query, results: [] };
    
    if (navigator.onLine && providerToken) {
      try {
        const url = `/v1/search?q=${encodeURIComponent(q)}${pathPrefix ? `&path=${encodeURIComponent(pathPrefix)}` : ''}`;
        const res = await this.invoke<{ query: string; results: any[] }>(url, {
          method: 'GET',
          providerToken
        });
        return res;
      } catch (_err) {
        // Fallback to offline search
      }
    }

    // Offline / Local search through IndexedDB files
    const list = await this.listFiles(providerToken);
    const queryLower = q.toLowerCase();
    const results = list.entries
      .filter(f => f.name.toLowerCase().includes(queryLower) && (!pathPrefix || f.path.startsWith(pathPrefix)))
      .map(f => ({
        path: f.path,
        title: f.name,
        snippet: `Match in ${f.path} (local)`,
        score: 1,
      }));
    return { query, results };
  }

  resetToDefaults(): void {
    console.warn("resetToDefaults is not supported in GitHub Vault mode");
  }
}

export const vaultService = new VaultService();
