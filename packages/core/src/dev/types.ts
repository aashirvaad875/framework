export interface MiddlewareTrace {
  name: string;
  duration: number;
  index: number;
}

export interface HandlerTrace {
  controller: string;
  method: string;
  duration: number;
  resultSize?: number;
}

export interface RequestSnapshot {
  id: string;
  timestamp: number;
  method: string;
  path: string;
  query: Record<string, unknown>;
  body: unknown;
  headers: Record<string, string>;
  status: number;
  responseTime: number;
  middlewareTraces: MiddlewareTrace[];
  handlerTrace: HandlerTrace;
  errorMessage?: string;
}

export interface ModuleDependency {
  id: string;
  filepath: string;
  imports: string[];
  importedBy: string[];
  type: 'module' | 'controller' | 'service' | 'provider' | 'dto';
  exports: string[];
}

export interface WatcherConfig {
  enabled: boolean;
  directories: string[];
  excludePatterns?: string[];
  debounceMs?: number;
}

export interface HotReloadConfig {
  enabled: boolean;
  directories: string[];
  debounceMs: number;
}

export interface DebugConfig {
  enabled: boolean;
  captureRequestBody: boolean;
  maxHistorySize: number;
}

export interface DashboardConfig {
  enabled: boolean;
  path: string;
  wsEnabled: boolean;
}

export interface DevToolingConfig {
  enabled: boolean;
  hotReload: HotReloadConfig;
  debug: DebugConfig;
  dashboard: DashboardConfig;
}

export interface FileChangeEvent {
  filepath: string;
  eventType: 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir';
}

export interface ModuleReloadResult {
  success: boolean;
  filepath: string;
  modules: string[];
  error?: string;
}

export interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'ping' | 'pong';
  channels?: string[];
}

export interface WebSocketEvent {
  type: 'request:captured' | 'module:reloaded' | 'metrics:updated' | 'error:occurred';
  data: unknown;
}
