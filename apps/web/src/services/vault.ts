import type { SyncStatus, Vault, VaultFile } from "../types/vault";
import { offlineDb } from "./storage/offlineDb";
import { supabase } from "./supabaseClient";

// UTF-8-safe base64 encoding/decoding (btoa/atob only support Latin-1)
function utf8ToBase64(str: string): string {
  return btoa(String.fromCodePoint(...new TextEncoder().encode(str)));
}

function base64ToUtf8(base64: string): string {
  const binary = atob(base64.replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, (c) => c.codePointAt(0)!);
  return new TextDecoder().decode(bytes);
}

export class VaultService {
  private async invoke<T>(
    path: string,
    options: {
      method: "GET" | "POST" | "PUT" | "DELETE";
      body?: Record<string, unknown>;
    },
  ): Promise<T> {
    const { data, error } = await supabase.functions.invoke(`api-v1${path}`, {
      method: options.method,
      body: options.body,
    });

    if (error) {
      throw new Error(error.message || "API request failed");
    }

    return data;
  }

  // Store GitHub token server-side (called once after OAuth login)
  async storeGitHubToken(token: string): Promise<void> {
    await this.invoke("/v1/auth/github-token", {
      method: "POST",
      body: { token },
    });
  }

  async getVault(): Promise<Vault> {
    try {
      if (navigator.onLine) {
        const vault = await this.invoke<Vault>("/v1/vault", { method: "GET" });
        await offlineDb.setMetadata("vault", vault);
        return vault;
      }
    } catch (_err) {
      // Fallback to offline storage
    }

    const cachedVault = await offlineDb.getMetadata<Vault>("vault");
    if (cachedVault) return cachedVault;
    throw new Error("Vault not available offline and not yet cached");
  }

  async createVault(repository: string, description?: string): Promise<Vault> {
    const vault = await this.invoke<Vault>("/v1/vault", {
      method: "POST",
      body: { repository, description },
    });
    await offlineDb.setMetadata("vault", vault);
    return vault;
  }

