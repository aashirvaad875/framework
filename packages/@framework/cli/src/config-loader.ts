import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { FrameworkConfig } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class ConfigLoader {
  static async load(projectRoot: string = process.cwd()): Promise<FrameworkConfig> {
    // Try .frameworkrc.json first
    const jsonPath = path.join(projectRoot, '.frameworkrc.json');
    if (await fs.pathExists(jsonPath)) {
      const content = await fs.readJson(jsonPath);
      return this.normalizeConfig(content);
    }

    // Try framework.config.ts (requires tsx or ts-node)
    const tsPath = path.join(projectRoot, 'framework.config.ts');
    if (await fs.pathExists(tsPath)) {
      try {
        const { default: config } = await import(`file://${tsPath}`);
        return this.normalizeConfig(config);
      } catch (err) {
        console.warn(`Warning: Could not load framework.config.ts: ${(err as Error).message}`);
      }
    }

    // Return defaults
    return this.getDefaults(projectRoot);
  }

  private static normalizeConfig(config: unknown): FrameworkConfig {
    const cfg = config as Record<string, unknown>;
    return {
      modulePath: (cfg.modulePath as string) || 'src/modules',
      templatePath: (cfg.templatePath as string) || path.join(__dirname, '../templates'),
      plugins: (cfg.plugins as string[]) || [],
      naming: {
        controllerSuffix:
          ((cfg.naming as Record<string, unknown>)?.controllerSuffix as string) || 'Controller',
        serviceSuffix:
          ((cfg.naming as Record<string, unknown>)?.serviceSuffix as string) || 'Service',
        modulePattern:
          ((cfg.naming as Record<string, unknown>)?.modulePattern as string) || '*.module.ts',
      },
      overrides: (cfg.overrides as Record<string, string>) || {},
    };
  }

  private static getDefaults(_projectRoot: string): FrameworkConfig {
    return {
      modulePath: 'src/modules',
      templatePath: path.join(__dirname, '../templates'),
      plugins: [],
      naming: {
        controllerSuffix: 'Controller',
        serviceSuffix: 'Service',
        modulePattern: '*.module.ts',
      },
      overrides: {},
    };
  }
}
