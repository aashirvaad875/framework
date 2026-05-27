import type { PluginManifest } from './types.js';
import { InvalidPluginManifestError } from './exceptions.js';

export class PluginLoader {
  validateManifest(manifest: any): void {
    const required = [
      'name',
      'version',
      'description',
      'author',
      'keywords',
      'dependencies',
      'capabilities',
    ];
    for (const field of required) {
      if (!(field in manifest)) {
        throw new InvalidPluginManifestError(
          manifest?.name || 'unknown',
          `Missing required field: ${field}`
        );
      }
    }

    if (typeof manifest.name !== 'string' || !manifest.name.trim()) {
      throw new InvalidPluginManifestError(
        manifest?.name || 'unknown',
        'name must be non-empty string'
      );
    }

    if (typeof manifest.version !== 'string' || !manifest.version.trim()) {
      throw new InvalidPluginManifestError(manifest.name, 'version must be non-empty string');
    }

    if (!Array.isArray(manifest.dependencies)) {
      throw new InvalidPluginManifestError(manifest.name, 'dependencies must be array');
    }

    if (typeof manifest.capabilities !== 'object' || manifest.capabilities === null) {
      throw new InvalidPluginManifestError(manifest.name, 'capabilities must be object');
    }
  }

  parseManifestJson(json: string): PluginManifest {
    try {
      const manifest = JSON.parse(json) as PluginManifest;
      this.validateManifest(manifest);
      return manifest;
    } catch (error) {
      if (error instanceof InvalidPluginManifestError) {
        throw error;
      }
      throw new Error(`Failed to parse plugin manifest JSON: ${(error as Error).message}`);
    }
  }

  async loadPluginFromModule(modulePath: string): Promise<any> {
    try {
      const module = await import(modulePath);
      return module.default || module;
    } catch (error) {
      throw new Error(
        `Failed to load plugin module from ${modulePath}: ${(error as Error).message}`
      );
    }
  }
}
