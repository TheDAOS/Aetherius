import React, { useState } from 'react';
import { Link2, Sparkles, ChevronDown, ChevronRight, FileText, Plus } from 'lucide-react';
import { BacklinkReference } from '../../services/intelligence/graphIndexer';
import { Badge } from '../common/Badge';

interface BacklinksPanelProps {
  activeFilePath: string;
  linkedReferences: BacklinkReference[];
  unlinkedMentions: BacklinkReference[];
  onSelectFile: (path: string) => void;
  onLinkMention?: (sourcePath: string, phrase: string) => void;
}

export const BacklinksPanel: React.FC<BacklinksPanelProps> = ({
  activeFilePath,
  linkedReferences,
  unlinkedMentions,
  onSelectFile,
  onLinkMention
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'linked' | 'unlinked'>('linked');

  const totalCount = linkedReferences.length + unlinkedMentions.length;
  if (totalCount === 0) return null;

  return (
    <div className="mt-8 border-t-2 border-ink-primary pt-4 bg-cream-shell/40 p-4 neo-box-sm">
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between cursor-pointer select-none"
      >
        <div className="flex items-center gap-2 font-mono text-xs font-bold text-ink-primary">
          <Link2 size={15} className="text-accent-cobalt" />
          <span>VAULT CONNECTIONS & BACKLINKS</span>
          <Badge variant="acid" size="sm">
            {linkedReferences.length} linked · {unlinkedMentions.length} unlinked
          </Badge>
        </div>
        <button className="text-ink-muted hover:text-ink-primary">
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-3 flex flex-col gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-2 border-b border-cream-border pb-2">
            <button
              onClick={() => setActiveTab('linked')}
              className={`px-2.5 py-1 text-xs font-mono font-bold transition-colors ${
                activeTab === 'linked'
                  ? 'bg-accent-acid text-ink-primary border border-ink-primary'
                  : 'text-ink-muted hover:text-ink-primary'
              }`}
            >
              Linked References ({linkedReferences.length})
            </button>
            <button
              onClick={() => setActiveTab('unlinked')}
              className={`px-2.5 py-1 text-xs font-mono font-bold transition-colors ${
                activeTab === 'unlinked'
                  ? 'bg-accent-acid text-ink-primary border border-ink-primary'
                  : 'text-ink-muted hover:text-ink-primary'
              }`}
            >
              Unlinked Mentions ({unlinkedMentions.length})
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'linked' ? (
            linkedReferences.length === 0 ? (
              <div className="text-xs font-mono text-ink-muted p-2">
                No explicit [[links]] to this note from other files.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {linkedReferences.map((ref, idx) => (
                  <div
                    key={idx}
                    onClick={() => onSelectFile(ref.sourcePath)}
                    className="p-2.5 bg-white border border-ink-primary/30 hover:border-ink-primary cursor-pointer transition-all hover:bg-cream-shell/80"
                  >
                    <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-accent-cobalt">
                      <FileText size={12} />
                      <span>{ref.sourceTitle}</span>
                      <span className="text-[10px] text-ink-muted font-normal">({ref.sourcePath})</span>
                    </div>
                    <div className="mt-1 text-xs font-sans text-ink-secondary line-clamp-2">
                      {ref.snippet}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            unlinkedMentions.length === 0 ? (
              <div className="text-xs font-mono text-ink-muted p-2">
                No unlinked text occurrences found in other notes.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {unlinkedMentions.map((ref, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-white border border-ink-primary/30 flex items-start justify-between gap-2"
                  >
                    <div
                      onClick={() => onSelectFile(ref.sourcePath)}
                      className="flex-1 cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-accent-orange">
                        <Sparkles size={12} />
                        <span>{ref.sourceTitle}</span>
                        <span className="text-[10px] text-ink-muted font-normal">({ref.sourcePath})</span>
                      </div>
                      <div className="mt-1 text-xs font-sans text-ink-secondary line-clamp-2">
                        {ref.snippet}
                      </div>
                    </div>
                    {onLinkMention && (
                      <button
                        onClick={() => onLinkMention(ref.sourcePath, activeFilePath)}
                        className="neo-btn px-2 py-1 bg-accent-acid text-ink-primary text-[11px] font-mono font-bold flex items-center gap-1 flex-shrink-0"
                        title="Convert mention to [[link]]"
                      >
                        <Plus size={11} /> Link
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};
