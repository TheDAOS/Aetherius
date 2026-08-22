# Architecture Overview

## Purpose

This document describes the high-level architecture of the Git-backed personal vault application.

The application provides clients for managing a user's personal Markdown vault while keeping the user's private GitHub repository as the canonical source of truth.

---

## High-Level Architecture

```text
                         USER
                          │
             ┌────────────┴────────────┐
             │                         │
             ▼                         ▼
          PWA/Web                 Swift/iOS
             │                         │
             └────────────┬────────────┘
                          │
                          ▼
                 Supabase API Layer
                          │
                 ┌────────┴────────┐
                 │                 │
              Auth            Edge Functions
                                   │
                                   ▼
                              GitHub API
                                   │
                                   ▼
                       User's Private Repository
                                   │
                     ┌─────────────┼─────────────┐
                     │             │             │
                  Markdown       Assets      Git History
```

---

## Source of Truth

The user's private GitHub repository is the canonical source of truth.

The repository contains ordinary files such as:

```text
my-vault/
├── notes/
├── assets/
├── templates/
├── .vault/
└── README.md
```

The application is an interface and API layer around this repository.

Supabase does not become the canonical owner of the user's notes.

---

## Clients

### Progressive Web App

The PWA is the initial application client.

The planned frontend stack is:

* React
* TypeScript
* Vite
* React Router
* PWA support

The PWA communicates with the backend API rather than directly performing privileged GitHub operations.

---

### Swift/iOS

A native iOS application will be developed later using:

* Swift
* SwiftUI
* SwiftData where appropriate
* Native iOS APIs

The Swift application will use the same backend API as the PWA.

It will not have a separate backend.

---

## Backend

Supabase provides the backend infrastructure.

Its responsibilities include:

* Authentication.
* Application metadata.
* Postgres.
* Edge Functions.
* API implementation.

Edge Functions provide the boundary between clients and GitHub.

---

## GitHub

GitHub provides the canonical vault repository.

It provides:

* Private repository storage.
* Markdown file storage.
* Git history.
* Version history.
* Repository ownership.
* GitHub API access.
* GitHub Actions.

Privileged repository operations are performed by the backend.

---

## API Boundary

The common client/backend API is versioned under `/v1/`.

The API contract is defined in:

```text
openapi/openapi.yaml
```

Both the PWA and future Swift application consume this contract.

---

## Development Architecture

The development environment surrounds the application architecture:

```text
                       Coding Agent
                            │
              ┌─────────────┼─────────────┐
              │             │             │
          Graphify         MCP         AGENTS.md
              │             │             │
              └─────────────┼─────────────┘
                            │
                   Docs + ADRs + OpenAPI
                            │
                            ▼
                          Code
                            │
                            ▼
                           PR
                            │
                    GitHub Actions
                            │
                ┌───────────┼───────────┐
                ▼           ▼           ▼
              Tests       Lint        Build
                │           │           │
                └───────────┼───────────┘
                            ▼
                       Protected main
```

AI tooling helps agents understand and modify the system.

It does not replace Git, documentation, contracts, tests, or human architectural decisions.

---

## Offline Caching & Sync Layer

The application operates offline-first using client-side IndexedDB:
- Derived cache of vault files for instant loading without network round-trips.
- Sequential mutation queue that replays edits against GitHub upon network reconnection.
- Visual side-by-side 3-way conflict resolution on SHA mismatch (`409 Conflict`).

---

## Derived Markdown Intelligence & Knowledge Graph

All relational note intelligence is computed on-the-fly from plain Markdown files:
- `[[Wikilinks]]` and YAML frontmatter parsing.
- Bi-directional linked references and unlinked mention discovery.
- Interactive 2D force-directed knowledge graph canvas without server-side graph databases.

---

## Architectural Principles

The architecture follows these principles:

1. User-owned data.
2. GitHub as the source of truth.
3. Markdown as the canonical note format.
4. API-first client/backend communication.
5. No privileged GitHub credentials in clients.
6. Shared API between PWA and Swift.
7. Documentation and ADRs as persistent project context.
8. Automated verification through CI.
9. Avoid premature abstraction.
10. Start with a simple Git-backed vault before introducing advanced AI and synchronization systems.
