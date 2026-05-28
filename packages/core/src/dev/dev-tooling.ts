import type { Application } from '../application.js';
import type { MiddlewarePipeline } from '../http/index.js';
import type { DevToolingConfig } from './types.js';
import { getDefaultDevToolingConfig } from './config.js';
import { FileWatcher } from './hot-reload/file-watcher.js';
import { ModuleReloader } from './hot-reload/module-reloader.js';
import { RequestCapture } from './debug/request-capture.js';
import { ModuleGraph } from './debug/module-graph.js';
import { DeveloperDashboard } from './dashboard/server.js';
import { EventBus } from '../events/index.js';

export class DevTooling {
  private config: DevToolingConfig;
  private fileWatcher?: FileWatcher;
  private moduleReloader?: ModuleReloader;
  private requestCapture?: RequestCapture;
  private moduleGraph?: ModuleGraph;
  private dashboard?: DeveloperDashboard;
  private eventBus: EventBus;
  private enabled: boolean = false;

  constructor(config?: Partial<DevToolingConfig>) {
    this.config = { ...getDefaultDevToolingConfig(), ...config };
    this.eventBus = new EventBus();
    this.enabled = this.config.enabled;
  }

  async initialize(app?: Application, _pipeline?: MiddlewarePipeline): Promise<void> {
    if (!this.enabled) {
      return;
    }

    if (this.config.hotReload.enabled) {
      this.fileWatcher = new FileWatcher();
      this.moduleReloader = new ModuleReloader();
      this.fileWatcher.on('change', event => {
        void this.moduleReloader?.reload(event.filepath).then(result => {
          void this.eventBus.emit('module:reloaded', result);
        });
      });
      this.fileWatcher.watch(this.config.hotReload);
    }

    if (this.config.debug.enabled) {
      this.requestCapture = new RequestCapture();
      this.moduleGraph = new ModuleGraph();
    }

    if (this.config.dashboard.enabled && app) {
      this.dashboard = new DeveloperDashboard(
        this.requestCapture,
        this.moduleGraph,
        this.config.dashboard.path
      );
    }
  }

  getFileWatcher(): FileWatcher | undefined {
    return this.fileWatcher;
  }

  getModuleReloader(): ModuleReloader | undefined {
    return this.moduleReloader;
  }

  getRequestCapture(): RequestCapture | undefined {
    return this.requestCapture;
  }

  getModuleGraph(): ModuleGraph | undefined {
    return this.moduleGraph;
  }

  getDashboard(): DeveloperDashboard | undefined {
    return this.dashboard;
  }

  getEventBus(): EventBus {
    return this.eventBus;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async shutdown(): Promise<void> {
    if (this.fileWatcher) {
      await this.fileWatcher.stop();
    }
    if (this.dashboard) {
      this.dashboard.closeAllConnections();
    }
    this.moduleReloader?.clear();
  }
}
