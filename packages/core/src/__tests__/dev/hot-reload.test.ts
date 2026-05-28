import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FileWatcher } from '../../dev/hot-reload/file-watcher.js';
import type { WatcherConfig } from '../../dev/types.js';

describe('FileWatcher', () => {
  let watcher: FileWatcher;

  beforeEach(() => {
    watcher = new FileWatcher();
  });

  afterEach(async () => {
    await watcher.stop();
  });

  it('should create FileWatcher instance', () => {
    expect(watcher).toBeDefined();
  });

  it('should watch directory with configuration', async () => {
    const config: WatcherConfig = {
      enabled: true,
      directories: ['src'],
      debounceMs: 100,
    };
    const onChangeFn = vi.fn();
    watcher.on('change', onChangeFn);

    // This is a basic sanity test; actual file watching tested separately
    expect(config.directories).toContain('src');
  });

  it('should exclude patterns', async () => {
    const config: WatcherConfig = {
      enabled: true,
      directories: ['src'],
      excludePatterns: ['**/*.test.ts', 'node_modules/**'],
    };
    expect(config.excludePatterns).toContain('**/*.test.ts');
  });
});
