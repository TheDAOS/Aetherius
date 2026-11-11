import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NoteEditor } from "./NoteEditor";

describe("NoteEditor autocomplete", () => {
  it("retains arrow selection through keyup and inserts the selected canonical path", () => {
    const onChange = vi.fn();
    render(
      <NoteEditor
        content="[["
        allFilePaths={["notes/a.md", "folder/b.md"]}
        onChange={onChange}
      />,
    );
    const editor = screen.getByRole("textbox") as HTMLTextAreaElement;
    editor.setSelectionRange(2, 2);
    fireEvent.keyUp(editor, { key: "[" });
    fireEvent.keyDown(editor, { key: "ArrowDown" });
    fireEvent.keyUp(editor, { key: "ArrowDown" });
    expect(screen.getAllByRole("option")[1]).toHaveAttribute(
      "aria-selected",
      "true",
    );
    fireEvent.keyDown(editor, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("[[folder/b]]");
  });

  it("keeps suggestions closed after Escape keyup", () => {
    render(
      <NoteEditor
        content="[["
        allFilePaths={["notes/a.md"]}
        onChange={vi.fn()}
      />,
    );
    const editor = screen.getByRole("textbox") as HTMLTextAreaElement;
    editor.setSelectionRange(2, 2);
    fireEvent.keyUp(editor, { key: "[" });
    fireEvent.keyDown(editor, { key: "Escape" });
    fireEvent.keyUp(editor, { key: "Escape" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
