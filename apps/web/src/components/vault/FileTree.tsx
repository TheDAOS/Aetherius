import React, { useState } from 'react';
import { VaultFile } from '../../types/vault';
import { FileItem } from './FileItem';

interface FileTreeProps {
  files: VaultFile[];
  activeFilePath: string;
  onSelectFile: (path: string) => void;
  onDeleteFile?: (path: string) => void;
}

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  file?: VaultFile;
  children: Record<string, TreeNode>;
}

export const FileTree: React.FC<FileTreeProps> = ({
  files,
  activeFilePath,
  onSelectFile,
  onDeleteFile
}) => {
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});

  const toggleFolder = (path: string) => {
    setCollapsedFolders(prev => ({ ...prev, [path]: !prev[path] }));
  };

  if (files.length === 0) {
    return (
      <div className="p-4 text-center text-xs font-mono text-ink-muted">
        No files found.
      </div>
    );
  }

  // Build tree from flat list of file paths
  const root: TreeNode = { name: '', path: '', type: 'directory', children: {} };

  files.forEach(file => {
    const parts = file.path.split('/').filter(Boolean);
    let current = root;

    parts.forEach((part, index) => {
      const isLast = index === parts.length - 1;
      const subpath = parts.slice(0, index + 1).join('/');

      if (!current.children[part]) {
        current.children[part] = {
          name: part,
          path: subpath,
          type: isLast ? file.type : 'directory',
          file: isLast ? file : { path: subpath, name: part, type: 'directory' },
          children: {}
        };
      } else if (isLast) {
        current.children[part].file = file;
        current.children[part].type = file.type;
      }
      current = current.children[part];
    });
  });

  const renderNode = (node: TreeNode, depth: number = 0): React.ReactNode => {
    const isDir = node.type === 'directory';
    const isCollapsed = collapsedFolders[node.path];
    const fileObj = node.file || {
      path: node.path,
      name: node.name,
      type: node.type
    };

    return (
      <React.Fragment key={node.path}>
        <FileItem
          file={fileObj}
          depth={depth}
          isOpen={!isCollapsed}
          isActive={activeFilePath === node.path}
          onToggleFolder={toggleFolder}
          onSelect={onSelectFile}
          onDelete={onDeleteFile}
        />
        {isDir && !isCollapsed && Object.values(node.children).map(child =>
          renderNode(child, depth + 1)
        )}
      </React.Fragment>
    );
  };

  // Sort: directories first, then alphabetical
  const sortNodes = (a: TreeNode, b: TreeNode) => {
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  };

  const topLevelNodes = Object.values(root.children).sort(sortNodes);

  return (
    <div className="flex flex-col overflow-y-auto">
      {topLevelNodes.map(node => renderNode(node, 0))}
    </div>
  );
};
