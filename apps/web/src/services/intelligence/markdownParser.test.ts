import { describe, expect, it } from "vitest";
import {
  extractInlineTags,
  extractWikilinks,
  parseFrontmatter,
  parseMarkdown,
  resolveWikilinkPath,
} from "./markdownParser";

describe("markdownParser", () => {
  it("parses YAML frontmatter correctly", () => {
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
    expect(frontmatter.title).toBe("Project Architecture");
    expect(frontmatter.tags).toEqual(["architecture", "react"]);
    expect(frontmatter.status).toBe("active");
    expect(frontmatter.priority).toBe(1);
    expect(frontmatter.published).toBe(true);
    expect(body.trim()).toBe("# Project Architecture\nThis is the note body.");
  });

  it("handles markdown without frontmatter", () => {
    const raw = "# Hello World\nJust normal markdown.";
    const { frontmatter, body } = parseFrontmatter(raw);
    expect(frontmatter).toEqual({});
    expect(body).toBe(raw);
  });

  it("handles unclosed frontmatter", () => {
    const raw = "---\ntitle: Missing end";
    const { frontmatter, body } = parseFrontmatter(raw);
    expect(frontmatter).toEqual({});
    expect(body).toBe(raw);
  });

  it("extracts standard and aliased wikilinks", () => {
    const text =
      "Reference to [[Welcome Note]] and [[notes/system-design|System Design]] and [[Architecture#Overview]].";
    const links = extractWikilinks(text);

    expect(links).toHaveLength(3);
    expect(links[0]).toEqual({
      raw: "[[Welcome Note]]",
      target: "Welcome Note",
      alias: "Welcome Note",
    });
    expect(links[1]).toEqual({
      raw: "[[notes/system-design|System Design]]",
      target: "notes/system-design",
      alias: "System Design",
    });
    expect(links[2]).toEqual({
      raw: "[[Architecture#Overview]]",
      target: "Architecture#Overview",
      alias: "Architecture#Overview",
    });
  });

  it("extracts inline hashtags while ignoring headings and code blocks", () => {
    const text = `# Main Heading
This note discusses #algorithms and #graph-theory/traversal.
\`\`\`js
const notATag = #code;
\`\`\`
Also #react and \`#inlineCode\`.`;

    const tags = extractInlineTags(text);
    expect(tags).toContain("algorithms");
    expect(tags).toContain("graph-theory/traversal");
    expect(tags).toContain("react");
    expect(tags).not.toContain("main"); // Heading is ignored
    expect(tags).not.toContain("code"); // Inside code block
  });

  it("resolves wikilink path against file list", () => {
    const files = [
      "notes/architecture/system-design.md",
      "notes/welcome.md",
      "templates/daily-note.md",
    ];

    expect(resolveWikilinkPath("welcome", files)).toBe("notes/welcome.md");
    expect(resolveWikilinkPath("Welcome", files)).toBe("notes/welcome.md");
    expect(resolveWikilinkPath("system-design", files)).toBe(
      "notes/architecture/system-design.md",
    );
    expect(
      resolveWikilinkPath("notes/architecture/system-design.md", files),
    ).toBe("notes/architecture/system-design.md");
    expect(resolveWikilinkPath("non-existent", files)).toBeNull();
  });

  it("parses full note into title, tags, aliases, and outgoing links", () => {
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

    const parsed = parseMarkdown(noteContent, "notes/graph.md");
    expect(parsed.title).toBe("Graph Engine");
    expect(parsed.aliases).toEqual(["Knowledge Graph", "Graph Indexer"]);
    expect(parsed.tags).toContain("graph");
    expect(parsed.tags).toContain("knowledge-management");
    expect(parsed.outgoingLinks[0].target).toBe("System Design");
  });

  it("falls back to heading title if no frontmatter title", () => {
    const parsed = parseMarkdown("# First Heading\nSome text");
    expect(parsed.title).toBe("First Heading");
  });

  it("falls back to default path if no title and no heading", () => {
    const parsed = parseMarkdown("Just some text", "folder/my-note.md");
    expect(parsed.title).toBe("my-note");
    
    // hit the fallback if .pop() is empty string (e.g. trailing slash)
    const parsedSlash = parseMarkdown("Just some text", "/");
    expect(parsedSlash.title).toBe("Untitled");
  });

  it("defaults to Untitled if absolutely no title can be found", () => {
    const parsed = parseMarkdown("Just some text");
    expect(parsed.title).toBe("Untitled");
  });

  it("covers all frontmatter parsing edge cases", () => {
    const raw = `---
# comment line

listKey:
  - "quoted item"
stringKey: "true"
falseKey: "false"
numberKey: 123
zeroKey: 0
emptyStrKey: ""
tags: single-tag
aliases: single-alias
---
# Heading`;
    const { frontmatter } = parseFrontmatter(raw);
    expect(frontmatter.listKey).toEqual(["quoted item"]);
    expect(frontmatter.stringKey).toBe(true);
    expect(frontmatter.falseKey).toBe(false);
    expect(frontmatter.numberKey).toBe(123);
    expect(frontmatter.zeroKey).toBe(0);
    expect(frontmatter.emptyStrKey).toBe("");
    expect(frontmatter.tags).toBe("single-tag");
    expect(frontmatter.aliases).toBe("single-alias");
  });

  it("covers parseMarkdown single string tag/alias and heading match branches", () => {
    const parsed = parseMarkdown(`---
tags: tag1
aliases: alias1
---
body with #tag1`);
    expect(parsed.tags).toEqual(["tag1"]);
    expect(parsed.aliases).toEqual(["alias1"]);
  });

  it("covers resolveWikilinkPath titleToPathMap normalized and default fallback", () => {
    const map = new Map();
    map.set("some-normalized-target", "found/path.md");
    const res1 = resolveWikilinkPath("Some Normalized Target", [], map);
    expect(res1).toBe("found/path.md");

    const res2 = resolveWikilinkPath("My-File", ["My-File.md"]);
    expect(res2).toBe("My-File.md");

    // target not in map, fallback to allFilePaths
    const res3 = resolveWikilinkPath("Not In Map", ["Not In Map.md"], map);
    expect(res3).toBe("Not In Map.md");

    // empty filename to hit !filename continue branch
    const res4 = resolveWikilinkPath("target", ["/", "target.md"]);
    expect(res4).toBe("target.md");
  });
});
