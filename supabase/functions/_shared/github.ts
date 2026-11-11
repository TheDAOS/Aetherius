function escapePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}
// UTF-8-safe base64 encoding (btoa only supports Latin-1)
function utf8ToBase64(str: string): string {
  return btoa(String.fromCodePoint(...new TextEncoder().encode(str)));
}

export class GitHubClient {
  private token: string;

  constructor(
    token: string,
    private request: typeof fetch = fetch,
  ) {
    if (!token) {
      throw new Error("GitHub token is required");
    }
    this.token = token;
  }

  private async fetch(path: string, options: RequestInit = {}) {
    const url = `https://api.github.com${path}`;
    const headers = new Headers(options.headers || {});
    headers.set("Authorization", `Bearer ${this.token}`);
    headers.set("Accept", "application/vnd.github.v3+json");
    headers.set("X-GitHub-Api-Version", "2022-11-28");

    const response = await this.request(url, { ...options, headers });

    if (!response.ok) {
      await response.body?.cancel();
      console.error("GitHub API request failed", { status: response.status });
      const err = Object.assign(
        new Error(
          `GitHub API error: ${response.status} ${response.statusText}`,
        ),
        { status: response.status },
      );
      throw err;
    }

    // Return null for 204 No Content
    if (response.status === 204) return null;

    return response.json();
  }

  async getUser() {
    return this.fetch("/user");
  }

  async createRepository(
    name: string,
    description: string = "",
    privateRepo: boolean = true,
  ) {
    return this.fetch("/user/repos", {
      method: "POST",
      body: JSON.stringify({
        name,
        description,
        private: privateRepo,
        auto_init: true, // Create an initial commit with empty README
      }),
    });
  }

  async getRepository(owner: string, repo: string) {
    return this.fetch(`/repos/${owner}/${repo}`);
  }

  async deleteRepository(owner: string, repo: string) {
    return this.fetch(`/repos/${owner}/${repo}`, { method: "DELETE" });
  }

