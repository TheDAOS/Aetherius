import { VaultFile } from '../../types/vault';

export interface OfflineMutation {
  id?: number;
  action: 'create' | 'update' | 'delete';
  path: string;
  content?: string;
  expectedSha?: string;
  commitMessage?: string;
  timestamp: number;
}

const DB_NAME = 'aetherius_vault_db';
const DB_VERSION = 1;

class OfflineDatabase {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files', { keyPath: 'path' });
        }

        if (!db.objectStoreNames.contains('mutations')) {
          db.createObjectStore('mutations', { keyPath: 'id', autoIncrement: true });
        }

        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        this.dbPromise = null;
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  // --- Files Store ---
  async saveFile(file: VaultFile): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('files', 'readwrite');
      const store = tx.objectStore('files');
      const req = store.put(file);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async saveFiles(files: VaultFile[]): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('files', 'readwrite');
      const store = tx.objectStore('files');
      for (const file of files) {
        store.put(file);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getFile(path: string): Promise<VaultFile | undefined> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('files', 'readonly');
      const store = tx.objectStore('files');
      const req = store.get(path);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async getAllFiles(): Promise<VaultFile[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('files', 'readonly');
      const store = tx.objectStore('files');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async deleteFile(path: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('files', 'readwrite');
      const store = tx.objectStore('files');
      const req = store.delete(path);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async clearFiles(): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('files', 'readwrite');
      const store = tx.objectStore('files');
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // --- Mutation Queue ---
  async queueMutation(mutation: Omit<OfflineMutation, 'id' | 'timestamp'>): Promise<number> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('mutations', 'readwrite');
      const store = tx.objectStore('mutations');
      const item: OfflineMutation = {
        ...mutation,
        timestamp: Date.now()
      };
      const req = store.add(item);
      req.onsuccess = () => resolve(req.result as number);
      req.onerror = () => reject(req.error);
    });
  }

  async getPendingMutations(): Promise<OfflineMutation[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('mutations', 'readonly');
      const store = tx.objectStore('mutations');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async deleteMutation(id: number): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('mutations', 'readwrite');
      const store = tx.objectStore('mutations');
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async clearMutations(): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('mutations', 'readwrite');
      const store = tx.objectStore('mutations');
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // --- Metadata Store ---
  async setMetadata(key: string, value: any): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('metadata', 'readwrite');
      const store = tx.objectStore('metadata');
      const req = store.put({ key, value });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async getMetadata<T>(key: string): Promise<T | undefined> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('metadata', 'readonly');
      const store = tx.objectStore('metadata');
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ? req.result.value : undefined);
      req.onerror = () => reject(req.error);
    });
  }
}

export const offlineDb = new OfflineDatabase();
