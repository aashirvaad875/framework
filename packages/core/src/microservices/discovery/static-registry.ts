import type { ServiceAddress } from '../types.js';
import { ServiceRegistry } from './service-registry.interface.js';
import { ServiceNotFoundException } from '../exceptions.js';

export class StaticRegistry implements ServiceRegistry {
  private services: Record<string, ServiceAddress[]>;

  constructor(config: Record<string, unknown>) {
    this.services = {};
    this.parseConfig(config);
  }

  private parseConfig(config: Record<string, unknown>): void {
    for (const [serviceName, addressStr] of Object.entries(config)) {
      if (typeof addressStr === 'string') {
        const [host, portStr] = addressStr.split(':');
        const port = parseInt(portStr, 10);
        this.services[serviceName] = [{ host, port }];
      } else if (Array.isArray(addressStr)) {
        this.services[serviceName] = addressStr as ServiceAddress[];
      }
    }
  }

  async resolve(serviceName: string): Promise<ServiceAddress[]> {
    const addresses = this.services[serviceName];
    if (!addresses || addresses.length === 0) {
      throw new ServiceNotFoundException(serviceName);
    }
    return addresses;
  }

  async watch(
    serviceName: string,
    callback: (addresses: ServiceAddress[]) => void
  ): Promise<() => void> {
    const addresses = await this.resolve(serviceName);
    callback(addresses);
    return async () => {};
  }

  async close(): Promise<void> {}
}

export function createStaticRegistry(config: Record<string, unknown>): StaticRegistry {
  return new StaticRegistry(config);
}
