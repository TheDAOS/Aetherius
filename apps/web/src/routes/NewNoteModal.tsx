import { FilePlus } from "lucide-react";
import type React from "react";
import { useId, useState } from "react";
import { Button } from "../components/common/Button";
import { Input } from "../components/common/Input";
import { Modal } from "../components/common/Modal";
import type { VaultFile } from "../types/vault";

interface NewNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  files?: VaultFile[];
  onCreateNote: (path: string, content?: string) => Promise<void>;
}

export const NewNoteModal: React.FC<NewNoteModalProps> = ({
  isOpen,
  onClose,
  files = [],
  onCreateNote,
}) => {
  const [folder, setFolder] = useState("notes");
  const [filename, setFilename] = useState("");
  const [templatePath, setTemplatePath] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const id = useId();
  const templates = files.filter(
    (file) =>
      file.type === "file" &&
      file.path.startsWith("templates/") &&
      file.path.endsWith(".md"),
  );
  const folders = [
    ...new Set([
      "notes",
      "templates",
      ...files.flatMap((file) => {
        const parts = file.path.split("/");
        if (file.type === "file") parts.pop();
        return parts.map((_, index) => parts.slice(0, index + 1).join("/"));
      }),
    ]),
  ];

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;
    const name = filename.trim();
    const destination = folder.trim().replace(/\/+$/, "");
    if (!name) {
      setError("Filename is required");
      return;
    }
    const cleanName = /\.md$/i.test(name) ? name : `${name}.md`;
    const fullPath = destination ? `${destination}/${cleanName}` : cleanName;
    if (
      fullPath.includes("\\") ||
      [...fullPath].some(
        (char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127,
      ) ||
      name.includes("/") ||
      folder.trim().startsWith("/") ||
      fullPath.startsWith("/") ||
      fullPath
        .split("/")
        .some(
          (part) =>
            !part ||
            part === "." ||
            part === ".." ||
            part.toLowerCase() === ".git",
        )
    ) {
      setError(
        "Invalid path. Use a relative folder and filename without traversal or empty path segments.",
      );
      return;
    }
    if (files.some((file) => file.path === fullPath)) {
      setError("A note already exists at this path.");
      return;
    }
    const template = templates.find((file) => file.path === templatePath);
    if (
      templatePath &&
      (!template ||
        template.content === undefined ||
        template.encoding === "base64")
    ) {
      setError(
        "Template content is unavailable. Open or sync the template before using it.",
      );
      return;
    }
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const content = template?.content?.replace(
      /\{\{\s*(date|name)\s*\}\}/g,
      (_, variable: string) =>
        variable === "date" ? date : cleanName.replace(/\.md$/i, ""),
    );
    try {
      setIsSubmitting(true);
      setError(null);
      await onCreateNote(fullPath, content);
      setFilename("");
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Failed to create note",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const close = () => {
    if (!isSubmitting) onClose();
  };
  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title="Create New Markdown Note"
      badgeText="NEW"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Destination Folder"
          list={`${id}-folders`}
          value={folder}
          onChange={(event) => setFolder(event.target.value)}
          placeholder="e.g. research/ideas (empty for vault root)"
          disabled={isSubmitting}
        />
        <datalist id={`${id}-folders`}>
          {folders.map((path) => (
            <option key={path} value={path} />
          ))}
        </datalist>
        <Input
          label="Note Title / Filename"
          placeholder="e.g. distributed-systems-research"
          value={filename}
          onChange={(event) => setFilename(event.target.value)}
          error={error || undefined}
          disabled={isSubmitting}
          autoFocus
        />
        <div className="flex flex-col gap-1">
          <label
            htmlFor={`${id}-template`}
            className="text-xs font-mono font-bold uppercase text-ink-secondary"
          >
            Template
          </label>
          <select
            id={`${id}-template`}
            value={templatePath}
            onChange={(event) => setTemplatePath(event.target.value)}
            disabled={isSubmitting}
            className="neo-box px-3 py-2 bg-paper-canvas text-sm"
          >
            <option value="">Blank note</option>
            {templates.map((file) => (
              <option key={file.path} value={file.path}>
                {file.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={close}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSubmitting}
            icon={<FilePlus size={14} />}
          >
            {isSubmitting ? "Creating..." : "Create Note"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
