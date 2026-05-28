import type { ModuleReloadResult } from '../types.js';

export interface ModuleReloadContext {
  filepath: string;
  url: string;
  timestamp: number;
  success: boolean;
  error?: string;
}

export class ModuleReloader {
  private contexts: Map<string, ModuleReloadContext> = new Map();
  private singletonCache: Map<string, unknown> = new Map();
  private reloadQueue: Set<string> = new Set();

  setSingletonInstance(token: string, instance: unknown): void {
    this.singletonCache.set(token, instance);
  }

  getSingletonInstance(token: string): unknown | undefined {
    return this.singletonCache.get(token);
  }

  clearSingletonInstance(token: string): void {
    this.singletonCache.delete(token);
  }

  getReloadContexts(): ModuleReloadContext[] {
    return Array.from(this.contexts.values());
  }

  async reload(filepath: string): Promise<ModuleReloadResult> {
    if (this.reloadQueue.has(filepath)) {
      return {
        success: false,
        filepath,
        modules: [],
        error: 'Reload already in progress',
      };
    }

    this.reloadQueue.add(filepath);

    try {
      // Create cache-busted URL
      const url = this.getModuleUrl(filepath);

      // Clear require cache if available
      try {
        const requireCache = (globalThis as Record<string, unknown>).require?.cache as
          | Record<string, unknown>
          | undefined;
        if (requireCache) {
          delete requireCache[url];
        }
      } catch {
        // Ignore
      }

      // Record context
      this.contexts.set(filepath, {
        filepath,
        url,
        timestamp: Date.now(),
        success: true,
      });

      return {
        success: true,
        filepath,
        modules: [filepath],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.contexts.set(filepath, {
        filepath,
        url: this.getModuleUrl(filepath),
        timestamp: Date.now(),
        success: false,
        error: errorMessage,
      });

      return {
        success: false,
        filepath,
        modules: [],
        error: errorMessage,
      };
    } finally {
      this.reloadQueue.delete(filepath);
    }
  }

  private getModuleUrl(filepath: string): string {
    // Convert file path to ESM URL
    const absolutePath = filepath.startsWith('/') ? filepath : `/${filepath}`;
    return `file://${absolutePath}`;
  }

  async reloadAll(): Promise<ModuleReloadResult> {
    const contexts = Array.from(this.contexts.keys());
    let successCount = 0;

    for (const filepath of contexts) {
      const result = await this.reload(filepath);
      if (result.success) {
        successCount++;
      }
    }

    return {
      success: successCount === contexts.length,
      filepath: 'all',
      modules: contexts,
    };
  }

  clear(): void {
    this.contexts.clear();
    this.singletonCache.clear();
    this.reloadQueue.clear();
  }
}
