# Graph Report - Aetherius  (2026-08-20)

## Corpus Check
- Corpus is ~7,341 words - fits in a single context window. You may not need a graph.

## Summary
- 79 nodes · 85 edges · 13 communities (8 shown, 5 thin omitted)
- Extraction: 74% EXTRACTED · 26% INFERRED · 0% AMBIGUOUS · INFERRED: 22 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- OpenAPI Contract & CI Pipeline
- Core Architectural Governance & ADRs
- Root Package Manifest Config
- System Architecture & Data Flows
- Security, Authentication & Trust Boundaries
- Supabase Responsibilities & Metadata Store
- Graphify Integration & Agent Workflows
- Workspace Engine & Tooling Settings
- Database Migration Policy
- Project Authority Hierarchy
- MVP Simplicity Guardrails
- Aetherius Identity Specification
- Project Overview & Readme

## God Nodes (most connected - your core abstractions)
1. `Git-Backed Personal Vault API (OpenAPI 3.1.0)` - 19 edges
2. `ADR-001: GitHub Is the Source of Truth` - 6 edges
3. `High-Level Architecture Overview` - 5 edges
4. `Supabase Backend Infrastructure` - 5 edges
5. `ADR-002: Supabase Responsibilities` - 5 edges
6. `ADR-003: API Boundary` - 5 edges
7. `ADR-005: PWA and Swift Share the Same API` - 5 edges
8. `packageManager` - 4 edges
9. `GitHub Canonical Vault Repository` - 4 edges
10. `Graphify Agent Rules` - 4 edges

## Surprising Connections (you probably didn't know these)
- `GitHub Is the Source of Truth (Rule)` --semantically_similar_to--> `GitHub as Source of Truth (Architecture Doc)`  [INFERRED] [semantically similar]
  AGENTS.md → docs/architecture/github.md
- `Graphify Rules (CLAUDE.md)` --semantically_similar_to--> `Graphify Agent Rules`  [INFERRED] [semantically similar]
  CLAUDE.md → .agents/rules/graphify.md
- `Graphify Rules (GEMINI.md)` --semantically_similar_to--> `Graphify Agent Rules`  [INFERRED] [semantically similar]
  GEMINI.md → .agents/rules/graphify.md
- `Graphify Rules (GEMINI.md)` --semantically_similar_to--> `Graphify Rules (CLAUDE.md)`  [INFERRED] [semantically similar]
  GEMINI.md → CLAUDE.md
- `ADR Rules` --references--> `ADR-001: GitHub Is the Source of Truth`  [INFERRED]
  AGENTS.md → docs/decisions/ADR-001-github-is-source-of-truth.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Core API Contract Participants (OpenAPI, ADR-003, ADR-005, PWA, Swift)** — openapi_openapi_yaml_vault_api, docs_decisions_adr_003_api_boundary, docs_decisions_adr_005_pwa_swift_shared_api, docs_architecture_overview_pwa_client, docs_architecture_overview_swift_ios_client [EXTRACTED 1.00]
- **GitHub Source of Truth Cluster (ADR-001, AGENTS Rule, Arch Doc, Data Flow)** — docs_decisions_adr_001_github_source_of_truth, agents_github_source_of_truth, docs_architecture_github_source_of_truth, docs_architecture_data_flow_write_flow, docs_architecture_overview_github_vault [INFERRED 0.95]
- **Supabase Responsibility Cluster (ADR-002, Arch Doc, Edge Functions, Auth, Postgres)** — docs_decisions_adr_002_supabase_responsibilities, docs_architecture_supabase_responsibilities, docs_architecture_supabase_edge_functions, docs_architecture_authentication_supabase_auth, docs_architecture_supabase_postgres_metadata [INFERRED 0.95]

## Communities (13 total, 5 thin omitted)

