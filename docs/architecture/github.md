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

## Existing vaults, branches, and moves

`POST /v1/vault` defaults to creating and seeding a new private repository. With
`mode: connect`, `owner`, `repository`, and optional `branch`, it connects an
existing private repository only after GitHub confirms write access and the
selected branch can be read. Connecting never seeds or overwrites existing files.
`PATCH /v1/vault` selects an existing branch after the same remote branch check.
The browser must finish or discard pending edits before changing branch, then
clear its derived file cache before loading the new branch.

`POST /v1/files/move` accepts `from`, `to`, `expectedSha`, and optional
`commitMessage`. It checks the source blob SHA and destination in a single
snapshot, creates one replacement tree and one commit, then advances the branch
without force. A concurrent branch advance or protected-branch rejection returns
409. Failed publication may leave unreachable Git objects, but never a visible
half-finished move. Directory moves are not supported by this endpoint.

GitHub's code index searches only the repository default branch. For another
selected branch the API scans that branch's Markdown content, four requests at a
time, with a maximum of 100 candidate notes of at most 1 MB each. Larger scans
return 422 and ask for a narrower path filter, rather than searching the wrong
branch or returning partial results. The default branch uses paginated GitHub
code search; nondefault branch scans use literal case-insensitive text matching.

OAuth's normal `repo` scope does not grant repository deletion. If vault setup
fails after creation and automatic cleanup is denied, the API returns
`502 VAULT_SETUP_INCOMPLETE` with the created repository name and recovery steps.
The user can connect that existing repository or remove it in GitHub before
retrying creation. Setup does not request broader `delete_repo` permission.
