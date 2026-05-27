import type { Server } from 'node:http';

export interface HttpAdapter<TInstance = unknown, TServer = Server> {
  init(): void | Promise<void>;
  get(path: string, ...handlers: unknown[]): void;
  post(path: string, ...handlers: unknown[]): void;
  put(path: string, ...handlers: unknown[]): void;
  delete(path: string, ...handlers: unknown[]): void;
  patch(path: string, ...handlers: unknown[]): void;
  use(...args: unknown[]): void;
  useErrorHandler(handler: unknown): void;
  listen(port: number, host: string, callback?: () => void): Promise<TServer>;
  close(): Promise<void>;
  getInstance(): TInstance;
  getHttpServer(): TServer | null;
  setGlobalPrefix(prefix: string): void;
  getGlobalPrefix(): string;
}
