import type { Token } from '../../di/types.js';
import type { ModuleMetadata, RouteEntry } from '../types.js';

/**
 * MetadataCache stores decorator metadata to eliminate reflection overhead during module loading.
 * Uses WeakMaps for automatic garbage collection when tokens are no longer referenced.
 */
export class MetadataCache {
  private moduleMetadata: WeakMap<object, ModuleMetadata> = new WeakMap();
  private routeMetadata: WeakMap<object, RouteEntry[]> = new WeakMap();
  private providerMetadata: WeakMap<object, unknown> = new WeakMap();

  // For non-object tokens (strings, symbols), we need a regular Map as fallback
  private stringTokenModuleMetadata: Map<string | symbol, ModuleMetadata> = new Map();
  private stringTokenRouteMetadata: Map<string | symbol, RouteEntry[]> = new Map();
  private stringTokenProviderMetadata: Map<string | symbol, unknown> = new Map();

  /**
   * Cache module metadata (providers, imports, exports)
   */
  setModuleMetadata(token: Token, metadata: ModuleMetadata): void {
    if (this.isObjectToken(token)) {
      this.moduleMetadata.set(token as object, metadata);
    } else {
      this.stringTokenModuleMetadata.set(token as string | symbol, metadata);
    }
  }

  /**
   * Retrieve cached module metadata
   */
  getModuleMetadata(token: Token): ModuleMetadata | undefined {
    if (this.isObjectToken(token)) {
      return this.moduleMetadata.get(token as object);
    } else {
      return this.stringTokenModuleMetadata.get(token as string | symbol);
    }
  }

  /**
   * Cache route metadata for a controller/handler
   */
  setRouteMetadata(token: Token, routes: RouteEntry[]): void {
    if (this.isObjectToken(token)) {
      this.routeMetadata.set(token as object, routes);
    } else {
      this.stringTokenRouteMetadata.set(token as string | symbol, routes);
    }
  }

  /**
   * Retrieve cached route metadata
   */
  getRouteMetadata(token: Token): RouteEntry[] | undefined {
    if (this.isObjectToken(token)) {
      return this.routeMetadata.get(token as object);
    } else {
      return this.stringTokenRouteMetadata.get(token as string | symbol);
    }
  }

  /**
   * Cache provider-specific metadata
   */
  setProviderMetadata(token: Token, metadata: unknown): void {
    if (this.isObjectToken(token)) {
      this.providerMetadata.set(token as object, metadata);
    } else {
      this.stringTokenProviderMetadata.set(token as string | symbol, metadata);
    }
  }

  /**
   * Retrieve cached provider metadata
   */
  getProviderMetadata(token: Token): unknown {
    if (this.isObjectToken(token)) {
      return this.providerMetadata.get(token as object);
    } else {
      return this.stringTokenProviderMetadata.get(token as string | symbol);
    }
  }

  /**
   * Check if token has any cached metadata
   */
  has(token: Token): boolean {
    if (this.isObjectToken(token)) {
      const obj = token as object;
      return (
        this.moduleMetadata.has(obj) ||
        this.routeMetadata.has(obj) ||
        this.providerMetadata.has(obj)
      );
    } else {
      const key = token as string | symbol;
      return (
        this.stringTokenModuleMetadata.has(key) ||
        this.stringTokenRouteMetadata.has(key) ||
        this.stringTokenProviderMetadata.has(key)
      );
    }
  }

  /**
   * Clear all cached metadata
   */
  clear(): void {
    this.moduleMetadata = new WeakMap();
    this.routeMetadata = new WeakMap();
    this.providerMetadata = new WeakMap();
    this.stringTokenModuleMetadata.clear();
    this.stringTokenRouteMetadata.clear();
    this.stringTokenProviderMetadata.clear();
  }

  /**
   * Serialize cache to JSON string
   * Note: WeakMaps cannot be serialized, so we only store version and timestamp
   */
  serialize(): string {
    const serialized = {
      version: '1.0',
      timestamp: Date.now(),
    };
    return JSON.stringify(serialized);
  }

  /**
   * Deserialize cache from JSON string
   */
  deserialize(json: string): void {
    try {
      JSON.parse(json);
    } catch (error) {
      throw new Error(`Invalid JSON in MetadataCache.deserialize: ${error}`);
    }
  }

  /**
   * Check if token is an object (class constructor or object)
   * Strings and symbols cannot be used as WeakMap keys
   */
  private isObjectToken(token: Token): boolean {
    const type = typeof token;
    return type === 'object' || type === 'function';
  }
}
