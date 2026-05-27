import type { OnModuleInit, OnApplicationBootstrap, OnApplicationShutdown } from './lifecycle-hooks.js';

export class LifecycleRunner {
  private readonly instances: unknown[] = [];

  register(instance: unknown): void {
    this.instances.push(instance);
  }

  async runOnModuleInit(): Promise<void> {
    for (const instance of this.instances) {
      if (this.hasOnModuleInit(instance)) {
        await instance.onModuleInit();
      }
    }
  }

  async runOnApplicationBootstrap(): Promise<void> {
    for (const instance of this.instances) {
      if (this.hasOnApplicationBootstrap(instance)) {
        await instance.onApplicationBootstrap();
      }
    }
  }

  async runOnApplicationShutdown(signal?: string): Promise<void> {
    for (const instance of this.instances) {
      if (this.hasOnApplicationShutdown(instance)) {
        await instance.onApplicationShutdown(signal);
      }
    }
  }

  private hasOnModuleInit(value: unknown): value is OnModuleInit {
    return typeof value === 'object' && value !== null && 'onModuleInit' in value;
  }

  private hasOnApplicationBootstrap(value: unknown): value is OnApplicationBootstrap {
    return typeof value === 'object' && value !== null && 'onApplicationBootstrap' in value;
  }

  private hasOnApplicationShutdown(value: unknown): value is OnApplicationShutdown {
    return typeof value === 'object' && value !== null && 'onApplicationShutdown' in value;
  }
}
