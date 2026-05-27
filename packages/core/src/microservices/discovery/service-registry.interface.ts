import type { ServiceAddress } from '../types.js';

export interface ServiceRegistry {
  resolve(serviceName: string): Promise<ServiceAddress[]>;
  watch(serviceName: string, callback: (addresses: ServiceAddress[]) => void): Promise<() => void>;
  register?(serviceName: string, address: ServiceAddress): Promise<void>;
  deregister?(serviceName: string, address: ServiceAddress): Promise<void>;
  close(): Promise<void>;
}
