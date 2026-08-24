import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { vaultService } from "../services/vault";
import { SettingsModal } from "./SettingsModal";

// Mock dependencies
vi.mock("../hooks/usePWA", () => ({
  usePWA: vi.fn(() => ({
    isInstallable: true,
    installApp: vi.fn(),
    isOnline: true,
  })),
}));

vi.mock("../contexts/AuthContext", () => ({
  useAuth: vi.fn(() => ({
    signOut: vi.fn(),
  })),
}));

vi.mock("../services/vault", () => ({
  vaultService: {
    resetToDefaults: vi.fn(),
  },
}));

// Mock the Modal wrapper to just render its children for easier testing
vi.mock("../components/common/Modal", () => ({
  Modal: ({ children, isOpen }: any) => (isOpen ? <div>{children}</div> : null),
}));

describe("SettingsModal", () => {
  const mockVault = {
    id: "test-uuid",
    owner: "test-owner",
    repository: "test-repo",
    branch: "main",
    created_at: new Date().toISOString(),
  };

  const mockSyncStatus = {
    lastSyncAt: new Date().toISOString(),
    status: "idle" as const,
  };

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    vault: mockVault,
    syncStatus: mockSyncStatus,
    isDirty: false,
    onResetVault: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.confirm
    vi.stubGlobal("confirm", vi.fn());
  });

  it("does not render when isOpen is false", () => {
    const { container } = render(
      <SettingsModal {...defaultProps} isOpen={false} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders vault information correctly", () => {
    render(<SettingsModal {...defaultProps} />);
    expect(screen.getByText("test-owner/test-repo")).toBeInTheDocument();
    expect(screen.getByText("main")).toBeInTheDocument();
    expect(screen.getByText("test-uuid")).toBeInTheDocument();
  });

  it("renders network status and sync time", () => {
    render(<SettingsModal {...defaultProps} />);
    expect(screen.getByText("ONLINE")).toBeInTheDocument();
    expect(screen.getByText(/Last Sync:/)).toBeInTheDocument();
  });

  it("calls resetToDefaults when Reset is clicked and confirmed", () => {
    vi.mocked(window.confirm).mockReturnValueOnce(true);

    render(<SettingsModal {...defaultProps} />);
    const resetBtn = screen.getByText("Reset to Defaults");
    fireEvent.click(resetBtn);

    expect(window.confirm).toHaveBeenCalledWith(
      "Reset local mock vault back to starter notes?",
    );
    expect(vaultService.resetToDefaults).toHaveBeenCalled();
    expect(defaultProps.onResetVault).toHaveBeenCalled();
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("does not reset when Reset is canceled", () => {
    vi.mocked(window.confirm).mockReturnValueOnce(false);

    render(<SettingsModal {...defaultProps} />);
    const resetBtn = screen.getByText("Reset to Defaults");
    fireEvent.click(resetBtn);

    expect(vaultService.resetToDefaults).not.toHaveBeenCalled();
    expect(defaultProps.onResetVault).not.toHaveBeenCalled();
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  describe("Sign Out functionality", () => {
    it("signs out immediately when there are no offline changes (isDirty=false)", async () => {
      const { useAuth } = await import("../contexts/AuthContext");
      const mockSignOut = vi.fn();
      vi.mocked(useAuth).mockReturnValue({ signOut: mockSignOut } as any);

      render(<SettingsModal {...defaultProps} isDirty={false} />);
      const signOutBtn = screen.getByText("Sign Out");
      fireEvent.click(signOutBtn);

      expect(window.confirm).not.toHaveBeenCalled();
      expect(mockSignOut).toHaveBeenCalled();
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it("shows confirmation dialog when there are offline changes (isDirty=true) and cancels", async () => {
      const { useAuth } = await import("../contexts/AuthContext");
      const mockSignOut = vi.fn();
      vi.mocked(useAuth).mockReturnValue({ signOut: mockSignOut } as any);
      vi.mocked(window.confirm).mockReturnValueOnce(false);

      render(<SettingsModal {...defaultProps} isDirty={true} />);
      const signOutBtn = screen.getByText("Sign Out");
      fireEvent.click(signOutBtn);

      expect(window.confirm).toHaveBeenCalledWith(
        "You have unsynced offline changes. Signing out will discard them permanently. Are you sure you want to sign out?",
      );
      expect(mockSignOut).not.toHaveBeenCalled();
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });

    it("shows confirmation dialog when there are offline changes (isDirty=true) and proceeds", async () => {
      const { useAuth } = await import("../contexts/AuthContext");
      const mockSignOut = vi.fn();
      vi.mocked(useAuth).mockReturnValue({ signOut: mockSignOut } as any);
      vi.mocked(window.confirm).mockReturnValueOnce(true);

      render(<SettingsModal {...defaultProps} isDirty={true} />);
      const signOutBtn = screen.getByText("Sign Out");
      fireEvent.click(signOutBtn);

      expect(window.confirm).toHaveBeenCalledWith(
        "You have unsynced offline changes. Signing out will discard them permanently. Are you sure you want to sign out?",
      );
      expect(mockSignOut).toHaveBeenCalled();
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });
});
