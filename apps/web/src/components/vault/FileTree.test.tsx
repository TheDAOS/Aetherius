import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { FileTree } from "./FileTree";

vi.mock("lucide-react", () => ({
  ChevronDown: () => <div data-testid="ChevronDown" />,
  ChevronRight: () => <div data-testid="ChevronRight" />,
  FileText: () => <div data-testid="FileText" />,
  Folder: () => <div data-testid="Folder" />,
  FolderOpen: () => <div data-testid="FolderOpen" />,
  Trash2: () => <div data-testid="Trash2" />,
}));

describe("FileTree", () => {
  it("renders empty state", () => {
    render(<FileTree files={[]} activeFilePath="" onSelectFile={() => {}} />);
    expect(screen.getByText("No files found.")).toBeDefined();
  });

  it("renders files and directories hierarchically", () => {
    const files = [
      { path: "folder/test.md", name: "test.md", type: "file" as const },
      { path: "folder2/sub/test2.md", name: "test2.md", type: "file" as const },
      { path: "root.md", name: "root.md", type: "file" as const },
    ];
    render(<FileTree files={files} activeFilePath="" onSelectFile={() => {}} />);

    // Directory nodes created dynamically
    expect(screen.getByText("folder")).toBeDefined();
    expect(screen.getByText("folder2")).toBeDefined();
    expect(screen.getByText("sub")).toBeDefined();
    expect(screen.getByText("test.md")).toBeDefined();
    expect(screen.getByText("test2.md")).toBeDefined();
    expect(screen.getByText("root.md")).toBeDefined();
  });

  it("toggles folder open and closed", () => {
    const files = [{ path: "folder/test.md", name: "test.md", type: "file" as const }];
    render(<FileTree files={files} activeFilePath="" onSelectFile={() => {}} />);

    // test.md is visible initially
    expect(screen.getByText("test.md")).toBeDefined();

    // Click folder to close
    fireEvent.click(screen.getByText("folder"));
    expect(screen.queryByText("test.md")).toBeNull();

    // Click again to open
    fireEvent.click(screen.getByText("folder"));
    expect(screen.getByText("test.md")).toBeDefined();
  });

  it("sorts directories first, then alphabetical", () => {
    const files = [
      { path: "b_file.md", name: "b_file.md", type: "file" as const },
      { path: "a_dir/test.md", name: "test.md", type: "file" as const },
      { path: "a_file.md", name: "a_file.md", type: "file" as const },
      { path: "b_dir/test.md", name: "test.md", type: "file" as const },
    ];

    const { container } = render(<FileTree files={files} activeFilePath="" onSelectFile={() => {}} />);
    const items = container.querySelectorAll(".group");
    // Text content of items should be in order: a_dir, b_dir, a_file.md, b_file.md
    const names = Array.from(items).map(item => item.textContent);
    
    // Exact mapping isn't perfectly clean due to children rendering, but root order is:
    // a_dir (dir) -> b_dir (dir) -> a_file.md (file) -> b_file.md (file)
    // Within a_dir: test.md
    // Within b_dir: test.md
    
    const text = container.textContent;
    expect(text?.indexOf("a_dir")).toBeLessThan(text?.indexOf("b_dir") as number);
    expect(text?.indexOf("b_dir")).toBeLessThan(text?.indexOf("a_file.md") as number);
    expect(text?.indexOf("a_file.md")).toBeLessThan(text?.indexOf("b_file.md") as number);
  });
  
  it("uses provided file node if it's already a directory (explicit after child)", () => {
    const files = [
      { path: "folder/file.md", name: "file.md", type: "file" as const },
      { path: "folder", name: "folder", type: "directory" as const }
    ];
    render(<FileTree files={files} activeFilePath="" onSelectFile={() => {}} />);
    expect(screen.getByText("folder")).toBeDefined();
    expect(screen.getByText("file.md")).toBeDefined();
  });
});
