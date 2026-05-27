import { createServer } from 'node:http';
import type { Server } from 'node:http';
import express from 'express';
import type { Application as ExpressApplication } from 'express';
import type { HttpAdapter } from './http-adapter.interface.js';

export class ExpressAdapter implements HttpAdapter<ExpressApplication, Server> {
  private express: ExpressApplication;
  private httpServer: Server | null = null;
  private globalPrefix = '';

  constructor() {
    this.express = express();
  }

  async init(): Promise<void> {
    this.express.use(express.json());
    this.express.use(express.urlencoded({ extended: true }));
  }

  get(path: string, ...handlers: unknown[]): void {
    (this.express.get as Function)(path, ...handlers);
  }

  post(path: string, ...handlers: unknown[]): void {
    (this.express.post as Function)(path, ...handlers);
  }

  put(path: string, ...handlers: unknown[]): void {
    (this.express.put as Function)(path, ...handlers);
  }

  delete(path: string, ...handlers: unknown[]): void {
    (this.express.delete as Function)(path, ...handlers);
  }

  patch(path: string, ...handlers: unknown[]): void {
    (this.express.patch as Function)(path, ...handlers);
  }

  use(...args: unknown[]): void {
    (this.express.use as Function)(...args);
  }

  useErrorHandler(handler: unknown): void {
    (this.express.use as Function)(handler);
  }

  async listen(port: number, host: string, callback?: () => void): Promise<Server> {
    return new Promise((resolve, reject) => {
      this.httpServer = createServer(this.express);

      this.httpServer.on('error', (error) => {
        reject(error);
      });

      this.httpServer.listen(port, host, () => {
        callback?.();
        resolve(this.httpServer!);
      });
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.httpServer) {
        resolve();
        return;
      }

      this.httpServer.close((error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  getInstance(): ExpressApplication {
    return this.express;
  }

  getHttpServer(): Server | null {
    return this.httpServer;
  }

  setGlobalPrefix(prefix: string): void {
    this.globalPrefix = prefix.startsWith('/') ? prefix : `/${prefix}`;
  }

  getGlobalPrefix(): string {
    return this.globalPrefix;
  }
}
