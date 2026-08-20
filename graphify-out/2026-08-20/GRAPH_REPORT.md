# Graph Report - Aetherius  (2026-08-20)

## Corpus Check
- 30 files · ~13,094 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 275 nodes · 247 edges · 30 communities (24 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e24d7f89`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Git-Backed Personal Vault API (OpenAPI 3.1.0)
- GitHub Architecture
- package.json
- Architecture Overview
- Security Architecture
- Supabase Architecture
- ADR-002: Supabase Responsibilities
- ADR-003: API Boundary
- ADR-004: Markdown Vault Format
- AGENTS.md
- ADR-005: PWA and Swift Share the Same API
- Non-Negotiable Rules
- ADR-001: GitHub Is the Source of Truth
- Project Philosophy
- Authentication Architecture
- Data Flow
- Project: {{name}}
- Personal Knowledge Vault
- Daily Note - {{date}}
- README.md
- Welcome to Your Vault
- rules/graphify.md
- workflows/graphify.md
- CLAUDE.md
- GEMINI.md
- pnpm Workspace Configuration (apps/*)
- Phase 1 Implementation Plan — Frontend / PWA Foundation
- Frontend & PWA Architecture
- ADR-006: Frontend PWA Design System and Architecture

## God Nodes (most connected - your core abstractions)
1. `Git-Backed Personal Vault API (OpenAPI 3.1.0)` - 14 edges
2. `Security Architecture` - 13 edges
3. `Non-Negotiable Rules` - 11 edges
4. `Project Philosophy` - 10 edges
5. `Architecture Overview` - 10 edges
6. `GitHub Architecture` - 9 edges
7. `Supabase Architecture` - 9 edges
8. `Authentication Architecture` - 8 edges
9. `Data Flow` - 8 edges
10. `Phase 1 Implementation Plan — Frontend / PWA Foundation` - 7 edges

## Surprising Connections (you probably didn't know these)
- `OpenAPI Validation Step (redocly lint)` --references--> `Git-Backed Personal Vault API (OpenAPI 3.1.0)`  [EXTRACTED]
  .github/workflows/ci.yml → openapi/openapi.yaml

## Import Cycles
- None detected.

## Communities (30 total, 6 thin omitted)

### Community 0 - "Git-Backed Personal Vault API (OpenAPI 3.1.0)"
Cohesion: 0.12
Nodes (16): CI Pipeline (GitHub Actions), OpenAPI Validation Step (redocly lint), Bearer Auth Security Scheme (JWT), POST /v1/files — createFile, DELETE /v1/files/{path} — deleteFile, File Schema (path, type, name, content, sha, size, lastModified), GET /v1/files/{path} — getFile, GET /v1/sync/status — getSyncStatus (+8 more)

### Community 1 - "GitHub Architecture"
Cohesion: 0.20
Nodes (9): API Access, File Operations, Git History, GitHub Actions, GitHub Architecture, Purpose, Repository Ownership, Source of Truth (+1 more)

### Community 2 - "package.json"
Cohesion: 0.12
Nodes (16): author, description, devEngines, packageManager, keywords, license, main, name (+8 more)

### Community 3 - "Architecture Overview"
Cohesion: 0.15
Nodes (12): API Boundary, Architectural Principles, Architecture Overview, Backend, Clients, Development Architecture, GitHub, High-Level Architecture (+4 more)

### Community 4 - "Security Architecture"
Cohesion: 0.14
Nodes (13): API Security, Authentication, Authorization, CI Security, Client Security, GitHub Security, Logging, Purpose (+5 more)

### Community 5 - "Supabase Architecture"
Cohesion: 0.15
Nodes (12): API Layer, Application metadata, Canonical, Canonical vs Derived Data, Cost and Infrastructure, Database, Database Migrations, Derived data (+4 more)

### Community 6 - "ADR-002: Supabase Responsibilities"
Cohesion: 0.17
Nodes (11): ADR-002: Supabase Responsibilities, Alternatives Considered, Consequences, Constraints, Context, Decision, Negative, Positive (+3 more)

### Community 7 - "ADR-003: API Boundary"
Cohesion: 0.17
Nodes (11): ADR-003: API Boundary, Alternatives Considered, Consequences, Context, Decision, Direct PWA → GitHub API, Negative, Positive (+3 more)

### Community 8 - "ADR-004: Markdown Vault Format"
Cohesion: 0.17
Nodes (11): ADR-004: Markdown Vault Format, Alternatives Considered, Consequences, Constraints, Context, Decision, Negative, Positive (+3 more)

### Community 9 - "AGENTS.md"
Cohesion: 0.08
Nodes (23): ADR Rules, ADRs, AI Context, AI Development Workflow, API Rules, Architecture Documentation, CI Requirements, Core Architecture (+15 more)

### Community 10 - "ADR-005: PWA and Swift Share the Same API"
Cohesion: 0.17
Nodes (11): ADR-005: PWA and Swift Share the Same API, Alternatives Considered, Consequences, Constraints, Context, Decision, Negative, Positive (+3 more)

### Community 11 - "Non-Negotiable Rules"
Cohesion: 0.18
Nodes (11): 10. Keep the MVP Simple, 1. GitHub Is the Source of Truth, 2. Markdown Is the Canonical Note Format, 3. Supabase Is Not Canonical Note Storage, 4. Clients Must Not Perform Privileged GitHub Operations, 5. PWA and Swift Must Use the Same API, 6. OpenAPI Must Stay in Sync, 7. Database Changes Require Migrations (+3 more)

### Community 12 - "ADR-001: GitHub Is the Source of Truth"
Cohesion: 0.18
Nodes (10): ADR-001: GitHub Is the Source of Truth, Alternatives Considered, Application-owned storage, Consequences, Context, Decision, Negative, Positive (+2 more)

### Community 13 - "Project Philosophy"
Cohesion: 0.20
Nodes (10): AI-assisted development, AI is not the authority, API-first, Automated enforcement, Documented architecture, Open formats, Project Philosophy, Start simple (+2 more)

### Community 14 - "Authentication Architecture"
Cohesion: 0.22
Nodes (8): Authentication Architecture, Authentication Provider, Authorization, Client Authentication, Credential Rules, Future Native Client, GitHub Authorization, Purpose

### Community 15 - "Data Flow"
Cohesion: 0.22
Nodes (8): Data Flow, File Operations, Future Derived Data, Purpose, Read Flow, Search, Synchronization, Write Flow

### Community 16 - "Project: {{name}}"
Cohesion: 0.33
Nodes (5): Architecture & Design, Goals & Non-Goals, Next Steps, Overview, Project: {{name}}

### Community 17 - "Personal Knowledge Vault"
Cohesion: 0.40
Nodes (4): Note Format, Personal Knowledge Vault, Portability & Ownership, Structure

### Community 18 - "Daily Note - {{date}}"
Cohesion: 0.40
Nodes (4): Daily Note - {{date}}, Notes & Thoughts, Objectives, Tasks & Follow-ups

### Community 19 - "README.md"
Cohesion: 0.50
Nodes (3): Aetherius, Architecture, Git-Backed Personal Vault

### Community 27 - "Phase 1 Implementation Plan — Frontend / PWA Foundation"
Cohesion: 0.13
Nodes (14): 1. Overview & Objectives, 2.1 Color Palette & Tokens, 2.2 Tactile Mechanical Physics & Shadows, 2.3 Typography Hierarchy, 2. Design System: "Warm Cream & Acid Neo-Memphis", 3.1 Key Views & Routes, 3.2 Responsive Adaptations & Platform UX, 3. Application Layout & Views (+6 more)

### Community 28 - "Frontend & PWA Architecture"
Cohesion: 0.17
Nodes (11): 1. Technical Stack, 2. Design System: "Warm Cream & Acid Neo-Memphis", 3.1 Desktop UX & Power-User Features, 3.2 Mobile PWA UX & Touch Specifics, 3. Application Shell & Layout, 4. Routes & Navigation Structure, 5. Mock API & OpenAPI Conformance, Color Palette & Tokens (+3 more)

### Community 29 - "ADR-006: Frontend PWA Design System and Architecture"
Cohesion: 0.25
Nodes (7): ADR-006: Frontend PWA Design System and Architecture, Consequences, Context, Decision, Negative, Positive, Related Decisions

## Knowledge Gaps
- **201 isolated node(s):** `name`, `private`, `version`, `description`, `main` (+196 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Non-Negotiable Rules` connect `Non-Negotiable Rules` to `AGENTS.md`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Why does `Project Philosophy` connect `Project Philosophy` to `AGENTS.md`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _201 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Git-Backed Personal Vault API (OpenAPI 3.1.0)` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Should `Security Architecture` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Should `AGENTS.md` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._