  async listFiles(): Promise<{ entries: VaultFile[] }> {
    try {
      if (navigator.onLine) {
        const res = await this.invoke<Record<string, unknown>>("/v1/files", {
          method: "GET",
        });
        const rawEntries = Array.isArray(res)
          ? res
          : ((res?.entries || res?.files || []) as Record<string, unknown>[]);
        const entries: VaultFile[] = rawEntries.map(
          (f: Record<string, unknown>) => ({
            path: f.path as string,
            name:
              (f.name as string) ||
              (f.path as string).split("/").pop() ||
              (f.path as string),
            type: (f.type === "directory" ||
            f.type === "dir" ||
            f.type === "tree"
              ? "directory"
              : "file") as "file" | "directory",
            size: (f.size as number) || 0,
            lastModified:
              (f.lastModified as string) || new Date().toISOString(),
            sha: f.sha as string | undefined,
          }),
        );

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

  async getFile(path: string): Promise<VaultFile> {
    try {
      if (navigator.onLine) {
        const f = await this.invoke<Record<string, unknown>>(
          `/v1/files/${path}`,
          { method: "GET" },
        );
        const file: VaultFile = {
          path: f.path as string,
          name:
            (f.name as string) ||
            (f.path as string).split("/").pop() ||
            (f.path as string),
          type: (f.type === "directory" || f.type === "dir"
            ? "directory"
            : "file") as "file" | "directory",
          size: f.size as number,
          lastModified: (f.lastModified as string) || new Date().toISOString(),
          sha: f.sha as string | undefined,
          content: f.content ? base64ToUtf8(f.content as string) : "",
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

  async createFile(params: {
    path: string;
    content: string;
    commitMessage?: string;
  }): Promise<VaultFile> {
    const filename = params.path.split("/").pop() || params.path;
    const optimisticFile: VaultFile = {
      path: params.path,
      name: filename,
      type: "file",
      content: params.content,
      lastModified: new Date().toISOString(),
    };

    if (navigator.onLine) {
      try {
        const res = await this.invoke<{ path: string }>("/v1/files", {
          method: "POST",
          body: {
            path: params.path,
            content: utf8ToBase64(params.content),
            commitMessage: params.commitMessage,
          },
        });
        const saved = await this.getFile(res.path);
        return saved;
      } catch (err) {
        console.warn("Online create failed, queuing offline mutation:", err);
      }
    }

    // Save optimistically to offline cache & queue mutation
    await offlineDb.saveFile(optimisticFile);
    await offlineDb.queueMutation({
      action: "create",
      path: params.path,
      content: params.content,
      commitMessage: params.commitMessage,
    });

    return optimisticFile;
  }

  async updateFile(
    path: string,
    params: { content: string; expectedSha?: string; commitMessage?: string },
  ): Promise<VaultFile> {
    const filename = path.split("/").pop() || path;
    const optimisticFile: VaultFile = {
      path,
      name: filename,
      type: "file",
      content: params.content,
      sha: params.expectedSha,
      lastModified: new Date().toISOString(),
    };

    if (navigator.onLine) {
      try {
        const res = await this.invoke<{ path: string }>(`/v1/files/${path}`, {
          method: "PUT",
          body: {
            content: utf8ToBase64(params.content),
            expectedSha: params.expectedSha,
            commitMessage: params.commitMessage,
          },
        });
        const saved = await this.getFile(res.path);
        return saved;
      } catch (err: unknown) {
        const error = err as { message?: string; code?: string };
        // If conflict, propagate error so user is notified
        if (
          error?.message?.includes("conflict") ||
          error?.message?.includes("409") ||
          error?.code === "CONFLICT"
        ) {
          throw err;
        }
        console.warn("Online update failed, queuing offline mutation:", err);
      }
    }

    // Save optimistically to offline cache & queue mutation
    await offlineDb.saveFile(optimisticFile);
    await offlineDb.queueMutation({
      action: "update",
      path,
      content: params.content,
      expectedSha: params.expectedSha,
      commitMessage: params.commitMessage,
    });

    return optimisticFile;
  }

  async deleteFile(path: string, sha?: string): Promise<void> {
    if (navigator.onLine && sha) {
      try {
        await this.invoke<void>(`/v1/files/${path}`, {
          method: "DELETE",
          body: { expectedSha: sha },
        });
        await offlineDb.deleteFile(path);
        return;
      } catch (err) {
        console.warn("Online delete failed, queuing offline mutation:", err);
      }
    }

    await offlineDb.deleteFile(path);
    await offlineDb.queueMutation({
      action: "delete",
      path,
      expectedSha: sha,
    });
  }

  async syncPendingMutations(): Promise<{
    syncedCount: number;
    errors: Array<{ mutation: unknown; error: string }>;
  }> {
    if (!navigator.onLine) {
      return { syncedCount: 0, errors: [{ mutation: null, error: "Offline" }] };
    }

    const mutations = await offlineDb.getPendingMutations();
    if (mutations.length === 0) {
      // Trigger cloud sync status ping
      try {
        await this.invoke("/v1/sync", { method: "POST" });
      } catch (_e) {
        // Ignore ping error
      }
      return { syncedCount: 0, errors: [] };
    }

    let syncedCount = 0;
    const errors: Array<{ mutation: unknown; error: string }> = [];

    for (const m of mutations) {
      try {
        if (m.action === "create" && m.content !== undefined) {
          await this.invoke("/v1/files", {
            method: "POST",
            body: {
              path: m.path,
              content: utf8ToBase64(m.content),
              commitMessage:
                m.commitMessage || `Create note: ${m.path} (offline sync)`,
            },
          });
        } else if (m.action === "update" && m.content !== undefined) {
          await this.invoke(`/v1/files/${m.path}`, {
            method: "PUT",
            body: {
              content: utf8ToBase64(m.content),
              expectedSha: m.expectedSha,
              commitMessage:
                m.commitMessage || `Update note: ${m.path} (offline sync)`,
            },
          });
        } else if (m.action === "delete") {
          await this.invoke(`/v1/files/${m.path}`, {
            method: "DELETE",
            body: m.expectedSha ? { expectedSha: m.expectedSha } : {},
          });
        }

        if (m.id !== undefined) {
          await offlineDb.deleteMutation(m.id);
        }
        syncedCount++;
      } catch (err: unknown) {
        const error = err as { message?: string };
        console.error(`Sync error on mutation ${m.path}:`, err);
        errors.push({ mutation: m, error: error?.message || "Unknown error" });
        // Stop batch on conflict or critical error
        break;
      }
    }

    // Refresh file cache from GitHub after sync
    await this.listFiles();

    return { syncedCount, errors };
  }

  async getSyncStatus(): Promise<SyncStatus> {
    const mutations = await offlineDb.getPendingMutations();
    if (mutations.length > 0) {
      return {
        status: "pending",
        lastSyncAt: null,
        message: `${mutations.length} change(s) queued for sync`,
      };
    }

    if (navigator.onLine) {
      try {
        return await this.invoke<SyncStatus>("/v1/sync/status", {
          method: "GET",
        });
      } catch (_e) {
        // Fallback
      }
    }

    return {
      lastSyncAt: new Date().toISOString(),
      status: "idle",
      message: navigator.onLine ? "Vault synchronized" : "Offline mode",
    };
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
    const q = query.trim();
    if (!q) return { query, results: [] };

    if (navigator.onLine) {
      try {
        const url = `/v1/search?q=${encodeURIComponent(q)}${pathPrefix ? `&path=${encodeURIComponent(pathPrefix)}` : ""}`;
        const res = await this.invoke<{
          query: string;
          results: Array<{
            path: string;
            title: string;
            snippet: string;
            score: number;
          }>;
        }>(url, {
          method: "GET",
        });
        return res;
      } catch (_err) {
        // Fallback to offline search
      }
    }

    // Offline / Local search through IndexedDB files
    const list = await this.listFiles();
    const queryLower = q.toLowerCase();
    const results = list.entries
      .filter(
        (f) =>
          f.type === "file" &&
          f.name.toLowerCase().includes(queryLower) &&
          (!pathPrefix || f.path.startsWith(pathPrefix)),
      )
      .map((f) => ({
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
