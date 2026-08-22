export interface ParsedNote {
  frontmatter: Record<string, any>;
  body: string;
  title: string;
  tags: string[];
  aliases: string[];
  outgoingLinks: Array<{ raw: string; target: string; alias?: string }>;
}

export function parseFrontmatter(rawContent: string): { frontmatter: Record<string, any>; body: string } {
  const trimmed = rawContent.trimStart();
  if (!trimmed.startsWith('---')) {
    return { frontmatter: {}, body: rawContent };
  }

  const endIndex = trimmed.indexOf('\n---', 3);
  if (endIndex === -1) {
    return { frontmatter: {}, body: rawContent };
  }

  const yamlBlock = trimmed.slice(3, endIndex).trim();
  const body = trimmed.slice(endIndex + 4).trimStart();
  const frontmatter: Record<string, any> = {};

  const lines = yamlBlock.split('\n');
  let currentKey = '';
  let inList = false;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) continue;

    if (trimmedLine.startsWith('- ') && currentKey && inList) {
      const val = trimmedLine.slice(2).trim().replace(/^["']|["']$/g, '');
      if (Array.isArray(frontmatter[currentKey])) {
        frontmatter[currentKey].push(val);
      }
      continue;
    }

    const colonIndex = line.indexOf(':');
    if (colonIndex !== -1) {
      const key = line.slice(0, colonIndex).trim();
      const rawValue = line.slice(colonIndex + 1).trim();

      if (!rawValue) {
        currentKey = key;
        frontmatter[key] = [];
        inList = true;
      } else {
        currentKey = key;
        inList = false;
        let parsedVal: any = rawValue.replace(/^["']|["']$/g, '');
        if (parsedVal === 'true') parsedVal = true;
        else if (parsedVal === 'false') parsedVal = false;
        else if (!isNaN(Number(parsedVal)) && parsedVal !== '') parsedVal = Number(parsedVal);
        frontmatter[key] = parsedVal;
      }
    }
  }

  return { frontmatter, body };
}

export function extractWikilinks(text: string): Array<{ raw: string; target: string; alias?: string }> {
  const wikilinkRegex = /\[\[([^[\]|]+)(?:\|([^[\]]+))?\]\]/g;
  const links: Array<{ raw: string; target: string; alias?: string }> = [];
  let match: RegExpExecArray | null;

  while ((match = wikilinkRegex.exec(text)) !== null) {
    const target = match[1].trim();
    const alias = match[2]?.trim();
    links.push({
      raw: match[0],
      target,
      alias: alias || target
    });
  }

  return links;
}

export function extractInlineTags(text: string): string[] {
  // Strip code blocks first
  const noCode = text.replace(/```[\s\S]*?```/g, '').replace(/`[^`]+`/g, '');
  const tagRegex = /(?:^|\s)#([a-zA-Z0-9_\-\/]+)(?=\s|$|[.,;:!?])/g;
  const tags = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(noCode)) !== null) {
    const tag = match[1].toLowerCase();
    // Exclude markdown headings (which have space after #, e.g. # Heading)
    if (tag) tags.add(tag);
  }

  return Array.from(tags);
}

export function parseMarkdown(content: string, defaultPath: string = ''): ParsedNote {
  const { frontmatter, body } = parseFrontmatter(content);
  const outgoingLinks = extractWikilinks(body);
  const inlineTags = extractInlineTags(body);

  const frontmatterTags: string[] = Array.isArray(frontmatter.tags)
    ? frontmatter.tags.map(t => String(t).toLowerCase())
    : (frontmatter.tags ? [String(frontmatter.tags).toLowerCase()] : []);

  const allTags = Array.from(new Set([...frontmatterTags, ...inlineTags]));
  const aliases = Array.isArray(frontmatter.aliases)
    ? frontmatter.aliases.map(a => String(a))
    : (frontmatter.aliases ? [String(frontmatter.aliases)] : []);

  // Title resolution: frontmatter title > first # heading > filename
  let title = frontmatter.title;
  if (!title) {
    const headingMatch = body.match(/^#\s+(.+)$/m);
    if (headingMatch) {
      title = headingMatch[1].trim();
    } else if (defaultPath) {
      const filename = defaultPath.split('/').pop() || defaultPath;
      title = filename.replace(/\.md$/, '');
    } else {
      title = 'Untitled';
    }
  }

  return {
    frontmatter,
    body,
    title,
    tags: allTags,
    aliases,
    outgoingLinks
  };
}

export function resolveWikilinkPath(target: string, allFilePaths: string[]): string | null {
  const cleanTarget = target.trim().replace(/\.md$/, '').toLowerCase();

  // 1. Exact path match
  for (const path of allFilePaths) {
    if (path.replace(/\.md$/, '').toLowerCase() === cleanTarget) {
      return path;
    }
  }

  // 2. Basename match
  for (const path of allFilePaths) {
    const filename = path.split('/').pop()?.replace(/\.md$/, '').toLowerCase();
    if (filename === cleanTarget) {
      return path;
    }
  }

  return null;
}
