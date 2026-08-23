import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { offlineDb } from "../services/storage/offlineDb";
import { useVault } from "./useVault";

vi.mock("../services/vault", () => ({
  vaultService: {
    listFiles: vi.fn(),
    getFile: vi.fn(),
    updateFile: vi.fn(),
    createFile: vi.fn(),
    deleteFile: vi.fn(),
    deleteRepository: vi.fn(),
  },
}));

vi.mock("../services/storage/offlineDb", () => ({
  offlineDb: {
    getAllFiles: vi.fn(),
    setFile: vi.fn(),
    deleteFile: vi.fn(),
    clear: vi.fn(),
  },
}));

describe("useVault", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (offlineDb.getAllFiles as any).mockResolvedValue([]);
  });

  it("initializes with default state", async () => {
    let resultRef: any;
    await act(async () => {
      const { result } = renderHook(() => useVault());
      resultRef = result;
    });

    expect(resultRef.current.files).toEqual([]);
    expect(resultRef.current.activeFilePath).toBe("README.md");
  });
});
