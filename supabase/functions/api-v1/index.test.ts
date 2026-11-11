import { GitHubClient } from "../_shared/github.ts";
import { createHandler } from "./handler.ts";

function equal(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected))
    throw new Error(
      `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
}
function fixture(identityId = "123") {
  const calls: Array<{ table: string; action: string; value?: unknown }> = [];
  let token = "github-token";
  let remoteError = false;
  const vault = {
    id: "vault",
    user_id: "user",
    github_owner: "owner",
    github_repo: "repo",
    branch: "dev",
  };
  const database = (admin: boolean) => ({
    auth: {
      getUser: async () => ({
        data: {
          user: {
            id: "user",
            identities: [
              {
                provider: "github",
                id: "identity-uuid",
                provider_id: identityId,
              },
            ],
          },
        },
      }),
    },
    from(table: string) {
      if (table === "user_github_tokens" && !admin)
        throw new Error("Token accessed with browser client");
      const query = {
        select: () => query,
        eq: (_key: string, value: string) => {
          equal(value, "user");
          return query;
        },
        maybeSingle: async () => ({
          data:
            table === "vaults"
              ? vault
              : token
                ? { encrypted_token: token }
                : null,
        }),
        upsert: async (value: unknown) => {
          calls.push({ table, action: "upsert", value });
          return { error: null };
        },
      };
      return query;
    },
  });
  const github = {
    getUser: async () => ({ id: 123, login: "owner" }),
    getTree: async () => {
      if (remoteError)
        throw Object.assign(new Error("unavailable"), { status: 503 });
      return { tree: [{ path: "notes/a.md", type: "blob", sha: "sha" }] };
    },
    getContents: async (
      _owner: string,
      _repo: string,
      path: string,
      branch: string,
    ) => {
      equal(branch, "dev");
      return { path, name: "a.md", type: "file", content: "aGk=", sha: "sha" };
    },
  };
  const handler = createHandler({
    userClient: () => database(false),
    tokenClient: () => database(true),
    github: () => github,
    allowedOrigins: ["https://example.test"],
  } as unknown as Parameters<typeof createHandler>[0]);
  const request = (
    path: string,
    method = "GET",
    body?: unknown,
    authorization = true,
  ) =>
    handler(
      new Request(`https://example.test/api-v1${path}`, {
        method,
        headers: authorization
          ? { Authorization: "Bearer test", "Content-Type": "application/json" }
          : {},
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    );
  return {
    request,
    calls,
    setToken: (value: string) => (token = value),
    failRemote: () => (remoteError = true),
  };
}
Deno.test("authentication required and preflight allowed", async () => {
  const f = fixture();
  equal((await f.request("/v1/vault", "GET", undefined, false)).status, 401);
  equal(
    (await f.request("/v1/vault", "OPTIONS", undefined, false)).status,
    200,
  );
});
Deno.test("vault and file responses use contract envelopes and configured branch", async () => {
  const f = fixture();
  const response = await f.request("/v1/vault");
  equal((await response.json()).data.branch, "dev");
  equal(
    (await (await f.request("/v1/files/notes/a.md")).json()).data.content,
    "aGk=",
  );
});
Deno.test("token bootstrap is server-only and rejects unrelated GitHub identity", async () => {
  const f = fixture();
  equal(
    (await f.request("/v1/auth/github-token", "POST", { token: "token" }))
      .status,
    200,
  );
  equal(f.calls[0].table, "user_github_tokens");
  const unrelated = fixture("999");
  equal(
    (
      await unrelated.request("/v1/auth/github-token", "POST", {
        token: "other-token",
      })
    ).status,
    403,
  );
  equal(unrelated.calls.length, 0);
});
Deno.test("missing GitHub token is a structured authentication error", async () => {
  const f = fixture();
  f.setToken("");
  const response = await f.request("/v1/files");
  equal(response.status, 401);
  equal((await response.json()).error.code, "TOKEN_REQUIRED");
});
Deno.test("sync validates remote and never reports success on GitHub failure", async () => {
  const f = fixture();
  equal(
    (await (await f.request("/v1/sync", "POST")).json()).data.status,
    "completed",
  );
  f.failRemote();
  equal((await f.request("/v1/sync", "POST")).status, 503);
});
Deno.test("malformed JSON and traversal paths are client errors", async () => {
  const f = fixture();
  equal(
    (
      await f.request("/v1/files", "POST", {
        path: "../escape.md",
        content: "aA==",
      })
    ).status,
    400,
  );
});
Deno.test("GitHub path escaping preserves punctuation and reads pass ref", async () => {
  const calls: string[] = [];
  const github = new GitHubClient("token", async (input) => {
    calls.push(String(input));
    return new Response("{}", { status: 200 });
  });
  await github.getContents("owner", "repo", "notes/C#?.md", "dev");
  equal(
    calls[0],
    "https://api.github.com/repos/owner/repo/contents/notes/C%23%3F.md?ref=dev",
  );
});
Deno.test("malformed JSON is 400 with a contract error", async () => {
  const handler = createHandler({
    userClient: () => ({
      auth: { getUser: async () => ({ data: { user: { id: "user" } } }) },
    }),
    tokenClient: () => {
      throw new Error(
        "Token client must not be reached for malformed bootstrap",
      );
    },
    github: () => {
      throw new Error("GitHub must not be reached");
    },
    allowedOrigins: [],
  } as unknown as Parameters<typeof createHandler>[0]);
  const response = await handler(
    new Request("https://example.test/api-v1/v1/auth/github-token", {
      method: "POST",
      headers: { Authorization: "Bearer fake" },
      body: "{",
    }),
  );
  equal(response.status, 400);
  equal((await response.json()).error.code, "BAD_REQUEST");
});
Deno.test("invalid session cannot instantiate privileged token client", async () => {
  const handler = createHandler({
    userClient: () => ({
      auth: {
        getUser: async () => ({
          data: { user: null },
          error: new Error("invalid"),
        }),
      },
    }),
    tokenClient: () => {
      throw new Error("Privileged client used before auth");
    },
    github: () => {
      throw new Error("GitHub before auth");
    },
    allowedOrigins: [],
  } as unknown as Parameters<typeof createHandler>[0]);
  equal(
    (
      await handler(
        new Request("https://example.test/api-v1/v1/vault", {
          headers: { Authorization: "Bearer invalid" },
        }),
      )
    ).status,
    401,
  );
});
Deno.test("truncated remote tree fails rather than producing partial cache input", async () => {
  const github = new GitHubClient(
    "token",
    async () => new Response(JSON.stringify({ tree: [], truncated: true })),
  );
  let status: number | undefined;
  try {
    await github.getTree("owner", "repo", "feature/notes");
  } catch (error) {
    status = (error as { status: number }).status;
  }
  equal(status, 502);
});
Deno.test("GitHub search reads every result page", async () => {
  let calls = 0;
  const github = new GitHubClient("token", async () => {
    calls++;
    return new Response(
      JSON.stringify({
        total_count: 101,
        items: Array.from({ length: calls === 1 ? 100 : 1 }, (_, i) => ({
          path: `note-${calls}-${i}.md`,
        })),
      }),
    );
  });
  equal((await github.searchCode("owner", "repo", "note")).items.length, 101);
  equal(calls, 2);
});
Deno.test("template initialization does not conceal a failed commit", async () => {
  const github = new GitHubClient(
    "token",
    async (_input, init) =>
      new Response(JSON.stringify({ message: "not found" }), {
        status: init?.method === "PUT" ? 503 : 404,
      }),
  );
  let rejected = false;
  try {
    await github.initTemplateFiles("owner", "repo", "master");
  } catch {
    rejected = true;
  }
  equal(rejected, true);
});
Deno.test("vault creation persists GitHub default branch and rolls back failed initialization", async () => {
  let seededBranch = "";
  let inserted: Record<string, unknown> = {};
  let rollback = false;
  let failSeed = false;
  let denyRollback = false;
  const query = {
    select: () => query,
    eq: () => query,
    maybeSingle: async () => ({ data: null }),
    insert: (value: Record<string, unknown>) => {
      inserted = value;
      return query;
    },
    single: async () => ({ data: { id: "vault", ...inserted } }),
  };
  const handler = createHandler({
    userClient: () => ({
      auth: { getUser: async () => ({ data: { user: { id: "user" } } }) },
      from: () => query,
    }),
    tokenClient: () => ({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { encrypted_token: "token" } }),
          }),
        }),
      }),
    }),
    github: () => ({
      getUser: async () => ({ login: "owner" }),
      createRepository: async () => ({ default_branch: "master" }),
      initTemplateFiles: async (
        _owner: string,
        _repo: string,
        branch: string,
      ) => {
        seededBranch = branch;
        if (failSeed) throw new Error("commit failed");
      },
      deleteRepository: async () => {
        rollback = true;
        if (denyRollback)
          throw Object.assign(new Error("cleanup denied"), { status: 403 });
      },
    }),
    allowedOrigins: [],
  } as unknown as Parameters<typeof createHandler>[0]);
  const create = () =>
    handler(
      new Request("https://example.test/api-v1/v1/vault", {
        method: "POST",
        headers: { Authorization: "Bearer valid" },
        body: JSON.stringify({ repository: "new-vault" }),
      }),
    );
  const response = await create();
  equal(response.status, 201);
  equal(seededBranch, "master");
  equal(inserted.branch, "master");
  failSeed = true;
  equal((await create()).status, 500);
  equal(rollback, true);
  denyRollback = true;
  const incomplete = await create();
  equal(incomplete.status, 502);
  const failure = await incomplete.json();
  equal(failure.error.code, "VAULT_SETUP_INCOMPLETE");
  equal(failure.error.message.includes("owner/new-vault"), true);
});
Deno.test("atomic file move writes one tree and advances ref without force", async () => {
  const calls: Array<{
    url: string;
    method: string;
    body: Record<string, unknown>;
  }> = [];
  const github = new GitHubClient("token", async (input, init) => {
    const url = String(input);
    const method = init?.method || "GET";
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    calls.push({ url, method, body });
    const data = url.endsWith("/git/ref/heads/dev")
      ? { object: { sha: "head" } }
      : url.endsWith("/git/commits/head")
        ? { tree: { sha: "old-tree" } }
        : url.includes("/git/trees/old-tree")
          ? {
              tree: [
                {
                  path: "old.md",
                  type: "blob",
                  mode: "100644",
                  sha: "blob",
                  size: 4,
                },
              ],
            }
          : method === "POST" && url.endsWith("/git/trees")
            ? { sha: "new-tree" }
            : method === "POST" && url.endsWith("/git/commits")
              ? { sha: "new-commit" }
              : {};
    return new Response(JSON.stringify(data));
  });
  const file = await github.moveFile(
    "owner",
    "repo",
    "dev",
    "old.md",
    "notes/new.md",
    "blob",
    "Move note",
  );
  equal(file.path, "notes/new.md");
  equal(file.sha, "blob");
  equal(calls.filter((call) => call.method === "PATCH").length, 1);
  equal(calls.at(-1)?.body, { sha: "new-commit", force: false });
  equal(
    calls.find(
      (call) => call.url.endsWith("/git/trees") && call.method === "POST",
    )?.body.tree,
    [
      { path: "old.md", mode: "100644", type: "blob", sha: null },
      { path: "notes/new.md", mode: "100644", type: "blob", sha: "blob" },
    ],
  );
});
Deno.test("atomic move rejects a stale source before writing Git objects", async () => {
  let writes = 0;
  const github = new GitHubClient("token", async (input, init) => {
    if (init?.method) writes++;
    const url = String(input);
    return new Response(
      JSON.stringify(
        url.includes("/git/ref/")
          ? { object: { sha: "head" } }
          : url.includes("/git/commits/")
            ? { tree: { sha: "tree" } }
            : {
                tree: [
                  {
                    path: "old.md",
                    sha: "remote",
                    type: "blob",
                    mode: "100644",
                  },
                ],
              },
      ),
    );
  });
  let status: number | undefined;
  try {
    await github.moveFile(
      "owner",
      "repo",
      "dev",
      "old.md",
      "new.md",
      "stale",
      "Move",
    );
  } catch (error) {
    status = (error as { status: number }).status;
  }
  equal(status, 409);
  equal(writes, 0);
});
function workflowFixture() {
  let stored: Record<string, unknown> | null = null;
  let privateRepo = true;
  let writable = true;
  let branchCalls = 0;
  const query = {
    select: () => query,
    eq: (_key: string, value: string) => {
      equal(value, "user");
      return query;
    },
    maybeSingle: async () => ({ data: stored }),
    insert: (value: Record<string, unknown>) => {
      stored = { id: "vault", ...value };
      return query;
    },
    update: (value: Record<string, unknown>) => {
      stored = { ...stored, ...value };
      return query;
    },
    single: async () => ({ data: stored }),
  };
  const github = {
    getRepository: async () => ({
      private: privateRepo,
      permissions: { push: writable },
      default_branch: "main",
    }),
    getTree: async (_owner: string, _repo: string, branch: string) => {
      branchCalls++;
      if (branch === "missing")
        throw Object.assign(new Error("not found"), { status: 404 });
      return { tree: [] };
    },
    moveFile: async (
      _owner: string,
      _repo: string,
      branch: string,
      from: string,
      to: string,
      sha: string,
    ) => {
      equal(branch, "feature/notes");
      equal(from, "old.md");
      equal(sha, "blob");
      return { path: to, sha, type: "file" };
    },
  };
  const handler = createHandler({
    userClient: () => ({
      auth: { getUser: async () => ({ data: { user: { id: "user" } } }) },
      from: () => query,
    }),
    tokenClient: () => ({
      from: () => ({
        select: () => ({
          eq: (_key: string, value: string) => {
            equal(value, "user");
            return {
              maybeSingle: async () => ({ data: { encrypted_token: "token" } }),
            };
          },
        }),
      }),
    }),
    github: () => github,
    allowedOrigins: [],
  } as unknown as Parameters<typeof createHandler>[0]);
  return {
    request: (path: string, method: string, body: unknown) =>
      handler(
        new Request(`https://example.test/api-v1${path}`, {
          method,
          headers: { Authorization: "Bearer user" },
          body: JSON.stringify(body),
        }),
      ),
    stored: () => stored,
    denyWrite: () => (writable = false),
    makePublic: () => (privateRepo = false),
    branchCalls: () => branchCalls,
  };
}
Deno.test("connect verifies private write access without creating a repository", async () => {
  const fixture = workflowFixture();
  const response = await fixture.request("/v1/vault", "POST", {
    mode: "connect",
    owner: "owner",
    repository: "existing",
    branch: "feature/notes",
  });
  equal(response.status, 201);
  equal((await response.json()).data.branch, "feature/notes");
  equal(fixture.stored()?.user_id, "user");
  equal(fixture.branchCalls(), 1);
  const denied = workflowFixture();
  denied.denyWrite();
  equal(
    (
      await denied.request("/v1/vault", "POST", {
        mode: "connect",
        owner: "owner",
        repository: "existing",
      })
    ).status,
    403,
  );
  equal(denied.stored(), null);
  const publicRepo = workflowFixture();
  publicRepo.makePublic();
  equal(
    (
      await publicRepo.request("/v1/vault", "POST", {
        mode: "connect",
        owner: "owner",
        repository: "existing",
      })
    ).status,
    403,
  );
});
Deno.test("branch change validates remote before updating owned metadata and move uses selection", async () => {
  const fixture = workflowFixture();
  await fixture.request("/v1/vault", "POST", {
    mode: "connect",
    owner: "owner",
    repository: "existing",
  });
  equal(
    (await fixture.request("/v1/vault", "PATCH", { branch: "missing" })).status,
    404,
  );
  equal(fixture.stored()?.branch, "main");
  equal(
    (await fixture.request("/v1/vault", "PATCH", { branch: "feature/notes" }))
      .status,
    200,
  );
  equal(
    (
      await fixture.request("/v1/files/move", "POST", {
        from: "old.md",
        to: "notes/new.md",
        expectedSha: "blob",
      })
    ).status,
    200,
  );
  equal(
    (await fixture.request("/v1/vault", "PATCH", { branch: "../invalid" }))
      .status,
    400,
  );
});
Deno.test("concurrent ref advance leaves a move unpublished and reports conflict", async () => {
  let publishAttempts = 0;
  const github = new GitHubClient("token", async (input, init) => {
    const url = String(input);
    if (init?.method === "PATCH") {
      publishAttempts++;
      return new Response("{}", { status: 422 });
    }
    return new Response(
      JSON.stringify(
        url.includes("/git/ref/")
          ? { object: { sha: "head" } }
          : url.includes("/git/commits/head")
            ? { tree: { sha: "tree" } }
            : url.includes("/git/trees/tree")
              ? {
                  tree: [
                    {
                      path: "old.md",
                      sha: "blob",
                      type: "blob",
                      mode: "100644",
                    },
                  ],
                }
              : { sha: "new-object" },
      ),
    );
  });
  let status: number | undefined;
  try {
    await github.moveFile(
      "owner",
      "repo",
      "dev",
      "old.md",
      "new.md",
      "blob",
      "Move",
    );
  } catch (error) {
    status = (error as { status: number }).status;
  }
  equal(status, 409);
  equal(publishAttempts, 1);
});
Deno.test("nondefault branch search reads matching branch content rather than GitHub's default index", async () => {
  const calls: string[] = [];
  const github = new GitHubClient("token", async (input) => {
    const url = String(input);
    calls.push(url);
    return new Response(
      JSON.stringify(
        url.includes("/git/trees/")
          ? { tree: [{ path: "notes/a.md", type: "blob", size: 20 }] }
          : { content: btoa("contains needle"), encoding: "base64" },
      ),
    );
  });
  equal(
    (
      await github.searchBranch("owner", "repo", "feature/notes", "needle")
    ).items.map((item) => item.path),
    ["notes/a.md"],
  );
  equal(calls[1].endsWith("?ref=feature%2Fnotes"), true);
});
Deno.test("token bootstrap ignores caller supplied user id and uses verified account", async () => {
  const f = fixture();
  equal(
    (
      await f.request("/v1/auth/github-token", "POST", {
        token: "token",
        user_id: "victim",
      })
    ).status,
    200,
  );
  equal((f.calls[0].value as { user_id: string }).user_id, "user");
});
function errorFixture(
  status: number,
  sensitiveMessage = "remote request rejected",
) {
  const handler = createHandler({
    userClient: () => ({
      auth: { getUser: async () => ({ data: { user: { id: "user" } } }) },
      from: () => ({
        select: () => ({
          eq: (_key: string, value: string) => {
            equal(value, "user");
            return {
              maybeSingle: async () => ({
                data: {
                  github_owner: "owner",
                  github_repo: "repo",
                  branch: "dev",
                },
              }),
            };
          },
        }),
      }),
    }),
    tokenClient: () => ({
      from: () => ({
        select: () => ({
          eq: (_key: string, value: string) => {
            equal(value, "user");
            return {
              maybeSingle: async () => ({ data: { encrypted_token: "token" } }),
            };
          },
        }),
      }),
    }),
    github: () => ({
      deleteFile: async () => {
        throw Object.assign(new Error(sensitiveMessage), { status });
      },
    }),
    allowedOrigins: [],
  } as unknown as Parameters<typeof createHandler>[0]);
  return (path = "/v1/files/a.md", body: unknown = { expectedSha: "sha" }) =>
    handler(
      new Request(`https://example.test/api-v1${path}`, {
        method: "DELETE",
        headers: { Authorization: "Bearer verified" },
        body: JSON.stringify(body),
      }),
    );
}
Deno.test("delete preserves upstream authentication authorization absence conflict and rate-limit status", async () => {
  for (const [status, code] of [
    [401, "TOKEN_REQUIRED"],
    [403, "FORBIDDEN"],
    [404, "NOT_FOUND"],
    [409, "CONFLICT"],
    [422, "BAD_REQUEST"],
    [429, "RATE_LIMITED"],
    [503, "INTERNAL_ERROR"],
  ] as const) {
    const response = await errorFixture(status)();
    equal(response.status, status);
    equal((await response.json()).error.code, code);
  }
});
Deno.test("invalid encoded paths and invalid delete SHA never reach GitHub", async () => {
  const request = errorFixture(503);
  equal((await request("/v1/files/%E0%A4%A")).status, 400);
  equal((await request("/v1/files/notes%2F..%2Fescape.md")).status, 400);
  equal(
    (await request("/v1/files/a.md", { expectedSha: { bad: true } })).status,
    400,
  );
});
Deno.test("missing runtime service credentials are a sanitized error, not a browser fallback", async () => {
  const handler = createHandler({
    userClient: () => ({
      auth: { getUser: async () => ({ data: { user: { id: "user" } } }) },
    }),
    tokenClient: () => {
      throw new Error("secret-missing-service-key-internal-detail");
    },
    github: () => {
      throw new Error("Must not fall back to browser token");
    },
    allowedOrigins: [],
  } as unknown as Parameters<typeof createHandler>[0]);
  const response = await handler(
    new Request("https://example.test/api-v1/v1/vault", {
      headers: {
        Authorization: "Bearer verified",
        "x-github-token": "attacker-token",
      },
    }),
  );
  equal(response.status, 500);
  equal((await response.text()).includes("secret-missing"), false);
});
Deno.test("connect propagates inaccessible repository and branch errors without recording metadata", async () => {
  const f = workflowFixture();
  equal(
    (
      await f.request("/v1/vault", "POST", {
        mode: "connect",
        owner: "owner",
        repository: "repo",
        branch: "missing",
      })
    ).status,
    404,
  );
  equal(f.stored(), null);
});
Deno.test("database failures never masquerade as a missing vault", async () => {
  const handler = createHandler({
    userClient: () => ({
      auth: { getUser: async () => ({ data: { user: { id: "user" } } }) },
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: null,
              error: new Error("database unavailable"),
            }),
          }),
        }),
      }),
    }),
    tokenClient: () => ({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { encrypted_token: "token" } }),
          }),
        }),
      }),
    }),
    github: () => ({}),
    allowedOrigins: [],
  } as unknown as Parameters<typeof createHandler>[0]);
  for (const path of [
    "/v1/vault",
    "/v1/files",
    "/v1/search?q=note",
    "/v1/sync/status",
  ]) {
    equal(
      (
        await handler(
          new Request(`https://example.test/api-v1${path}`, {
            headers: { Authorization: "Bearer valid" },
          }),
        )
      ).status,
      500,
    );
  }
});
Deno.test("cross-device branch guard rejects reads writes search and sync before GitHub access", async () => {
  const f = fixture();
  for (const [path, method, body] of [
    ["/v1/files?expectedBranch=main", "GET", undefined],
    ["/v1/files/a.md?expectedBranch=main", "GET", undefined],
    ["/v1/search?q=note&expectedBranch=main", "GET", undefined],
    ["/v1/sync/status?expectedBranch=main", "GET", undefined],
    [
      "/v1/files",
      "POST",
      { path: "a.md", content: "aA==", expectedBranch: "main" },
    ],
    [
      "/v1/files/a.md",
      "PUT",
      { content: "aA==", expectedSha: "sha", expectedBranch: "main" },
    ],
    [
      "/v1/files/a.md",
      "DELETE",
      { expectedSha: "sha", expectedBranch: "main" },
    ],
    [
      "/v1/files/move",
      "POST",
      { from: "a.md", to: "b.md", expectedSha: "sha", expectedBranch: "main" },
    ],
    ["/v1/sync", "POST", { expectedBranch: "main" }],
  ] as const) {
    const response = await f.request(path, method, body);
    equal(response.status, 409);
    equal((await response.json()).error.code, "BRANCH_CHANGED");
  }
});
