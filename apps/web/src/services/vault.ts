import { supabase } from './supabaseClient';
import { Vault, VaultFile, SyncStatus } from '../types/vault';

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
    return this.invoke<Vault>('/v1/vault', { method: 'GET', providerToken });
  }

  async createVault(providerToken: string | null, repository: string, description?: string): Promise<Vault> {
    return this.invoke<Vault>('/v1/vault', { 
      method: 'POST', 
      body: { repository, description },
      providerToken 
    });
  }

  async listFiles(providerToken: string | null): Promise<{ entries: VaultFile[] }> {
    const res = await this.invoke<any>('/v1/files', { method: 'GET', providerToken });
    const rawEntries = Array.isArray(res) ? res : (res?.entries || res?.files || []);
    return {
      entries: rawEntries.map((f: any) => ({
        path: f.path,
        name: f.name || f.path.split('/').pop() || f.path,
        type: f.type === 'directory' || f.type === 'dir' || f.type === 'tree' ? 'directory' : 'file',
        size: f.size || 0,
        lastModified: f.lastModified || new Date().toISOString(),
        sha: f.sha
      }))
    };
  }

  async getFile(providerToken: string | null, path: string): Promise<VaultFile> {
    const f = await this.invoke<any>(`/v1/files/${path}`, { method: 'GET', providerToken });
    return {
      path: f.path,
      name: f.name || f.path.split('/').pop() || f.path,
      type: f.type === 'directory' || f.type === 'dir' ? 'directory' : 'file',
      size: f.size,
      lastModified: f.lastModified || new Date().toISOString(),
      sha: f.sha,
      // GitHub content is base64
      content: f.content ? atob(f.content.replace(/\s/g, '')) : ''
    };
  }

  async createFile(providerToken: string | null, params: { path: string; content: string; commitMessage?: string }): Promise<VaultFile> {
    const res = await this.invoke<any>('/v1/files', {
      method: 'POST',
      body: {
        path: params.path,
        content: btoa(params.content),
        commitMessage: params.commitMessage
      },
      providerToken
    });
    return this.getFile(providerToken, res.path);
  }

  async updateFile(providerToken: string | null, path: string, params: { content: string; expectedSha: string; commitMessage?: string }): Promise<VaultFile> {
    const res = await this.invoke<any>(`/v1/files/${path}`, {
      method: 'PUT',
      body: {
        content: btoa(params.content),
        sha: params.expectedSha,
        commitMessage: params.commitMessage
      },
      providerToken
    });
    return this.getFile(providerToken, res.path);
  }

  async deleteFile(providerToken: string | null, path: string, sha: string): Promise<void> {
    await this.invoke<void>(`/v1/files/${path}?sha=${encodeURIComponent(sha)}`, { method: 'DELETE', providerToken });
  }

  async getSyncStatus(_providerToken: string | null): Promise<SyncStatus> {
    return {
      lastSyncAt: new Date().toISOString(),
      status: 'idle',
      message: undefined
    };
  }

  async syncVault(_providerToken: string | null): Promise<void> {
    // Sync trigger stub
  }

  async search(providerToken: string | null, query: string, pathPrefix?: string): Promise<{ query: string; results: any[] }> {
    const q = query.trim();
    if (!q) return { query, results: [] };
    
    try {
      const url = `/v1/search?q=${encodeURIComponent(q)}${pathPrefix ? `&path=${encodeURIComponent(pathPrefix)}` : ''}`;
      const res = await this.invoke<{ query: string; results: any[] }>(url, {
        method: 'GET',
        providerToken
      });
      return res;
    } catch (_err) {
      // Fallback client-side filter
      const list = await this.listFiles(providerToken);
      const queryLower = q.toLowerCase();
      const results = list.entries
        .filter(f => f.name.toLowerCase().includes(queryLower) && (!pathPrefix || f.path.startsWith(pathPrefix)))
        .map(f => ({
          path: f.path,
          title: f.name,
          snippet: `Match in ${f.path}`,
          score: 1,
        }));
      return { query, results };
    }
  }

  resetToDefaults(): void {
    console.warn("resetToDefaults is not supported in GitHub Vault mode");
  }
}

export const vaultService = new VaultService();
