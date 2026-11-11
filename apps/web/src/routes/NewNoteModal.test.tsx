import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NewNoteModal } from "./NewNoteModal";

const template = {
  path: "templates/project.md",
  name: "project.md",
  type: "file" as const,
  content: "# {{name}}\nCreated {{date}}",
};

describe("NewNoteModal", () => {
  it("creates a note in an arbitrary nested folder using a selected template", async () => {
    const create = vi.fn().mockResolvedValue(undefined);
    render(
      <NewNoteModal
        isOpen
        onClose={vi.fn()}
        files={[template]}
        onCreateNote={create}
      />,
    );
    fireEvent.change(screen.getByLabelText("Destination Folder"), {
      target: { value: "research/2026" },
    });
    fireEvent.change(screen.getByLabelText("Note Title / Filename"), {
      target: { value: "Aetherius" },
    });
    fireEvent.change(screen.getByLabelText("Template"), {
      target: { value: template.path },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Note" }));
    await waitFor(() => expect(create).toHaveBeenCalledOnce());
    expect(create.mock.calls[0][0]).toBe("research/2026/Aetherius.md");
    expect(create.mock.calls[0][1]).toMatch(
      /^# Aetherius\nCreated \d{4}-\d{2}-\d{2}$/,
    );
  });

  it("rejects traversal paths and duplicate notes without calling the backend", async () => {
    const create = vi.fn();
    render(
      <NewNoteModal
        isOpen
        onClose={vi.fn()}
        files={[
          { path: "notes/existing.md", name: "existing.md", type: "file" },
        ]}
        onCreateNote={create}
      />,
    );
    fireEvent.change(screen.getByLabelText("Destination Folder"), {
      target: { value: "../outside" },
    });
    fireEvent.change(screen.getByLabelText("Note Title / Filename"), {
      target: { value: "new" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Note" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/path/i);
    expect(create).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Destination Folder"), {
      target: { value: "notes" },
    });
    fireEvent.change(screen.getByLabelText("Note Title / Filename"), {
      target: { value: "existing" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Note" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/exists/i);
    expect(create).not.toHaveBeenCalled();
  });

  it("retains errors and user input when creation fails", async () => {
    const close = vi.fn();
    render(
      <NewNoteModal
        isOpen
        onClose={close}
        onCreateNote={vi.fn().mockRejectedValue(new Error("Forbidden"))}
      />,
    );
    fireEvent.change(screen.getByLabelText("Note Title / Filename"), {
      target: { value: "new" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Note" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Forbidden");
    expect(close).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Note Title / Filename")).toHaveValue("new");
  });
});
