import type { SyncStatus, Vault, VaultFile } from "../types/vault";
import {
  type OfflineDatabase,
  type OfflineMutation,
  offlineDb,
} from "./storage/offlineDb";
import { supabase } from "./supabaseClient";

export class VaultApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
const pathUrl = (path: string) =>
  path.split("/").map(encodeURIComponent).join("/");
function encode(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}
function decode(base64: string): string {
  return new TextDecoder().decode(
    Uint8Array.from(atob(base64.replace(/\s/g, "")), (c) => c.charCodeAt(0)),
  );
}
const networkError = (error: unknown) =>
  error instanceof TypeError ||
  (error as Error)?.name === "FunctionsFetchError";
const textFile = (path: string) =>
  /\.(md|markdown|txt|json|ya?ml|csv|svg)$/i.test(path);

// Web Locks coordinate separate tabs/PWA windows. The promise fallback also
// coordinates multiple service instances in runtimes without LockManager.
const localLocks = new Map<string, Promise<unknown>>();
async function withAccountLock<T>(
  user: string | null,
  operation: () => Promise<T>,
): Promise<T> {
  const name = `aetherius-vault-${user ?? "default"}`;
  if (navigator.locks?.request)
    return navigator.locks.request(name, { mode: "exclusive" }, operation);
  const next = (localLocks.get(name) ?? Promise.resolve()).then(
    operation,
    operation,
  );
  const settled = next.catch(() => {});
  localLocks.set(name, settled);
  try {
    return await next;
  } finally {
    if (localLocks.get(name) === settled) localLocks.delete(name);
  }
}

export class VaultService {
  constructor(
    private readonly scopedDb?: OfflineDatabase,
    private readonly scopeVersion?: number,
    private readonly queue = {
      tail: Promise.resolve() as Promise<unknown>,
      epoch: 0,
    },
    private vaultEpoch = queue.epoch,
    private expectedBranch?: string,
  ) {}
  private assertScope(): void {
    if (
      this.scopedDb &&
      (offlineDb.getScopeVersion() !== this.scopeVersion ||
        this.queue.epoch !== this.vaultEpoch)
    ) {
      throw new VaultApiError(
        "SCOPE_CHANGED",
        "The account or vault branch changed. Retry this operation in the current workspace.",
        0,
      );
    }
  }
  private get db(): OfflineDatabase {
    this.assertScope();
    return this.scopedDb ?? offlineDb;
  }
  private async inScope<T>(
    operation: (service: VaultService) => Promise<T>,
  ): Promise<T> {
    const version = offlineDb.getScopeVersion();
    let service!: VaultService;
    const db = offlineDb.snapshot(() => service.assertScope());
    service = new VaultService(db, version, this.queue);
    service.expectedBranch = (await db.getMetadata<Vault>("vault"))?.branch;
    service.assertScope();
    const result = await operation(service);
    service.assertScope();
    return result;
  }
  private invalidateVaultReads(): void {
    this.queue.epoch++;
    this.vaultEpoch = this.queue.epoch;
  }

