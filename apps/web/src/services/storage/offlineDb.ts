import type { Vault, VaultFile } from "../../types/vault";

export interface OfflineMutation {
  id?: number;
  action: "create" | "update" | "delete";
  path: string;
  content?: string;
  expectedSha?: string;
  expectedBranch?: string;
  commitMessage?: string;
  timestamp: number;
  encoding?: "utf-8" | "base64";
}

const DB_NAME_PREFIX = "aetherius_vault_";
const DB_VERSION = 1;

export class OfflineDatabase {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private userId: string | null = null;
  private scopeVersion = 0;
  private frozenScope = false;
  private guard?: () => void;

  private getDbName(): string {
    return this.userId
      ? `${DB_NAME_PREFIX}${this.userId}`
      : `${DB_NAME_PREFIX}default`;
  }

  // Set the user ID to scope the IndexedDB database per user
  // Must be called after authentication to prevent cross-account data leaks
  setUserId(userId: string | null): void {
    if (this.frozenScope && this.userId !== userId)
      throw new Error("Cannot change a captured database scope");
    if (this.userId !== userId) {
      this.scopeVersion++;
      this.userId = userId;
      this.dbPromise = null; // Force re-open with new name
    }
  }

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.getDbName(), DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains("files")) {
          db.createObjectStore("files", { keyPath: "path" });
        }

        if (!db.objectStoreNames.contains("mutations")) {
          db.createObjectStore("mutations", {
            keyPath: "id",
            autoIncrement: true,
          });
        }

        if (!db.objectStoreNames.contains("metadata")) {
          db.createObjectStore("metadata", { keyPath: "key" });
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

  getUserId(): string | null {
    return this.userId;
  }
  getScopeVersion(): number {
    return this.scopeVersion;
  }
  /** Capture the database now; later account changes cannot redirect its writes. */
  snapshot(guard?: () => void): OfflineDatabase {
    const captured = new OfflineDatabase();
    captured.userId = this.userId;
    captured.dbPromise = this.getDB();
    // Auth bootstrap may capture a scope before it needs storage. If opening
    // fails, the first storage operation still receives the original rejection.
    void captured.dbPromise.catch(() => {});
    captured.frozenScope = true;
    captured.guard = guard;
    return captured;
  }

  // Commit the draft and its coalesced operation together. A failed transaction
  // must never leave a draft with no replay operation (or the reverse).
  async applyMutation(
    mutation: Omit<OfflineMutation, "id" | "timestamp">,
    file?: VaultFile,
  ): Promise<void> {
    this.guard?.();
    const db = await this.getDB();
    this.guard?.();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(["files", "mutations"], "readwrite");
      const queue = tx.objectStore("mutations");
      const files = tx.objectStore("files");
      const request = queue.getAll();
      request.onsuccess = () => {
        const previous = (request.result as OfflineMutation[]).filter(
          (m) => m.path === mutation.path,
        );
        const first = previous[0];
        for (const item of previous)
          if (item.id !== undefined) queue.delete(item.id);
        if (first?.action === "create" && mutation.action === "delete") {
          files.delete(mutation.path);
          return;
        }
        const action =
          first?.action === "create"
            ? "create"
            : first?.action === "delete" &&
                mutation.action === "create" &&
                first.expectedSha
              ? "update"
              : mutation.action;
        queue.add({
          ...mutation,
          action,
          ...(first?.id !== undefined ? { id: first.id } : {}),
          expectedSha: first?.expectedSha ?? mutation.expectedSha,
          expectedBranch: first?.expectedBranch ?? mutation.expectedBranch,
          timestamp: first?.timestamp ?? Date.now(),
        });
        if (mutation.action === "delete") files.delete(mutation.path);
        else if (file) files.put(file);
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () =>
        reject(tx.error ?? new Error("Draft transaction aborted"));
    });
  }

  async reconcileFiles(
    remote: VaultFile[],
    expectedVault?: Pick<Vault, "id" | "branch">,
  ): Promise<VaultFile[]> {
    this.guard?.();
    const db = await this.getDB();
    this.guard?.();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(
        ["files", "mutations", "metadata"],
        "readwrite",
      );
      const files = tx.objectStore("files");
      const cached = files.getAll();
      const metadata = tx.objectStore("metadata").get("vault");
      const pending = tx.objectStore("mutations").getAll();
      let result: VaultFile[] = [];
      pending.onsuccess = () => {
        const currentVault = metadata.result?.value as Vault | undefined;
        if (
          expectedVault &&
          (currentVault?.id !== expectedVault.id ||
            currentVault.branch !== expectedVault.branch)
        ) {
          reject(
            new Error("The vault branch changed while the listing was loading"),
          );
          tx.abort();
          return;
        }
        const old = new Map(
          (cached.result as VaultFile[]).map((f) => [f.path, f]),
        );
        const drafts = new Map(
          (pending.result as OfflineMutation[]).map((m) => [m.path, m]),
        );
        const next = new Map<string, VaultFile>();
        for (const item of remote) {
          if (drafts.has(item.path)) continue;
          const prior = old.get(item.path);
          next.set(
            item.path,
            prior?.sha === item.sha ? { ...prior, ...item } : item,
          );
        }
        for (const [path, m] of drafts) {
          if (m.action !== "delete" && old.has(path))
            next.set(path, old.get(path)!);
        }
        files.clear();
        result = [...next.values()];
        for (const file of result) files.put(file);
      };
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () =>
        reject(tx.error ?? new Error("Cache reconciliation aborted"));
    });
  }

  async bindLegacyMutations(branch: string): Promise<void> {
    this.guard?.();
    const db = await this.getDB();
    this.guard?.();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("mutations", "readwrite");
      const store = tx.objectStore("mutations");
      const request = store.getAll();
      request.onsuccess = () => {
        for (const mutation of request.result as OfflineMutation[]) {
          if (!mutation.expectedBranch)
            store.put({ ...mutation, expectedBranch: branch });
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () =>
        reject(tx.error ?? new Error("Branch binding aborted"));
    });
  }

  async discardMutations(path: string): Promise<void> {
    this.guard?.();
    const db = await this.getDB();
    this.guard?.();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("mutations", "readwrite");
      const store = tx.objectStore("mutations");
      const request = store.getAll();
      request.onsuccess = () => {
        for (const m of request.result as OfflineMutation[])
          if (m.path === path && m.id !== undefined) store.delete(m.id);
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /** Cache a network body only when no newer local mutation owns this path. */
  async cacheRemoteFile(
    file: VaultFile,
    expectedVault?: Pick<Vault, "id" | "branch">,
  ): Promise<VaultFile> {
    this.guard?.();
    const db = await this.getDB();
    this.guard?.();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(
        ["files", "mutations", "metadata"],
        "readwrite",
      );
      const files = tx.objectStore("files");
      const cached = files.get(file.path);
      const metadata = tx.objectStore("metadata").get("vault");
      const pending = tx.objectStore("mutations").getAll();
      let result = file;
      let failure: Error | undefined;
      pending.onsuccess = () => {
        const currentVault = metadata.result?.value as Vault | undefined;
        if (
          expectedVault &&
          (currentVault?.id !== expectedVault.id ||
            currentVault.branch !== expectedVault.branch)
        ) {
          failure = new Error(
            "The vault branch changed while this file was downloading. Retry in the current branch.",
          );
          tx.abort();
          return;
        }
        const mutation = (pending.result as OfflineMutation[]).find(
          (item) => item.path === file.path,
        );
        if (mutation?.action === "delete") {
          failure = new Error(`File ${file.path} is pending deletion`);
          tx.abort();
        } else if (mutation) {
          result = cached.result ?? {
            ...file,
            content: mutation.content,
            sha: mutation.expectedSha,
            encoding: mutation.encoding ?? "utf-8",
          };
        } else files.put(file);
      };
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () =>
        reject(
          failure ?? tx.error ?? new Error("File cache transaction aborted"),
        );
    });
  }

  async switchVault(vault: Vault, preserveDrafts = false): Promise<void> {
    this.guard?.();
    const db = await this.getDB();
    this.guard?.();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(
        ["files", "metadata", "mutations"],
        "readwrite",
      );
      const files = tx.objectStore("files");
      if (preserveDrafts) {
        // The atomic equivalent of reconciling an empty remote listing: only
        // queued draft bodies survive while the branch metadata swaps.
        const cached = files.getAll();
        const pending = tx.objectStore("mutations").getAll();
        pending.onsuccess = () => {
          const keep = new Set(
            (pending.result as OfflineMutation[])
              .filter((m) => m.action !== "delete")
              .map((m) => m.path),
          );
          files.clear();
          for (const file of cached.result as VaultFile[])
            if (keep.has(file.path)) files.put(file);
        };
      } else files.clear();
      tx.objectStore("metadata").put({ key: "vault", value: vault });
      tx.objectStore("metadata").put({ key: "lastSyncAt", value: null });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () =>
        reject(tx.error ?? new Error("Branch cache swap aborted"));
    });
  }

  // --- Files Store ---
  async saveFile(file: VaultFile): Promise<void> {
    this.guard?.();
    const db = await this.getDB();
    this.guard?.();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("files", "readwrite");
      const store = tx.objectStore("files");
      const req = store.put(file);
      tx.oncomplete = () => resolve();
      tx.onabort = () =>
        reject(tx.error ?? new Error("Storage transaction aborted"));
      req.onerror = () => reject(req.error);
    });
  }

  async saveFiles(files: VaultFile[]): Promise<void> {
    this.guard?.();
    const db = await this.getDB();
    this.guard?.();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("files", "readwrite");
      const store = tx.objectStore("files");
      for (const file of files) {
        store.put(file);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getFile(path: string): Promise<VaultFile | undefined> {
    this.guard?.();
    const db = await this.getDB();
    this.guard?.();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("files", "readonly");
      const store = tx.objectStore("files");
      const req = store.get(path);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async getAllFiles(): Promise<VaultFile[]> {
    this.guard?.();
    const db = await this.getDB();
    this.guard?.();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("files", "readonly");
      const store = tx.objectStore("files");
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async deleteFile(path: string): Promise<void> {
    this.guard?.();
    const db = await this.getDB();
    this.guard?.();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("files", "readwrite");
      const store = tx.objectStore("files");
      const req = store.delete(path);
      tx.oncomplete = () => resolve();
      tx.onabort = () =>
        reject(tx.error ?? new Error("Storage transaction aborted"));
      req.onerror = () => reject(req.error);
    });
  }

  async clearFiles(): Promise<void> {
    this.guard?.();
    const db = await this.getDB();
    this.guard?.();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("files", "readwrite");
      const store = tx.objectStore("files");
      const req = store.clear();
      tx.oncomplete = () => resolve();
      tx.onabort = () =>
        reject(tx.error ?? new Error("Storage transaction aborted"));
      req.onerror = () => reject(req.error);
    });
  }

  // --- Mutation Queue ---
  async queueMutation(
    mutation: Omit<OfflineMutation, "id" | "timestamp">,
  ): Promise<number> {
    this.guard?.();
    const db = await this.getDB();
    this.guard?.();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("mutations", "readwrite");
      const store = tx.objectStore("mutations");
      const item: OfflineMutation = {
        ...mutation,
        timestamp: Date.now(),
      };
      const req = store.add(item);
      tx.oncomplete = () => resolve(req.result as number);
      tx.onabort = () =>
        reject(tx.error ?? new Error("Storage transaction aborted"));
      req.onerror = () => reject(req.error);
    });
  }

  async getPendingMutations(): Promise<OfflineMutation[]> {
    this.guard?.();
    const db = await this.getDB();
    this.guard?.();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("mutations", "readonly");
      const store = tx.objectStore("mutations");
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async deleteMutation(id: number): Promise<void> {
    this.guard?.();
    const db = await this.getDB();
    this.guard?.();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("mutations", "readwrite");
      const store = tx.objectStore("mutations");
      const req = store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onabort = () =>
        reject(tx.error ?? new Error("Storage transaction aborted"));
      req.onerror = () => reject(req.error);
    });
  }

  async clearMutations(): Promise<void> {
    this.guard?.();
    const db = await this.getDB();
    this.guard?.();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("mutations", "readwrite");
      const store = tx.objectStore("mutations");
      const req = store.clear();
      tx.oncomplete = () => resolve();
      tx.onabort = () =>
        reject(tx.error ?? new Error("Storage transaction aborted"));
      req.onerror = () => reject(req.error);
    });
  }

  // --- Metadata Store ---
  async setMetadata(key: string, value: any): Promise<void> {
    this.guard?.();
    const db = await this.getDB();
    this.guard?.();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("metadata", "readwrite");
      const store = tx.objectStore("metadata");
      const req = store.put({ key, value });
      tx.oncomplete = () => resolve();
      tx.onabort = () =>
        reject(tx.error ?? new Error("Storage transaction aborted"));
      req.onerror = () => reject(req.error);
    });
  }

  async getMetadata<T>(key: string): Promise<T | undefined> {
    this.guard?.();
    const db = await this.getDB();
    this.guard?.();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("metadata", "readonly");
      const store = tx.objectStore("metadata");
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ? req.result.value : undefined);
      req.onerror = () => reject(req.error);
    });
  }

  async clearAll(): Promise<void> {
    this.guard?.();
    const db = await this.getDB();
    this.guard?.();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(
        ["files", "mutations", "metadata"],
        "readwrite",
      );
      tx.objectStore("files").clear();
      tx.objectStore("mutations").clear();
      tx.objectStore("metadata").clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

export const offlineDb = new OfflineDatabase();
