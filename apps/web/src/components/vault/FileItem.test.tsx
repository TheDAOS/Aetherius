import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { FileItem } from "./FileItem";

vi.mock("lucide-react", () => ({
  ChevronDown: () => <div data-testid="ChevronDown" />,
  ChevronRight: () => <div data-testid="ChevronRight" />,
  FileText: () => <div data-testid="FileText" />,
  Folder: () => <div data-testid="Folder" />,
  FolderOpen: () => <div data-testid="FolderOpen" />,
  Trash2: () => <div data-testid="Trash2" />,
}));

describe("FileItem", () => {
  const mockFile = { path: "test.md", name: "test.md", type: "file" as const };
  const mockDir = { path: "folder", name: "folder", type: "directory" as const };

  it("renders a file correctly", () => {
    const { container } = render(
      <FileItem file={mockFile} isActive={false} onSelect={() => {}} />
    );
    expect(screen.getByText("test.md")).toBeDefined();
    expect(screen.getByTestId("FileText")).toBeDefined();
    expect(container.firstChild).toHaveStyle({ paddingLeft: "12px" });
  });

  it("renders an active file correctly", () => {
    const { container } = render(
      <FileItem file={mockFile} isActive={true} onSelect={() => {}} />
    );
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("bg-accent-acid/30");
  });

  it("calls onSelect when clicked for a file", () => {
    const onSelect = vi.fn();
    render(<FileItem file={mockFile} isActive={false} onSelect={onSelect} />);
    fireEvent.click(screen.getByText("test.md"));
    expect(onSelect).toHaveBeenCalledWith("test.md");
  });

  it("renders a directory correctly", () => {
    render(<FileItem file={mockDir} isActive={false} onSelect={() => {}} />);
    expect(screen.getByText("folder")).toBeDefined();
    expect(screen.getByTestId("ChevronDown")).toBeDefined();
    expect(screen.getByTestId("FolderOpen")).toBeDefined();
  });

  it("renders a closed directory correctly", () => {
    render(
      <FileItem file={mockDir} isActive={false} isOpen={false} onSelect={() => {}} />
    );
    expect(screen.getByTestId("ChevronRight")).toBeDefined();
    expect(screen.getByTestId("Folder")).toBeDefined();
  });

  it("calls onToggleFolder when clicked for a directory", () => {
    const onToggleFolder = vi.fn();
    const onSelect = vi.fn();
    render(
      <FileItem
        file={mockDir}
        isActive={false}
        onSelect={onSelect}
        onToggleFolder={onToggleFolder}
      />
    );
    fireEvent.click(screen.getByText("folder"));
    expect(onToggleFolder).toHaveBeenCalledWith("folder");
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("calls onSelect for directory if onToggleFolder is not provided", () => {
    const onSelect = vi.fn();
    render(<FileItem file={mockDir} isActive={false} onSelect={onSelect} />);
    fireEvent.click(screen.getByText("folder"));
    expect(onSelect).toHaveBeenCalledWith("folder");
  });

  it("shows delete button and deletes when confirmed", () => {
    const onDelete = vi.fn();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <FileItem file={mockFile} isActive={false} onSelect={() => {}} onDelete={onDelete} />
    );

    const deleteBtn = screen.getByTitle("Delete file");
    fireEvent.click(deleteBtn);

    expect(confirmSpy).toHaveBeenCalledWith("Delete test.md?");
    expect(onDelete).toHaveBeenCalledWith("test.md");
    confirmSpy.mockRestore();
  });

  it("does not delete when confirmation is cancelled", () => {
    const onDelete = vi.fn();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

    render(
      <FileItem file={mockFile} isActive={false} onSelect={() => {}} onDelete={onDelete} />
    );

    const deleteBtn = screen.getByTitle("Delete file");
    fireEvent.click(deleteBtn);

    expect(confirmSpy).toHaveBeenCalledWith("Delete test.md?");
    expect(onDelete).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("applies correct padding based on depth", () => {
    const { container } = render(
      <FileItem file={mockFile} isActive={false} onSelect={() => {}} depth={2} />
    );
    // 12 + 2 * 14 = 40
    expect(container.firstChild).toHaveStyle({ paddingLeft: "40px" });
  });
});
