import { beforeEach, describe, expect, it, vi } from "vitest";
import "fake-indexeddb/auto";
import { FunctionsFetchError, FunctionsHttpError } from "@supabase/supabase-js";
import { offlineDb } from "./storage/offlineDb";
import { VaultService } from "./vault";

vi.mock("./supabaseClient", () => ({
  supabase: { functions: { invoke: vi.fn() }, auth: { getSession: vi.fn() } },
}));

import { supabase } from "./supabaseClient";

const invoke = vi.mocked(supabase.functions.invoke);
const service = new VaultService();
const remote = {
  path: "notes/note.md",
  name: "note.md",
  type: "file" as const,
  sha: "s0",
};
const online = (value: boolean) =>
  Object.defineProperty(navigator, "onLine", { value, configurable: true });
const ok = (data: unknown) =>
  ({ data: { data, error: null }, error: null }) as any;
const http = (status: number, code: string) =>
  ({
    data: null,
    error: new FunctionsHttpError(
      new Response(JSON.stringify({ error: { code, message: code } }), {
        status,
      }),
    ),
  }) as any;
beforeEach(async () => {
  vi.resetAllMocks();
  online(true);
  vi.mocked(supabase.auth.getSession).mockResolvedValue({
    data: { session: null },
    error: null,
  });
  await offlineDb.clearAll();
});
describe("real service, SDK responses and IndexedDB", () => {
  it("unwraps the documented vault envelope", async () => {
    invoke.mockResolvedValue(
      ok({ id: "v", owner: "u", repository: "r", branch: "main" }),
    );
    expect((await service.getVault())?.id).toBe("v");
  });
  it("returns null only for an explicitly missing vault", async () => {
    invoke.mockResolvedValue(http(404, "NOT_FOUND"));
    expect(await service.getVault()).toBeNull();
    invoke.mockResolvedValue(http(401, "TOKEN_REQUIRED"));
    await expect(service.getVault()).rejects.toMatchObject({
      code: "TOKEN_REQUIRED",
    });
  });
  it("keeps cached content when unchanged metadata is refreshed", async () => {
    await offlineDb.saveFile({ ...remote, content: "valuable cached note" });
    invoke.mockResolvedValue(ok({ entries: [remote] }));
    await service.listFiles();
    online(false);
    expect((await service.getFile(remote.path)).content).toBe(
      "valuable cached note",
    );
  });
  it("invalidates cached bodies when remote SHA changes", async () => {
    await offlineDb.saveFile({ ...remote, content: "stale" });
    invoke.mockResolvedValue(ok({ entries: [{ ...remote, sha: "new" }] }));
    await service.listFiles();
    online(false);
    await expect(service.getFile(remote.path)).rejects.toThrow(
      /not.*cached|not.*offline/i,
    );
  });
  it("overlays pending drafts on reconnect reads and listings", async () => {
    online(false);
    await service.updateFile(remote.path, {
      content: "unsynced edit",
      expectedSha: "s0",
    });
    online(true);
    invoke.mockResolvedValue(ok({ entries: [remote] }));
    expect((await service.listFiles()).entries[0].content).toBe(
      "unsynced edit",
    );
    expect((await service.getFile(remote.path)).content).toBe("unsynced edit");
  });
  it("propagates HTTP 409 without pretending the write succeeded", async () => {
    invoke.mockResolvedValue(http(409, "CONFLICT"));
    await expect(
      service.updateFile(remote.path, { content: "draft", expectedSha: "s0" }),
    ).rejects.toMatchObject({ code: "CONFLICT", status: 409 });
    expect(await offlineDb.getPendingMutations()).toHaveLength(0);
  });
  it.each([400, 401, 403, 422, 500])(
    "does not queue an HTTP %i as an offline success",
    async (status) => {
      invoke.mockResolvedValue(http(status, "REJECTED"));
      await expect(
        service.createFile({ path: remote.path, content: "draft" }),
      ).rejects.toThrow();
      expect(await offlineDb.getPendingMutations()).toHaveLength(0);
    },
  );
  it("queues actual network failures atomically with the draft", async () => {
    invoke.mockResolvedValue({
      data: null,
      error: new FunctionsFetchError(new TypeError("network unavailable")),
    } as any);
    await service.updateFile(remote.path, {
      content: "draft",
      expectedSha: "s0",
    });
    expect((await offlineDb.getFile(remote.path))?.content).toBe("draft");
    expect(await offlineDb.getPendingMutations()).toHaveLength(1);
  });
  it("removes remotely deleted cache entries while preserving local creates", async () => {
    await offlineDb.saveFile({ ...remote, content: "deleted elsewhere" });
    online(false);
    await service.createFile({ path: "local.md", content: "local" });
    online(true);
    invoke.mockResolvedValue(ok({ entries: [] }));
    expect((await service.listFiles()).entries.map((f) => f.path)).toEqual([
      "local.md",
    ]);
    online(false);
    expect((await service.listFiles()).entries.map((f) => f.path)).toEqual([
      "local.md",
    ]);
  });
  it("coalesces repeated offline edits and uploads only the final content", async () => {
    online(false);
    await service.updateFile(remote.path, {
      content: "first",
      expectedSha: "s0",
    });
    await service.updateFile(remote.path, {
      content: "second",
      expectedSha: "s0",
    });
    expect(await offlineDb.getPendingMutations()).toHaveLength(1);
    online(true);
    invoke.mockImplementation(async (_name, options) =>
      options?.method === "PUT"
        ? ok({ ...remote, sha: "s1" })
        : ok({ entries: [{ ...remote, sha: "s1" }] }),
    );
    expect((await service.syncPendingMutations()).errors).toHaveLength(0);
    expect(
      (
        invoke.mock.calls.find(([, o]) => o?.method === "PUT")?.[1]?.body as
          | { content?: string }
          | undefined
      )?.content,
    ).toBe(btoa("second"));
    expect(await offlineDb.getPendingMutations()).toHaveLength(0);
  });
  it("coalesces create followed by update, and cancels create followed by delete", async () => {
    online(false);
    await service.createFile({ path: "new.md", content: "first" });
    await service.updateFile("new.md", { content: "second" });
    expect((await offlineDb.getPendingMutations())[0]).toMatchObject({
      action: "create",
      content: "second",
    });
    await service.deleteFile("new.md");
    expect(await offlineDb.getPendingMutations()).toHaveLength(0);
    expect(await offlineDb.getFile("new.md")).toBeUndefined();
  });
  it("does not resurrect pending deletions during a list refresh", async () => {
    await offlineDb.saveFile({ ...remote, content: "remote" });
    online(false);
    await service.deleteFile(remote.path, remote.sha);
    online(true);
    invoke.mockResolvedValue(ok({ entries: [remote] }));
    expect((await service.listFiles()).entries).toHaveLength(0);
  });
  it("serializes overlapping syncs", async () => {
    online(false);
    await service.updateFile(remote.path, {
      content: "edit",
      expectedSha: "s0",
    });
    online(true);
    invoke.mockImplementation(async (_name, options) =>
      options?.method === "PUT"
        ? ok({ ...remote, sha: "s1" })
        : ok({ entries: [{ ...remote, sha: "s1" }] }),
    );
    await Promise.all([
      service.syncPendingMutations(),
      service.syncPendingMutations(),
    ]);
    expect(
      invoke.mock.calls.filter(([, o]) => o?.method === "PUT"),
    ).toHaveLength(1);
  });
  it("searches cached note bodies offline", async () => {
    await offlineDb.saveFile({ ...remote, content: "A capybara eats grass." });
    online(false);
    expect((await service.search("capybara")).results[0]?.path).toBe(
      remote.path,
    );
  });
  it("encodes reserved path characters before transport", async () => {
    invoke.mockResolvedValue(
      ok({ ...remote, path: "notes/C# why?.md", content: btoa("hello") }),
    );
    await service.getFile("notes/C# why?.md");
    expect(invoke.mock.calls[0][0]).toBe(
      "api-v1/v1/files/notes/C%23%20why%3F.md",
    );
  });
  it("handles large UTF8 notes without argument-spread overflow", async () => {
    const content = "അ".repeat(100000);
    invoke.mockResolvedValue(ok({ ...remote, sha: "s1" }));
    expect(
      (await service.updateFile(remote.path, { content, expectedSha: "s0" }))
        .content,
    ).toBe(content);
  });
});

