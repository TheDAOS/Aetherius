import MarkdownIt from "markdown-it";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import type { BacklinkReference } from "../../services/intelligence/graphIndexer";
import {
  parseMarkdown,
  resolveWikilinkPath,
} from "../../services/intelligence/markdownParser";
import { BacklinksPanel } from "./BacklinksPanel";
import { FrontmatterCard } from "./FrontmatterCard";

const SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);
const isExternal = (url: string) => /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(url);
function isSafeUrl(url: string): boolean {
  try {
    return SAFE_PROTOCOLS.has(
      new URL(url, "https://placeholder.invalid").protocol,
    );
  } catch {
    return false;
  }
}

/** Resolve a normal Markdown URL relative to its containing vault file. */
export function resolveRelativeVaultPath(
  url: string,
  activeFilePath: string,
): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(url.split(/[?#]/)[0]);
  } catch {
    return null;
  }
  const parts = decoded.startsWith("/")
    ? []
    : activeFilePath.split("/").slice(0, -1);
  for (const part of decoded.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      if (!parts.length) return null;
      parts.pop();
    } else parts.push(part);
  }
  return parts.join("/");
}

interface RenderEnvironment extends Record<string | symbol, unknown> {
  activeFilePath: string;
  assets: Record<string, string>;
}
const md = new MarkdownIt({ html: false, linkify: true, typographer: true });
// Tokenize wikilinks, so raw HTML remains disabled and link labels stay escaped.
md.inline.ruler.before("link", "wikilink", (state, silent) => {
  const match = state.src
    .slice(state.pos)
    .match(/^\[\[([^[\]\n|]+)(?:\|([^[\]\n]+))?\]\]/);
  if (!match || state.linkLevel > 0) return false;
  if (!silent) {
    const target = match[1].trim();
    const open = state.push("link_open", "a", 1);
    open.attrs = [
      ["href", "#"],
      ["class", "wikilink"],
      ["data-target", target],
    ];
    state.push("text", "", 0).content = match[2]?.trim() || target;
    state.push("link_close", "a", -1);
  }
  state.pos += match[0].length;
  return true;
});
md.renderer.rules.link_open = (tokens, idx, options, rawEnv, self) => {
  const env = rawEnv as RenderEnvironment;
  const token = tokens[idx];
  const href = String(token.attrGet("href") || "");
  if (token.attrGet("class") === "wikilink")
    return self.renderToken(tokens, idx, options);
  if (!isSafeUrl(href)) {
    token.attrSet("href", "#");
    token.attrSet("title", "Blocked: unsafe URL");
  } else if (
    !isExternal(href) &&
    !href.startsWith("#") &&
    /\.md(?:[?#]|$)/i.test(href)
  ) {
    const path = resolveRelativeVaultPath(href, env.activeFilePath);
    token.attrSet("href", "#");
    if (path) token.attrSet("data-note-path", path);
  } else if (isExternal(href)) {
    token.attrSet("target", "_blank");
    token.attrSet("rel", "noopener noreferrer");
  }
  return self.renderToken(tokens, idx, options);
};
const defaultImageRender = md.renderer.rules.image;
md.renderer.rules.image = (tokens, idx, options, rawEnv, self) => {
  const env = rawEnv as RenderEnvironment;
  const src = String(tokens[idx].attrGet("src") || "");
  if (!isExternal(src)) {
    const path = resolveRelativeVaultPath(src, env.activeFilePath);
    // Never issue an unauthenticated request for private assets to the PWA host.
    const resolved = path && env.assets[path];
    if (resolved) tokens[idx].attrSet("src", resolved);
    else
      tokens[idx].attrs = (tokens[idx].attrs || []).filter(
        ([key]) => key !== "src",
      );
  } else if (!isSafeUrl(src)) {
    tokens[idx].attrs = (tokens[idx].attrs || []).filter(
      ([key]) => key !== "src",
    );
  }
  return defaultImageRender
    ? defaultImageRender(tokens, idx, options, env, self)
    : self.renderToken(tokens, idx, options);
};

interface NotePreviewProps {
  content: string;
  activeFilePath?: string;
  allFilePaths?: string[];
  linkedReferences?: BacklinkReference[];
  unlinkedMentions?: BacklinkReference[];
  onSelectFile?: (path: string) => void;
  onLinkMention?: (sourcePath: string, phrase: string) => void;
  /** Resolve an authenticated vault image to an object URL; caller owns URL lifetime. */
  resolveAsset?: (path: string) => Promise<string>;
}

export const NotePreview: React.FC<NotePreviewProps> = ({
  content,
  activeFilePath = "",
  allFilePaths = [],
  linkedReferences = [],
  unlinkedMentions = [],
  onSelectFile,
  onLinkMention,
  resolveAsset,
}) => {
  const parsed = useMemo(
    () => parseMarkdown(content, activeFilePath),
    [content, activeFilePath],
  );
  const [assetState, setAssetState] = useState<{
    key: string;
    urls: Record<string, string>;
  }>({ key: "", urls: {} });
  const assetKey = `${activeFilePath}\n${parsed.body}`;
  useEffect(() => {
    let cancelled = false;
    if (!resolveAsset) return;
    const paths = new Set<string>();
    const visit = (tokens: ReturnType<typeof md.parse>) => {
      for (const token of tokens) {
        if (token.type === "image") {
          const src = String(token.attrGet("src") || "");
          if (!isExternal(src)) {
            const path = resolveRelativeVaultPath(src, activeFilePath);
            if (path) paths.add(path);
          }
        }
        if (token.children) visit(token.children);
      }
    };
    visit(md.parse(parsed.body, {}));
    void Promise.all(
      [...paths].map(async (path) => {
        try {
          const url = await resolveAsset(path);
          // Only display locally created object URLs, or safe raster data URLs.
          if (
            /^blob:/i.test(url) ||
            /^data:image\/(?:png|jpeg|gif|webp|avif|bmp);base64,/i.test(url)
          )
            return [path, url] as const;
        } catch {
          /* Leave an unavailable image inert rather than requesting its private path. */
        }
        return null;
      }),
    ).then((entries) => {
      if (!cancelled)
        setAssetState({
          key: assetKey,
          urls: Object.fromEntries(entries.filter((entry) => entry !== null)),
        });
    });
    return () => {
      cancelled = true;
    };
  }, [assetKey, activeFilePath, parsed.body, resolveAsset]);

  const renderedHtml = useMemo(
    () =>
      md.render(parsed.body, {
        activeFilePath,
        assets: assetState.key === assetKey ? assetState.urls : {},
      } satisfies RenderEnvironment),
    [parsed.body, activeFilePath, assetState, assetKey],
  );

  const handleClick = (event: React.MouseEvent) => {
    const target = (event.target as HTMLElement).closest<HTMLAnchorElement>(
      "a[data-target], a[data-note-path]",
    );
    if (!target || !onSelectFile) return;
    event.preventDefault();
    const notePath = target.getAttribute("data-note-path");
    const wikilink = target.getAttribute("data-target");
    if (notePath) onSelectFile(notePath);
    else if (wikilink)
      onSelectFile(resolveWikilinkPath(wikilink, allFilePaths) || wikilink);
  };

  return (
    <div className="flex-1 h-full p-6 md:p-10 bg-paper-canvas overflow-y-auto max-w-4xl mx-auto w-full">
      <div className="prose prose-neutral max-w-none">
        <FrontmatterCard frontmatter={parsed.frontmatter} />
        <div
          className="note-preview-content"
          onClick={handleClick}
          // biome-ignore lint/security/noDangerouslySetInnerHtml: markdown-it disables raw HTML and escapes text/attributes.
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />
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
