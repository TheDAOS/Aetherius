# ADR-008: Derived Markdown Intelligence, Wikilinks, and Knowledge Graph

**Status:** Accepted

## Context

Personal knowledge management relies heavily on relational linking (`[[wikilinks]]`), bi-directional backlinks, tagging (`#tags`), and visual knowledge graph exploration.

However, many existing tools persist knowledge graph nodes and relational edges into proprietary database schemas (Neo4j, relational SQL foreign keys, or vector DBs), resulting in platform lock-in.

Aetherius must provide deep relational intelligence while adhering to Rule #2 (**Markdown is the Canonical Note Format**) and Rule #10 (**Keep the MVP Simple without unnecessary vector DB dependencies**).

## Decision

1. **Standard Open Markdown Conventions**:
   - Internal links use standard Wikilinks: `[[Note Title]]`, `[[folder/note]]`, or `[[Target|Custom Display Text]]`.
   - Metadata is declared using standard YAML frontmatter blocks (`---` ... `---`).
   - Categorization uses inline `#tags` and frontmatter `tags: [...]`.
   - Markdown files remain 100% human-readable and compatible with external tools (Obsidian, VS Code, GitHub Web).

2. **Deterministic In-Memory / Client-Side Graph Indexing**:
   - The knowledge graph is **strictly derived state** computed client-side by `graphIndexer.ts`.
   - Neither Supabase Postgres nor GitHub stores explicit graph tables or edge collections.
   - The graph indexer parses notes in memory / IndexedDB on startup, building:
     - `nodes`: Note files with calculated degree and hub status (`degree >= 3`).
     - `edges`: Directed links derived from outgoing `[[wikilinks]]`.
     - `backlinks`: Map of inbound references with surrounding context snippets.
     - `unlinkedMentions`: Discovered occurrences of note titles or aliases in unlinked text.
     - `tagMap`: Index of all tags mapped to note paths.

3. **Interactive 2D Force-Directed Canvas Explorer**:
   - Visualized using an HTML5 Canvas physics simulation styled with the signature Acid Neo-Memphis design system (ADR-006).
   - Features real-time spring physics, charge repulsion, pan/zoom, note search filtering, and local neighborhood toggle (1-hop radius vs global vault).

4. **1-Click Mention Conversion & Link Autocompletion**:
   - Typing `[[` inside `NoteEditor` invokes floating fuzzy autocompletion.
   - Unlinked mentions in the `BacklinksPanel` provide a 1-click action to convert raw text into explicit `[[links]]` and commit to Git.

## Consequences

### Positive
- Zero database lock-in: if all local caches and Supabase metadata are wiped, the full knowledge graph is deterministically regenerated from raw Markdown in milliseconds.
- Zero server-side infrastructure cost for graph processing (aligned with zero-cost goal).
- Maximum data portability for the user.

### Negative
- Very large vaults (>10,000 notes) will require Web Worker offloading for AST parsing to prevent main-thread UI jank.

## Related Decisions
- ADR-001: GitHub Is the Source of Truth
- ADR-004: Markdown Is the Canonical Note Format
- ADR-006: Frontend PWA Design System and Architecture
