import React, { useState } from 'react';
import { FilePlus } from 'lucide-react';
import { Modal } from '../components/common/Modal';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';

interface NewNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateNote: (path: string) => Promise<void>;
}

export const NewNoteModal: React.FC<NewNoteModalProps> = ({
  isOpen,
  onClose,
  onCreateNote
}) => {
  const [folder, setFolder] = useState('notes');
  const [filename, setFilename] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!filename.trim()) {
      setError('Filename is required');
      return;
    }

    const cleanName = filename.endsWith('.md') ? filename.trim() : `${filename.trim()}.md`;
    const fullPath = folder ? `${folder}/${cleanName}` : cleanName;

    try {
      setIsSubmitting(true);
      setError(null);
      await onCreateNote(fullPath);
      setFilename('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create note');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Markdown Note"
      badgeText="NEW"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-xs font-mono font-bold tracking-wider uppercase text-ink-secondary block mb-1">
            Destination Folder
          </label>
          <select
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            className="neo-box w-full px-3 py-2 bg-paper-canvas text-ink-primary font-mono text-xs outline-none focus:ring-2 focus:ring-accent-acid"
          >
            <option value="notes">notes/</option>
            <option value="notes/ideas">notes/ideas/</option>
            <option value="templates">templates/</option>
            <option value="">(vault root)</option>
          </select>
        </div>

        <Input
          label="Note Title / Filename"
          placeholder="e.g. distributed-systems-research"
          value={filename}
          onChange={(e) => setFilename(e.target.value)}
          error={error || undefined}
          autoFocus
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
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
            {isSubmitting ? 'Creating...' : 'Create Note'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