  private exclusive<T>(operation: () => Promise<T>): Promise<T> {
    const guarded = () =>
      withAccountLock(this.scopedDb?.getUserId() ?? null, async () => {
        this.assertScope();
        return operation();
      });
    const next = this.queue.tail.then(guarded, guarded);
    this.queue.tail = next.catch(() => {});
    return next;
  }
  private async invoke<T>(
    path: string,
    options: {
      method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
      body?: Record<string, unknown>;
    },
  ): Promise<T> {
    this.assertScope();
    const { data: auth, error: authError } = await supabase.auth.getSession();
    this.assertScope();
    if (authError) throw authError;
    if ((auth.session?.user.id ?? null) !== this.db.getUserId())
      throw new VaultApiError(
        "SCOPE_CHANGED",
        "The signed-in account changed. Retry this operation.",
        0,
      );
    // Pin the bearer instead of allowing the SDK to fetch another user's token
    // while a queued request waits for the auth lock.
    const headers = auth.session
      ? { Authorization: `Bearer ${auth.session.access_token}` }
      : undefined;
    if (
      /^\/v1\/(?:files|search|sync)(?:[/?]|$)/.test(path) &&
      this.expectedBranch
    ) {
      if (options.method === "GET") {
        if (!new URLSearchParams(path.split("?")[1]).has("expectedBranch"))
          path += `${path.includes("?") ? "&" : "?"}expectedBranch=${encodeURIComponent(this.expectedBranch)}`;
      } else
        options = {
          ...options,
          body: { expectedBranch: this.expectedBranch, ...options.body },
        };
    }

    const { data, error } = await supabase.functions.invoke(`api-v1${path}`, {
      ...options,
      headers,
    });
    this.assertScope();
    if (error) {
      const response = (error as { context?: Response }).context;
      if (response instanceof Response) {
        let payload: {
          error?: { code?: string; message?: string };
          code?: string;
          message?: string;
        } = {};
        try {
          payload = await response.clone().json();
        } catch {
          /* Non-JSON gateway response */
        }
        const detail = payload.error ?? payload;
        throw new VaultApiError(
          detail.code ?? "HTTP_ERROR",
          detail.message ?? `API request failed (${response.status})`,
          response.status,
        );
      }
      throw error;
    }
    if (data?.error)
      throw new VaultApiError(
        data.error.code ?? "API_ERROR",
        data.error.message ?? "API request failed",
        0,
      );
    if (data === null || data === undefined) return undefined as T; // HTTP 204
    if (!("data" in data))
      throw new VaultApiError(
        "INVALID_RESPONSE",
        "API response does not match the contract",
        0,
      );
    return data.data as T;
  }
  async storeGitHubToken(token: string): Promise<void> {
    if (!this.scopedDb)
      return this.inScope((service) => service.storeGitHubToken(token));
    this.assertScope();

    await this.invoke("/v1/auth/github-token", {
      method: "POST",
      body: { token },
    });
  }
  async getVault(): Promise<Vault | null> {
    if (!this.scopedDb) return this.inScope((service) => service.getVault());
    this.assertScope();

    return this.exclusive(async () => {
      if (this.expectedBranch)
        await this.db.bindLegacyMutations(this.expectedBranch);
      if (navigator.onLine) {
        try {
          const vault = await this.invoke<Vault>("/v1/vault", {
            method: "GET",
          });
          const cached = await this.db.getMetadata<Vault>("vault");
          const pending = await this.db.getPendingMutations();
          if (
            cached &&
            pending.some(
              (m) => m.expectedBranch && m.expectedBranch !== vault.branch,
            )
          )
            return cached;
          if (
            cached &&
            (cached.id !== vault.id || cached.branch !== vault.branch)
          ) {
            this.invalidateVaultReads();
            this.expectedBranch = vault.branch;
            await this.db.switchVault(vault, pending.length > 0);
          } else await this.db.setMetadata("vault", vault);
          return vault;
        } catch (error) {
          if (error instanceof VaultApiError && error.status === 404)
            return null;
          if (!networkError(error)) throw error;
        }
      }
      const vault = await this.db.getMetadata<Vault>("vault");
      if (!vault)
        throw new Error(
          "Vault is not cached for offline use. Connect to the internet and retry.",
        );
      return vault;
    });
  }
  async createVault(repository: string, description?: string): Promise<Vault> {
    if (!this.scopedDb)
      return this.inScope((service) =>
        service.createVault(repository, description),
      );
    this.assertScope();

    const vault = await this.invoke<Vault>("/v1/vault", {
      method: "POST",
      body: { repository, description },
    });
    await this.db.setMetadata("vault", vault);
    return vault;
  }
  async connectVault(
    owner: string,
    repository: string,
    branch?: string,
  ): Promise<Vault> {
    if (!this.scopedDb)
      return this.inScope((service) =>
        service.connectVault(owner, repository, branch),
      );
    this.assertScope();

    const vault = await this.invoke<Vault>("/v1/vault", {
      method: "POST",
      body: { mode: "connect", owner, repository, branch: branch || undefined },
    });
    await this.db.setMetadata("vault", vault);
    return vault;
  }
  async changeBranch(branch: string): Promise<Vault> {
    if (!this.scopedDb)
      return this.inScope((service) => service.changeBranch(branch));
    this.assertScope();

    return this.exclusive(async () => {
      if (this.expectedBranch)
        await this.db.bindLegacyMutations(this.expectedBranch);
      const pending = await this.db.getPendingMutations();
      if (
        pending.length &&
        !pending.every((mutation) => mutation.expectedBranch === branch)
      )
        throw new Error(
          "Synchronize pending changes before changing branches, or restore their original branch",
        );
      const vault = await this.invoke<Vault>("/v1/vault", {
        method: "PATCH",
        body: { branch },
      });
      this.invalidateVaultReads();
      this.expectedBranch = branch;
      await this.db.switchVault(vault, pending.length > 0);
      return vault;
    });
  }
  async moveFile(
    from: string,
    to: string,
    expectedSha?: string,
  ): Promise<VaultFile> {
    if (!this.scopedDb)
      return this.inScope((service) => service.moveFile(from, to, expectedSha));
    this.assertScope();

    return this.exclusive(async () => {
      if (!navigator.onLine)
        throw new Error("Connect to the internet to rename or move files");
      if (
        (await this.db.getPendingMutations()).some(
          (m) => m.path === from || m.path === to,
        )
      )
        throw new Error("Synchronize pending changes before moving this note");
      const saved = await this.invoke<VaultFile>("/v1/files/move", {
        method: "POST",
        body: { from, to, expectedSha },
      });
      await this.db.deleteFile(from);
      return saved;
    });
  }
  async listFiles(): Promise<{ entries: VaultFile[] }> {
    if (!this.scopedDb) return this.inScope((service) => service.listFiles());
    this.assertScope();

    if (navigator.onLine) {
      try {
        const expectedVault = await this.db.getMetadata<Vault>("vault");
        const result = await this.invoke<{ entries: VaultFile[] }>(
          "/v1/files",
          { method: "GET" },
        );
        if (!Array.isArray(result?.entries))
          throw new Error("Invalid file listing response");
        return {
          entries: await this.db.reconcileFiles(result.entries, expectedVault),
        };
      } catch (error) {
        if (!networkError(error)) throw error;
      }
    }
    return { entries: await this.db.getAllFiles() };
  }
  async getRemoteFile(
    path: string,
    expectedBranch?: string,
  ): Promise<VaultFile> {
    if (!this.scopedDb)
      return this.inScope((service) =>
        service.getRemoteFile(path, expectedBranch),
      );
    this.assertScope();

    const f = await this.invoke<VaultFile>(
      `/v1/files/${pathUrl(path)}${expectedBranch ? `?expectedBranch=${encodeURIComponent(expectedBranch)}` : ""}`,
      {
        method: "GET",
      },
    );
    if (!f || f.type === "directory" || f.content === undefined)
      throw new Error(`File ${path} has no downloadable content`);
    const encoding = textFile(path) ? "utf-8" : "base64";
    return {
      ...f,
      encoding,
      content:
        encoding === "utf-8" ? decode(f.content) : f.content.replace(/\s/g, ""),
    };
  }
  async getFile(path: string): Promise<VaultFile> {
    if (!this.scopedDb) return this.inScope((service) => service.getFile(path));
    this.assertScope();

    const pending = (await this.db.getPendingMutations()).find(
      (m) => m.path === path,
    );
    if (pending?.action === "delete")
      throw new Error(`File ${path} is pending deletion`);
    const cached = await this.db.getFile(path);
    if (pending && cached?.content !== undefined) return cached;
    if (navigator.onLine) {
      try {
        const expectedVault = await this.db.getMetadata<Vault>("vault");
        const file = await this.getRemoteFile(path);
        return await this.db.cacheRemoteFile(file, expectedVault);
      } catch (error) {
        if (!networkError(error)) throw error;
      }
    }
    if (cached?.content !== undefined) return cached;
    throw new Error(`File ${path} is not cached for offline use`);
  }
  private async write(
    mutation: Omit<OfflineMutation, "id" | "timestamp">,
  ): Promise<VaultFile> {
    return this.exclusive(async () => {
      const cached = await this.db.getFile(mutation.path);
      const optimistic: VaultFile = {
        path: mutation.path,
        name: mutation.path.split("/").pop()!,
        type: "file",
        content: mutation.content,
        encoding: mutation.encoding ?? "utf-8",
        sha: mutation.expectedSha ?? cached?.sha,
        lastModified: new Date().toISOString(),
      };
      const pending = (await this.db.getPendingMutations()).find(
        (m) => m.path === mutation.path,
      );
      if (
        pending?.expectedBranch &&
        mutation.expectedBranch &&
        pending.expectedBranch !== mutation.expectedBranch
      ) {
        throw new VaultApiError(
          "BRANCH_CHANGED",
          `This draft belongs to ${pending.expectedBranch}. Restore that branch before editing it.`,
          409,
        );
      }
      if (navigator.onLine && !pending) {
        try {
          const saved = await this.send(mutation);
          const file = {
            ...optimistic,
            ...saved,
            content: mutation.content,
            encoding: optimistic.encoding,
          };
          await this.db.saveFile(file);
          return file;
        } catch (error) {
          if (!networkError(error)) throw error;
        }
      }
      await this.db.applyMutation(mutation, optimistic);
      return optimistic;
    });
  }
  async createFile(params: {
    path: string;
    content: string;
    commitMessage?: string;
    encoding?: "utf-8" | "base64";
  }): Promise<VaultFile> {
    if (!this.scopedDb)
      return this.inScope((service) => service.createFile(params));
    this.assertScope();

    return this.write({
      ...params,
      action: "create",
      expectedBranch: this.expectedBranch,
    });
  }
  async updateFile(
    path: string,
    params: { content: string; expectedSha?: string; commitMessage?: string },
  ): Promise<VaultFile> {
    if (!this.scopedDb)
      return this.inScope((service) => service.updateFile(path, params));
    this.assertScope();

    return this.write({
      ...params,
      path,
      action: "update",
      expectedBranch: this.expectedBranch,
    });
  }
  async deleteFile(path: string, sha?: string): Promise<void> {
    if (!this.scopedDb)
      return this.inScope((service) => service.deleteFile(path, sha));
    this.assertScope();

    await this.exclusive(async () => {
      const pending = (await this.db.getPendingMutations()).find(
        (m) => m.path === path,
      );
      if (
        pending?.expectedBranch &&
        this.expectedBranch &&
        pending.expectedBranch !== this.expectedBranch
      ) {
        throw new VaultApiError(
          "BRANCH_CHANGED",
          `This draft belongs to ${pending.expectedBranch}. Restore that branch before deleting it.`,
          409,
        );
      }
      const expectedSha = sha ?? (await this.db.getFile(path))?.sha;
      if (navigator.onLine && !pending && expectedSha) {
        try {
          await this.send({
            action: "delete",
            path,
            expectedSha,
            expectedBranch: this.expectedBranch,
          });
          await this.db.deleteFile(path);
          return;
        } catch (error) {
          if (!networkError(error)) throw error;
        }
      }
      await this.db.applyMutation({
        action: "delete",
        path,
        expectedSha,
        expectedBranch: this.expectedBranch,
      });
    });
  }
  private async send(
    m: Omit<OfflineMutation, "id" | "timestamp">,
  ): Promise<VaultFile | undefined> {
    if (m.action === "delete")
      return this.invoke(`/v1/files/${pathUrl(m.path)}`, {
        method: "DELETE",
        body: {
          expectedSha: m.expectedSha,
          expectedBranch: m.expectedBranch ?? this.expectedBranch,
        },
      });
    return this.invoke(
      m.action === "create" ? "/v1/files" : `/v1/files/${pathUrl(m.path)}`,
      {
        method: m.action === "create" ? "POST" : "PUT",
        body: {
          ...(m.action === "create" ? { path: m.path } : {}),
          content:
            m.encoding === "base64" ? m.content : encode(m.content ?? ""),
          expectedSha: m.expectedSha,
          expectedBranch: m.expectedBranch ?? this.expectedBranch,
          commitMessage: m.commitMessage ?? `${m.action} ${m.path}`,
        },
      },
    );
  }
  async syncPendingMutations(): Promise<{
    syncedCount: number;
    errors: Array<{ mutation: OfflineMutation; error: string; code?: string }>;
  }> {
    if (!this.scopedDb)
      return this.inScope((service) => service.syncPendingMutations());
    this.assertScope();

    return this.exclusive(async () => {
      const errors: Array<{
        mutation: OfflineMutation;
        error: string;
        code?: string;
      }> = [];
      if (!navigator.onLine) throw new Error("Cannot sync while offline");
      let syncedCount = 0;
      if (this.expectedBranch)
        await this.db.bindLegacyMutations(this.expectedBranch);
      for (const mutation of await this.db.getPendingMutations()) {
        try {
          let saved: VaultFile | undefined;
          try {
            saved = await this.send(mutation);
          } catch (error) {
            // An interrupted response may have committed remotely. Acknowledge only
            // identical content; never silently overwrite a divergent remote note.
            if (
              error instanceof VaultApiError &&
              error.status === 409 &&
              error.code === "CONFLICT" &&
              mutation.action !== "delete"
            ) {
              const remote = await this.getRemoteFile(
                mutation.path,
                mutation.expectedBranch,
              );
              if (remote.content !== mutation.content) throw error;
              saved = remote;
            } else if (
              !(
                mutation.action === "delete" &&
                error instanceof VaultApiError &&
                error.status === 404
              )
            )
              throw error;
          }
          if (mutation.action === "delete")
            await this.db.deleteFile(mutation.path);
          else
            await this.db.saveFile({
              ...saved,
              path: mutation.path,
              name: mutation.path.split("/").pop()!,
              type: "file",
              content: mutation.content,
              encoding: mutation.encoding ?? "utf-8",
            });
          if (mutation.id !== undefined)
            await this.db.deleteMutation(mutation.id);
          syncedCount++;
        } catch (error) {
          errors.push({
            mutation,
            error: (error as Error).message,
            code: (error as VaultApiError).code,
          });
          break;
        }
      }
      if (errors.length === 0) {
        await this.listFiles();
        // This verifies remote access; it does not claim to upload local mutations.
        await this.invoke("/v1/sync", { method: "POST" });
        await this.db.setMetadata("lastSyncAt", new Date().toISOString());
      }
      return { syncedCount, errors };
    });
  }
  async getSyncStatus(): Promise<SyncStatus> {
    if (!this.scopedDb)
      return this.inScope((service) => service.getSyncStatus());
    this.assertScope();

    const mutations = await this.db.getPendingMutations();
    const lastSyncAt =
      (await this.db.getMetadata<string>("lastSyncAt")) ?? null;
    if (mutations.length)
      return {
        status: "pending",
        lastSyncAt,
        message: `${mutations.length} change(s) awaiting GitHub`,
      };
    return {
      status: "idle",
      lastSyncAt,
      message: navigator.onLine
        ? "No local changes pending"
        : "Offline — cached notes",
    };
  }
  async resolveConflict(
    path: string,
    action: "remote" | "overwrite" | "copy",
    content: string,
  ): Promise<void> {
    if (!this.scopedDb)
      return this.inScope((service) =>
        service.resolveConflict(path, action, content),
      );
    this.assertScope();

    await this.exclusive(async () => {
      if (!navigator.onLine)
        throw new Error("Connect to the internet to resolve this conflict");
      const remote = await this.getRemoteFile(path);
      if (action === "overwrite") {
        const saved = await this.send({
          action: "update",
          path,
          content,
          expectedSha: remote.sha,
        });
        await this.db.saveFile({ ...remote, ...saved, content });
      } else {
        if (action === "copy") {
          const copy = path.replace(
            /(\.[^/.]+)?$/,
            `.conflict-${Date.now()}$1`,
          );
          const saved = await this.send({
            action: "create",
            path: copy,
            content,
          });
          await this.db.saveFile({
            ...saved,
            path: copy,
            name: copy.split("/").pop()!,
            type: "file",
            content,
          });
        }
        await this.db.saveFile(remote);
      }
      await this.db.discardMutations(path);
    });
  }
  async search(
    query: string,
    pathPrefix?: string,
  ): Promise<{
    query: string;
    results: Array<{
      path: string;
      title: string;
      snippet: string;
      score: number;
    }>;
  }> {
    if (!this.scopedDb)
      return this.inScope((service) => service.search(query, pathPrefix));
    this.assertScope();

    const q = query.trim();
    if (!q) return { query, results: [] };
    if (navigator.onLine) {
      try {
        return await this.invoke(
          `/v1/search?q=${encodeURIComponent(q)}${pathPrefix ? `&path=${encodeURIComponent(pathPrefix)}` : ""}`,
          { method: "GET" },
        );
      } catch (error) {
        if (!networkError(error)) throw error;
      }
    }
    const files = await this.db.getAllFiles();
    return {
      query,
      results: files
        .filter(
          (f) =>
            f.type === "file" &&
            textFile(f.path) &&
            (!pathPrefix || f.path.startsWith(pathPrefix)) &&
            `${f.name}\n${f.content ?? ""}`
              .toLowerCase()
              .includes(q.toLowerCase()),
        )
        .map((f) => ({
          path: f.path,
          title: f.name,
          snippet: (f.content ?? f.path).slice(0, 200),
          score: 1,
        })),
    };
  }
}
export const vaultService = new VaultService();
