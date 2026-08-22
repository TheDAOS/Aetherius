import { VaultFile } from '../../types/vault';
import { parseMarkdown, resolveWikilinkPath, ParsedNote } from './markdownParser';

export interface GraphNode {
  id: string; // path
  path: string;
  title: string;
  tags: string[];
  isHub: boolean;
  degree: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  label?: string;
}

export interface BacklinkReference {
  sourcePath: string;
  sourceTitle: string;
  snippet: string;
  isExplicit: boolean; // true = [[wikilink]], false = unlinked mention
}

export interface VaultGraphIndex {
  nodes: GraphNode[];
  edges: GraphEdge[];
  backlinks: Map<string, BacklinkReference[]>;
  unlinkedMentions: Map<string, BacklinkReference[]>;
  tagMap: Map<string, Set<string>>;
}

export function extractSnippet(content: string, searchPhrase: string, maxLen: number = 120): string {
  const lowerContent = content.toLowerCase();
  const lowerPhrase = searchPhrase.toLowerCase();
  const index = lowerContent.indexOf(lowerPhrase);

  if (index === -1) {
    return content.slice(0, maxLen).replace(/\n/g, ' ') + (content.length > maxLen ? '...' : '');
  }

  const start = Math.max(0, index - 40);
  const end = Math.min(content.length, index + searchPhrase.length + 60);
  let snippet = content.slice(start, end).replace(/\n/g, ' ');

  if (start > 0) snippet = '...' + snippet;
  if (end < content.length) snippet = snippet + '...';

  return snippet;
}

export function buildGraphIndex(files: VaultFile[]): VaultGraphIndex {
  const mdFiles = files.filter(f => f.type === 'file' && f.path.endsWith('.md'));
  const allPaths = mdFiles.map(f => f.path);

  const parsedNotesMap = new Map<string, ParsedNote>();
  const nodesMap = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const backlinks = new Map<string, BacklinkReference[]>();
  const unlinkedMentions = new Map<string, BacklinkReference[]>();
  const tagMap = new Map<string, Set<string>>();

  // 1. Parse all notes
  for (const file of mdFiles) {
    const parsed = parseMarkdown(file.content || '', file.path);
    parsedNotesMap.set(file.path, parsed);

    nodesMap.set(file.path, {
      id: file.path,
      path: file.path,
      title: parsed.title,
      tags: parsed.tags,
      isHub: false,
      degree: 0
    });

    // Populate Tag Map
    for (const tag of parsed.tags) {
      if (!tagMap.has(tag)) tagMap.set(tag, new Set());
      tagMap.get(tag)!.add(file.path);
    }
  }

  // 2. Build title and alias lookup map
  const titleToPathMap = new Map<string, string>();
  for (const [path, parsed] of parsedNotesMap.entries()) {
    if (parsed.title) {
      titleToPathMap.set(parsed.title.toLowerCase(), path);
    }
    for (const alias of parsed.aliases) {
      titleToPathMap.set(alias.toLowerCase(), path);
    }
  }

  // 3. Build forward links and backlinks
  for (const [sourcePath, parsed] of parsedNotesMap.entries()) {
    for (const link of parsed.outgoingLinks) {
      const targetPath = resolveWikilinkPath(link.target, allPaths, titleToPathMap);
      if (targetPath && targetPath !== sourcePath) {
        edges.push({ source: sourcePath, target: targetPath, label: 'links' });

        // Record Backlink
        if (!backlinks.has(targetPath)) backlinks.set(targetPath, []);
        const snippet = extractSnippet(parsed.body, link.raw);
        backlinks.get(targetPath)!.push({
          sourcePath,
          sourceTitle: parsed.title,
          snippet,
          isExplicit: true
        });

        // Increment degree
        const sourceNode = nodesMap.get(sourcePath);
        const targetNode = nodesMap.get(targetPath);
        if (sourceNode) sourceNode.degree++;
        if (targetNode) targetNode.degree++;
      }
    }
  }

  // 4. Scan Unlinked Mentions
  for (const [targetPath, targetParsed] of parsedNotesMap.entries()) {
    const targetPhrases = [targetParsed.title, ...targetParsed.aliases].filter(
      p => p && p.length > 2 && p.toLowerCase() !== 'untitled'
    );

    if (targetPhrases.length === 0) continue;

    for (const [sourcePath, sourceParsed] of parsedNotesMap.entries()) {
      if (sourcePath === targetPath) continue;

      // Check if source already has explicit link to target
      const alreadyLinked = (backlinks.get(targetPath) || []).some(
        b => b.sourcePath === sourcePath
      );
      if (alreadyLinked) continue;

      // Strip explicit links and code blocks from text to avoid false positives
      const cleanBody = sourceParsed.body
        .replace(/\[\[[^\]]+\]\]/g, '')
        .replace(/```[\s\S]*?```/g, '')
        .replace(/`[^`]+`/g, '');

      for (const phrase of targetPhrases) {
        const regex = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (regex.test(cleanBody)) {
          if (!unlinkedMentions.has(targetPath)) unlinkedMentions.set(targetPath, []);
          const snippet = extractSnippet(sourceParsed.body, phrase);
          unlinkedMentions.get(targetPath)!.push({
            sourcePath,
            sourceTitle: sourceParsed.title,
            snippet,
            isExplicit: false
          });
          break;
        }
      }
    }
  }

  // 4. Mark Hubs (nodes with high degree >= 3)
  for (const node of nodesMap.values()) {
    if (node.degree >= 3) {
      node.isHub = true;
    }
  }

  return {
    nodes: Array.from(nodesMap.values()),
    edges,
    backlinks,
    unlinkedMentions,
    tagMap
  };
}
