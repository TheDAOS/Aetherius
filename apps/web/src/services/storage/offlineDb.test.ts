import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { offlineDb } from './offlineDb';

describe('OfflineDatabase', () => {
  beforeEach(async () => {
    await offlineDb.clearAll();
  });

  it('saves and retrieves cached files', async () => {
    const file = {
      name: 'test.md',
      path: 'notes/test.md',
      type: 'file' as const,
      sha: 'abc123sha',
      content: '# Offline Test Note',
      lastModified: new Date().toISOString()
    };

    await offlineDb.saveFile(file);
    const retrieved = await offlineDb.getFile('notes/test.md');

    expect(retrieved).toBeDefined();
    expect(retrieved?.path).toBe('notes/test.md');
    expect(retrieved?.content).toBe('# Offline Test Note');
    expect(retrieved?.sha).toBe('abc123sha');
  });

  it('manages offline mutation queue in sequence', async () => {
    // Enqueue 2 mutations
    await offlineDb.queueMutation({
      action: 'create',
      path: 'notes/new-offline.md',
      content: 'Offline note content'
    });

    await offlineDb.queueMutation({
      action: 'update',
      path: 'notes/existing.md',
      content: 'Updated content',
      expectedSha: 'old-sha'
    });

    const pending = await offlineDb.getPendingMutations();
    expect(pending).toHaveLength(2);
    expect(pending[0].action).toBe('create');
    expect(pending[0].path).toBe('notes/new-offline.md');
    expect(pending[1].action).toBe('update');

    // Remove first mutation
    if (pending[0].id) {
      await offlineDb.deleteMutation(pending[0].id);
    }

    const remaining = await offlineDb.getPendingMutations();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].action).toBe('update');
  });

  it('stores and retrieves arbitrary metadata', async () => {
    await offlineDb.setMetadata('last_sync_timestamp', 1724345000000);
    const val = await offlineDb.getMetadata('last_sync_timestamp');
    expect(val).toBe(1724345000000);
  });
});
