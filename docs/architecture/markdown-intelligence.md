# Markdown Intelligence & Knowledge Graph Architecture

## Principles
1. **Zero Database Lock-in**: All relational links, backlinks, tags, and graph topologies are dynamically derived from plain Markdown files.
2. **Open Standards**: Fully compatible with standard Wikilinks (`[[Note]]`, `[[Target|Alias]]`), YAML Frontmatter (`--- ... ---`), and inline hashtags (`#tag`).

## Pipeline

```text
Vault Markdown Files
        │
        ▼
[ markdownParser.ts ]
  - Parse YAML frontmatter (tags, aliases, status, created)
  - Extract [[wikilinks]] (target, alias, raw)
  - Extract #hashtags
        │
        ▼
[ graphIndexer.ts ]
  - Build GraphNode[] & GraphEdge[]
  - Map Bi-directional Backlinks with context snippets
  - Map Unlinked Mentions across vault notes
  - Compute Tag Registry & Hub Note Degrees
        │
  ┌─────┴─────────────────────────┐
  ▼                               ▼
[ BacklinksPanel.tsx ]    [ GraphCanvas.tsx (2D) ]
- Linked References       - Interactive Force-Directed Canvas
- Unlinked Mentions       - Spring & Repulsion Simulation
- 1-Click Link Action     - Acid Neo-Memphis Node Aesthetic
```

## Knowledge Graph Visualization
* **Canvas Simulation**: HTML5 Canvas with real-time velocity damping, spring attraction between linked notes, and Coulomb charge repulsion between all nodes.
* **Neighborhood Filter**: Supports toggling between the entire vault graph and a focused 1-hop / 2-hop radius around the active note.
* **Keyboard Shortcut**: `Ctrl+G` toggles the Knowledge Graph modal instantly.