### Community 0 - "OpenAPI Contract & CI Pipeline"
Cohesion: 0.13
Nodes (15): CI Pipeline (GitHub Actions), OpenAPI Validation Step (redocly lint), OpenAPI Must Stay in Sync (Rule), POST /v1/files — createFile, DELETE /v1/files/{path} — deleteFile, File Schema (path, type, name, content, sha, size, lastModified), GET /v1/files/{path} — getFile, GET /v1/sync/status — getSyncStatus (+7 more)

### Community 1 - "Core Architectural Governance & ADRs"
Cohesion: 0.19
Nodes (14): ADR Rules, Clients Must Not Perform Privileged GitHub Operations (Rule), GitHub Is the Source of Truth (Rule), Markdown Is the Canonical Note Format (Rule), PWA and Swift Must Use the Same API (Rule), Supabase Is Not Canonical Note Storage (Rule), Git History (Version control, recovery, portability), GitHub as Source of Truth (Architecture Doc) (+6 more)

### Community 2 - "Root Package Manifest Config"
Cohesion: 0.17
Nodes (11): author, description, keywords, license, main, name, private, scripts (+3 more)

### Community 3 - "System Architecture & Data Flows"
Cohesion: 0.27
Nodes (10): Core Architecture (PWA → Supabase → Edge Functions → GitHub → Repository), Read Flow (Client → Supabase → Edge Fn → GitHub → Repo), Write Flow (User → PWA → Supabase → Edge Fn → GitHub → Git Commit), API Boundary (/v1/ namespace, OpenAPI contract), GitHub Canonical Vault Repository, High-Level Architecture Overview, PWA Client (React/TypeScript/Vite), Supabase Backend Infrastructure (+2 more)

### Community 4 - "Security, Authentication & Trust Boundaries"
Cohesion: 0.33
Nodes (7): Security Rules (AGENTS.md), Authentication Model (GitHub OAuth via Supabase), GitHub Authorization (Backend-enforced repo access), Supabase Auth Layer, Secret Management (No committed secrets, separate dev/prod creds), Trust Boundaries (User → Client → Supabase → Edge Fn → GitHub → Repo), Bearer Auth Security Scheme (JWT)

### Community 5 - "Supabase Responsibilities & Metadata Store"
Cohesion: 0.33
Nodes (6): Future Derived Data (Search Indexes, Graphs, Embeddings, AI), Canonical vs Derived Data Distinction, Supabase Edge Functions (API boundary between clients and GitHub), Supabase Postgres Metadata (vaults table: id, user_id, github_owner, github_repo, branch), Supabase Responsibilities (Auth, Metadata, Postgres, Edge Functions), Vault Schema (id, owner, repository, branch)

### Community 6 - "Graphify Integration & Agent Workflows"
Cohesion: 0.50
Nodes (5): Graphify Agent Rules, Graphify Workflow, AI Development Workflow, Graphify Rules (CLAUDE.md), Graphify Rules (GEMINI.md)

### Community 7 - "Workspace Engine & Tooling Settings"
Cohesion: 0.40
Nodes (5): devEngines, packageManager, name, onFail, version

## Knowledge Gaps
- **36 isolated node(s):** `name`, `private`, `version`, `description`, `main` (+31 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Git-Backed Personal Vault API (OpenAPI 3.1.0)` connect `OpenAPI Contract & CI Pipeline` to `Core Architectural Governance & ADRs`, `System Architecture & Data Flows`, `Security, Authentication & Trust Boundaries`, `Supabase Responsibilities & Metadata Store`?**
  _High betweenness centrality (0.322) - this node is a cross-community bridge._
- **Why does `Supabase Edge Functions (API boundary between clients and GitHub)` connect `Supabase Responsibilities & Metadata Store` to `OpenAPI Contract & CI Pipeline`, `System Architecture & Data Flows`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `Supabase Backend Infrastructure` (e.g. with `Core Architecture (PWA → Supabase → Edge Functions → GitHub → Repository)` and `Supabase Auth Layer`) actually correct?**
  _`Supabase Backend Infrastructure` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _36 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `OpenAPI Contract & CI Pipeline` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._