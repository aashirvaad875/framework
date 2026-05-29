import type { LoadedModule, ModuleLoadEvent } from '../types.js';
import { Logger } from '@dancha/logger';

const logger = new Logger('ModuleInitializer');

/**
 * Calls lifecycle hooks on modules during loading.
 */
export class ModuleInitializer {
  /**
   * Call onModuleInit hooks.
   */
  static async onModuleInit(modules: LoadedModule[]): Promise<ModuleLoadEvent[]> {
    const events: ModuleLoadEvent[] = [];

    for (const module of modules) {
      const timestamp = new Date();

      try {
        if (this.hasOnModuleInit(module.instance)) {
          logger.debug(`Calling onModuleInit for ${module.class.name}`);
          await module.instance.onModuleInit();
        }

        events.push({
          phase: 'initialization',
          module: module.class,
          timestamp,
        });
      } catch (error) {
        logger.error(`onModuleInit failed for ${module.class.name}`, error as Error);
        events.push({
          phase: 'initialization',
          module: module.class,
          timestamp,
          error: error as Error,
        });
      }
    }

    return events;
  }

  /**
   * Call onApplicationBootstrap hooks.
   */
  static async onApplicationBootstrap(modules: LoadedModule[]): Promise<ModuleLoadEvent[]> {
    const events: ModuleLoadEvent[] = [];

    for (const module of modules) {
      const timestamp = new Date();

      try {
        if (this.hasOnApplicationBootstrap(module.instance)) {
          logger.debug(`Calling onApplicationBootstrap for ${module.class.name}`);
          await module.instance.onApplicationBootstrap();
        }

        events.push({
          phase: 'ready',
          module: module.class,
          timestamp,
        });
      } catch (error) {
        logger.error(`onApplicationBootstrap failed for ${module.class.name}`, error as Error);
        events.push({
          phase: 'ready',
          module: module.class,
          timestamp,
          error: error as Error,
        });
      }
    }

    return events;
  }

  /**
   * Call onApplicationShutdown hooks.
   */
  static async onApplicationShutdown(
    modules: LoadedModule[],
    signal?: string
  ): Promise<ModuleLoadEvent[]> {
    const events: ModuleLoadEvent[] = [];

    for (const module of modules) {
      const timestamp = new Date();

      try {
        if (this.hasOnApplicationShutdown(module.instance)) {
          logger.debug(`Calling onApplicationShutdown for ${module.class.name}`);
          await module.instance.onApplicationShutdown(signal);
        }

        events.push({
          phase: 'initialization',
          module: module.class,
          timestamp,
        });
      } catch (error) {
        logger.error(`onApplicationShutdown failed for ${module.class.name}`, error as Error);
        events.push({
          phase: 'initialization',
          module: module.class,
          timestamp,
          error: error as Error,
        });
      }
    }

    return events;
  }

  /**
   * Check if value has onModuleInit method.
   */
  private static hasOnModuleInit(
    value: unknown
  ): value is { onModuleInit(): Promise<void> | void } {
    return (
      typeof value === 'object' &&
      value !== null &&
      'onModuleInit' in value &&
      typeof (value as any).onModuleInit === 'function'
    );
  }

  /**
   * Check if value has onApplicationBootstrap method.
   */
  private static hasOnApplicationBootstrap(
    value: unknown
  ): value is { onApplicationBootstrap(): Promise<void> | void } {
    return (
      typeof value === 'object' &&
      value !== null &&
      'onApplicationBootstrap' in value &&
      typeof (value as any).onApplicationBootstrap === 'function'
    );
  }

  /**
   * Check if value has onApplicationShutdown method.
   */
  private static hasOnApplicationShutdown(
    value: unknown
  ): value is { onApplicationShutdown(signal?: string): Promise<void> | void } {
    return (
      typeof value === 'object' &&
      value !== null &&
      'onApplicationShutdown' in value &&
      typeof (value as any).onApplicationShutdown === 'function'
    );
  }
}
