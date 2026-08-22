import React from 'react';
import { Modal } from '../common/Modal';
import { GraphCanvas } from './GraphCanvas';
import { VaultGraphIndex } from '../../services/intelligence/graphIndexer';

interface GraphModalProps {
  isOpen: boolean;
  onClose: () => void;
  graphIndex: VaultGraphIndex;
  activeFilePath?: string;
  onSelectFile: (path: string) => void;
}

export const GraphModal: React.FC<GraphModalProps> = ({
  isOpen,
  onClose,
  graphIndex,
  activeFilePath,
  onSelectFile
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Vault Knowledge Graph"
      badgeText={`${graphIndex.nodes.length} nodes · ${graphIndex.edges.length} links`}
      maxWidth="max-w-5xl"
    >
      <div className="h-[550px] w-full border-2 border-ink-primary overflow-hidden relative neo-box-sm bg-paper-canvas">
        <GraphCanvas
          graphIndex={graphIndex}
          activeFilePath={activeFilePath}
          onSelectNode={(path) => {
            onSelectFile(path);
            onClose();
          }}
        />
      </div>
    </Modal>
  );
};
