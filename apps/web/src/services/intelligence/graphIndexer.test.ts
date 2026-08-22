import { describe, it, expect } from 'vitest';
import { buildGraphIndex, extractSnippet } from './graphIndexer';
import { VaultFile } from '../../types/vault';

describe('graphIndexer', () => {
  const sampleFiles: VaultFile[] = [
    {
      name: 'welcome.md',
      path: 'notes/welcome.md',
      type: 'file',
      sha: 'sha1',
      content: `---
title: Welcome Note
tags:
  - onboarding
---
# Welcome Note
Welcome to Aetherius! Check out [[System Design]] and [[Daily Log]].
Also check out #productivity.`
    },
    {
      name: 'system-design.md',
      path: 'notes/system-design.md',
      type: 'file',
      sha: 'sha2',
      content: `---
title: System Design
aliases:
  - Architecture
tags:
  - architecture
---
# System Design
This document outlines our architecture. Linking back to [[Welcome Note]].`
    },
    {
      name: 'daily-log.md',
      path: 'notes/daily-log.md',
      type: 'file',
      sha: 'sha3',
      content: `---
title: Daily Log
tags:
  - journal
---
# Daily Log
Today I reviewed the Architecture of our project and wrote some notes.`
    },
    {
      name: 'extra.md',
      path: 'notes/extra.md',
      type: 'file',
      sha: 'sha4',
      content: `---
title: Extra Notes
---
# Extra Notes
Mentions [[Welcome Note]] and [[System Design]].`
    }
  ];

  it('builds nodes, edges, and computes degrees', () => {
    const graph = buildGraphIndex(sampleFiles);

    expect(graph.nodes).toHaveLength(4);
    expect(graph.edges.length).toBeGreaterThanOrEqual(4);

    const welcomeNode = graph.nodes.find(n => n.path === 'notes/welcome.md');
    expect(welcomeNode).toBeDefined();
    expect(welcomeNode?.title).toBe('Welcome Note');
    expect(welcomeNode?.tags).toContain('onboarding');
    expect(welcomeNode?.tags).toContain('productivity');
  });

  it('discovers bi-directional backlinks correctly', () => {
    const graph = buildGraphIndex(sampleFiles);

    // Notes linking to system-design.md: welcome.md and extra.md
    const sysDesignBacklinks = graph.backlinks.get('notes/system-design.md') || [];
    const sourcePaths = sysDesignBacklinks.map(b => b.sourcePath);

    expect(sourcePaths).toContain('notes/welcome.md');
    expect(sourcePaths).toContain('notes/extra.md');
    expect(sysDesignBacklinks[0].isExplicit).toBe(true);
  });

  it('identifies unlinked mentions using title and aliases', () => {
    const graph = buildGraphIndex(sampleFiles);

    // daily-log.md mentions "Architecture" (alias of System Design) without [[...]]
    const sysDesignUnlinked = graph.unlinkedMentions.get('notes/system-design.md') || [];
    expect(sysDesignUnlinked.length).toBeGreaterThan(0);
    expect(sysDesignUnlinked[0].sourcePath).toBe('notes/daily-log.md');
    expect(sysDesignUnlinked[0].isExplicit).toBe(false);
  });

  it('extracts clean snippet around matched text', () => {
    const text = 'Before text. This is a very interesting section about graph indexing in personal vaults. After text.';
    const snippet = extractSnippet(text, 'graph indexing');
    expect(snippet).toContain('graph indexing');
  });

  it('populates tag mapping across all notes', () => {
    const graph = buildGraphIndex(sampleFiles);
    expect(graph.tagMap.get('architecture')?.has('notes/system-design.md')).toBe(true);
    expect(graph.tagMap.get('onboarding')?.has('notes/welcome.md')).toBe(true);
    expect(graph.tagMap.get('journal')?.has('notes/daily-log.md')).toBe(true);
  });
});
