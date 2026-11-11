import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ConflictModal } from "./ConflictModal";

describe("ConflictModal", () => {
  it("waits for resolution to succeed and blocks duplicate submissions", async () => {
    let finish!: () => void;
    const action = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const close = vi.fn();
    render(
      <ConflictModal
        isOpen
        onClose={close}
        filePath="a.md"
        localContent="local"
        remoteContent="remote"
        onAcceptRemote={vi.fn()}
        onForceOverwrite={action}
        onSaveAsCopy={vi.fn()}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Force Overwrite Remote" }),
    );
    expect(close).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Save as Conflict Copy" }),
    ).toBeDisabled();
    await act(async () => finish());
    expect(close).toHaveBeenCalledOnce();
  });

  it("shows a failed resolution and keeps the dialog open", async () => {
    const close = vi.fn();
    render(
      <ConflictModal
        isOpen
        onClose={close}
        filePath="a.md"
        localContent="local"
        remoteContent="remote"
        onAcceptRemote={vi.fn()}
        onForceOverwrite={vi
          .fn()
          .mockRejectedValue(new Error("Permission denied"))}
        onSaveAsCopy={vi.fn()}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Force Overwrite Remote" }),
    );
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Permission denied"),
    );
    expect(close).not.toHaveBeenCalled();
  });
});
