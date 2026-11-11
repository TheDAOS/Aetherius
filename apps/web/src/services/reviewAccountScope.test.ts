import "fake-indexeddb/auto";
import { waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { offlineDb } from "./storage/offlineDb";
import { supabase } from "./supabaseClient";
import { VaultService } from "./vault";

vi.mock("./supabaseClient", () => ({
  supabase: { functions: { invoke: vi.fn() }, auth: { getSession: vi.fn() } },
}));
const invoke = vi.mocked(supabase.functions.invoke);
const ok = (data: unknown) =>
  ({ data: { data, error: null }, error: null }) as never;
const remote = {
  path: "a.md",
  name: "a.md",
  type: "file",
  sha: "main-sha",
  content: btoa("private A note"),
};
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function account(id: string) {
  offlineDb.setUserId(id);
  vi.mocked(supabase.auth.getSession).mockResolvedValue({
    data: { session: { access_token: `${id}-jwt`, user: { id } } },
    error: null,
  } as never);
}
beforeEach(async () => {
  vi.resetAllMocks();
  Object.defineProperty(navigator, "onLine", {
    value: true,
    configurable: true,
  });
  account("review-A");
  await offlineDb.clearAll();
  account("review-B");
  await offlineDb.clearAll();
  account("review-A");
});

it("does not store a delayed A file response in B's account cache", async () => {
  const response = deferred<ReturnType<typeof ok>>();
  invoke.mockReturnValue(response.promise);
  const service = new VaultService();
  const result = service.getFile("a.md");
  await waitFor(() => expect(invoke).toHaveBeenCalledOnce());
  account("review-B");
  response.resolve(ok(remote));
  await expect(result).rejects.toThrow(/account|scope|changed/i);
  expect(await offlineDb.getFile("a.md")).toBeUndefined();
});

it("invalidates an old branch's delayed downloads before clearing the new branch cache", async () => {
  const response = deferred<ReturnType<typeof ok>>();
  invoke.mockImplementation(async (_name, options) =>
    options?.method === "PATCH"
      ? ok({ id: "v", owner: "u", repository: "r", branch: "dev" })
      : response.promise,
  );
  const service = new VaultService();
  const download = service.getFile("a.md");
  await waitFor(() => expect(invoke).toHaveBeenCalledOnce());
  await service.changeBranch("dev");
  response.resolve(ok(remote));
  await expect(download).rejects.toThrow(/branch|vault|scope|changed/i);
  expect(await offlineDb.getFile("a.md")).toBeUndefined();
});

it("does not execute old-account queued writes with the next account's credentials", async () => {
  const response = deferred<ReturnType<typeof ok>>();
  invoke.mockReturnValue(response.promise);
  const service = new VaultService();
  const first = service.updateFile("a.md", {
    content: "first",
    expectedSha: "s0",
  });
  const second = service.updateFile("b.md", {
    content: "second",
    expectedSha: "s0",
  });
  const outcomes = Promise.allSettled([first, second]);
  await waitFor(() => expect(invoke).toHaveBeenCalledOnce());
  account("review-B");
  response.resolve(ok({ ...remote, sha: "s1" }));
  expect(
    (await outcomes).every((outcome) => outcome.status === "rejected"),
  ).toBe(true);
  expect(invoke).toHaveBeenCalledOnce();
  expect(
    (invoke.mock.calls[0][1] as { headers: Record<string, string> }).headers
      .Authorization,
  ).toBe("Bearer review-A-jwt");
  expect(await offlineDb.getAllFiles()).toHaveLength(0);
});

it("serializes writes against sync across service instances", async () => {
  Object.defineProperty(navigator, "onLine", {
    value: false,
    configurable: true,
  });
  const firstTab = new VaultService();
  const secondTab = new VaultService();
  await firstTab.updateFile("a.md", {
    content: "old draft",
    expectedSha: "s0",
  });
  Object.defineProperty(navigator, "onLine", {
    value: true,
    configurable: true,
  });
  const response = deferred<ReturnType<typeof ok>>();
  let sends = 0;
  invoke.mockImplementation(async (_name, options) =>
    options?.method === "PUT"
      ? ++sends === 1
        ? response.promise
        : ok({ ...remote, sha: "s2" })
      : ok({ entries: [{ ...remote, content: undefined, sha: "s1" }] }),
  );
  const sync = firstTab.syncPendingMutations();
  await waitFor(() => expect(invoke).toHaveBeenCalledOnce());
  let complete = false;
  const later = secondTab
    .updateFile("a.md", { content: "new draft", expectedSha: "s1" })
    .then(() => {
      complete = true;
    });
  await new Promise((resolve) => setTimeout(resolve, 10));
  expect(complete).toBe(false);
  response.resolve(ok({ ...remote, sha: "s1" }));
  await sync;
  await later;
  expect((await offlineDb.getFile("a.md"))?.content).toBe("new draft");
});

it("uses browser Web Locks for cross-tab mutation exclusion", async () => {
  const request = vi.fn(async (_name, _options, callback) => callback());
  Object.defineProperty(navigator, "locks", {
    value: { request },
    configurable: true,
  });
  Object.defineProperty(navigator, "onLine", {
    value: false,
    configurable: true,
  });
  await new VaultService().createFile({ path: "new.md", content: "draft" });
  expect(request.mock.calls[0][0]).toBe("aetherius-vault-review-A");
  Object.defineProperty(navigator, "locks", {
    value: undefined,
    configurable: true,
  });
});

it("atomically preserves a draft queued while a remote file response is cached", async () => {
  const remoteFile = {
    ...remote,
    type: "file" as const,
    content: "remote body",
    encoding: "utf-8" as const,
  };
  const draft = { ...remoteFile, content: "local draft" };
  await offlineDb.applyMutation(
    {
      action: "update",
      path: "a.md",
      content: draft.content,
      expectedSha: "main-sha",
    },
    draft,
  );
  const result = await offlineDb.cacheRemoteFile(remoteFile);
  expect(result.content).toBe("local draft");
  expect((await offlineDb.getFile("a.md"))?.content).toBe("local draft");
});

it("rejects caching an old branch response after another tab changes cached vault metadata", async () => {
  await offlineDb.setMetadata("vault", { id: "v", branch: "main" });
  const response = deferred<ReturnType<typeof ok>>();
  invoke.mockReturnValue(response.promise);
  const result = new VaultService().getFile("a.md");
  await waitFor(() => expect(invoke).toHaveBeenCalledOnce());
  await offlineDb.setMetadata("vault", { id: "v", branch: "dev" });
  response.resolve(ok(remote));
  await expect(result).rejects.toThrow(/branch|vault|changed/i);
  expect(await offlineDb.getFile("a.md")).toBeUndefined();
});

it("binds legacy queued edits to cached branch before refreshing metadata", async () => {
  await offlineDb.setMetadata("vault", { id: "v", branch: "main" });
  await offlineDb.queueMutation({
    action: "update",
    path: "a.md",
    content: "legacy draft",
    expectedSha: "s0",
  });
  invoke.mockResolvedValue(ok({ id: "v", branch: "dev" }));
  await new VaultService().getVault();
  expect((await offlineDb.getPendingMutations())[0]).toMatchObject({
    expectedBranch: "main",
  });
});

it("never acknowledges another branch's equal content as a successful queued write", async () => {
  await offlineDb.setMetadata("vault", { id: "v", branch: "dev" });
  await offlineDb.applyMutation(
    {
      action: "update",
      path: "a.md",
      content: "draft",
      expectedSha: "s0",
      expectedBranch: "main",
    },
    { ...remote, type: "file", content: "draft" },
  );
  invoke.mockResolvedValue({
    data: {
      data: null,
      error: { code: "BRANCH_CHANGED", message: "Branch changed" },
    },
    error: null,
  } as never);
  const result = await new VaultService().syncPendingMutations();
  expect(result.errors[0]).toMatchObject({ code: "BRANCH_CHANGED" });
  expect(await offlineDb.getPendingMutations()).toHaveLength(1);
  expect(invoke.mock.calls[0][1]?.body).toMatchObject({
    expectedBranch: "main",
  });
  expect(invoke).toHaveBeenCalledOnce();
});

it("can restore the queued branch without erasing its pending drafts", async () => {
  await offlineDb.setMetadata("vault", { id: "v", branch: "dev" });
  await offlineDb.applyMutation(
    {
      action: "update",
      path: "a.md",
      content: "draft",
      expectedSha: "s0",
      expectedBranch: "main",
    },
    { ...remote, type: "file", content: "draft" },
  );
  invoke.mockResolvedValue(ok({ id: "v", branch: "main" }));
  await new VaultService().changeBranch("main");
  expect((await offlineDb.getFile("a.md"))?.content).toBe("draft");
  expect(await offlineDb.getPendingMutations()).toHaveLength(1);
  expect(await offlineDb.getMetadata("vault")).toMatchObject({
    branch: "main",
  });
});

it("retains the original vault label when another device switches away from pending drafts", async () => {
  await offlineDb.setMetadata("vault", { id: "v", branch: "main" });
  await offlineDb.queueMutation({
    action: "update",
    path: "a.md",
    content: "pending",
    expectedSha: "s0",
  });
  invoke.mockResolvedValue(ok({ id: "v", branch: "dev" }));
  expect(await new VaultService().getVault()).toMatchObject({ branch: "main" });
  expect(await offlineDb.getMetadata("vault")).toMatchObject({
    branch: "main",
  });
});
it("does not reconcile a stale listing after another tab changes branches", async () => {
  await offlineDb.setMetadata("vault", { id: "v", branch: "main" });
  const response = deferred<ReturnType<typeof ok>>();
  invoke.mockReturnValue(response.promise);
  const request = new VaultService().listFiles();
  await waitFor(() => expect(invoke).toHaveBeenCalledOnce());
  await offlineDb.setMetadata("vault", { id: "v", branch: "dev" });
  response.resolve(ok({ entries: [remote] }));
  await expect(request).rejects.toThrow(/branch changed/);
  expect(await offlineDb.getAllFiles()).toEqual([]);
});