  async getContents(
    owner: string,
    repo: string,
    path: string = "",
    branch?: string,
  ) {
    return this.fetch(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${escapePath(path)}${branch ? `?ref=${encodeURIComponent(branch)}` : ""}`,
    );
  }

  async getTree(
    owner: string,
    repo: string,
    treeSha: string = "main",
    recursive: boolean = true,
  ) {
    const url = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(treeSha)}${recursive ? "?recursive=1" : ""}`;
    const result = await this.fetch(url);
    if (result.truncated)
      throw Object.assign(
        new Error(
          "Vault exceeds GitHub tree response limit; refusing an incomplete listing",
        ),
        { status: 502 },
      );
    return result;
  }

  async createOrUpdateFile(
    owner: string,
    repo: string,
    path: string,
    message: string,
    content: string, // base64 encoded
    sha?: string, // required for updates
    branch: string = "main",
  ) {
    return this.fetch(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${escapePath(path)}`,
      {
        method: "PUT",
        body: JSON.stringify({
          message,
          content,
          sha,
          branch,
        }),
      },
    );
  }

  async deleteFile(
    owner: string,
    repo: string,
    path: string,
    message: string,
    sha: string,
    branch: string = "main",
  ) {
    return this.fetch(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${escapePath(path)}`,
      {
        method: "DELETE",
        body: JSON.stringify({
          message,
          sha,
          branch,
        }),
      },
    );
  }

  async moveFile(
    owner: string,
    repo: string,
    branch: string,
    from: string,
    to: string,
    expectedSha: string,
    message: string,
  ) {
    const base = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git`;
    const head = await this.fetch(`${base}/ref/heads/${escapePath(branch)}`);
    const commit = await this.fetch(`${base}/commits/${head.object.sha}`);
    const tree = await this.getTree(owner, repo, commit.tree.sha, true);
    const source = tree.tree.find(
      (entry: { path: string }) => entry.path === from,
    );
    if (source?.type !== "blob")
      throw Object.assign(new Error("Source file not found"), { status: 404 });
    if (source.sha !== expectedSha)
      throw Object.assign(new Error("Source file changed remotely"), {
        status: 409,
      });
    if (
      tree.tree.some(
        (entry: { path: string; type: string }) =>
          entry.path === to ||
          entry.path.startsWith(`${to}/`) ||
          (entry.type === "blob" && to.startsWith(`${entry.path}/`)),
      )
    )
      throw Object.assign(
        new Error("Destination already exists or conflicts with a file"),
        { status: 409 },
      );
    const changedTree = await this.fetch(`${base}/trees`, {
      method: "POST",
      body: JSON.stringify({
        base_tree: commit.tree.sha,
        tree: [
          { path: from, mode: source.mode, type: "blob", sha: null },
          { path: to, mode: source.mode, type: "blob", sha: source.sha },
        ],
      }),
    });
    const movedCommit = await this.fetch(`${base}/commits`, {
      method: "POST",
      body: JSON.stringify({
        message,
        tree: changedTree.sha,
        parents: [head.object.sha],
      }),
    });
    try {
      await this.fetch(`${base}/refs/heads/${escapePath(branch)}`, {
        method: "PATCH",
        body: JSON.stringify({ sha: movedCommit.sha, force: false }),
      });
    } catch (error) {
      if ([409, 422].includes((error as { status: number }).status))
        throw Object.assign(
          new Error("Branch changed or is protected; move was not published"),
          { status: 409 },
        );
      throw error;
    }
    return {
      path: to,
      name: to.split("/").pop(),
      type: "file",
      sha: source.sha,
      size: source.size,
    };
  }

  async searchBranch(
    owner: string,
    repo: string,
    branch: string,
    query: string,
    pathPrefix = "",
  ) {
    const listing = await this.getTree(owner, repo, branch, true);
    const files = listing.tree.filter(
      (entry: { type: string; path: string }) =>
        entry.type === "blob" &&
        /\.(md|markdown)$/i.test(entry.path) &&
        entry.path.startsWith(pathPrefix),
    ) as Array<{ path: string; size?: number }>;
    if (
      files.length > 100 ||
      files.some((file) => (file.size || 0) > 1_000_000)
    )
      throw Object.assign(
        new Error(
          "Branch search exceeds safe content scan limits; narrow the path filter",
        ),
        { status: 422 },
      );
    const matches: Array<{ path: string; name: string; score: number }> = [];
    const needle = query.toLocaleLowerCase();
    // Four requests at a time keeps GitHub usage bounded without dropping matches.
    for (let start = 0; start < files.length; start += 4) {
      const found = await Promise.all(
        files.slice(start, start + 4).map(async (file) => {
          const result = await this.getContents(owner, repo, file.path, branch);
          if (
            result.encoding !== "base64" ||
            typeof result.content !== "string"
          )
            throw Object.assign(
              new Error("Branch search could not read every note"),
              { status: 502 },
            );
          const text = new TextDecoder().decode(
            Uint8Array.from(atob(result.content.replace(/\s/g, "")), (char) =>
              char.charCodeAt(0),
            ),
          );
          return text.toLocaleLowerCase().includes(needle) ||
            file.path.toLocaleLowerCase().includes(needle)
            ? {
                path: file.path,
                name: file.path.split("/").pop() || file.path,
                score: 1,
              }
            : null;
        }),
      );
      for (const item of found) if (item) matches.push(item);
    }
    return { items: matches };
  }

  async searchCode(owner: string, repo: string, query: string) {
    const encodedQuery = encodeURIComponent(`${query} repo:${owner}/${repo}`);
    const items = [];
    for (let page = 1; page <= 10; page++) {
      const result = await this.fetch(
        `/search/code?q=${encodedQuery}&per_page=100&page=${page}`,
      );
      if (result.incomplete_results || result.total_count > 1000)
        throw Object.assign(
          new Error("Search is incomplete; narrow the query"),
          { status: 422 },
        );
      items.push(...result.items);
      if (items.length >= result.total_count || result.items.length < 100)
        return { items };
    }
    return { items };
  }

  async initTemplateFiles(
    owner: string,
    repo: string,
    branch: string = "main",
  ) {
    const templateFiles = [
      {
        path: "README.md",
        content: utf8ToBase64(
          `# Personal Knowledge Vault\n\nWelcome to your personal knowledge vault!\n\nThis repository is your private, Git-backed vault for Markdown notes and assets.\n\n## Structure\n\n\`\`\`text\n├── notes/\n│   ├── programming/       # Technical & programming notes\n│   ├── projects/          # Active project documentation and specs\n│   └── miscellaneous/     # Quick notes, ideas, and scratchpads\n├── assets/\n│   └── images/            # Embedded images, diagrams, and attachments\n├── templates/             # Markdown templates for new notes\n├── .vault/\n│   └── config.json        # Vault configuration and metadata\n└── README.md              # Vault root overview\n\`\`\`\n`,
        ),
        message: "chore: initialize vault README",
      },
      {
        path: ".vault/config.json",
        content: utf8ToBase64(
          JSON.stringify(
            { version: "1.0.0", name: repo, created: new Date().toISOString() },
            null,
            2,
          ),
        ),
        message: "chore: initialize vault configuration",
      },
      {
        path: "notes/miscellaneous/welcome.md",
        content: utf8ToBase64(
          `---\ntitle: Welcome to Your Vault\ntags:\n  - welcome\n  - guide\ncreated: ${new Date().toISOString().split("T")[0]}\nupdated: ${new Date().toISOString().split("T")[0]}\n---\n\n# Welcome to Your Vault\n\nThis is your first note in your personal knowledge vault!\n\n## Key Features\n\n- **Markdown-first**: Write in standard Markdown with YAML frontmatter.\n- **Git-backed**: Every save is committed directly to your private GitHub repository.\n- **Hierarchical organization**: Create folders and subfolders to organize your notes.\n- **Templates**: Start new notes quickly using templates in the \`templates/\` folder.\n`,
        ),
        message: "chore: add welcome note",
      },
      {
        path: "templates/daily-note.md",
        content: utf8ToBase64(
          `---\ntitle: Daily Note - {{date}}\ntags:\n  - daily\ncreated: {{date}}\nupdated: {{date}}\n---\n\n# Daily Note - {{date}}\n\n## Objectives\n- [ ] \n\n## Notes & Thoughts\n\n## Tasks & Follow-ups\n- [ ] \n`,
        ),
        message: "chore: add daily note template",
      },
      {
        path: "templates/project-spec.md",
        content: utf8ToBase64(
          `---\ntitle: Project - {{name}}\ntags:\n  - project\nstatus: planning\ncreated: {{date}}\nupdated: {{date}}\n---\n\n# Project: {{name}}\n\n## Overview\n\n## Goals & Non-Goals\n\n## Architecture & Design\n\n## Next Steps\n- [ ] \n`,
        ),
        message: "chore: add project spec template",
      },
    ];

    for (const file of templateFiles) {
      try {
        let sha: string | undefined;
        try {
          const existing = await this.getContents(
            owner,
            repo,
            file.path,
            branch,
          );
          if (existing && !Array.isArray(existing)) {
            sha = existing.sha;
          }
        } catch (error) {
          if ((error as { status?: number }).status !== 404) throw error;
        }
        await this.createOrUpdateFile(
          owner,
          repo,
          file.path,
          file.message,
          file.content,
          sha,
          branch,
        );
      } catch (err) {
        throw new Error(`Could not seed template file ${file.path}`, {
          cause: err,
        });
      }
    }
  }
}
