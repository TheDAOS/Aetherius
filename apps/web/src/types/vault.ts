/**
 * Conforms strictly to openapi/openapi.yaml
 */

export interface Vault {
  id: string;
  owner: string;
  repository: string;
  branch: string;
}

export type FileType = 'file' | 'directory';

export interface VaultFile {
  path: string;
  type: FileType;
  name: string;
  content?: string;
  sha?: string;
  size?: number;
  lastModified?: string;
}

export interface FileListResponse {
  path: string;
  entries: VaultFile[];
}

export interface CreateFileRequest {
  path: string;
  content: string;
  commitMessage?: string;
}

export interface UpdateFileRequest {
  content: string;
  expectedSha?: string;
  commitMessage?: string;
}

export interface SearchResult {
  path: string;
  title: string;
  snippet: string;
  score?: number;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
}

export type SyncState = 'idle' | 'pending' | 'running' | 'completed' | 'failed' | 'conflict';

export interface SyncStatus {
  status: SyncState;
  lastSyncAt: string | null;
  message?: string;
}

export interface SyncOperation {
  id: string;
  status: SyncState;
}

export interface ApiError {
  code: string;
  message: string;
}
