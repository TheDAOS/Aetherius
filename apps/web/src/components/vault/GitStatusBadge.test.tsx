import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GitStatusBadge } from "./GitStatusBadge";

vi.mock("lucide-react", () => ({
  GitBranch: () => <div data-testid="GitBranch" />,
  CheckCircle2: () => <div data-testid="CheckCircle2" />,
  RefreshCw: (props: any) => (
    <div data-testid="RefreshCw" className={props.className} />
  ),
}));

describe("GitStatusBadge", () => {
  it("renders clean status with branch name", () => {
    render(<GitStatusBadge status={null} branch="main" />);
    expect(screen.getByText("main")).toBeDefined();
    expect(screen.getByText("CLEAN")).toBeDefined();
    expect(screen.getByTestId("CheckCircle2")).toBeDefined();
  });

  it("renders dirty status", () => {
    render(<GitStatusBadge status={null} branch="feature" isDirty={true} />);
    expect(screen.getByText("feature")).toBeDefined();
    expect(screen.getByText("UNCOMMITTED")).toBeDefined();
  });

  it("renders sync button when onSync is provided", () => {
    const onSync = vi.fn();
    render(<GitStatusBadge status={null} branch="main" onSync={onSync} />);

    const syncBtn = screen.getByTitle("Trigger Git Sync");
    fireEvent.click(syncBtn);
    expect(onSync).toHaveBeenCalled();
  });

  it("shows spinning icon when status is running", () => {
    render(
      <GitStatusBadge
        status={{ status: "running", lastSyncAt: null }}
        branch="main"
        onSync={() => {}}
      />,
    );

    const syncBtn = screen.getByTitle("Trigger Git Sync") as HTMLButtonElement;
    expect(syncBtn.disabled).toBe(true);
    expect(screen.getByTestId("RefreshCw").className).toContain("animate-spin");
  });

  it("shows spinning icon when status is pending", () => {
    render(
      <GitStatusBadge
        status={{ status: "pending", lastSyncAt: null }}
        branch="main"
        onSync={() => {}}
      />,
    );

    const syncBtn = screen.getByTitle("Trigger Git Sync") as HTMLButtonElement;
    expect(syncBtn.disabled).toBe(true);
    expect(screen.getByTestId("RefreshCw").className).toContain("animate-spin");
  });
});
