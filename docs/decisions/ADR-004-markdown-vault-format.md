# ADR-004: Markdown Vault Format

**Status:** Accepted

## Context

The application is a personal knowledge-management system.

Users should retain direct access to their notes independently of the application.

A proprietary storage format would make the user's data dependent on the application.

## Decision

Markdown is the canonical format for notes.

Vault contents will remain ordinary files within the user's GitHub repository.

A vault may use a structure similar to:

```text
my-vault/
├── notes/
├── assets/
├── templates/
├── .vault/
└── README.md
```

Notes may use YAML frontmatter for metadata.

For example:

```text
---
title: Swift Concurrency
tags:
  - swift
  - concurrency
created: 2026-08-18
updated: 2026-08-18
---
```

The application must not require a proprietary format for normal note storage.

## Consequences

### Positive

* Notes remain human-readable.
* Users can edit notes directly through GitHub or other Markdown tools.
* Git provides natural version history.
* Data remains portable.
* Future tools can consume the same files.
* AI features can operate on an open format.

### Negative

* Markdown does not enforce a rigid schema.
* Metadata conventions must be documented.
* Some advanced application features may require derived indexes.

## Constraints

Derived indexes, caches, embeddings, graphs, or other generated representations must remain secondary to the Markdown files.

The application must remain useful without those derived systems.

## Alternatives Considered

### Proprietary database format

Rejected because it reduces portability and user ownership.

### Supabase-managed note records

Rejected because canonical note contents belong in the user's GitHub repository.

## Related Decisions

* ADR-001: GitHub Is the Source of Truth
* ADR-002: Supabase Responsibilities
