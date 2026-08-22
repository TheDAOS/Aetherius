import React from 'react';
import { parseMarkdown } from '../../services/intelligence/markdownParser';
import { FrontmatterCard } from './FrontmatterCard';
import { BacklinksPanel } from './BacklinksPanel';
import { BacklinkReference } from '../../services/intelligence/graphIndexer';

interface NotePreviewProps {
  content: string;
  activeFilePath?: string;
  linkedReferences?: BacklinkReference[];
  unlinkedMentions?: BacklinkReference[];
  onSelectFile?: (path: string) => void;
  onLinkMention?: (sourcePath: string, phrase: string) => void;
}

export const NotePreview: React.FC<NotePreviewProps> = ({
  content,
  activeFilePath = '',
  linkedReferences = [],
  unlinkedMentions = [],
  onSelectFile,
  onLinkMention
}) => {
  const parsed = parseMarkdown(content, activeFilePath);

  const renderFormattedInline = (text: string): React.ReactNode => {
    // Process wikilinks [[Target|Alias]] or [[Target]]
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    const regex = /\[\[([^[\]|]+)(?:\|([^[\]]+))?\]\]|`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*|!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }

      if (match[1]) {
        // Wikilink [[Target|Alias]]
        const target = match[1].trim();
        const alias = match[2]?.trim() || target;
        parts.push(
          <span
            key={match.index}
            onClick={() => onSelectFile && onSelectFile(target)}
            className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-accent-acid/40 text-accent-cobalt font-mono font-bold underline decoration-ink-primary cursor-pointer hover:bg-accent-acid hover:text-ink-primary transition-colors border-b-2 border-ink-primary select-text"
            title={`Open [[${target}]]`}
          >
            [[{alias}]]
          </span>
        );
      } else if (match[3]) {
        // Inline code `code`
        parts.push(
          <code key={match.index} className="neo-box-sm px-1.5 py-0.5 bg-cream-shell text-ink-primary font-mono text-xs border border-ink-primary/40">
            {match[3]}
          </code>
        );
      } else if (match[4]) {
        // Bold **text**
        parts.push(<strong key={match.index} className="font-bold text-ink-primary">{match[4]}</strong>);
      } else if (match[5]) {
        // Italic *text*
        parts.push(<em key={match.index} className="italic text-ink-secondary">{match[5]}</em>);
      } else if (match[6] !== undefined && match[7]) {
        // Image ![alt](url)
        const alt = match[6];
        const src = match[7];
        parts.push(
          <span key={match.index} className="block my-4">
            <img
              src={src}
              alt={alt}
              className="neo-box max-w-full h-auto max-h-96 object-contain rounded-none border-2 border-ink-primary bg-white"
              loading="lazy"
            />
            {alt && <span className="block text-center text-xs font-mono text-ink-muted mt-1">{alt}</span>}
          </span>
        );
      } else if (match[8] && match[9]) {
        // Standard link [text](url)
        parts.push(
          <a
            key={match.index}
            href={match[9]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-cobalt font-bold underline hover:text-accent-orange transition-colors"
          >
            {match[8]}
          </a>
        );
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts;
  };

  const renderMarkdownBody = (body: string) => {
    if (!body.trim()) {
      return (
        <div className="text-ink-muted italic font-mono text-xs">
          No content in note body.
        </div>
      );
    }

    const lines = body.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeBuffer: string[] = [];
    let codeLang = '';

    lines.forEach((line, index) => {
      // Code block handling
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          elements.push(
            <div key={`code-${index}`} className="my-4 neo-box bg-white overflow-hidden">
              {codeLang && (
                <div className="px-3 py-1 bg-cream-muted border-b border-ink-primary font-mono text-[10px] text-ink-muted font-bold uppercase">
                  {codeLang}
                </div>
              )}
              <pre className="p-4 overflow-x-auto text-ink-primary font-mono text-xs bg-paper-canvas">
                <code>{codeBuffer.join('\n')}</code>
              </pre>
            </div>
          );
          codeBuffer = [];
          inCodeBlock = false;
          codeLang = '';
        } else {
          inCodeBlock = true;
          codeLang = line.slice(3).trim();
        }
        return;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        return;
      }

      // Headers
      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={index} className="font-display font-extrabold text-2xl md:text-3xl text-ink-primary border-b-2 border-ink-primary pb-2 my-5">
            {line.slice(2)}
          </h1>
        );
      } else if (line.startsWith('## ')) {
        elements.push(
          <h2 key={index} className="font-display font-bold text-xl md:text-2xl text-ink-primary mt-6 mb-3">
            {line.slice(3)}
          </h2>
        );
      } else if (line.startsWith('### ')) {
        elements.push(
          <h3 key={index} className="font-display font-bold text-base md:text-lg text-ink-primary mt-4 mb-2">
            {line.slice(4)}
          </h3>
        );
      } else if (line.startsWith('> ')) {
        elements.push(
          <blockquote
            key={index}
            className="neo-box-sm border-l-4 border-l-accent-orange bg-cream-shell p-3 my-3 text-sm text-ink-secondary italic font-serif"
          >
            {renderFormattedInline(line.slice(2))}
          </blockquote>
        );
      } else if (line.startsWith('- [ ] ') || line.startsWith('- [x] ') || line.startsWith('- [X] ')) {
        const isChecked = line.startsWith('- [x] ') || line.startsWith('- [X] ');
        const text = line.slice(6);
        elements.push(
          <div key={index} className="flex items-center gap-2.5 my-1.5 text-sm font-sans">
            <input
              type="checkbox"
              checked={isChecked}
              readOnly
              className="w-4 h-4 accent-accent-orange rounded-none cursor-default"
            />
            <span className={isChecked ? 'line-through text-ink-muted' : 'text-ink-primary'}>
              {renderFormattedInline(text)}
            </span>
          </div>
        );
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        elements.push(
          <li key={index} className="ml-5 list-disc text-sm text-ink-primary my-1 leading-relaxed">
            {renderFormattedInline(line.slice(2))}
          </li>
        );
      } else if (line.trim() === '') {
        elements.push(<div key={index} className="h-3" />);
      } else {
        elements.push(
          <p key={index} className="text-sm font-sans text-ink-secondary leading-relaxed my-2">
            {renderFormattedInline(line)}
          </p>
        );
      }
    });

    return elements;
  };

  return (
    <div className="flex-1 h-full p-6 md:p-10 bg-paper-canvas overflow-y-auto max-w-4xl mx-auto w-full">
      <div className="prose prose-neutral max-w-none">
        {/* YAML Frontmatter Metadata Inspector */}
        <FrontmatterCard frontmatter={parsed.frontmatter} />

        {/* Markdown Rendered Body */}
        {renderMarkdownBody(parsed.body)}

        {/* Bi-directional Backlinks & Connections Panel */}
        <BacklinksPanel
          activeFilePath={activeFilePath}
          linkedReferences={linkedReferences}
          unlinkedMentions={unlinkedMentions}
          onSelectFile={onSelectFile || (() => {})}
          onLinkMention={onLinkMention}
        />
      </div>
    </div>
  );
};
