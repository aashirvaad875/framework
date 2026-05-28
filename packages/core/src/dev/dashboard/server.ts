import type {
  RequestSnapshot,
  ModuleDependency,
  WebSocketMessage,
  WebSocketEvent,
} from '../types.js';
import { RequestCapture } from '../debug/request-capture.js';
import { ModuleGraph } from '../debug/module-graph.js';
import { DASHBOARD_HTML } from './dashboard-ui.html.js';

interface Response {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(data?: string | Buffer): void;
}

interface DashboardMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  slowestRequest: number;
  fastestRequest: number;
  totalModules: number;
  totalCircularDependencies: number;
}

interface FormattedRequest {
  id: string;
  timestamp: number;
  method: string;
  path: string;
  status: number;
  responseTime: number;
  errorMessage?: string;
}

interface FormattedModule {
  id: string;
  filepath: string;
  type: string;
  imports: number;
  importedBy: number;
  exports: number;
}

interface WebSocketClient {
  send(message: WebSocketEvent): void;
  isAlive: boolean;
}

export class DeveloperDashboard {
  private requestCapture: RequestCapture;
  private moduleGraph: ModuleGraph;
  private wsClients: Set<WebSocketClient> = new Set();
  private wsSubscriptions: Map<WebSocketClient, Set<string>> = new Map();
  private metricsCache: DashboardMetrics | null = null;
  private metricsCacheTime: number = 0;
  private cacheDuration: number = 5000; // 5 seconds

  constructor(
    requestCapture: RequestCapture = new RequestCapture(),
    moduleGraph: ModuleGraph = new ModuleGraph()
  ) {
    this.requestCapture = requestCapture;
    this.moduleGraph = moduleGraph;
  }

  /**
   * Handle dashboard HTML request
   */
  handleDashboardRequest(_req: unknown, res: Response): void {
    // Security check
    if (process.env.NODE_ENV !== 'development') {
      res.statusCode = 403;
      res.end('Forbidden');
      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(DASHBOARD_HTML);
  }

  /**
   * Handle API requests list endpoint
   */
  handleApiRequests(_req: unknown, res: Response): void {
    // Security check
    if (process.env.NODE_ENV !== 'development') {
      res.statusCode = 403;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Forbidden' }));
      return;
    }

    const requests = this.requestCapture.getHistory();
    const formatted = this.formatRequests(requests);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(formatted));
  }

