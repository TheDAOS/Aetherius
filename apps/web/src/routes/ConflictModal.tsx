import React from 'react';
import { AlertTriangle, Check, RefreshCw, Copy } from 'lucide-react';
import { Modal } from '../components/common/Modal';
import { Button } from '../components/common/Button';

interface ConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  filePath: string;
  localContent: string;
  remoteContent: string;
  onAcceptRemote: () => void;
  onForceOverwrite: () => void;
  onSaveAsCopy: () => void;
}

export const ConflictModal: React.FC<ConflictModalProps> = ({
  isOpen,
  onClose,
  filePath,
  localContent,
  remoteContent,
  onAcceptRemote,
  onForceOverwrite,
  onSaveAsCopy
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Merge Conflict Detected"
      badgeText="409 Conflict"
      maxWidth="max-w-4xl"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 p-3 bg-accent-pink/30 border-2 border-ink-primary font-mono text-xs text-ink-primary">
          <AlertTriangle size={16} className="text-accent-orange flex-shrink-0" />
          <div>
            <strong>Conflict in {filePath}:</strong> The note has been modified on GitHub since you last retrieved it. Review the differences below and choose how to resolve:
          </div>
        </div>

        {/* Side-by-side diff preview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-72">
          {/* Local Draft */}
          <div className="flex flex-col border-2 border-ink-primary bg-white overflow-hidden neo-box-sm">
            <div className="px-3 py-1.5 bg-accent-acid/40 border-b border-ink-primary font-mono text-xs font-bold text-ink-primary flex items-center justify-between">
              <span>Local (Your Uncommitted Changes)</span>
            </div>
            <textarea
              readOnly
              value={localContent}
              className="flex-1 p-3 font-mono text-xs outline-none resize-none bg-paper-canvas text-ink-primary"
            />
          </div>

          {/* Remote GitHub Version */}
          <div className="flex flex-col border-2 border-ink-primary bg-white overflow-hidden neo-box-sm">
            <div className="px-3 py-1.5 bg-accent-cobalt/20 border-b border-ink-primary font-mono text-xs font-bold text-ink-primary flex items-center justify-between">
              <span>Remote (Latest on GitHub)</span>
            </div>
            <textarea
              readOnly
              value={remoteContent}
              className="flex-1 p-3 font-mono text-xs outline-none resize-none bg-paper-canvas text-ink-primary"
            />
          </div>
        </div>

        {/* Resolution Actions */}
        <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-cream-border">
          <Button
            variant="secondary"
            size="sm"
            icon={<Copy size={13} />}
            onClick={() => {
              onSaveAsCopy();
              onClose();
            }}
          >
            Save as Conflict Copy
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw size={13} />}
            onClick={() => {
              onAcceptRemote();
              onClose();
            }}
          >
            Accept Remote (Discard Local)
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={<Check size={13} />}
            onClick={() => {
              onForceOverwrite();
              onClose();
            }}
          >
            Force Overwrite Remote
          </Button>
        </div>
      </div>
    </Modal>
  );
};
