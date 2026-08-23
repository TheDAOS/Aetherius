import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AppShell } from "../AppShell";

vi.mock("../Sidebar", () => ({
  Sidebar: ({ isOpenMobile, onCloseMobile, files, activeFilePath }: any) => (
    <div data-testid="sidebar" data-open={isOpenMobile}>
      <button onClick={onCloseMobile} data-testid="close-sidebar">Close Sidebar</button>
      <div data-testid="sidebar-files">{files?.length}</div>
      <div data-testid="sidebar-active">{activeFilePath}</div>
    </div>
  ),
}));

vi.mock("../TopHeader", () => ({
  TopHeader: ({ onToggleSidebar, branch, syncStatus, isDirty, onNewNote, onOpenSearch, onOpenGraph, onOpenSettings, onSync }: any) => (
    <div data-testid="top-header">
      <button onClick={onToggleSidebar} data-testid="toggle-sidebar">Toggle Sidebar</button>
      <div data-testid="th-branch">{branch}</div>
      <div data-testid="th-sync">{syncStatus}</div>
      <div data-testid="th-dirty">{isDirty ? "yes" : "no"}</div>
      <button onClick={onNewNote} data-testid="th-new-note">New</button>
      <button onClick={onOpenSearch} data-testid="th-search">Search</button>
      <button onClick={onOpenGraph} data-testid="th-graph">Graph</button>
      <button onClick={onOpenSettings} data-testid="th-settings">Settings</button>
      <button onClick={onSync} data-testid="th-onsync">Sync</button>
    </div>
  ),
}));

describe("AppShell", () => {
  const mockVaultState = {
    syncStatus: "idle",
    vault: { branch: "main" },
    isDirty: false,
    sync: vi.fn(),
    files: [{ path: "test.md" }],
    activeFilePath: "test.md",
    selectFile: vi.fn(),
    deleteFile: vi.fn(),
  };

  const defaultProps = {
    vaultState: mockVaultState as any,
    onOpenSearch: vi.fn(),
    onOpenGraph: vi.fn(),
    onOpenSettings: vi.fn(),
    onNewNote: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders children, TopHeader, and Sidebar", () => {
    render(
      <AppShell {...defaultProps}>
        <div data-testid="child-content">Content</div>
      </AppShell>
    );

    expect(screen.getByTestId("top-header")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("child-content")).toBeInTheDocument();
    
    // Check TopHeader props passed correctly
    expect(screen.getByTestId("th-branch")).toHaveTextContent("main");
    expect(screen.getByTestId("th-sync")).toHaveTextContent("idle");
    expect(screen.getByTestId("th-dirty")).toHaveTextContent("no");
    
    // Check Sidebar props passed correctly
    expect(screen.getByTestId("sidebar-files")).toHaveTextContent("1");
    expect(screen.getByTestId("sidebar-active")).toHaveTextContent("test.md");
  });

  it("falls back to 'main' branch if vault is undefined", () => {
    const noVaultState = { ...mockVaultState, vault: undefined };
    render(
      <AppShell {...defaultProps} vaultState={noVaultState as any}>
        <div>Content</div>
      </AppShell>
    );
    expect(screen.getByTestId("th-branch")).toHaveTextContent("main");
  });
  
  it("passes handlers to TopHeader correctly", () => {
    render(
      <AppShell {...defaultProps}>
        <div>Content</div>
      </AppShell>
    );
    
    fireEvent.click(screen.getByTestId("th-new-note"));
    expect(defaultProps.onNewNote).toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("th-search"));
    expect(defaultProps.onOpenSearch).toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("th-graph"));
    expect(defaultProps.onOpenGraph).toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("th-settings"));
    expect(defaultProps.onOpenSettings).toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("th-onsync"));
    expect(mockVaultState.sync).toHaveBeenCalled();
  });

  it("toggles sidebar mobile state", () => {
    render(
      <AppShell {...defaultProps}>
        <div>Content</div>
      </AppShell>
    );

    const sidebar = screen.getByTestId("sidebar");
    expect(sidebar).toHaveAttribute("data-open", "false");

    const toggleBtn = screen.getByTestId("toggle-sidebar");
    fireEvent.click(toggleBtn);

    expect(sidebar).toHaveAttribute("data-open", "true");
    
    // Toggle again
    fireEvent.click(toggleBtn);
    expect(sidebar).toHaveAttribute("data-open", "false");
  });
  
  it("closes sidebar when close is called from sidebar", () => {
    render(
      <AppShell {...defaultProps}>
        <div>Content</div>
      </AppShell>
    );

    // Open it first
    fireEvent.click(screen.getByTestId("toggle-sidebar"));
    expect(screen.getByTestId("sidebar")).toHaveAttribute("data-open", "true");

    // Close it via sidebar
    fireEvent.click(screen.getByTestId("close-sidebar"));
    expect(screen.getByTestId("sidebar")).toHaveAttribute("data-open", "false");
  });
});
