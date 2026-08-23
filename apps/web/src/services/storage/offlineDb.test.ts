import { beforeEach, describe, expect, it } from "vitest";
import "fake-indexeddb/auto";
import { offlineDb } from "./offlineDb";

describe("OfflineDatabase", () => {
  beforeEach(async () => {
    await offlineDb.clearAll();
  });

  it("saves and retrieves cached files", async () => {
    const file = {
      name: "test.md",
      path: "notes/test.md",
      type: "file" as const,
      sha: "abc123sha",
      content: "# Offline Test Note",
      lastModified: new Date().toISOString(),
    };

    await offlineDb.saveFile(file);
    const retrieved = await offlineDb.getFile("notes/test.md");

    expect(retrieved).toBeDefined();
    expect(retrieved?.path).toBe("notes/test.md");
    expect(retrieved?.content).toBe("# Offline Test Note");
    expect(retrieved?.sha).toBe("abc123sha");
  });

  it("manages offline mutation queue in sequence", async () => {
    // Enqueue 2 mutations
    await offlineDb.queueMutation({
      action: "create",
      path: "notes/new-offline.md",
      content: "Offline note content",
    });

    await offlineDb.queueMutation({
      action: "update",
      path: "notes/existing.md",
      content: "Updated content",
      expectedSha: "old-sha",
    });

    const pending = await offlineDb.getPendingMutations();
    expect(pending).toHaveLength(2);
    expect(pending[0].action).toBe("create");
    expect(pending[0].path).toBe("notes/new-offline.md");
    expect(pending[1].action).toBe("update");

    // Remove first mutation
    if (pending[0].id) {
      await offlineDb.deleteMutation(pending[0].id);
    }

    const remaining = await offlineDb.getPendingMutations();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].action).toBe("update");
  });

  it("stores and retrieves arbitrary metadata", async () => {
    await offlineDb.setMetadata("last_sync_timestamp", 1724345000000);
    const val = await offlineDb.getMetadata("last_sync_timestamp");
    expect(val).toBe(1724345000000);
  });

  it("gets all files", async () => {
    await offlineDb.saveFile({
      name: "1.md",
      path: "1.md",
      type: "file",
      sha: "1",
      content: "1",
    });
    await offlineDb.saveFile({
      name: "2.md",
      path: "2.md",
      type: "file",
      sha: "2",
      content: "2",
    });
    const all = await offlineDb.getAllFiles();
    expect(all).toHaveLength(2);
  });

  it("deletes a file", async () => {
    await offlineDb.saveFile({
      name: "1.md",
      path: "1.md",
      type: "file",
      sha: "1",
      content: "1",
    });
    await offlineDb.deleteFile("1.md");
    const retrieved = await offlineDb.getFile("1.md");
    expect(retrieved).toBeUndefined();
  });

  it("clears all files", async () => {
    await offlineDb.saveFile({
      name: "1.md",
      path: "1.md",
      type: "file",
      sha: "1",
      content: "1",
    });
    await offlineDb.clearFiles();
    const all = await offlineDb.getAllFiles();
    expect(all).toHaveLength(0);
  });

  it("clears mutations", async () => {
    await offlineDb.queueMutation({
      action: "create",
      path: "1.md",
      content: "1",
    });
    await offlineDb.clearMutations();
    const mutations = await offlineDb.getPendingMutations();
    expect(mutations).toHaveLength(0);
  });

  it("clears everything", async () => {
    await offlineDb.saveFile({
      name: "1.md",
      path: "1.md",
      type: "file",
      sha: "1",
      content: "1",
    });
    await offlineDb.queueMutation({
      action: "create",
      path: "1.md",
      content: "1",
    });
    await offlineDb.setMetadata("key", "val");
    await offlineDb.clearAll();

    expect(await offlineDb.getAllFiles()).toHaveLength(0);
    expect(await offlineDb.getPendingMutations()).toHaveLength(0);
    expect(await offlineDb.getMetadata("key")).toBeUndefined();
  });

  it("saves multiple files", async () => {
    await offlineDb.saveFiles([
      { name: "1.md", path: "1.md", type: "file", sha: "1", content: "1" },
      { name: "2.md", path: "2.md", type: "file", sha: "2", content: "2" },
    ]);
    const all = await offlineDb.getAllFiles();
    expect(all).toHaveLength(2);
  });
});
