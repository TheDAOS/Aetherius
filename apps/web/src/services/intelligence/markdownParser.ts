export interface ParsedNote {
  frontmatter: Record<string, any>;
  body: string;
  title: string;
  tags: string[];
  aliases: string[];
  outgoingLinks: Array<{ raw: string; target: string; alias?: string }>;
}

// Small YAML subset used by note metadata: scalars and flat/block lists.
// Preserve quoted strings and split arrays outside quoted commas.
function parseScalar(value: string): unknown {
  let quote = "";
  let end = value.length;
  let escaped = false;
  for (let index = 0; index < value.length; index++) {
    const char = value[index];
    if (!escaped && (char === '"' || char === "'"))
      quote = quote === char ? "" : quote || char;
    if (
      !quote &&
      char === "#" &&
      (index === 0 || /\s/.test(value[index - 1]))
    ) {
      end = index;
      break;
    }
    escaped = quote === '"' && !escaped && char === "\\";
  }
  const raw = value.slice(0, end).trim();
  if (raw.startsWith('"') && raw.endsWith('"')) {
    try {
      return JSON.parse(raw);
    } catch {
      return raw.slice(1, -1);
    }
  }
  if (raw.startsWith("'") && raw.endsWith("'")) {
    return raw.slice(1, -1).replace(/''/g, "'");
  }
  if (raw.startsWith("[") && raw.endsWith("]")) {
    const values: unknown[] = [];
    let current = "";
    let quote = "";
    for (const char of raw.slice(1, -1)) {
      if ((char === '"' || char === "'") && !current.endsWith("\\")) {
        quote = quote === char ? "" : quote || char;
      }
      if (char === "," && !quote) {
        if (current.trim()) values.push(parseScalar(current));
        current = "";
      } else current += char;
    }
    if (current.trim()) values.push(parseScalar(current));
    return values;
  }
  const scalar = raw.replace(/\s+#.*$/, "").trim();
  if (scalar === "true") return true;
  if (scalar === "false") return false;
  if (scalar === "null" || scalar === "~") return null;
  if (/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(scalar)) return Number(scalar);
  return scalar;
}

export function parseFrontmatter(rawContent: string): {
  frontmatter: Record<string, unknown>;
  body: string;
} {
  const match = rawContent.match(
    /^\s*---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/,
  );
  if (!match) return { frontmatter: {}, body: rawContent };
  const frontmatter: Record<string, unknown> = {};
  let currentKey = "";
  for (const line of match[1].split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    if (
      trimmed.startsWith("- ") &&
      currentKey &&
      Array.isArray(frontmatter[currentKey])
    ) {
      (frontmatter[currentKey] as unknown[]).push(
        parseScalar(trimmed.slice(2)),
      );
      continue;
    }
    const entry = line.match(/^([^:#]+):\s*(.*)$/);
    if (!entry) continue;
    const key = entry[1].trim();
    // A Markdown document must never modify Object.prototype through metadata.
    if (["__proto__", "constructor", "prototype"].includes(key)) continue;
    currentKey = key;
    frontmatter[key] = entry[2].trim() ? parseScalar(entry[2]) : [];
  }
  return {
    frontmatter,
    body: rawContent.slice(match[0].length).replace(/^(?:[ \t]*\r?\n)*/, ""),
  };
}

function withoutCode(text: string): string {
  return text
    .replace(
      /^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?^ {0,3}\1[ \t]*(?:\n|$)/gm,
      "",
    )
    .replace(/(`+)[\s\S]*?\1/g, "");
}

export function extractWikilinks(
  text: string,
): Array<{ raw: string; target: string; alias?: string }> {
  const wikilinkRegex = /\[\[([^[\]|]+)(?:\|([^[\]]+))?\]\]/g;
  const links: Array<{ raw: string; target: string; alias?: string }> = [];
  let match: RegExpExecArray | null;
  const source = withoutCode(text);

  while ((match = wikilinkRegex.exec(source)) !== null) {
    const target = match[1].trim();
    const alias = match[2]?.trim();
    links.push({
      raw: match[0],
      target,
      alias: alias || target,
    });
  }

  return links;
}

export function extractInlineTags(text: string): string[] {
  // Strip code blocks first
  const noCode = withoutCode(text);
  const tagRegex = /(?:^|\s)#([a-zA-Z0-9_\-/]+)(?=\s|$|[.,;:!?])/g;
  const tags = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(noCode)) !== null) {
    const tag = match[1].toLowerCase();
    // Exclude markdown headings (which have space after #, e.g. # Heading)
    tags.add(tag);
  }

  return Array.from(tags);
}

export function parseMarkdown(
  content: string,
  defaultPath: string = "",
): ParsedNote {
  const { frontmatter, body } = parseFrontmatter(content);
  const outgoingLinks = extractWikilinks(body);
  const inlineTags = extractInlineTags(body);

  const frontmatterTags: string[] = Array.isArray(frontmatter.tags)
    ? frontmatter.tags.map((t) => String(t).toLowerCase())
    : frontmatter.tags
      ? [String(frontmatter.tags).toLowerCase()]
      : [];

  const allTags = Array.from(new Set([...frontmatterTags, ...inlineTags]));
  const aliases = Array.isArray(frontmatter.aliases)
    ? frontmatter.aliases.map((a) => String(a))
    : frontmatter.aliases
      ? [String(frontmatter.aliases)]
      : [];

  // Title resolution: frontmatter title > first # heading > filename
  let title = frontmatter.title == null ? "" : String(frontmatter.title);
  if (!title) {
    const headingMatch = body.match(/^#\s+(.+)$/m);
    if (headingMatch) {
      title = headingMatch[1].trim();
    } else if (defaultPath) {
      const filename = defaultPath.split("/").pop() || defaultPath;
      title = filename.replace(/\.md$/, "");
    } else {
      title = "Untitled";
    }
  }

  return {
    frontmatter,
    body,
    title,
    tags: allTags,
    aliases,
    outgoingLinks,
  };
}

export function resolveWikilinkPath(
  target: string,
  allFilePaths: string[],
  titleToPathMap?: Map<string, string>,
): string | null {
  const cleanTarget = target
    .split("#")[0]
    .trim()
    .replace(/\.md$/, "")
    .toLowerCase();
  const normalizedTarget = cleanTarget.replace(/[\s\-_]+/g, "-");

  // 1. Check title/alias map if provided
  if (titleToPathMap) {
    const fromMap =
      titleToPathMap.get(cleanTarget) || titleToPathMap.get(normalizedTarget);
    if (fromMap) return fromMap;
  }

  // 2. Exact path match
  for (const path of allFilePaths) {
    const cleanPath = path.replace(/\.md$/, "").toLowerCase();
    if (
      cleanPath === cleanTarget ||
      cleanPath.replace(/[\s\-_]+/g, "-") === normalizedTarget
    ) {
      return path;
    }
  }

  // 3. Basename match (e.g. [[System Design]] -> notes/system-design.md)
  for (const path of allFilePaths) {
    const popResult = path.split("/").pop();
    if (!popResult) continue;
    const filename = popResult.replace(/\.md$/, "").toLowerCase();
    if (!filename) continue;
    const normalizedFilename = filename.replace(/[\s\-_]+/g, "-");
    if (filename === cleanTarget || normalizedFilename === normalizedTarget) {
      return path;
    }
  }

  return null;
}
