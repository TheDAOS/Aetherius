# Supabase Architecture

## Purpose

Supabase provides the application's backend infrastructure without becoming the canonical storage system for vault contents.

---

## Responsibilities

Supabase is responsible for:

* Authentication.
* Application sessions.
* Application metadata.
* Postgres.
* Edge Functions.
* Backend API endpoints.

---

## API Layer

Supabase Edge Functions provide the backend API boundary.

```text
PWA / Swift
     │
     ▼
Supabase Edge Functions
     │
     ▼
GitHub API
```

The API is versioned and documented using:

```text
openapi/openapi.yaml
```

---

## Database

Supabase Postgres stores application metadata.

Example:

```text
vaults
------
id
user_id
github_owner
github_repo
branch
created_at
```

The database does not become the canonical storage location for Markdown notes.

---

## Canonical vs Derived Data

The distinction is important.

### Canonical

```text
User's GitHub Repository
        │
        └── Markdown / vault files
```

### Application metadata

```text
Supabase
   │
   └── Vault/user/application metadata
```

### Derived data

Future systems may contain:

* Search indexes.
* Graph data.
* Embeddings.
* Cached content.
* AI-generated relationships.

Derived data can be recreated from canonical data and must not silently replace it.

---

## Database Migrations

Database schema changes must be represented through migrations.

Production schema changes must not be performed manually without a corresponding migration.

---

## Security Boundary

Supabase Edge Functions are responsible for enforcing:

* Authentication.
* Authorization.
* Input validation.
* Secure GitHub access.
* Appropriate error handling.

Privileged backend credentials must remain server-side.

---

## Cost and Infrastructure

The initial architecture targets zero-cost development using Supabase's available free tier.

The system should remain portable enough that paid infrastructure can be introduced later without requiring a fundamental architectural rewrite.
