export class GitHubClient {
  private token: string;

  constructor(token: string) {
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

    const response = await fetch(url, { ...options, headers });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`GitHub API Error (${response.status}):`, errorText);
      const err: any = new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      err.status = response.status;
      err.body = errorText;
      throw err;
    }

    // Return null for 204 No Content
    if (response.status === 204) return null;

    return response.json();
  }

  async getUser() {
    return this.fetch("/user");
  }

  async createRepository(name: string, description: string = "", privateRepo: boolean = true) {
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

  async getContents(owner: string, repo: string, path: string = "") {
    return this.fetch(`/repos/${owner}/${repo}/contents/${path}`);
  }

  async getTree(owner: string, repo: string, treeSha: string = "main", recursive: boolean = true) {
    const url = `/repos/${owner}/${repo}/git/trees/${treeSha}${recursive ? "?recursive=1" : ""}`;
    return this.fetch(url);
  }

  async createOrUpdateFile(
    owner: string,
    repo: string,
    path: string,
    message: string,
    content: string, // base64 encoded
    sha?: string, // required for updates
    branch: string = "main"
  ) {
    return this.fetch(`/repos/${owner}/${repo}/contents/${path}`, {
      method: "PUT",
      body: JSON.stringify({
        message,
        content,
        sha,
        branch,
      }),
    });
  }

  async deleteFile(
    owner: string,
    repo: string,
    path: string,
    message: string,
    sha: string,
    branch: string = "main"
  ) {
    return this.fetch(`/repos/${owner}/${repo}/contents/${path}`, {
      method: "DELETE",
      body: JSON.stringify({
        message,
        sha,
        branch,
      }),
    });
  }

  async searchCode(owner: string, repo: string, query: string) {
    const encodedQuery = encodeURIComponent(`${query} repo:${owner}/${repo}`);
    return this.fetch(`/search/code?q=${encodedQuery}`);
  }

  async initTemplateFiles(owner: string, repo: string, branch: string = "main") {
    const templateFiles = [
      {
        path: "README.md",
        content: btoa(`# Personal Knowledge Vault\n\nWelcome to your personal knowledge vault!\n\nThis repository is your private, Git-backed vault for Markdown notes and assets.\n\n## Structure\n\n\`\`\`text\n├── notes/\n│   ├── programming/       # Technical & programming notes\n│   ├── projects/          # Active project documentation and specs\n│   └── miscellaneous/     # Quick notes, ideas, and scratchpads\n├── assets/\n│   └── images/            # Embedded images, diagrams, and attachments\n├── templates/             # Markdown templates for new notes\n├── .vault/\n│   └── config.json        # Vault configuration and metadata\n└── README.md              # Vault root overview\n\`\`\`\n`),
        message: "chore: initialize vault README"
      },
      {
        path: ".vault/config.json",
        content: btoa(JSON.stringify({ version: "1.0.0", name: repo, created: new Date().toISOString() }, null, 2)),
        message: "chore: initialize vault configuration"
      },
      {
        path: "notes/miscellaneous/welcome.md",
        content: btoa(`---\ntitle: Welcome to Your Vault\ntags:\n  - welcome\n  - guide\ncreated: ${new Date().toISOString().split('T')[0]}\nupdated: ${new Date().toISOString().split('T')[0]}\n---\n\n# Welcome to Your Vault\n\nThis is your first note in your personal knowledge vault!\n\n## Key Features\n\n- **Markdown-first**: Write in standard Markdown with YAML frontmatter.\n- **Git-backed**: Every save is committed directly to your private GitHub repository.\n- **Hierarchical organization**: Create folders and subfolders to organize your notes.\n- **Templates**: Start new notes quickly using templates in the \`templates/\` folder.\n`),
        message: "chore: add welcome note"
      },
      {
        path: "templates/daily-note.md",
        content: btoa(`---\ntitle: Daily Note - {{date}}\ntags:\n  - daily\ncreated: {{date}}\nupdated: {{date}}\n---\n\n# Daily Note - {{date}}\n\n## Objectives\n- [ ] \n\n## Notes & Thoughts\n\n## Tasks & Follow-ups\n- [ ] \n`),
        message: "chore: add daily note template"
      },
      {
        path: "templates/project-spec.md",
        content: btoa(`---\ntitle: Project - {{name}}\ntags:\n  - project\nstatus: planning\ncreated: {{date}}\nupdated: {{date}}\n---\n\n# Project: {{name}}\n\n## Overview\n\n## Goals & Non-Goals\n\n## Architecture & Design\n\n## Next Steps\n- [ ] \n`),
        message: "chore: add project spec template"
      }
    ];

    for (const file of templateFiles) {
      try {
        let sha: string | undefined;
        try {
          const existing = await this.getContents(owner, repo, file.path);
          if (existing && !Array.isArray(existing)) {
            sha = existing.sha;
          }
        } catch {
          // File does not exist yet, no sha needed
        }
        await this.createOrUpdateFile(owner, repo, file.path, file.message, file.content, sha, branch);
      } catch (err) {
        console.warn(`Could not seed template file ${file.path}:`, err);
      }
    }
  }
}