describe("vault lifecycle, deletion and conflict recovery", () => {
  it("creates and connects vault metadata without dropping the envelope", async () => {
    const vault = { id: "v", owner: "u", repository: "r", branch: "dev" };
    invoke.mockResolvedValue(ok(vault));
    expect(await service.createVault("r", "notes")).toEqual(vault);
    expect(await service.connectVault("u", "r", "dev")).toEqual(vault);
    expect(invoke.mock.calls.at(-1)?.[1]?.body).toMatchObject({
      mode: "connect",
    });
    online(false);
    expect(await service.getVault()).toEqual(vault);
  });
  it("does not invent a vault without cached metadata", async () => {
    online(false);
    await expect(service.getVault()).rejects.toThrow(/not cached/);
  });
  it("never hides auth errors behind cached vault data", async () => {
    await offlineDb.setMetadata("vault", { id: "old" });
    invoke.mockResolvedValue(http(401, "UNAUTHORIZED"));
    await expect(service.getVault()).rejects.toMatchObject({ status: 401 });
  });
  it("falls back to a cached vault/list/body only for network failures", async () => {
    const vault = { id: "v", owner: "u", repository: "r", branch: "main" };
    await offlineDb.setMetadata("vault", vault);
    await offlineDb.saveFile({ ...remote, content: "cached" });
    invoke.mockResolvedValue({
      data: null,
      error: new FunctionsFetchError(new Error("network")),
    } as any);
    expect(await service.getVault()).toEqual(vault);
    expect((await service.listFiles()).entries).toHaveLength(1);
    expect((await service.getFile(remote.path)).content).toBe("cached");
  });
  it("fails clearly on malformed envelopes, listings, directories and missing file content", async () => {
    invoke.mockResolvedValue({ data: { id: "bad" }, error: null } as any);
    await expect(service.getVault()).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    });
    invoke.mockResolvedValue(ok({ entries: "not an array" }));
    await expect(service.listFiles()).rejects.toThrow(/Invalid file listing/);
    invoke.mockResolvedValue(ok({ ...remote, type: "directory" }));
    await expect(service.getRemoteFile(remote.path)).rejects.toThrow(
      /downloadable/,
    );
  });
  it("decodes UTF8 base64 and retains binary assets as base64", async () => {
    invoke
      .mockResolvedValueOnce(ok({ ...remote, content: btoa("hello") }))
      .mockResolvedValueOnce(
        ok({ ...remote, path: "pixel.png", content: "AP8=" }),
      );
    expect((await service.getFile(remote.path)).content).toBe("hello");
    expect(await service.getFile("pixel.png")).toMatchObject({
      content: "AP8=",
      encoding: "base64",
    });
  });
  it("uploads binary base64 exactly once", async () => {
    invoke.mockResolvedValue(ok({ ...remote, path: "pixel.png", sha: "new" }));
    await service.createFile({
      path: "pixel.png",
      content: "AP8=",
      encoding: "base64",
    });
    expect(invoke.mock.calls[0][1]?.body).toMatchObject({ content: "AP8=" });
  });
  it("deletes online using cached SHA and queues only transport failures", async () => {
    await offlineDb.saveFile({ ...remote, content: "cached" });
    invoke.mockResolvedValue({ data: null, error: null } as any);
    await service.deleteFile(remote.path);
    expect(await offlineDb.getFile(remote.path)).toBeUndefined();
    expect(invoke.mock.calls[0][1]?.body).toMatchObject({ expectedSha: "s0" });
    await offlineDb.saveFile({ ...remote, content: "cached" });
    invoke.mockResolvedValue({
      data: null,
      error: new FunctionsFetchError(new Error("network")),
    } as any);
    await service.deleteFile(remote.path);
    expect((await offlineDb.getPendingMutations())[0]).toMatchObject({
      action: "delete",
      expectedSha: "s0",
    });
    await expect(service.getFile(remote.path)).rejects.toThrow(
      /pending deletion/,
    );
  });
  it("propagates rejected delete without deleting the cache", async () => {
    await offlineDb.saveFile({ ...remote, content: "cached" });
    invoke.mockResolvedValue(http(403, "FORBIDDEN"));
    await expect(service.deleteFile(remote.path)).rejects.toMatchObject({
      status: 403,
    });
    expect(await offlineDb.getFile(remote.path)).toBeDefined();
  });
  it("protects branch switching and moving when local changes are pending", async () => {
    online(false);
    await service.updateFile(remote.path, {
      content: "draft",
      expectedSha: "s0",
    });
    await expect(service.changeBranch("dev")).rejects.toThrow(/Synchronize/);
    await expect(
      service.moveFile(remote.path, "other.md", "s0"),
    ).rejects.toThrow(/internet/);
    online(true);
    await expect(
      service.moveFile(remote.path, "other.md", "s0"),
    ).rejects.toThrow(/Synchronize/);
  });
  it("switches branch after validation and discards the old derived cache", async () => {
    await offlineDb.saveFile({ ...remote, content: "main note" });
    invoke.mockResolvedValue(
      ok({ id: "v", owner: "u", repository: "r", branch: "dev" }),
    );
    expect((await service.changeBranch("dev")).branch).toBe("dev");
    expect(await offlineDb.getAllFiles()).toHaveLength(0);
  });
  it("moves a file through the atomic endpoint and clears the obsolete cache path", async () => {
    await offlineDb.saveFile({ ...remote, content: "old" });
    invoke.mockResolvedValue(ok({ ...remote, path: "new.md" }));
    expect((await service.moveFile(remote.path, "new.md", "s0")).path).toBe(
      "new.md",
    );
    expect(await offlineDb.getFile(remote.path)).toBeUndefined();
    expect(invoke.mock.calls[0][0]).toBe("api-v1/v1/files/move");
  });
  it("does not claim a successful sync when remote validation fails", async () => {
    invoke.mockImplementation(async (name) =>
      name.endsWith("/v1/files")
        ? ok({ entries: [] })
        : http(503, "UNAVAILABLE"),
    );
    await expect(service.syncPendingMutations()).rejects.toMatchObject({
      status: 503,
    });
    expect((await service.getSyncStatus()).lastSyncAt).toBeNull();
  });
  it("rejects offline sync and resolution instead of pretending success", async () => {
    online(false);
    await expect(service.syncPendingMutations()).rejects.toThrow(/offline/);
    await expect(
      service.resolveConflict(remote.path, "remote", "draft"),
    ).rejects.toThrow(/internet/);
    expect((await service.getSyncStatus()).message).toMatch(/Offline/);
  });
  it("keeps a conflicting queued draft and reports the actual failed mutation", async () => {
    online(false);
    await service.updateFile(remote.path, {
      content: "local",
      expectedSha: "s0",
    });
    online(true);
    invoke.mockImplementation(async (_name, o) =>
      o?.method === "PUT"
        ? http(409, "CONFLICT")
        : ok({ ...remote, content: btoa("remote") }),
    );
    const result = await service.syncPendingMutations();
    expect(result.errors[0]).toMatchObject({
      code: "CONFLICT",
      mutation: { path: remote.path, content: "local" },
    });
    expect((await offlineDb.getPendingMutations())[0].content).toBe("local");
  });
  it("acknowledges an interrupted write that already has identical remote content", async () => {
    online(false);
    await service.createFile({ path: remote.path, content: "identical" });
    online(true);
    invoke.mockImplementation(async (name, o) =>
      o?.method === "POST" && name.endsWith("/files")
        ? http(409, "CONFLICT")
        : name.includes("/files/")
          ? ok({ ...remote, content: btoa("identical") })
          : ok({ entries: [remote] }),
    );
    expect((await service.syncPendingMutations()).syncedCount).toBe(1);
    expect(await offlineDb.getPendingMutations()).toHaveLength(0);
  });
  it("acknowledges a queued deletion already absent remotely", async () => {
    online(false);
    await service.deleteFile(remote.path, "s0");
    online(true);
    invoke.mockImplementation(async (_name, o) =>
      o?.method === "DELETE" ? http(404, "NOT_FOUND") : ok({ entries: [] }),
    );
    expect((await service.syncPendingMutations()).syncedCount).toBe(1);
    expect(await offlineDb.getPendingMutations()).toHaveLength(0);
  });
  it.each(["remote", "overwrite", "copy"] as const)(
    "resolves queued conflict via %s and removes only that path mutation",
    async (action) => {
      online(false);
      await service.updateFile(remote.path, {
        content: "draft",
        expectedSha: "s0",
      });
      await service.createFile({ path: "keep.md", content: "keep" });
      online(true);
      invoke.mockImplementation(async (name, o) =>
        o?.method === "GET"
          ? ok({ ...remote, content: btoa("remote text"), sha: "head" })
          : ok({
              ...remote,
              path: name.endsWith("/files") ? "copy.md" : remote.path,
              sha: "saved",
            }),
      );
      await service.resolveConflict(remote.path, action, "latest draft");
      expect(
        (await offlineDb.getPendingMutations()).map((m) => m.path),
      ).toEqual(["keep.md"]);
      expect((await offlineDb.getFile(remote.path))?.content).toBe(
        action === "overwrite" ? "latest draft" : "remote text",
      );
    },
  );
  it("failed resolution keeps the pending draft recoverable", async () => {
    online(false);
    await service.updateFile(remote.path, {
      content: "draft",
      expectedSha: "s0",
    });
    online(true);
    invoke.mockResolvedValue(http(403, "FORBIDDEN"));
    await expect(
      service.resolveConflict(remote.path, "overwrite", "draft"),
    ).rejects.toMatchObject({ status: 403 });
    expect(await offlineDb.getPendingMutations()).toHaveLength(1);
  });
  it("search propagates authorization failures and limits offline path scope", async () => {
    invoke.mockResolvedValue(http(401, "UNAUTHORIZED"));
    await expect(service.search("note")).rejects.toMatchObject({ status: 401 });
    online(false);
    await offlineDb.saveFile({ ...remote, content: "capybara" });
    expect((await service.search("capybara", "other/")).results).toHaveLength(
      0,
    );
    expect((await service.search("")).results).toHaveLength(0);
  });
});
