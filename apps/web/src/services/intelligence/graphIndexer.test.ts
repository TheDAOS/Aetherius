import { describe, expect, it } from "vitest";
import type { VaultFile } from "../../types/vault";
import { buildGraphIndex, extractSnippet } from "./graphIndexer";

describe("graphIndexer", () => {
  const sampleFiles: VaultFile[] = [
    {
      name: "welcome.md",
      path: "notes/welcome.md",
      type: "file",
      sha: "sha1",
      content: `---
title: Welcome Note
tags:
  - onboarding
---
# Welcome Note
Welcome to Aetherius! Check out [[System Design]] and [[Daily Log]].
Also check out #productivity.`,
    },
    {
      name: "system-design.md",
      path: "notes/system-design.md",
      type: "file",
      sha: "sha2",
      content: `---
title: System Design
aliases:
  - Architecture
tags:
  - architecture
---
# System Design
This document outlines our architecture. Linking back to [[Welcome Note]].`,
    },
    {
      name: "daily-log.md",
      path: "notes/daily-log.md",
      type: "file",
      sha: "sha3",
      content: `---
title: Daily Log
tags:
  - journal
---
# Daily Log
Today I reviewed the Architecture of our project and wrote some notes.`,
    },
    {
      name: "extra.md",
      path: "notes/extra.md",
      type: "file",
      sha: "sha4",
      content: `---
title: Extra Notes
tags:
  - onboarding
---
# Extra Notes
Mentions [[Welcome Note]] and [[System Design]].`,
    },
  ];

  it("builds nodes, edges, and computes degrees", () => {
    const graph = buildGraphIndex(sampleFiles);

    expect(graph.nodes).toHaveLength(4);
    expect(graph.edges.length).toBeGreaterThanOrEqual(4);

    const welcomeNode = graph.nodes.find((n) => n.path === "notes/welcome.md");
    expect(welcomeNode).toBeDefined();
    expect(welcomeNode?.title).toBe("Welcome Note");
    expect(welcomeNode?.tags).toContain("onboarding");
    expect(welcomeNode?.tags).toContain("productivity");
  });

  it("discovers bi-directional backlinks correctly", () => {
    const graph = buildGraphIndex(sampleFiles);

    // Notes linking to system-design.md: welcome.md and extra.md
    const sysDesignBacklinks =
      graph.backlinks.get("notes/system-design.md") || [];
    const sourcePaths = sysDesignBacklinks.map((b) => b.sourcePath);

    expect(sourcePaths).toContain("notes/welcome.md");
    expect(sourcePaths).toContain("notes/extra.md");
    expect(sysDesignBacklinks[0].isExplicit).toBe(true);
  });

  it("identifies unlinked mentions using title and aliases", () => {
    const graph = buildGraphIndex(sampleFiles);

    // daily-log.md mentions "Architecture" (alias of System Design) without [[...]]
    const sysDesignUnlinked =
      graph.unlinkedMentions.get("notes/system-design.md") || [];
    expect(sysDesignUnlinked.length).toBeGreaterThan(0);
    expect(sysDesignUnlinked[0].sourcePath).toBe("notes/daily-log.md");
    expect(sysDesignUnlinked[0].isExplicit).toBe(false);
  });

  it("extracts clean snippet around matched text", () => {
    const text =
      "Before text. This is a very interesting section about graph indexing in personal vaults. After text.";
    const snippet = extractSnippet(text, "graph indexing");
    expect(snippet).toContain("graph indexing");
  });

  it("returns truncated start of content if phrase not found", () => {
    const text = "A short sentence.";
    const snippet = extractSnippet(text, "not found");
    expect(snippet).toBe("A short sentence.");

    const longText = "a".repeat(150);
    const longSnippet = extractSnippet(longText, "not found", 120);
    expect(longSnippet).toContain("a".repeat(120) + "...");
  });

  it("populates tag mapping across all notes", () => {
    const graph = buildGraphIndex(sampleFiles);
    expect(
      graph.tagMap.get("architecture")?.has("notes/system-design.md"),
    ).toBe(true);
    expect(graph.tagMap.get("onboarding")?.has("notes/welcome.md")).toBe(true);
    expect(graph.tagMap.get("journal")?.has("notes/daily-log.md")).toBe(true);
  });

  it("handles edge cases to achieve 100% coverage", () => {
    // extractSnippet with a very long text where the phrase is in the middle
    const longText =
      "Start padding. " +
      "a".repeat(100) +
      " match phrase " +
      "b".repeat(100) +
      " End padding.";
    const longSnippet = extractSnippet(longText, "match phrase");
    expect(longSnippet).toContain("..."); // both start and end ...

    const edgeFiles: VaultFile[] = [
      {
        name: "empty.md",
        path: "empty.md",
        type: "file",
        sha: "1",
        // no content to hit `file.content || ""`
      },
      {
        name: "self-link.md",
        path: "self-link.md",
        type: "file",
        sha: "2",
        content: `---
title: Self Link
---
I link to [[Self Link]] and [[empty]].`,
      },
      {
        name: "unlinked.md",
        path: "unlinked.md",
        type: "file",
        sha: "3",
        content: `---
title: A Very Specific Title That Wont Be Linked
---
I mention Self Link twice to hit unlinkedMentions already set branch.`,
      },
      {
        name: "unlinked2.md",
        path: "unlinked2.md",
        type: "file",
        sha: "3.5",
        content: `I also mention Self Link again so that unlinkedMentions already has it.`,
      },
      {
        name: "untitled.md",
        path: "untitled.md",
        type: "file",
        sha: "4",
        content: `I mention A Very Specific Title That Wont Be Linked`,
      },
    ];

    const graph = buildGraphIndex(edgeFiles);
    expect(graph.nodes.length).toBe(5);

    // Check if self-link was ignored
    const selfLinkEdges = graph.edges.filter(
      (e) => e.source === "self-link.md" && e.target === "self-link.md",
    );
    expect(selfLinkEdges.length).toBe(0);
  });
});
