import type { ServiceAddress } from '../types.js';
import { ServiceRegistry } from './service-registry.interface.js';
import { ServiceNotFoundException } from '../exceptions.js';

export interface DynamicRegistryConfig {
  registryUrl: string;
  registryType?: 'consul' | 'eureka' | 'custom';
  pollIntervalMs?: number;
  serviceName?: string;
  port?: number;
  metadata?: Record<string, string>;
}

export class DynamicRegistry implements ServiceRegistry {
  private cache: Record<string, ServiceAddress[]> = {};
  private watchers: Map<string, Set<Function>> = new Map();
  private pollTimers: Map<string, NodeJS.Timeout> = new Map();
  private config: DynamicRegistryConfig;

  constructor(config: DynamicRegistryConfig) {
    this.config = { pollIntervalMs: 10000, registryType: 'consul', ...config };
  }

  async resolve(serviceName: string): Promise<ServiceAddress[]> {
    if (this.cache[serviceName]) {
      return this.cache[serviceName];
    }
    const addresses = await this.fetchFromRegistry(serviceName);
    if (addresses.length === 0) {
      throw new ServiceNotFoundException(serviceName);
    }
    this.cache[serviceName] = addresses;
    return addresses;
  }

  async watch(
    serviceName: string,
    callback: (addresses: ServiceAddress[]) => void
  ): Promise<() => void> {
    if (!this.watchers.has(serviceName)) {
      this.watchers.set(serviceName, new Set());
    }
    this.watchers.get(serviceName)!.add(callback);

    if (!this.pollTimers.has(serviceName)) {
      this.startPolling(serviceName);
    }

    return async () => {
      this.watchers.get(serviceName)?.delete(callback);
      if (this.watchers.get(serviceName)?.size === 0) {
        const timer = this.pollTimers.get(serviceName);
        if (timer) {
          clearInterval(timer);
        }
        this.pollTimers.delete(serviceName);
      }
    };
  }

  async register(serviceName: string, address: ServiceAddress): Promise<void> {
    console.warn(`Registered ${serviceName} at ${address.host}:${address.port}`);
  }

  async deregister(serviceName: string, address: ServiceAddress): Promise<void> {
    console.warn(`Deregistered ${serviceName} from ${address.host}:${address.port}`);
  }

  async close(): Promise<void> {
    for (const timer of this.pollTimers.values()) {
      clearInterval(timer);
    }
    this.pollTimers.clear();
    this.watchers.clear();
    this.cache = {};
  }

  private startPolling(serviceName: string): void {
    const poll = async () => {
      try {
        const addresses = await this.fetchFromRegistry(serviceName);
        const oldAddresses = this.cache[serviceName];
        if (JSON.stringify(oldAddresses) !== JSON.stringify(addresses)) {
          this.cache[serviceName] = addresses;
          const callbacks = this.watchers.get(serviceName) || new Set();
          for (const callback of callbacks) {
            callback(addresses);
          }
        }
      } catch (error) {
        console.error(`Failed to fetch addresses for ${serviceName}:`, error);
      }
    };
    const timer = setInterval(() => {
      void poll();
    }, this.config.pollIntervalMs);
    this.pollTimers.set(serviceName, timer);
    void poll();
  }

  private async fetchFromRegistry(_serviceName: string): Promise<ServiceAddress[]> {
    return [];
  }
}

export function createDynamicRegistry(config: DynamicRegistryConfig): DynamicRegistry {
  return new DynamicRegistry(config);
}
