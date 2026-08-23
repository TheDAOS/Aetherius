import MarkdownIt from "markdown-it";
import type React from "react";
import { useMemo } from "react";
import type { BacklinkReference } from "../../services/intelligence/graphIndexer";
import { parseMarkdown } from "../../services/intelligence/markdownParser";
import { BacklinksPanel } from "./BacklinksPanel";
import { FrontmatterCard } from "./FrontmatterCard";

// Safe URL protocols — blocks javascript:, data:, vbscript: etc.
const SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url, "https://placeholder.invalid");
    return SAFE_PROTOCOLS.has(parsed.protocol);
  } catch {
    // Relative URLs are safe
    return !url.toLowerCase().trimStart().startsWith("javascript:");
  }
}

// Configure markdown-it with security defaults
const md = new MarkdownIt({
  html: false, // Disable raw HTML to prevent XSS
  linkify: true, // Auto-link URLs
  typographer: true, // Smart quotes etc.
  breaks: false, // Don't convert \n to <br>
});

// Override link rendering to sanitize href and add security attributes
const defaultLinkRender =
  md.renderer.rules.link_open ||
  ((tokens, idx, options, _env, self) =>
    self.renderToken(tokens, idx, options));

md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const i = idx as number;
  const href = tokens[i].attrGet("href") as string | null;
  if (href && !isSafeUrl(href)) {
    // Block unsafe URLs by replacing with empty hash
    tokens[i].attrSet("href", "#");
    tokens[i].attrSet("title", "Blocked: unsafe URL");
  } else {
    // Add security attributes for external links
    tokens[i].attrSet("target", "_blank");
    tokens[i].attrSet("rel", "noopener noreferrer");
  }
  return defaultLinkRender(tokens, idx, options, env, self);
};

// Override image rendering to sanitize src
const defaultImageRender =
  md.renderer.rules.image ||
  ((tokens, idx, options, _env, self) =>
    self.renderToken(tokens, idx, options));

md.renderer.rules.image = (tokens, idx, options, env, self) => {
  const i = idx as number;
  const src = tokens[i].attrGet("src") as string | null;
  if (src && !isSafeUrl(src)) {
    tokens[i].attrSet("src", "");
    tokens[i].attrSet("alt", "Blocked: unsafe image URL");
  }
  return defaultImageRender(tokens, idx, options, env, self);
};

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
  activeFilePath = "",
  linkedReferences = [],
  unlinkedMentions = [],
  onSelectFile,
  onLinkMention,
}) => {
  const parsed = parseMarkdown(content, activeFilePath);

  // Process wikilinks [[Target|Alias]] before markdown rendering
  const processedBody = useMemo(() => {
    return parsed.body.replace(
      /\[\[([^[\]|]+)(?:\|([^[\]]+))?\]\]/g,
      (_match, target: string, alias?: string) => {
        const displayText = alias?.trim() || target.trim();
        const targetPath = target.trim();
        // Render as a special span with data attributes for click handling
        return `<span class="wikilink" data-target="${targetPath.replace(/"/g, "&quot;")}" title="Open [[${targetPath.replace(/"/g, "&quot;")}]]">[[${displayText}]]</span>`;
      },
    );
  }, [parsed.body]);

  // Render markdown to HTML using markdown-it
  const renderedHtml = useMemo(() => {
    return md.render(processedBody);
  }, [processedBody]);

  // Handle clicks on wikilinks
  const handleClick = (e: React.MouseEvent) => {
    const target = (e.target as HTMLElement).closest(
      ".wikilink",
    ) as HTMLElement | null;
    if (target && onSelectFile) {
      const path = target.getAttribute("data-target");
      if (path) {
        e.preventDefault();
        onSelectFile(path);
      }
    }
  };

  return (
    <div className="flex-1 h-full p-6 md:p-10 bg-paper-canvas overflow-y-auto max-w-4xl mx-auto w-full">
      <div className="prose prose-neutral max-w-none">
        {/* YAML Frontmatter Metadata Inspector */}
        <FrontmatterCard frontmatter={parsed.frontmatter} />

        {/* Markdown Rendered Body */}
        <div
          className="note-preview-content"
          onClick={handleClick}
          // biome-ignore lint/security/noDangerouslySetInnerHtml: Sanitized via markdown-it (html: false)
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />

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
