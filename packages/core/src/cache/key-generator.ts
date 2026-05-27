export class CacheKeyGenerator {
  static generate(
    namespace: string | undefined,
    key: string | undefined,
    ...params: any[]
  ): string {
    let cacheKey: string;

    if (key) {
      // Custom key provided
      if (typeof key === 'function') {
        cacheKey = (key as any)(...params);
      } else {
        cacheKey = key;
      }
    } else {
      // Generate from parameters
      const paramsHash = this.hashParams(...params);
      cacheKey = `params:${paramsHash}`;
    }

    // Add namespace prefix
    const prefixed = namespace ? `${namespace}:${cacheKey}` : cacheKey;
    return prefixed;
  }

  private static hashParams(...params: any[]): string {
    const stringified = params
      .map((p) => {
        if (p === null || p === undefined) return 'null';
        if (typeof p === 'object') {
          try {
            return JSON.stringify(p);
          } catch {
            return String(p);
          }
        }
        return String(p);
      })
      .join('|');

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < stringified.length; i++) {
      const char = stringified.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `${Math.abs(hash)}`;
  }

  static buildPattern(namespace: string | undefined, pattern: string): string {
    return namespace ? `${namespace}:${pattern}` : pattern;
  }

  static extractNamespace(key: string): string | undefined {
    const parts = key.split(':');
    return parts.length > 1 ? parts[0] : undefined;
  }
}
