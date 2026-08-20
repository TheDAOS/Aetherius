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
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
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
}
