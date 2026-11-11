import { createServer, type Server } from "node:http";
import { expect, test } from "@playwright/test";
import { createHandler } from "../../supabase/functions/api-v1/handler";

// Exercise the real browser, Supabase SDK, VaultService, IndexedDB and actual
// Edge handler together. Only external Supabase/GitHub persistence is synthetic.
let server: Server;
let counter = 0;
let bootstrapTokens: string[] = [];
let files: Map<string, { content: string; sha: string; bytes?: Buffer }>;
const vault = {
  id: "vault-id",
  user_id: "user-id",
  github_owner: "owner",
  github_repo: "vault",
  branch: "main",
};
const fail = (status: number) => {
  throw Object.assign(new Error(`Remote error ${status}`), { status });
};
const github = {
  getUser: async () => ({ id: 1, login: "owner" }),
  getRepository: async () => ({
    private: true,
    default_branch: "main",
    permissions: { push: true },
  }),
  getTree: async () => ({
    tree: [...files].map(([path, f]) => ({ path, type: "blob", sha: f.sha })),
  }),
  getContents: async (_owner: string, _repo: string, path: string) => {
    const f = files.get(path);
    if (!f) return fail(404);
    return {
      path,
      name: path.split("/").pop(),
      type: "file",
      sha: f.sha,
      content: (f.bytes ?? Buffer.from(f.content)).toString("base64"),
    };
  },
  createOrUpdateFile: async (
    _owner: string,
    _repo: string,
    path: string,
    _message: string,
    content: string,
    sha?: string,
  ) => {
    const existing = files.get(path);
    if ((existing && existing.sha !== sha) || (!existing && sha))
      return fail(409);
    const updated = {
      bytes: Buffer.from(content, "base64"),
      content: Buffer.from(content, "base64").toString("utf8"),
      sha: `sha-${++counter}`,
    };
    files.set(path, updated);
    return {
      content: {
        path,
        name: path.split("/").pop(),
        sha: updated.sha,
        size: updated.content.length,
      },
    };
  },
  deleteFile: async (
    _owner: string,
    _repo: string,
    path: string,
    _message: string,
    sha: string,
  ) => {
    if (files.get(path)?.sha !== sha) return fail(409);
    files.delete(path);
  },
};
const database = () => ({
  auth: {
    getUser: async () => ({
      data: {
        user: {
          id: "user-id",
          identities: [{ provider: "github", provider_id: "1" }],
        },
      },
    }),
  },
  from(table: string) {
    const query = {
      select: () => query,
      eq: () => query,
      upsert: async (value: { encrypted_token: string }) => {
        bootstrapTokens.push(value.encrypted_token);
        return { error: null };
      },
      maybeSingle: async () => ({
        data: table === "vaults" ? vault : { encrypted_token: "test-only" },
      }),
    };
    return query;
  },
});
const handler = createHandler({
  userClient: database,
  tokenClient: database,
  github: () => github,
  allowedOrigins: ["http://127.0.0.1:5173"],
} as unknown as Parameters<typeof createHandler>[0]);
test.beforeAll(async () => {
  server = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c);
    try {
      if (req.url?.startsWith("/auth/v1/") && req.method === "OPTIONS") {
        res.writeHead(204, {
          "Access-Control-Allow-Origin": "http://127.0.0.1:5173",
          "Access-Control-Allow-Headers":
            "authorization, apikey, x-client-info, content-type, x-supabase-api-version",
          "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        });
        res.end();
        return;
      }
      if (req.url?.startsWith("/auth/v1/user") && req.method === "GET") {
        res.writeHead(200, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "http://127.0.0.1:5173",
        });
        res.end(
          JSON.stringify({
            id: "user-id",
            aud: "authenticated",
            role: "authenticated",
            email: "test@example.invalid",
            app_metadata: { provider: "github" },
            user_metadata: {},
            created_at: "2026-01-01T00:00:00Z",
          }),
        );
        return;
      }
      const response = await handler(
        new Request(
          `http://127.0.0.1:54329${req.url?.replace("/functions/v1", "")}`,
          {
            method: req.method,
            headers: req.headers as Record<string, string>,
            body: chunks.length ? Buffer.concat(chunks) : undefined,
          },
        ),
      );
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch {
      res.writeHead(500);
      res.end();
    }
  });
  await new Promise<void>((resolve) =>
    server.listen(54329, "127.0.0.1", resolve),
  );
});
test.afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((e) => (e ? reject(e) : resolve())),
  );
});
test.beforeEach(async ({ page }) => {
  counter = 0;
  bootstrapTokens = [];
  files = new Map([
    ["README.md", { content: "# Welcome\n\n[[notes/other]]", sha: "initial" }],
    [
      "notes/other.md",
      { content: "# Other\n\nA capybara lives here.", sha: "other" },
    ],
  ]);
  await page.addInitScript(() => {
    if (window.location.hash.includes("access_token=")) return;
    const token =
      btoa(JSON.stringify({ alg: "none" })) +
      "." +
      btoa(
        JSON.stringify({
          sub: "user-id",
          exp: Math.floor(Date.now() / 1000) + 3600,
        }),
      ) +
      ".signature";
    localStorage.setItem(
      "sb-127-auth-token",
      JSON.stringify({
        access_token: token,
        refresh_token: "test-refresh",
        token_type: "bearer",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        expires_in: 3600,
        user: {
          id: "user-id",
          aud: "authenticated",
          role: "authenticated",
          email: "test@example.invalid",
          app_metadata: { provider: "github" },
          user_metadata: {},
          created_at: "2026-01-01T00:00:00Z",
        },
      }),
    );
  });
});
test("existing vault loads, edits commit through actual handler, and reload keeps saved content", async ({
  page,
}) => {
  await page.goto("/");
  const editor = page.getByPlaceholder(
    "Start writing markdown notes... (Type [[ to link notes)",
  );
  await expect(editor).toHaveValue(/# Welcome/);
  await editor.fill("# Saved from the browser");
  await editor.press("Control+s");
  await expect
    .poll(() => files.get("README.md")?.content)
    .toBe("# Saved from the browser");
  await page.reload();
  await expect(editor).toHaveValue("# Saved from the browser");
});
test("repeated offline saves survive reload and synchronize final draft on reconnect", async ({
  page,
  context,
}) => {
  await page.goto("/");
  const editor = page.getByPlaceholder(
    "Start writing markdown notes... (Type [[ to link notes)",
  );
  await expect(editor).toHaveValue(/# Welcome/);
  await expect(page.getByText("SYNCING", { exact: true })).toHaveCount(0);
  await context.setOffline(true);
  await editor.fill("# Offline first");
  await editor.press("Control+s");
  await expect(page.getByText("PENDING", { exact: true })).toBeVisible();
  await editor.fill("# Offline final");
  await editor.press("Control+s");
  await expect(page.getByText("UNCOMMITTED", { exact: true })).toHaveCount(0);
  expect(files.get("README.md")?.content).toContain("# Welcome");
  await context.setOffline(false);
  await expect
    .poll(() => files.get("README.md")?.content)
    .toBe("# Offline final");
  await page.reload();
  await expect(editor).toHaveValue("# Offline final");
});
test("wikilinks navigate within vault and offline body search finds a cached note", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await expect(
    page.getByPlaceholder(
      "Start writing markdown notes... (Type [[ to link notes)",
    ),
  ).toHaveValue(/# Welcome/);
  await page.locator('a[data-target="notes/other"]').click();
  await expect(
    page.getByPlaceholder(
      "Start writing markdown notes... (Type [[ to link notes)",
    ),
  ).toHaveValue(/capybara/);
  await expect(page).toHaveURL(/note=notes%2Fother.md/);
  await context.setOffline(true);
  await page.getByTitle("Quick Search (Ctrl+K)").click();
  await page
    .getByPlaceholder("Type note title, folder, or keywords...")
    .fill("capybara");
  await expect(
    page.getByText("other.md", { exact: true }).last(),
  ).toBeVisible();
});

test("conflicting save preserves draft and explicit overwrite resolves against fresh SHA", async ({
  page,
}) => {
  await page.goto("/");
  const editor = page.getByPlaceholder(
    "Start writing markdown notes... (Type [[ to link notes)",
  );
  await expect(editor).toHaveValue(/# Welcome/);
  await expect(page.getByText("SYNCING", { exact: true })).toHaveCount(0);
  await editor.fill("# My local draft");
  files.set("README.md", { content: "# External edit", sha: "external-sha" });
  await editor.press("Control+s");
  await expect(page.getByText("View Diff & Resolve")).toBeVisible();
  await expect(editor).toHaveValue("# My local draft");
  await page.getByText("View Diff & Resolve").click();
  await expect(
    page.locator("textarea").filter({ hasText: "" }).last(),
  ).toHaveValue("# External edit");
  await page.getByRole("button", { name: "Force Overwrite Remote" }).click();
  await expect
    .poll(() => files.get("README.md")?.content)
    .toBe("# My local draft");
  await expect(page.getByText("View Diff & Resolve")).toHaveCount(0);
  await expect(editor).toHaveValue("# My local draft");
});
test("image upload preserves binary bytes and keeps the note selected", async ({
  page,
}) => {
  await page.goto("/");
  const editor = page.getByPlaceholder(
    "Start writing markdown notes... (Type [[ to link notes)",
  );
  await expect(editor).toHaveValue(/# Welcome/);
  const image = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+kM3sAAAAASUVORK5CYII=",
    "base64",
  );
  await page
    .locator("input[type=file]")
    .setInputFiles({ name: "pixel.png", mimeType: "image/png", buffer: image });
  await expect(editor).toHaveValue(/!\[pixel.png\]\(\/assets\/images\//);
  const uploaded = [...files].find(([path]) => path.endsWith("pixel.png"));
  expect(uploaded?.[1].bytes?.equals(image)).toBe(true);
  await expect(page).not.toHaveURL(/note=assets/);
  await editor.press("Control+s");
  await expect
    .poll(() => files.get("README.md")?.content)
    .toContain("pixel.png");
});

test("frontmatter aliases navigate to the canonical note and browser back restores selection", async ({
  page,
}) => {
  files.set("README.md", { content: "# Welcome\n\n[[DS]]", sha: "initial" });
  files.set("notes/other.md", {
    content: "---\ntitle: Distributed Systems\naliases: [DS]\n---\n# Other",
    sha: "other",
  });
  await page.goto("/");
  await expect(page.locator('a[data-target="DS"]')).toBeVisible();
  await page.locator('a[data-target="DS"]').click();
  await expect(page).toHaveURL(/note=notes%2Fother.md/);
  await expect(
    page.getByPlaceholder(
      "Start writing markdown notes... (Type [[ to link notes)",
    ),
  ).toHaveValue(/title: Distributed Systems/);
  await page.goBack();
  await expect(
    page.getByPlaceholder(
      "Start writing markdown notes... (Type [[ to link notes)",
    ),
  ).toHaveValue(/# Welcome/);
});

test("OAuth callback transfers provider token once and scrubs persisted browser session", async ({
  page,
}) => {
  const access =
    btoa(JSON.stringify({ alg: "none" })) +
    "." +
    btoa(
      JSON.stringify({
        sub: "user-id",
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    ) +
    ".signature";
  await page.goto(
    "/#access_token=" +
      encodeURIComponent(access) +
      "&refresh_token=test-refresh&token_type=bearer&expires_in=3600&provider_token=github-bootstrap-secret",
  );
  await expect(
    page.getByPlaceholder(
      "Start writing markdown notes... (Type [[ to link notes)",
    ),
  ).toHaveValue(/# Welcome/);
  await expect
    .poll(() => bootstrapTokens.includes("github-bootstrap-secret"))
    .toBe(true);
  const storage = await page.evaluate(() =>
    localStorage.getItem("sb-127-auth-token"),
  );
  expect(storage).not.toContain("github-bootstrap-secret");
  expect(storage).not.toContain("provider_token");
});

test("two tabs serialize offline replay without deleting the latest queued draft", async ({
  page,
  context,
}) => {
  await page.goto("/");
  const editor = page.getByPlaceholder(
    "Start writing markdown notes... (Type [[ to link notes)",
  );
  await expect(editor).toHaveValue(/# Welcome/);
  const second = await context.newPage();
  await second.goto("/");
  const otherEditor = second.getByPlaceholder(
    "Start writing markdown notes... (Type [[ to link notes)",
  );
  await expect(otherEditor).toHaveValue(/# Welcome/);
  await context.setOffline(true);
  await editor.fill("# First tab offline");
  await editor.press("Control+s");
  await expect(page.getByText("PENDING", { exact: true })).toBeVisible();
  await otherEditor.fill("# Latest tab offline");
  await otherEditor.press("Control+s");
  await expect(second.getByText("PENDING", { exact: true })).toBeVisible();
  await context.setOffline(false);
  await expect
    .poll(() => files.get("README.md")?.content)
    .toBe("# Latest tab offline");
  await expect(page.getByText("PENDING", { exact: true })).toHaveCount(0);
  await expect(second.getByText("PENDING", { exact: true })).toHaveCount(0);
  await second.close();
});
