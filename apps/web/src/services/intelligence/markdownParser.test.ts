import { describe, it, expect } from 'vitest';
import {
  parseFrontmatter,
  extractWikilinks,
  extractInlineTags,
  parseMarkdown,
  resolveWikilinkPath
} from './markdownParser';

describe('markdownParser', () => {
  it('parses YAML frontmatter correctly', () => {
    const raw = `---
title: Project Architecture
tags:
  - architecture
  - react
status: active
priority: 1
published: true
---

# Project Architecture
This is the note body.`;

    const { frontmatter, body } = parseFrontmatter(raw);
    expect(frontmatter.title).toBe('Project Architecture');
    expect(frontmatter.tags).toEqual(['architecture', 'react']);
    expect(frontmatter.status).toBe('active');
    expect(frontmatter.priority).toBe(1);
    expect(frontmatter.published).toBe(true);
    expect(body.trim()).toBe('# Project Architecture\nThis is the note body.');
  });

  it('handles markdown without frontmatter', () => {
    const raw = '# Hello World\nJust normal markdown.';
    const { frontmatter, body } = parseFrontmatter(raw);
    expect(frontmatter).toEqual({});
    expect(body).toBe(raw);
  });

  it('extracts standard and aliased wikilinks', () => {
    const text = 'Reference to [[Welcome Note]] and [[notes/system-design|System Design]] and [[Architecture#Overview]].';
    const links = extractWikilinks(text);

    expect(links).toHaveLength(3);
    expect(links[0]).toEqual({
      raw: '[[Welcome Note]]',
      target: 'Welcome Note',
      alias: 'Welcome Note'
    });
    expect(links[1]).toEqual({
      raw: '[[notes/system-design|System Design]]',
      target: 'notes/system-design',
      alias: 'System Design'
    });
    expect(links[2]).toEqual({
      raw: '[[Architecture#Overview]]',
      target: 'Architecture#Overview',
      alias: 'Architecture#Overview'
    });
  });

  it('extracts inline hashtags while ignoring headings and code blocks', () => {
    const text = `# Main Heading
This note discusses #algorithms and #graph-theory/traversal.
\`\`\`js
const notATag = #code;
\`\`\`
Also #react and \`#inlineCode\`.`;

    const tags = extractInlineTags(text);
    expect(tags).toContain('algorithms');
    expect(tags).toContain('graph-theory/traversal');
    expect(tags).toContain('react');
    expect(tags).not.toContain('main'); // Heading is ignored
    expect(tags).not.toContain('code'); // Inside code block
  });

  it('resolves wikilink path against file list', () => {
    const files = [
      'notes/architecture/system-design.md',
      'notes/welcome.md',
      'templates/daily-note.md'
    ];

    expect(resolveWikilinkPath('welcome', files)).toBe('notes/welcome.md');
    expect(resolveWikilinkPath('Welcome', files)).toBe('notes/welcome.md');
    expect(resolveWikilinkPath('system-design', files)).toBe('notes/architecture/system-design.md');
    expect(resolveWikilinkPath('notes/architecture/system-design.md', files)).toBe('notes/architecture/system-design.md');
    expect(resolveWikilinkPath('non-existent', files)).toBeNull();
  });

  it('parses full note into title, tags, aliases, and outgoing links', () => {
    const noteContent = `---
title: Graph Engine
aliases:
  - Knowledge Graph
  - Graph Indexer
tags:
  - graph
---
# Knowledge Graph
See [[System Design]] for details. Also tagged #knowledge-management.`;

    const parsed = parseMarkdown(noteContent, 'notes/graph.md');
    expect(parsed.title).toBe('Graph Engine');
    expect(parsed.aliases).toEqual(['Knowledge Graph', 'Graph Indexer']);
    expect(parsed.tags).toContain('graph');
    expect(parsed.tags).toContain('knowledge-management');
    expect(parsed.outgoingLinks[0].target).toBe('System Design');
  });
});
