import React, { useState } from 'react';
import { Tag, ChevronDown, ChevronRight, Calendar, Info } from 'lucide-react';
import { Badge } from '../common/Badge';

interface FrontmatterCardProps {
  frontmatter: Record<string, any>;
}

export const FrontmatterCard: React.FC<FrontmatterCardProps> = ({ frontmatter }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (Object.keys(frontmatter).length === 0) {
    return null;
  }

  const tags: string[] = Array.isArray(frontmatter.tags)
    ? frontmatter.tags
    : frontmatter.tags
    ? [String(frontmatter.tags)]
    : [];

  const otherEntries = Object.entries(frontmatter).filter(([k]) => k !== 'tags' && k !== 'title');

  return (
    <div className="mb-6 neo-box-sm bg-cream-shell border-2 border-ink-primary p-3">
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between cursor-pointer select-none"
      >
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-ink-primary">
          <Info size={14} className="text-accent-cobalt" />
          <span>PROPERTIES / METADATA</span>
          {tags.length > 0 && (
            <span className="text-[10px] text-ink-muted">({tags.length} tags)</span>
          )}
        </div>
        <button className="text-ink-muted hover:text-ink-primary">
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-cream-border flex flex-col gap-2 font-mono text-xs">
          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-ink-muted flex items-center gap-1 min-w-[70px]">
                <Tag size={12} /> tags:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {tags.map((t, idx) => (
                  <Badge key={idx} variant="acid" size="sm">
                    #{t}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Other Frontmatter Properties */}
          {otherEntries.map(([key, val]) => (
            <div key={key} className="flex items-start gap-2">
              <span className="text-ink-muted min-w-[70px] flex items-center gap-1">
                {key.includes('date') || key === 'created' || key === 'updated' ? (
                  <Calendar size={12} />
                ) : null}
                {key}:
              </span>
              <span className="text-ink-primary font-bold">
                {typeof val === 'object' ? JSON.stringify(val) : String(val)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
