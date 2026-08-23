# ADR-009: Server-Side GitHub Token Storage

## Status

Accepted

## Context

The application authenticates users via GitHub OAuth through Supabase Auth. The OAuth flow produces a GitHub `provider_token` that grants access to the user's repositories.

The initial implementation exposed this token to the PWA client, which passed it to Edge Functions via the `x-github-token` HTTP header. This violated AGENTS.md Rule #4: "Never expose GitHub credentials, access tokens... to the client."

A security audit confirmed that:
- An XSS vulnerability existed in the markdown preview component (`javascript:` URLs)
- Combined with the client-side token, an attacker could exfiltrate the user's GitHub token
- The token has `repo` scope, granting access to ALL of the user's private repositories

## Decision

Store the GitHub provider token server-side in a `user_github_tokens` table. The Edge Function reads the token from the database instead of receiving it from the client.

The flow becomes:

```text
Client
  │
  │ JWT only (no GitHub token)
  ▼
Edge Function
  │
  │ reads GitHub token from user_github_tokens table
  ▼
GitHub API
```

The client stores the token server-side once after the OAuth callback, then removes it from client-side state.

## Consequences

### Positive
- GitHub token is no longer accessible to client-side JavaScript
- XSS vulnerabilities cannot exfiltrate the GitHub token
- Aligns with AGENTS.md Rule #4 and the documented security architecture
- Edge Functions become the sole consumer of GitHub credentials
- Future Swift client follows the same pattern (AGENTS.md Rule #5)

### Negative
- Adds a database lookup per Edge Function request (mitigated by Supabase connection pooling)
- Token refresh requires the user to re-authenticate if the stored token expires
- Initial setup requires one client-to-server token transfer during the OAuth callback

### Neutral
- The `user_github_tokens` table is protected by RLS policies identical to the `vaults` table
- IndexedDB is now namespaced per user to prevent cross-account data leaks

## Related Decisions

- ADR-001: GitHub Is the Source of Truth
- ADR-003: API Boundary