  /**
   * Handle API request detail endpoint
   */
  handleApiRequestDetail(_req: unknown, res: Response, id: string): void {
    // Security check
    if (process.env.NODE_ENV !== 'development') {
      res.statusCode = 403;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Forbidden' }));
      return;
    }

    const request = this.getRequestById(id);

    if (!request) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Request not found' }));
      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(request));
  }

  /**
   * Handle API modules endpoint
   */
  handleApiModules(_req: unknown, res: Response): void {
    // Security check
    if (process.env.NODE_ENV !== 'development') {
      res.statusCode = 403;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Forbidden' }));
      return;
    }

    const modules = this.moduleGraph.getGraph();
    const formatted = this.formatModules(modules);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(formatted));
  }

  /**
   * Handle API metrics endpoint
   */
  handleApiMetrics(_req: unknown, res: Response): void {
    // Security check
    if (process.env.NODE_ENV !== 'development') {
      res.statusCode = 403;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Forbidden' }));
      return;
    }

    const metrics = this.getMetrics();

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(metrics));
  }

  /**
   * Handle WebSocket connection and messages
   */
  handleWebSocket(ws: any): void {
    // Security check
    if (process.env.NODE_ENV !== 'development') {
      ws.close(1008, 'Forbidden');
      return;
    }

    const client: WebSocketClient = {
      send: (message: WebSocketEvent) => {
        try {
          ws.send(JSON.stringify(message));
        } catch (_err) {
          // Client may be disconnected
        }
      },
      isAlive: true,
    };

    this.wsClients.add(client);
    this.wsSubscriptions.set(client, new Set());

    ws.on('message', (data: Buffer) => {
      try {
        const message: WebSocketMessage = JSON.parse(data.toString());
        this.handleWebSocketMessage(client, message);
      } catch (_err) {
        // Invalid message format
      }
    });

    ws.on('close', () => {
      this.wsClients.delete(client);
      this.wsSubscriptions.delete(client);
    });

    ws.on('pong', () => {
      client.isAlive = true;
    });
  }

  /**
   * Handle WebSocket message
   */
  private handleWebSocketMessage(client: WebSocketClient, message: WebSocketMessage): void {
    switch (message.type) {
      case 'subscribe':
        if (message.channels) {
          const subscriptions = this.wsSubscriptions.get(client) || new Set();
          message.channels.forEach(ch => subscriptions.add(ch));
          this.wsSubscriptions.set(client, subscriptions);
        }
        break;
      case 'unsubscribe':
        if (message.channels) {
          const subscriptions = this.wsSubscriptions.get(client);
          if (subscriptions) {
            message.channels.forEach(ch => subscriptions.delete(ch));
          }
        }
        break;
      case 'ping':
        client.send({ type: 'metrics:updated', data: { ping: 'pong' } });
        break;
    }
  }

  /**
   * Broadcast event to subscribed clients
   */
  broadcastEvent(event: WebSocketEvent): void {
    const eventType = event.type;
    for (const client of this.wsClients) {
      const subscriptions = this.wsSubscriptions.get(client);
      if (subscriptions && subscriptions.has(eventType)) {
        client.send(event);
      }
    }
  }

  /**
   * Format requests for API response
   */
  private formatRequests(requests: RequestSnapshot[]): FormattedRequest[] {
    return requests.map(req => ({
      id: req.id,
      timestamp: req.timestamp,
      method: req.method,
      path: req.path,
      status: req.status,
      responseTime: req.responseTime,
      errorMessage: req.errorMessage,
    }));
  }

  /**
   * Format modules for API response
   */
  private formatModules(modules: ModuleDependency[]): FormattedModule[] {
    return modules.map(mod => ({
      id: mod.id,
      filepath: mod.filepath,
      type: mod.type,
      imports: mod.imports.length,
      importedBy: mod.importedBy.length,
      exports: mod.exports.length,
    }));
  }

  /**
   * Get request by ID
   */
  private getRequestById(id: string): RequestSnapshot | undefined {
    return this.requestCapture.getSnapshotById(id);
  }

  /**
   * Calculate metrics with caching
   */
  private getMetrics(): DashboardMetrics {
    const now = Date.now();
    if (this.metricsCache && now - this.metricsCacheTime < this.cacheDuration) {
      return this.metricsCache;
    }

    const requests = this.requestCapture.getHistory();
    const modules = this.moduleGraph.getGraph();

    const totalRequests = requests.length;
    let successfulRequests = 0;
    let failedRequests = 0;
    let totalResponseTime = 0;
    let slowestRequest = 0;
    let fastestRequest = Infinity;

    for (const req of requests) {
      if (req.status >= 200 && req.status < 300) {
        successfulRequests++;
      } else if (req.status >= 400) {
        failedRequests++;
      }

      totalResponseTime += req.responseTime;
      slowestRequest = Math.max(slowestRequest, req.responseTime);
      fastestRequest = Math.min(fastestRequest, req.responseTime);
    }

    const averageResponseTime = totalRequests > 0 ? totalResponseTime / totalRequests : 0;

    const metrics: DashboardMetrics = {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime: Math.round(averageResponseTime * 100) / 100,
      slowestRequest: slowestRequest === 0 ? 0 : slowestRequest,
      fastestRequest: fastestRequest === Infinity ? 0 : fastestRequest,
      totalModules: modules.length,
      totalCircularDependencies: this.moduleGraph.findCircularDeps().length,
    };

    this.metricsCache = metrics;
    this.metricsCacheTime = now;

    return metrics;
  }

  /**
   * Get request capture instance
   */
  getRequestCapture(): RequestCapture {
    return this.requestCapture;
  }

  /**
   * Get module graph instance
   */
  getModuleGraph(): ModuleGraph {
    return this.moduleGraph;
  }

  /**
   * Get active WebSocket client count
   */
  getActiveConnections(): number {
    return this.wsClients.size;
  }

  /**
   * Close all WebSocket connections
   */
  closeAllConnections(): void {
    for (const client of this.wsClients) {
      client.isAlive = false;
    }
    this.wsClients.clear();
    this.wsSubscriptions.clear();
  }
}
