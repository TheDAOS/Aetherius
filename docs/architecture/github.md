# GitHub Architecture

## Purpose

GitHub is the persistence and version-control layer for the user's vault.

---

## Source of Truth

The user's private GitHub repository is the canonical source of truth.

Example:

```text
User's Private Repository
│
├── notes/
├── assets/
├── templates/
├── .vault/
└── README.md
```

Markdown files stored in this repository represent the user's actual notes.

---

## Vault Repository

A user can create a private vault repository from the project's vault template.

Conceptually:

```text
Vault Template
      │
      │ create from template
      ▼
User's Private Repository
```

After creation, the user's repository becomes independent of the template.

---

## Git History

Changes to vault files are committed to the user's repository.

This provides:

* Version history.
* Change tracking.
* Recovery through Git history.
* Portability.
* Direct access through GitHub.

---

## API Access

GitHub operations are performed by the backend.

```text
PWA / Swift
      │
      ▼
Supabase Edge Function
      │
      ▼
GitHub API
      │
      ▼
User Repository
```

Clients must not perform privileged GitHub operations directly.

---

## File Operations

The backend will eventually provide operations for:

* Listing vault files.
* Reading files.
* Creating files.
* Updating files.
* Deleting files.
* Committing changes.

The exact API behavior is defined by the OpenAPI contract.

---

## Repository Ownership

The backend must verify authorization before performing repository operations.

A repository must never be treated as accessible merely because its owner and name are known.

---

## GitHub Actions

GitHub Actions may later process repository changes.

Potential workflows include:

```text
User commits Markdown
        ↓
GitHub Actions
        ↓
Validate vault
        ↓
Process metadata
        ↓
Generate derived index
```

Generated indexes or metadata remain derived data.

They do not replace the Markdown files as the source of truth.
