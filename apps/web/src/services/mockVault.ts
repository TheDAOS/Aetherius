import { 
  Vault, 
  VaultFile, 
  FileListResponse, 
  CreateFileRequest, 
  UpdateFileRequest, 
  SearchResponse, 
  SyncStatus, 
  SyncOperation 
} from '../types/vault';

const STORAGE_KEY_PREFIX = 'aetherius_mock_vault_';

const DEFAULT_VAULT: Vault = {
  id: '7b89d42e-9d21-4f91-8be9-e3144ef91987',
  owner: 'thedaos',
  repository: 'my-personal-vault',
  branch: 'main'
};

const DEFAULT_FILES: Record<string, { content: string; sha: string; lastModified: string }> = {
  'README.md': {
    content: `# Welcome to Aetherius ⚡\n\nAetherius is a **zero-lockin, user-owned, Git-backed personal knowledge vault**.\n\n### Why Aetherius?\n* **Markdown Canon**: Your notes are plain files in your private GitHub repository.\n* **Zero Vendor Lock-in**: Read or clone your vault anywhere with standard Git tooling.\n* **Tactile Design**: Built for maximum focus with Neo-Memphis mechanical feedback.\n\n### Getting Started\n1. Use \`Ctrl + K\` to jump between notes or search content.\n2. Use \`Ctrl + N\` or the top \`+ New Note\` button to write.\n3. Changes are committed automatically as atomic Git revisions.\n`,
    sha: '8f3a9e102bc4501a332fbc19c991823901a094bb',
    lastModified: new Date(Date.now() - 3600000 * 24).toISOString()
  },
  'notes/daily-log.md': {
    content: `# Daily Log // Architecture & Synthesis\n\n- [x] Initialized Phase 1 Frontend architecture\n- [x] Conformed mock API to \`openapi.yaml\` contracts\n- [ ] Design custom Neo-Memphis split preview pane\n\n> "Knowledge increases by sharing but remains anchored in plain text."\n\n### Highlights\n* Building with **React 19 & Tailwind CSS**.\n* Offline caching with Service Workers and IndexedDB sync.\n`,
    sha: '2a49f7d3e61a8e3290b21389471ab8e01923cd44',
    lastModified: new Date(Date.now() - 3600000 * 4).toISOString()
  },
  'notes/ideas/quantum-memex.md': {
    content: `# The Quantum Memex Concept\n\nExploring personal associative indexing using hypergraphs and local AST caches.\n\n## Principles\n1. **User agency** above proprietary formats.\n2. **Flat files, rich graphs**.\n3. **Tactile mechanical inputs** for intuitive cognitive capture.\n`,
    sha: '419fb3e8201a4e5192bcfa8201948ba102948ce1',
    lastModified: new Date(Date.now() - 3600000 * 48).toISOString()
  },
  'templates/meeting-template.md': {
    content: `# Meeting: {{Title}}\n**Date**: {{Date}}\n**Attendees**: @me, \n\n## Agenda\n- [ ] Item 1\n- [ ] Item 2\n\n## Discussion Notes\n\n## Action Items\n- [ ] \n`,
    sha: 'bc1294ef90123ca49281749201948e9182bc394a',
    lastModified: new Date(Date.now() - 3600000 * 120).toISOString()
  }
};

function generateSha(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(40, '0');
}

class MockVaultService {
  private vault: Vault;
  private files: Map<string, { content: string; sha: string; lastModified: string }>;
  private syncState: SyncStatus;

