import { EventEmitter } from 'node:events';
import { watch } from 'node:fs';
import type { WatcherConfig, FileChangeEvent } from '../types.js';

export class FileWatcher extends EventEmitter {
  private watchers: Map<string, ReturnType<typeof watch>>;
  private debounceTimers: Map<string, NodeJS.Timeout>;
  private debounceMs: number;
  private excludePatterns: Set<string>;
  private running: boolean;

  constructor() {
    super();
    this.watchers = new Map();
    this.debounceTimers = new Map();
    this.debounceMs = 300;
    this.excludePatterns = new Set();
    this.running = false;
  }

  watch(config: WatcherConfig): void {
    if (!config.enabled) {
      return;
    }

    this.running = true;
    this.debounceMs = config.debounceMs ?? 300;

    // Set up exclude patterns
    this.setupExcludePatterns(config.excludePatterns);

    // Watch each directory
    for (const dir of config.directories) {
      if (this.watchers.has(dir)) {
        continue; // Skip if already watching
      }

      const watcher = watch(
        dir,
        { recursive: true },
        (eventType: string, filename: string | null) => {
          if (filename) {
            this.handleFileChange(
              filename,
              eventType as 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir'
            );
          }
        }
      );

      this.watchers.set(dir, watcher);
    }
  }

  async stop(): Promise<void> {
    this.running = false;

    // Clear all debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    // Close all watchers
    for (const watcher of this.watchers.values()) {
      watcher.close();
    }
    this.watchers.clear();
  }

  private setupExcludePatterns(customPatterns?: string[]): void {
    // Always exclude these patterns
    const defaultExclusions = ['.git', 'node_modules', '.map'];

    this.excludePatterns.clear();

    for (const pattern of defaultExclusions) {
      this.excludePatterns.add(pattern);
    }

    if (customPatterns) {
      for (const pattern of customPatterns) {
        this.excludePatterns.add(pattern);
      }
    }
  }

  private shouldExclude(filepath: string): boolean {
    for (const pattern of this.excludePatterns) {
      if (this.matchesPattern(filepath, pattern)) {
        return true;
      }
    }
    return false;
  }

  private matchesPattern(filepath: string, pattern: string): boolean {
    // Normalize path separators for cross-platform compatibility
    const normalizedPath = filepath.replace(/\\/g, '/');
    const normalizedPattern = pattern.replace(/\\/g, '/');

    // Handle ** patterns (any-depth matching)
    if (normalizedPattern.includes('**')) {
      const parts = normalizedPattern.split('**');

      // For patterns like "**/*.test.ts"
      if (parts.length === 2) {
        const prefix = parts[0];
        const suffix = parts[1];

        // Remove leading/trailing slashes for matching
        const cleanSuffix = suffix.replace(/^\//, '');

        if (prefix === '') {
          // Pattern like "**/*.test.ts" - matches if path ends with suffix
          return normalizedPath.endsWith(cleanSuffix);
        } else if (suffix === '') {
          // Pattern like "node_modules/**" - matches if path starts with prefix
          return normalizedPath.startsWith(prefix);
        }
      }
    }

    // Simple substring matching for exact pattern parts
    return normalizedPath.includes(normalizedPattern);
  }

  private handleFileChange(
    filename: string,
    eventType: 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir'
  ): void {
    // Check if file should be excluded
    if (this.shouldExclude(filename)) {
      return;
    }

    // Clear existing debounce timer for this file
    const existingTimer = this.debounceTimers.get(filename);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set up new debounce timer
    const timer = setTimeout(() => {
      if (this.running) {
        const event: FileChangeEvent = {
          filepath: filename,
          eventType,
        };
        this.emit('change', event);
      }
      this.debounceTimers.delete(filename);
    }, this.debounceMs);

    this.debounceTimers.set(filename, timer);
  }
}
