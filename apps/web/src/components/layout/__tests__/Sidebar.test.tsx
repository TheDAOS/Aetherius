import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, screen } from "@testing-library/react";
import { Sidebar } from "../Sidebar";
import type { VaultFile } from "../../../types/vault";

// Mock the lucide-react icons and FileTree
vi.mock("lucide-react", () => ({
  FolderTree: () => <div data-testid="folder-tree-icon" />,
  X: () => <div data-testid="x-icon" />,
}));

vi.mock("../../vault/FileTree", () => ({
  FileTree: ({ files, activeFilePath, onSelectFile, onDeleteFile }: any) => (
    <div data-testid="file-tree">
      <div data-testid="active-file">{activeFilePath}</div>
      {files.map((f: any) => (
        <div key={f.path} data-testid={`file-${f.path}`} onClick={() => onSelectFile(f.path)}>
          {f.path}
          {onDeleteFile && <button onClick={(e) => { e.stopPropagation(); onDeleteFile(f.path); }}>del {f.path}</button>}
        </div>
      ))}
    </div>
  ),
}));

describe("Sidebar", () => {
  const mockFiles: VaultFile[] = [
    { path: "notes/note1.md", name: "note1.md", content: "", sha: "1", type: "file", size: 10, url: "" },
    { path: "README.md", name: "README.md", content: "", sha: "2", type: "file", size: 10, url: "" },
    { path: "templates/template1.md", name: "template1.md", content: "", sha: "3", type: "file", size: 10, url: "" },
    { path: "other/file.txt", name: "file.txt", content: "", sha: "4", type: "file", size: 10, url: "" },
  ];

  const defaultProps = {
    files: mockFiles,
    activeFilePath: "notes/note1.md",
    onSelectFile: vi.fn(),
    onDeleteFile: vi.fn(),
    isOpenMobile: false,
    onCloseMobile: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders desktop sidebar with all files by default", () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText("Explorer")).toBeInTheDocument();
    
    // Check files
    expect(screen.getByTestId("file-notes/note1.md")).toBeInTheDocument();
    expect(screen.getByTestId("file-README.md")).toBeInTheDocument();
    expect(screen.getByTestId("file-templates/template1.md")).toBeInTheDocument();
    expect(screen.getByTestId("file-other/file.txt")).toBeInTheDocument();

    expect(screen.getByText("4 files")).toBeInTheDocument();
  });

  it("filters notes correctly", () => {
    render(<Sidebar {...defaultProps} />);
    fireEvent.click(screen.getByText("NOTES"));

    expect(screen.getByTestId("file-notes/note1.md")).toBeInTheDocument();
    expect(screen.getByTestId("file-README.md")).toBeInTheDocument();
    expect(screen.queryByTestId("file-templates/template1.md")).not.toBeInTheDocument();
    expect(screen.queryByTestId("file-other/file.txt")).not.toBeInTheDocument();

    expect(screen.getByText("2 files")).toBeInTheDocument();
  });

  it("filters templates correctly", () => {
    render(<Sidebar {...defaultProps} />);
    fireEvent.click(screen.getByText("TEMPLATES"));

    expect(screen.queryByTestId("file-notes/note1.md")).not.toBeInTheDocument();
    expect(screen.queryByTestId("file-README.md")).not.toBeInTheDocument();
    expect(screen.getByTestId("file-templates/template1.md")).toBeInTheDocument();
    expect(screen.queryByTestId("file-other/file.txt")).not.toBeInTheDocument();

    expect(screen.getByText("1 files")).toBeInTheDocument();
  });

  it("calls onSelectFile and onCloseMobile when a file is selected", () => {
    render(<Sidebar {...defaultProps} />);
    fireEvent.click(screen.getByTestId("file-notes/note1.md"));

    expect(defaultProps.onSelectFile).toHaveBeenCalledWith("notes/note1.md");
    expect(defaultProps.onCloseMobile).toHaveBeenCalled();
  });

  it("renders mobile backdrop and closes when backdrop is clicked", () => {
    const { container } = render(<Sidebar {...defaultProps} isOpenMobile={true} />);
    
    // The backdrop is rendered when isOpenMobile is true
    const backdrop = container.querySelector(".bg-ink-primary\\/50");
    expect(backdrop).toBeInTheDocument();
    
    fireEvent.click(backdrop!);
    expect(defaultProps.onCloseMobile).toHaveBeenCalled();
  });

  it("renders mobile close button and closes when clicked", () => {
    render(<Sidebar {...defaultProps} isOpenMobile={true} />);
    
    // Close button should be rendered (the button containing X)
    const closeBtn = screen.getByTestId("x-icon").parentElement;
    fireEvent.click(closeBtn!);
    
    expect(defaultProps.onCloseMobile).toHaveBeenCalled();
  });
  
  it("shows correct styling based on filter state", () => {
    render(<Sidebar {...defaultProps} />);
    const allBtn = screen.getByText("ALL");
    const notesBtn = screen.getByText("NOTES");
    const templatesBtn = screen.getByText("TEMPLATES");
    
    // 'all' is active
    expect(allBtn.className).toContain("font-bold");
    expect(notesBtn.className).not.toContain("font-bold");
    expect(templatesBtn.className).not.toContain("font-bold");
    
    fireEvent.click(notesBtn);
    expect(notesBtn.className).toContain("font-bold");
    expect(allBtn.className).not.toContain("font-bold");

    fireEvent.click(templatesBtn);
    expect(templatesBtn.className).toContain("font-bold");
    expect(notesBtn.className).not.toContain("font-bold");

    fireEvent.click(allBtn);
    expect(allBtn.className).toContain("font-bold");
    expect(templatesBtn.className).not.toContain("font-bold");
  });
  
  it("renders active file path", () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByTestId("active-file")).toHaveTextContent("notes/note1.md");
  });
  
  it("passes onDeleteFile to FileTree", () => {
    render(<Sidebar {...defaultProps} />);
    const deleteBtn = screen.getByText("del notes/note1.md");
    fireEvent.click(deleteBtn);
    expect(defaultProps.onDeleteFile).toHaveBeenCalledWith("notes/note1.md");
  });
});