  constructor() {
    this.vault = DEFAULT_VAULT;
    this.files = new Map();
    this.syncState = {
      status: 'idle',
      lastSyncAt: new Date().toISOString(),
      message: 'All files up to date with origin/main'
    };
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const storedFiles = localStorage.getItem(STORAGE_KEY_PREFIX + 'files');
      if (storedFiles) {
        const parsed = JSON.parse(storedFiles);
        Object.entries(parsed).forEach(([path, data]: [string, any]) => {
          this.files.set(path, data);
        });
      } else {
        Object.entries(DEFAULT_FILES).forEach(([path, data]) => {
          this.files.set(path, data);
        });
        this.saveToStorage();
      }
    } catch (e) {
      console.warn('Storage unavailable, using in-memory mock', e);
      Object.entries(DEFAULT_FILES).forEach(([path, data]) => {
        this.files.set(path, data);
      });
    }
  }

  private saveToStorage() {
    try {
      const obj: Record<string, any> = {};
      this.files.forEach((val, key) => {
        obj[key] = val;
      });
      localStorage.setItem(STORAGE_KEY_PREFIX + 'files', JSON.stringify(obj));
    } catch (e) {
      console.warn('Failed to save to localStorage', e);
    }
  }

  async getVault(): Promise<Vault> {
    return { ...this.vault };
  }

  async listFiles(prefix?: string): Promise<FileListResponse> {
    const entries: VaultFile[] = [];
    const dirs = new Set<string>();

    const normalizedPrefix = prefix ? (prefix.endsWith('/') ? prefix : prefix + '/') : '';

    this.files.forEach((data, path) => {
      if (normalizedPrefix && !path.startsWith(normalizedPrefix)) {
        return;
      }

      const relative = normalizedPrefix ? path.slice(normalizedPrefix.length) : path;
      const parts = relative.split('/');

      if (parts.length === 1) {
        // Direct file
        entries.push({
          path,
          name: parts[0],
          type: 'file',
          sha: data.sha,
          size: data.content.length,
          lastModified: data.lastModified
        });
      } else {
        // Directory entry
        const dirName = parts[0];
        const dirPath = normalizedPrefix ? `${normalizedPrefix}${dirName}` : dirName;
        if (!dirs.has(dirPath)) {
          dirs.add(dirPath);
          entries.push({
            path: dirPath,
            name: dirName,
            type: 'directory'
          });
        }
      }
    });

    // Sort: directories first, then alphabetical
    entries.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return {
      path: prefix || '/',
      entries
    };
  }

  async getFile(path: string): Promise<VaultFile> {
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const file = this.files.get(cleanPath);
    if (!file) {
      throw new Error(`File not found: ${cleanPath}`);
    }

    const name = cleanPath.split('/').pop() || cleanPath;
    return {
      path: cleanPath,
      name,
      type: 'file',
      content: file.content,
      sha: file.sha,
      size: file.content.length,
      lastModified: file.lastModified
    };
  }

  async createFile(req: CreateFileRequest): Promise<VaultFile> {
    const cleanPath = req.path.startsWith('/') ? req.path.slice(1) : req.path;
    if (this.files.has(cleanPath)) {
      throw new Error(`File already exists: ${cleanPath}`);
    }

    const sha = generateSha(req.content);
    const lastModified = new Date().toISOString();
    const fileData = { content: req.content, sha, lastModified };
    
    this.files.set(cleanPath, fileData);
    this.saveToStorage();

    const name = cleanPath.split('/').pop() || cleanPath;
    return {
      path: cleanPath,
      name,
      type: 'file',
      content: req.content,
      sha,
      size: req.content.length,
      lastModified
    };
  }

  async updateFile(path: string, req: UpdateFileRequest): Promise<VaultFile> {
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const existing = this.files.get(cleanPath);
    if (!existing) {
      throw new Error(`File not found: ${cleanPath}`);
    }

    if (req.expectedSha && req.expectedSha !== existing.sha) {
      throw new Error(`Conflict: expected SHA ${req.expectedSha} but found ${existing.sha}`);
    }

    const sha = generateSha(req.content);
    const lastModified = new Date().toISOString();
    const updatedData = { content: req.content, sha, lastModified };

    this.files.set(cleanPath, updatedData);
    this.saveToStorage();

    const name = cleanPath.split('/').pop() || cleanPath;
    return {
      path: cleanPath,
      name,
      type: 'file',
      content: req.content,
      sha,
      size: req.content.length,
      lastModified
    };
  }

  async deleteFile(path: string): Promise<void> {
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    if (!this.files.has(cleanPath)) {
      throw new Error(`File not found: ${cleanPath}`);
    }
    this.files.delete(cleanPath);
    this.saveToStorage();
  }

  async search(query: string, pathPrefix?: string): Promise<SearchResponse> {
    const q = query.toLowerCase().trim();
    if (!q) {
      return { query, results: [] };
    }

    const results = [];
    for (const [path, data] of this.files.entries()) {
      if (pathPrefix && !path.startsWith(pathPrefix)) continue;

      const title = path.split('/').pop() || path;
      const content = data.content;
      const lowerContent = content.toLowerCase();
      const lowerTitle = title.toLowerCase();

      if (lowerTitle.includes(q) || lowerContent.includes(q)) {
        let snippet = '';
        const idx = lowerContent.indexOf(q);
        if (idx !== -1) {
          const start = Math.max(0, idx - 40);
          const end = Math.min(content.length, idx + q.length + 60);
          snippet = (start > 0 ? '...' : '') + content.slice(start, end).replace(/\n/g, ' ') + (end < content.length ? '...' : '');
        } else {
          snippet = content.slice(0, 100).replace(/\n/g, ' ');
        }

        results.push({
          path,
          title,
          snippet,
          score: lowerTitle.includes(q) ? 1.0 : 0.7
        });
      }
    }

    return {
      query,
      results: results.sort((a, b) => (b.score || 0) - (a.score || 0))
    };
  }

  async getSyncStatus(): Promise<SyncStatus> {
    return { ...this.syncState };
  }

  async syncVault(): Promise<SyncOperation> {
    this.syncState = {
      status: 'completed',
      lastSyncAt: new Date().toISOString(),
      message: 'Vault synchronized with origin/main'
    };
    return {
      id: 'sync_' + Date.now(),
      status: 'completed'
    };
  }

  resetToDefaults() {
    this.files.clear();
    Object.entries(DEFAULT_FILES).forEach(([path, data]) => {
      this.files.set(path, data);
    });
    this.saveToStorage();
  }
}

export const mockVaultService = new MockVaultService();
