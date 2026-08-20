import React from 'react';
import { VaultFile } from '../../types/vault';
import { FileItem } from './FileItem';

interface FileTreeProps {
  files: VaultFile[];
  activeFilePath: string;
  onSelectFile: (path: string) => void;
  onDeleteFile?: (path: string) => void;
}

export const FileTree: React.FC<FileTreeProps> = ({
  files,
  activeFilePath,
  onSelectFile,
  onDeleteFile
}) => {
  if (files.length === 0) {
    return (
      <div className="p-4 text-center text-xs font-mono text-ink-muted">
        No files found.
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-y-auto">
      {files.map((file) => (
        <FileItem
          key={file.path}
          file={file}
          isActive={activeFilePath === file.path}
          onSelect={onSelectFile}
          onDelete={onDeleteFile}
        />
      ))}
    </div>
  );
};
