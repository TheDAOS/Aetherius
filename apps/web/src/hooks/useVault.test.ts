import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { VaultApiError, vaultService } from "../services/vault";
import { useVault } from "./useVault";

vi.mock("../services/vault", async (original) => {
  const actual = await original<typeof import("../services/vault")>();
  return {
    ...actual,
    vaultService: {
      getVault: vi.fn(),
      listFiles: vi.fn(),
      getFile: vi.fn(),
      getSyncStatus: vi.fn(),
      syncPendingMutations: vi.fn(),
      updateFile: vi.fn(),
      createFile: vi.fn(),
      deleteFile: vi.fn(),
      resolveConflict: vi.fn(),
      changeBranch: vi.fn(),
      moveFile: vi.fn(),
    },
  };
});
const file = (path: string, content = path) => ({
  path,
  content,
  name: path,
  type: "file" as const,
  sha: path,
});
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};
beforeEach(() => {
  window.history.replaceState(null, "", "/");
  vi.resetAllMocks();
  Object.defineProperty(navigator, "onLine", {
    value: true,
    configurable: true,
  });
  vi.mocked(vaultService.getVault).mockResolvedValue({
    id: "v",
    owner: "u",
    repository: "r",
    branch: "main",
  });
  vi.mocked(vaultService.listFiles).mockResolvedValue({
    entries: [file("README.md"), file("b.md")],
  });
  vi.mocked(vaultService.getFile).mockImplementation(async (path) =>
    file(path),
  );
  vi.mocked(vaultService.getSyncStatus).mockResolvedValue({
    status: "idle",
    lastSyncAt: null,
  });
  vi.mocked(vaultService.syncPendingMutations).mockResolvedValue({
    syncedCount: 0,
    errors: [],
  });
});
it("loads vault and automatically replays pending changes on startup", async () => {
  const { result } = renderHook(() => useVault());
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  await waitFor(() =>
    expect(result.current.activeFile?.path).toBe("README.md"),
  );
  expect(vaultService.syncPendingMutations).toHaveBeenCalled();
});
it("does not confuse a server error with a missing vault", async () => {
  vi.mocked(vaultService.getVault).mockRejectedValue(
    new Error("Token setup failed"),
  );
  const { result } = renderHook(() => useVault());
  await waitFor(() => expect(result.current.error).toBe("Token setup failed"));
  expect(result.current.vault).toBeNull();
});
it("ignores stale file loads after another note is selected", async () => {
  const slow = deferred<ReturnType<typeof file>>();
  const { result } = renderHook(() => useVault());
  await waitFor(() =>
    expect(result.current.activeFile?.path).toBe("README.md"),
  );
  vi.mocked(vaultService.getFile).mockImplementation((path) =>
    path === "a.md" ? slow.promise : Promise.resolve(file(path)),
  );
  act(() => result.current.selectFile("a.md"));
  act(() => result.current.selectFile("b.md"));
  await waitFor(() => expect(result.current.activeFile?.path).toBe("b.md"));
  await act(async () => slow.resolve(file("a.md")));
  expect(result.current.content).toBe("b.md");
});
it("cannot save previous content under a newly selected path while loading", async () => {
  const slow = deferred<ReturnType<typeof file>>();
  const { result } = renderHook(() => useVault());
  await waitFor(() =>
    expect(result.current.activeFile?.path).toBe("README.md"),
  );
  vi.mocked(vaultService.getFile).mockReturnValue(slow.promise);
  act(() => result.current.selectFile("b.md"));
  await act(async () => result.current.saveActiveFile());
  expect(vaultService.updateFile).not.toHaveBeenCalled();
  await act(async () => slow.resolve(file("b.md")));
});
it("keeps edits made during an in-flight save dirty", async () => {
  const save = deferred<ReturnType<typeof file>>();
  const { result } = renderHook(() => useVault());
  await waitFor(() =>
    expect(result.current.activeFile?.path).toBe("README.md"),
  );
  vi.mocked(vaultService.updateFile).mockReturnValue(save.promise);
  act(() => result.current.updateContent("first"));
  let pending!: Promise<void>;
  act(() => {
    pending = result.current.saveActiveFile();
  });
  act(() => result.current.updateContent("second"));
  await act(async () => {
    save.resolve(file("README.md", "first"));
    await pending;
  });
  expect(result.current.content).toBe("second");
  expect(result.current.isDirty).toBe(true);
});
it("exposes a structured conflict without discarding the editor draft", async () => {
  const { result } = renderHook(() => useVault());
  await waitFor(() =>
    expect(result.current.activeFile?.path).toBe("README.md"),
  );
  vi.mocked(vaultService.updateFile).mockRejectedValue(
    new VaultApiError("CONFLICT", "SHA changed", 409),
  );
  act(() => result.current.updateContent("draft"));
  await act(async () => result.current.saveActiveFile());
  expect(result.current.hasConflict).toBe(true);
  expect(result.current.content).toBe("draft");
  expect(result.current.isDirty).toBe(true);
});
it("uses hydrated note bodies for indexing and falls back to the first available Markdown note", async () => {
  vi.mocked(vaultService.listFiles).mockResolvedValue({
    entries: [{ ...file("notes/only.md"), content: undefined }],
  });
  const { result } = renderHook(() => useVault());
  await waitFor(() =>
    expect(result.current.activeFile?.path).toBe("notes/only.md"),
  );
  expect(result.current.files[0].content).toBe("notes/only.md");
});
it("does not load files or sync a user who has no vault configured", async () => {
  vi.mocked(vaultService.getVault).mockResolvedValue(null);
  const { result } = renderHook(() => useVault());
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.error).toBeNull();
  expect(vaultService.listFiles).not.toHaveBeenCalled();
});
it("asks before discarding an unsaved editor when selecting another note", async () => {
  vi.spyOn(window, "confirm").mockReturnValue(false);
  const { result } = renderHook(() => useVault());
  await waitFor(() => expect(result.current.activeFile).not.toBeNull());
  act(() => result.current.updateContent("draft"));
  act(() => result.current.selectFile("b.md"));
  expect(result.current.content).toBe("draft");
  expect(result.current.activeFilePath).toBe("README.md");
});
it("creates/selects a note, deletes it, and selects a surviving note", async () => {
  const { result } = renderHook(() => useVault());
  await waitFor(() => expect(result.current.activeFile).not.toBeNull());
  vi.mocked(vaultService.createFile).mockResolvedValue(file("new.md"));
  vi.mocked(vaultService.listFiles).mockResolvedValue({
    entries: [file("README.md"), file("new.md")],
  });
  await act(async () => {
    await result.current.createFile("new.md", "# New");
  });
  await waitFor(() => expect(result.current.activeFilePath).toBe("new.md"));
  vi.mocked(vaultService.listFiles).mockResolvedValue({
    entries: [file("README.md")],
  });
  await act(async () => {
    await result.current.deleteFile("new.md");
  });
  expect(result.current.activeFilePath).toBe("README.md");
  expect(vaultService.deleteFile).toHaveBeenCalledWith("new.md", "new.md");
});
it("preserves edits typed while a new note is being created", async () => {
  const create = deferred<ReturnType<typeof file>>();
  const { result } = renderHook(() => useVault());
  await waitFor(() => expect(result.current.activeFile).not.toBeNull());
  vi.mocked(vaultService.createFile).mockReturnValue(create.promise);
  let operation!: Promise<unknown>;
  act(() => {
    operation = result.current.createFile("new.md");
  });
  act(() => result.current.updateContent("typing while waiting"));
  await act(async () => {
    create.resolve(file("new.md"));
    await expect(operation).rejects.toThrow(/draft was preserved/);
  });
  expect(result.current.content).toBe("typing while waiting");
  expect(result.current.isDirty).toBe(true);
});
it("shows deletion failure without removing the current note", async () => {
  const { result } = renderHook(() => useVault());
  await waitFor(() => expect(result.current.activeFile).not.toBeNull());
  vi.mocked(vaultService.deleteFile).mockRejectedValue(
    new Error("Delete denied"),
  );
  await act(async () => result.current.deleteFile("README.md"));
  expect(result.current.error).toBe("Delete denied");
  expect(result.current.activeFilePath).toBe("README.md");
});
it("reports queued conflicts with the failed note and resolves using the latest editor draft", async () => {
  const { result } = renderHook(() => useVault());
  await waitFor(() => expect(result.current.activeFile).not.toBeNull());
  act(() => result.current.updateContent("snapshot"));
  vi.mocked(vaultService.updateFile).mockRejectedValue(
    new VaultApiError("CONFLICT", "changed", 409),
  );
  await act(async () => result.current.saveActiveFile());
  act(() => result.current.updateContent("newer edit"));
  await act(async () => result.current.resolveConflict("overwrite"));
  expect(vaultService.resolveConflict).toHaveBeenCalledWith(
    "README.md",
    "overwrite",
    "newer edit",
  );
  expect(result.current.hasConflict).toBe(false);
});
it("preserves typing during conflict resolution and keeps newer content dirty", async () => {
  const finish = deferred<void>();
  const { result } = renderHook(() => useVault());
  await waitFor(() => expect(result.current.activeFile).not.toBeNull());
  act(() => result.current.updateContent("snapshot"));
  vi.mocked(vaultService.updateFile).mockRejectedValue(
    new VaultApiError("CONFLICT", "changed", 409),
  );
  await act(async () => result.current.saveActiveFile());
  vi.mocked(vaultService.resolveConflict).mockReturnValue(finish.promise);
  let pending!: Promise<void>;
  act(() => {
    pending = result.current.resolveConflict("overwrite");
  });
  act(() => result.current.updateContent("new during resolve"));
  await act(async () => {
    finish.resolve();
    await pending;
  });
  expect(result.current.content).toBe("new during resolve");
  expect(result.current.isDirty).toBe(true);
});
it("exposes the failed queued mutation as a conflict instead of a generic successful sync", async () => {
  const { result } = renderHook(() => useVault());
  await waitFor(() => expect(result.current.activeFile).not.toBeNull());
  vi.mocked(vaultService.syncPendingMutations).mockResolvedValue({
    syncedCount: 0,
    errors: [
      {
        mutation: {
          action: "update",
          path: "b.md",
          content: "pending",
          timestamp: 0,
        },
        error: "changed",
        code: "CONFLICT",
      },
    ],
  });
  await act(async () => result.current.sync());
  expect(result.current.conflict).toEqual({ path: "b.md", content: "pending" });
  expect(result.current.syncStatus?.status).toBe("conflict");
});
it("rejects branch switching with a dirty editor and locks typing while a clean switch is pending", async () => {
  const branch = deferred<any>();
  const { result } = renderHook(() => useVault());
  await waitFor(() => expect(result.current.activeFile).not.toBeNull());
  act(() => result.current.updateContent("draft"));
  await expect(result.current.changeBranch("dev")).rejects.toThrow(
    /Save or discard/,
  );
  // Start again with a clean mounted workspace through a completed save.
  vi.mocked(vaultService.updateFile).mockResolvedValue(
    file("README.md", "draft"),
  );
  await act(async () => result.current.saveActiveFile());
  vi.mocked(vaultService.changeBranch).mockReturnValue(branch.promise);
  let pending!: Promise<void>;
  act(() => {
    pending = result.current.changeBranch("dev");
  });
  expect(result.current.isChangingBranch).toBe(true);
  act(() => result.current.updateContent("ignored while readonly"));
  expect(result.current.content).toBe("draft");
  await act(async () => {
    branch.resolve({ id: "v", owner: "u", repository: "r", branch: "dev" });
    await pending;
  });
  expect(result.current.isChangingBranch).toBe(false);
});
it("appends uploaded images only to the intended active note", async () => {
  const { result } = renderHook(() => useVault());
  await waitFor(() => expect(result.current.activeFile).not.toBeNull());
  act(() => result.current.appendToFile("README.md", " image link"));
  expect(result.current.content).toBe("README.md image link");
  expect(() => result.current.appendToFile("another.md", "bad")).toThrow(
    /active note changed/,
  );
});
