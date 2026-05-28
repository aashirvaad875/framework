import type { DeveloperDashboard } from './server.js';

/**
 * WebSocket handler wrapper for the developer dashboard
 * Delegates all WebSocket operations to the dashboard instance
 */
export class WebSocketHandler {
  constructor(private dashboard: DeveloperDashboard) {}

  /**
   * Handle incoming WebSocket connection
   */
  handleConnection(ws: any): void {
    this.dashboard.handleWebSocket(ws);
  }
}
