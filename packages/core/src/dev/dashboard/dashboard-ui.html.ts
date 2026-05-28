/**
 * Development Dashboard HTML Template
 *
 * A comprehensive, self-contained dashboard for development tools including:
 * - Request inspector with detailed tracing
 * - Module dependency visualization
 * - Metrics and performance dashboard
 * - Hot reload status indicator
 * - WebSocket with polling fallback
 *
 * No external dependencies - vanilla JS and CSS only
 */

export const DASHBOARD_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Framework Development Dashboard</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    :root {
      --primary: #0066cc;
      --primary-dark: #0052a3;
      --primary-light: #e6f0ff;
      --success: #28a745;
      --warning: #ffc107;
      --danger: #dc3545;
      --info: #17a2b8;
      --text-primary: #212529;
      --text-secondary: #6c757d;
      --border: #dee2e6;
      --bg-light: #f8f9fa;
      --bg-white: #ffffff;
      --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.12);
      --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
      --shadow-lg: 0 10px 24px rgba(0, 0, 0, 0.15);
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: var(--bg-light);
      color: var(--text-primary);
      line-height: 1.5;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 0 16px;
    }

    /* Header */
    .header {
      background: var(--bg-white);
      border-bottom: 1px solid var(--border);
      padding: 20px 0;
      margin-bottom: 20px;
      box-shadow: var(--shadow-sm);
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .header-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
    }

    .header-title {
      font-size: 24px;
      font-weight: 600;
      color: var(--primary-dark);
    }

    .header-status {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 16px;
      background: var(--bg-light);
      border-radius: 6px;
    }

    .status-indicator {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }

    .status-indicator.connected {
      background: var(--success);
    }

    .status-indicator.disconnected {
      background: var(--danger);
      animation: none;
    }

    .status-indicator.polling {
      background: var(--warning);
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .status-text {
      font-size: 13px;
      font-weight: 500;
      color: var(--text-secondary);
    }

    /* Grid Layout */
    .dashboard-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
    }

    .dashboard-row {
      display: grid;
      grid-template-columns: 1fr;
      gap: 20px;
      margin-bottom: 20px;
    }

    @media (max-width: 1200px) {
      .dashboard-grid {
        grid-template-columns: 1fr;
      }
    }

    /* Card Styles */
    .card {
      background: var(--bg-white);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 20px;
      box-shadow: var(--shadow-sm);
      transition: all 0.3s ease;
    }

    .card:hover {
      box-shadow: var(--shadow-md);
    }

    .card-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 16px;
      color: var(--text-primary);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .card-subtitle {
      font-size: 13px;
      color: var(--text-secondary);
      font-weight: 500;
    }

    /* Request Inspector */
    .request-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 600px;
      overflow-y: auto;
    }

    .request-item {
      padding: 12px;
      border: 1px solid var(--border);
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
      background: var(--bg-white);
    }

    .request-item:hover {
      background: var(--primary-light);
      border-color: var(--primary);
    }

    .request-item.selected {
      background: var(--primary-light);
      border-color: var(--primary);
      border-width: 2px;
    }

    .request-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 6px;
    }

    .request-method {
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      min-width: 50px;
      text-align: center;
    }

    .request-method.GET {
      background: #e3f2fd;
      color: #1976d2;
    }

    .request-method.POST {
      background: #f3e5f5;
      color: #7b1fa2;
    }

    .request-method.PUT {
      background: #fff3e0;
      color: #e65100;
    }

    .request-method.DELETE {
      background: #ffebee;
      color: #c62828;
    }

    .request-method.PATCH {
      background: #fce4ec;
      color: #ad1457;
    }

    .request-path {
      flex: 1;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 13px;
      color: var(--text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .request-status {
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      min-width: 50px;
      text-align: center;
    }

    .request-status.success {
      background: #e8f5e9;
      color: #2e7d32;
    }

    .request-status.client-error {
      background: #fff3e0;
      color: #e65100;
    }

    .request-status.server-error {
      background: #ffebee;
      color: #c62828;
    }

    .request-meta {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 12px;
      color: var(--text-secondary);
    }

    .request-time {
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-weight: 500;
    }

    /* Request Details Panel */
    .request-details {
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-height: 600px;
      overflow-y: auto;
    }

    .details-section {
      border: 1px solid var(--border);
      border-radius: 6px;
      overflow: hidden;
    }

    .details-header {
      padding: 12px;
      background: var(--bg-light);
      border-bottom: 1px solid var(--border);
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
      user-select: none;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .details-header:hover {
      background: #e9ecef;
    }

    .details-header.collapsed + .details-body {
      display: none;
    }

    .details-body {
      padding: 12px;
      background: var(--bg-white);
    }

    .details-row {
      display: flex;
      padding: 8px 0;
      border-bottom: 1px solid var(--border);
    }

    .details-row:last-child {
      border-bottom: none;
    }

    .details-label {
      font-weight: 600;
      color: var(--text-secondary);
      min-width: 120px;
      font-size: 13px;
    }

    .details-value {
      flex: 1;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 13px;
      color: var(--text-primary);
      word-break: break-all;
    }

    .details-value.json {
      background: var(--bg-light);
      padding: 8px;
      border-radius: 4px;
      max-height: 200px;
      overflow-y: auto;
    }

    /* Metrics Display */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 12px;
    }

    .metric-box {
      background: var(--bg-light);
      padding: 12px;
      border-radius: 6px;
      border: 1px solid var(--border);
      text-align: center;
    }

    .metric-label {
      font-size: 12px;
      color: var(--text-secondary);
      font-weight: 500;
      margin-bottom: 8px;
    }

    .metric-value {
      font-size: 24px;
      font-weight: 700;
      color: var(--primary);
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    }

    .metric-unit {
      font-size: 12px;
      color: var(--text-secondary);
      margin-left: 4px;
    }

    /* Routes Table */
    .routes-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    .routes-table th {
      background: var(--bg-light);
      border-bottom: 2px solid var(--border);
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .routes-table td {
      padding: 12px;
      border-bottom: 1px solid var(--border);
    }

    .routes-table tbody tr:hover {
      background: var(--primary-light);
    }

    .route-method {
      font-weight: 600;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    }

    .route-path {
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      color: var(--primary);
    }

    .route-time {
      text-align: right;
      font-weight: 500;
    }

    .route-time.slow {
      color: var(--danger);
      font-weight: 700;
    }

    /* Module Graph */
    .module-graph {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 600px;
      overflow-y: auto;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 12px;
    }

    .module-node {
      padding: 8px 12px;
      background: var(--bg-light);
      border: 1px solid var(--border);
      border-radius: 4px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .module-node.circular {
      background: #ffebee;
      border-color: var(--danger);
    }

    .module-icon {
      font-size: 16px;
      min-width: 20px;
    }

    .module-name {
      flex: 1;
      color: var(--text-primary);
      font-weight: 600;
    }

    .module-count {
      background: var(--primary);
      color: white;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
    }

    .module-deps {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 4px;
      padding: 0 20px;
    }

    .module-dep-tag {
      background: white;
      border: 1px solid var(--border);
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 11px;
      color: var(--text-secondary);
    }

    /* Filters */
    .filter-bar {
      display: flex;
      gap: 12px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }

    .filter-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .filter-label {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .filter-input,
    .filter-select {
      padding: 6px 12px;
      border: 1px solid var(--border);
      border-radius: 4px;
      font-size: 13px;
      background: var(--bg-white);
      color: var(--text-primary);
      font-family: inherit;
    }

    .filter-input:focus,
    .filter-select:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px var(--primary-light);
    }

    .filter-button {
      padding: 6px 12px;
      background: var(--primary);
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .filter-button:hover {
      background: var(--primary-dark);
    }

    .filter-button:active {
      transform: scale(0.98);
    }

    /* Empty State */
    .empty-state {
      padding: 40px 20px;
      text-align: center;
      color: var(--text-secondary);
    }

    .empty-state-icon {
      font-size: 48px;
      margin-bottom: 12px;
      opacity: 0.3;
    }

    .empty-state-text {
      font-size: 14px;
    }

    /* Scrollbar Styling */
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }

    ::-webkit-scrollbar-track {
      background: transparent;
    }

    ::-webkit-scrollbar-thumb {
      background: var(--border);
      border-radius: 4px;
    }

    ::-webkit-scrollbar-thumb:hover {
      background: var(--text-secondary);
    }

    /* Responsive */
    @media (max-width: 768px) {
      .dashboard-grid {
        grid-template-columns: 1fr;
      }

      .header-content {
        flex-direction: column;
        align-items: flex-start;
      }

      .filter-bar {
        flex-direction: column;
      }

      .filter-group {
        width: 100%;
      }

      .filter-input,
      .filter-select {
        width: 100%;
      }

      .metrics-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .request-list,
      .request-details,
      .module-graph {
        max-height: 400px;
      }
    }

    /* Animations */
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .card {
      animation: fadeIn 0.3s ease;
    }

    /* Badge Styles */
    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
    }

    .badge.success {
      background: #e8f5e9;
      color: #2e7d32;
    }

    .badge.danger {
      background: #ffebee;
      color: #c62828;
    }

    .badge.warning {
      background: #fff3e0;
      color: #e65100;
    }

    .badge.info {
      background: #e3f2fd;
      color: #1976d2;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="container">
      <div class="header-content">
        <h1 class="header-title">🛠 Framework Dev Dashboard</h1>
        <div class="header-status">
          <div class="status-indicator connected" id="connectionStatus"></div>
          <div class="status-text" id="connectionText">Connected (WebSocket)</div>
        </div>
      </div>
    </div>
  </div>

  <div class="container">
    <!-- Metrics Overview -->
    <div class="dashboard-row">
      <div class="card">
        <div class="card-title">
          📊 Performance Metrics
        </div>
        <div class="metrics-grid" id="metricsGrid">
          <div class="metric-box">
            <div class="metric-label">Total Requests</div>
            <div class="metric-value" id="totalRequests">0</div>
          </div>
          <div class="metric-box">
            <div class="metric-label">Avg Response Time</div>
            <div class="metric-value" id="avgResponseTime">0<span class="metric-unit">ms</span></div>
          </div>
          <div class="metric-box">
            <div class="metric-label">Slowest Route</div>
            <div class="metric-value" id="slowestRoute">-<span class="metric-unit">ms</span></div>
          </div>
          <div class="metric-box">
            <div class="metric-label">Error Rate</div>
            <div class="metric-value" id="errorRate">0<span class="metric-unit">%</span></div>
          </div>
          <div class="metric-box">
            <div class="metric-label">Active Modules</div>
            <div class="metric-value" id="activeModules">0</div>
          </div>
          <div class="metric-box">
            <div class="metric-label">Memory Usage</div>
            <div class="metric-value" id="memoryUsage">0<span class="metric-unit">MB</span></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Grid -->
    <div class="dashboard-grid">
      <!-- Request Inspector -->
      <div class="card">
        <div class="card-title">
          📋 Request Inspector
          <span class="card-subtitle" id="requestCount" style="font-weight: normal; margin: 0;">0 requests</span>
        </div>
        <div class="filter-bar">
          <div class="filter-group" style="flex: 1;">
            <input type="text" id="pathFilter" class="filter-input" placeholder="Filter by path..." style="flex: 1;">
          </div>
          <div class="filter-group">
            <select id="methodFilter" class="filter-select">
              <option value="">All Methods</option>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
              <option value="PATCH">PATCH</option>
            </select>
          </div>
        </div>
        <div class="request-list" id="requestList">
          <div class="empty-state">
            <div class="empty-state-icon">📭</div>
            <div class="empty-state-text">No requests captured yet</div>
          </div>
        </div>
      </div>

      <!-- Request Details -->
      <div class="card">
        <div class="card-title">
          🔍 Request Details
        </div>
        <div class="request-details" id="requestDetails">
          <div class="empty-state">
            <div class="empty-state-icon">👈</div>
            <div class="empty-state-text">Select a request to view details</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Slowest Routes -->
    <div class="card" style="margin-bottom: 20px;">
      <div class="card-title">
        🐢 Slowest Routes (Top 10)
      </div>
      <table class="routes-table" id="slowestRoutesTable">
        <thead>
          <tr>
            <th>Method</th>
            <th>Path</th>
            <th>Handler</th>
            <th style="width: 100px;">Avg Time</th>
            <th style="width: 100px;">Calls</th>
          </tr>
        </thead>
        <tbody id="slowestRoutesBody">
          <tr>
            <td colspan="5" style="text-align: center; padding: 40px; color: var(--text-secondary);">
              No route data yet
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Module Dependencies -->
    <div class="dashboard-grid">
      <div class="card">
        <div class="card-title">
          🧩 Module Dependencies
          <span class="card-subtitle" id="moduleCount" style="font-weight: normal; margin: 0;">0 modules</span>
        </div>
        <div class="module-graph" id="moduleGraph">
          <div class="empty-state">
            <div class="empty-state-icon">📦</div>
            <div class="empty-state-text">No module data available</div>
          </div>
        </div>
      </div>

      <!-- Middleware Performance -->
      <div class="card">
        <div class="card-title">
          ⚙️ Middleware Performance
        </div>
        <table class="routes-table" id="middlewareTable">
          <thead>
            <tr>
              <th>Middleware</th>
              <th style="width: 120px;">Avg Time</th>
              <th style="width: 80px;">Calls</th>
            </tr>
          </thead>
          <tbody id="middlewareBody">
            <tr>
              <td colspan="3" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                No middleware data yet
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <script>
    /**
     * Development Dashboard JavaScript
     * Handles WebSocket/polling, request tracking, metrics calculation
     */

    class DevelopmentDashboard {
      constructor() {
        this.requests = [];
        this.modules = [];
        this.middlewareStats = {};
        this.routeStats = {};
        this.maxRequests = 100;
        this.ws = null;
        this.pollInterval = null;
        this.isConnected = false;
        this.isPolling = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.filterPath = '';
        this.filterMethod = '';
        this.selectedRequestId = null;

        this.init();
      }

      init() {
        this.setupEventListeners();
        this.connectWebSocket();
        // Fallback to polling if WebSocket doesn't connect after 3 seconds
        setTimeout(() => {
          if (!this.isConnected && !this.isPolling) {
            this.startPolling();
          }
        }, 3000);
      }

      setupEventListeners() {
        document.getElementById('pathFilter').addEventListener('input', (e) => {
          this.filterPath = e.target.value.toLowerCase();
          this.renderRequestList();
        });

        document.getElementById('methodFilter').addEventListener('change', (e) => {
          this.filterMethod = e.target.value;
          this.renderRequestList();
        });
      }

      connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = \`\${protocol}//\${window.location.host}/_dev/ws\`;

        try {
          this.ws = new WebSocket(wsUrl);

          this.ws.onopen = () => {
            this.isConnected = true;
            this.isPolling = false;
            this.reconnectAttempts = 0;
            this.updateConnectionStatus('connected');
            if (this.pollInterval) {
              clearInterval(this.pollInterval);
              this.pollInterval = null;
            }
            // Subscribe to all channels
            this.ws.send(JSON.stringify({
              type: 'subscribe',
              channels: ['requests', 'modules', 'metrics']
            }));
          };

          this.ws.onmessage = (event) => {
            try {
              const message = JSON.parse(event.data);
              this.handleMessage(message);
            } catch (e) {
              console.error('Failed to parse WebSocket message:', e);
            }
          };

          this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
          };

          this.ws.onclose = () => {
            this.isConnected = false;
            this.handleDisconnect();
          };
        } catch (e) {
          console.error('Failed to create WebSocket:', e);
          this.startPolling();
        }
      }

      handleDisconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          setTimeout(() => {
            this.connectWebSocket();
          }, this.reconnectDelay * this.reconnectAttempts);
        } else {
          this.startPolling();
        }
      }

      startPolling() {
        if (this.isPolling) return;
        this.isPolling = true;
        this.updateConnectionStatus('polling');

        this.pollInterval = setInterval(async () => {
          try {
            const response = await fetch('/_dev/api/snapshot');
            if (response.ok) {
              const data = await response.json();
              this.handleSnapshot(data);
            }
          } catch (e) {
            console.error('Polling error:', e);
          }
        }, 2000);
      }

      handleMessage(message) {
        if (message.type === 'request:captured') {
          this.addRequest(message.data);
        } else if (message.type === 'metrics:updated') {
          this.updateMetrics(message.data);
        } else if (message.type === 'module:reloaded') {
          this.updateModules(message.data);
        }
      }

      handleSnapshot(data) {
        if (data.requests) {
          this.requests = data.requests.slice(-this.maxRequests);
          this.renderRequestList();
          this.calculateMetrics();
        }
        if (data.modules) {
          this.modules = data.modules;
          this.renderModuleGraph();
        }
      }

      addRequest(request) {
        this.requests.unshift(request);
        if (this.requests.length > this.maxRequests) {
          this.requests = this.requests.slice(0, this.maxRequests);
        }
        this.renderRequestList();
        this.calculateMetrics();
      }

      updateMetrics(metrics) {
        // Update any additional metrics from the server
        this.calculateMetrics();
      }

      updateModules(modules) {
        this.modules = modules;
        this.renderModuleGraph();
      }

      calculateMetrics() {
        const totalRequests = this.requests.length;
        const successCount = this.requests.filter(r => r.status < 400).length;
        const errorCount = this.requests.filter(r => r.status >= 400).length;

        const avgResponseTime = totalRequests > 0
          ? Math.round(this.requests.reduce((sum, r) => sum + r.responseTime, 0) / totalRequests)
          : 0;

        const slowestRoute = totalRequests > 0
          ? Math.max(...this.requests.map(r => r.responseTime))
          : 0;

        const errorRate = totalRequests > 0
          ? Math.round((errorCount / totalRequests) * 100)
          : 0;

        // Calculate route stats
        const routeMap = {};
        this.requests.forEach(req => {
          const key = \`\${req.method} \${req.path}\`;
          if (!routeMap[key]) {
            routeMap[key] = {
              method: req.method,
              path: req.path,
              handler: req.handlerTrace.controller + '.' + req.handlerTrace.method,
              times: [],
              count: 0
            };
          }
          routeMap[key].times.push(req.responseTime);
          routeMap[key].count++;
        });

        this.routeStats = routeMap;

        // Calculate middleware stats
        const middlewareMap = {};
        this.requests.forEach(req => {
          req.middlewareTraces.forEach(trace => {
            if (!middlewareMap[trace.name]) {
              middlewareMap[trace.name] = { times: [], count: 0 };
            }
            middlewareMap[trace.name].times.push(trace.duration);
            middlewareMap[trace.name].count++;
          });
        });

        this.middlewareStats = middlewareMap;

        // Update UI
        document.getElementById('totalRequests').textContent = totalRequests;
        document.getElementById('avgResponseTime').innerHTML = \`\${avgResponseTime}<span class="metric-unit">ms</span>\`;
        document.getElementById('slowestRoute').innerHTML = \`\${slowestRoute}<span class="metric-unit">ms</span>\`;
        document.getElementById('errorRate').innerHTML = \`\${errorRate}<span class="metric-unit">%</span>\`;
        document.getElementById('activeModules').textContent = this.modules.length;
        document.getElementById('memoryUsage').innerHTML = \`\${this.getMemoryUsage()}<span class="metric-unit">MB</span>\`;
        document.getElementById('requestCount').textContent = \`\${totalRequests} requests\`;
        document.getElementById('moduleCount').textContent = \`\${this.modules.length} modules\`;

        this.renderSlowestRoutes();
        this.renderMiddlewareTable();
      }

      getMemoryUsage() {
        if (performance.memory) {
          return Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
        }
        return 0;
      }

      renderRequestList() {
        const container = document.getElementById('requestList');
        const filtered = this.requests.filter(req => {
          const pathMatch = req.path.toLowerCase().includes(this.filterPath);
          const methodMatch = !this.filterMethod || req.method === this.filterMethod;
          return pathMatch && methodMatch;
        });

        if (filtered.length === 0) {
          container.innerHTML = \`
            <div class="empty-state">
              <div class="empty-state-icon">🔍</div>
              <div class="empty-state-text">No requests match filters</div>
            </div>
          \`;
          return;
        }

        container.innerHTML = filtered.map(req => \`
          <div class="request-item \${this.selectedRequestId === req.id ? 'selected' : ''}" data-request-id="\${req.id}">
            <div class="request-header">
              <span class="request-method \${req.method}">\${req.method}</span>
              <span class="request-path">\${req.path}</span>
              <span class="request-status \${req.status < 400 ? 'success' : req.status < 500 ? 'client-error' : 'server-error'}">\${req.status}</span>
            </div>
            <div class="request-meta">
              <span class="request-time">\${req.responseTime}ms</span>
              <span>\${new Date(req.timestamp).toLocaleTimeString()}</span>
            </div>
          </div>
        \`).join('');

        container.querySelectorAll('.request-item').forEach(item => {
          item.addEventListener('click', () => {
            const id = item.getAttribute('data-request-id');
            this.selectRequest(id);
          });
        });
      }

      selectRequest(id) {
        this.selectedRequestId = id;
        this.renderRequestList();
        this.renderRequestDetails();
      }

      renderRequestDetails() {
        const container = document.getElementById('requestDetails');
        const request = this.requests.find(r => r.id === this.selectedRequestId);

        if (!request) {
          container.innerHTML = \`
            <div class="empty-state">
              <div class="empty-state-icon">👈</div>
              <div class="empty-state-text">Select a request to view details</div>
            </div>
          \`;
          return;
        }

        const middlewareHtml = request.middlewareTraces.map(trace => \`
          <div class="details-row">
            <div class="details-label">\${trace.name}</div>
            <div class="details-value">\${trace.duration}ms</div>
          </div>
        \`).join('');

        container.innerHTML = \`
          <div class="details-section">
            <div class="details-header">Request Info</div>
            <div class="details-body">
              <div class="details-row">
                <div class="details-label">Method</div>
                <div class="details-value">\${request.method}</div>
              </div>
              <div class="details-row">
                <div class="details-label">Path</div>
                <div class="details-value">\${request.path}</div>
              </div>
              <div class="details-row">
                <div class="details-label">Status</div>
                <div class="details-value">\${request.status}</div>
              </div>
              <div class="details-row">
                <div class="details-label">Response Time</div>
                <div class="details-value">\${request.responseTime}ms</div>
              </div>
              <div class="details-row">
                <div class="details-label">Timestamp</div>
                <div class="details-value">\${new Date(request.timestamp).toLocaleString()}</div>
              </div>
            </div>
          </div>

          <div class="details-section">
            <div class="details-header">Handler</div>
            <div class="details-body">
              <div class="details-row">
                <div class="details-label">Controller</div>
                <div class="details-value">\${request.handlerTrace.controller}</div>
              </div>
              <div class="details-row">
                <div class="details-label">Method</div>
                <div class="details-value">\${request.handlerTrace.method}</div>
              </div>
              <div class="details-row">
                <div class="details-label">Duration</div>
                <div class="details-value">\${request.handlerTrace.duration}ms</div>
              </div>
            </div>
          </div>

          <div class="details-section">
            <div class="details-header">Middleware (\${request.middlewareTraces.length})</div>
            <div class="details-body">
              \${middlewareHtml || '<div style="color: var(--text-secondary); font-size: 12px;">No middleware traces</div>'}
            </div>
          </div>

          \${request.errorMessage ? \`
            <div class="details-section">
              <div class="details-header">Error</div>
              <div class="details-body">
                <div class="details-value json">\${this.escapeHtml(request.errorMessage)}</div>
              </div>
            </div>
          \` : ''}

          <div class="details-section">
            <div class="details-header">Query Parameters</div>
            <div class="details-body">
              \${Object.keys(request.query).length > 0
                ? Object.entries(request.query).map(([k, v]) => \`
                    <div class="details-row">
                      <div class="details-label">\${k}</div>
                      <div class="details-value">\${JSON.stringify(v)}</div>
                    </div>
                  \`).join('')
                : '<div style="color: var(--text-secondary); font-size: 12px;">No query parameters</div>'}
            </div>
          </div>

          <div class="details-section">
            <div class="details-header">Headers</div>
            <div class="details-body">
              \${Object.entries(request.headers).map(([k, v]) => \`
                <div class="details-row">
                  <div class="details-label">\${k}</div>
                  <div class="details-value">\${this.escapeHtml(String(v))}</div>
                </div>
              \`).join('')}
            </div>
          </div>
        \`;
      }

      renderSlowestRoutes() {
        const tbody = document.getElementById('slowestRoutesBody');
        const routes = Object.values(this.routeStats)
          .map(route => ({
            ...route,
            avg: Math.round(route.times.reduce((a, b) => a + b, 0) / route.times.length)
          }))
          .sort((a, b) => b.avg - a.avg)
          .slice(0, 10);

        if (routes.length === 0) {
          tbody.innerHTML = \`
            <tr>
              <td colspan="5" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                No route data yet
              </td>
            </tr>
          \`;
          return;
        }

        tbody.innerHTML = routes.map(route => \`
          <tr>
            <td><span class="request-method \${route.method}">\${route.method}</span></td>
            <td><span class="route-path">\${route.path}</span></td>
            <td>\${route.handler}</td>
            <td class="route-time \${route.avg > 500 ? 'slow' : ''}">\${route.avg}ms</td>
            <td style="text-align: center;">\${route.count}</td>
          </tr>
        \`).join('');
      }

      renderMiddlewareTable() {
        const tbody = document.getElementById('middlewareBody');
        const middleware = Object.entries(this.middlewareStats)
          .map(([name, stats]) => ({
            name,
            avg: Math.round(stats.times.reduce((a, b) => a + b, 0) / stats.times.length),
            count: stats.count
          }))
          .sort((a, b) => b.avg - a.avg);

        if (middleware.length === 0) {
          tbody.innerHTML = \`
            <tr>
              <td colspan="3" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                No middleware data yet
              </td>
            </tr>
          \`;
          return;
        }

        tbody.innerHTML = middleware.map(m => \`
          <tr>
            <td>\${m.name}</td>
            <td class="route-time \${m.avg > 100 ? 'slow' : ''}">\${m.avg}ms</td>
            <td style="text-align: center;">\${m.count}</td>
          </tr>
        \`).join('');
      }

      renderModuleGraph() {
        const container = document.getElementById('moduleGraph');

        if (this.modules.length === 0) {
          container.innerHTML = \`
            <div class="empty-state">
              <div class="empty-state-icon">📦</div>
              <div class="empty-state-text">No module data available</div>
            </div>
          \`;
          return;
        }

        // Detect circular dependencies
        const circularModules = new Set();
        this.modules.forEach(mod => {
          const hasCircular = this.hasCircularDependency(mod.id);
          if (hasCircular) {
            circularModules.add(mod.id);
          }
        });

        container.innerHTML = this.modules.map(module => \`
          <div class="module-node \${circularModules.has(module.id) ? 'circular' : ''}">
            <span class="module-icon">
              \${module.type === 'controller' ? '🎮' :
                module.type === 'service' ? '⚙️' :
                module.type === 'provider' ? '📌' :
                module.type === 'dto' ? '📦' : '📄'}
            </span>
            <span class="module-name">\${module.id}</span>
            <span class="module-count">\${module.imports.length}</span>
          </div>
          \${module.imports.length > 0 ? \`
            <div class="module-deps">
              \${module.imports.slice(0, 5).map(dep => \`
                <span class="module-dep-tag">\${dep}</span>
              \`).join('')}
              \${module.imports.length > 5 ? \`<span class="module-dep-tag">+\${module.imports.length - 5} more</span>\` : ''}
            </div>
          \` : ''}
        \`).join('');
      }

      hasCircularDependency(moduleId, visited = new Set(), path = new Set()) {
        if (visited.has(moduleId)) return false;
        if (path.has(moduleId)) return true;

        visited.add(moduleId);
        path.add(moduleId);

        const module = this.modules.find(m => m.id === moduleId);
        if (module) {
          for (const dep of module.imports) {
            if (this.hasCircularDependency(dep, visited, new Set(path))) {
              return true;
            }
          }
        }

        path.delete(moduleId);
        return false;
      }

      updateConnectionStatus(status) {
        const indicator = document.getElementById('connectionStatus');
        const text = document.getElementById('connectionText');

        indicator.className = 'status-indicator ' + status;
        if (status === 'connected') {
          text.textContent = 'Connected (WebSocket)';
        } else if (status === 'polling') {
          text.textContent = 'Polling (WebSocket unavailable)';
        } else {
          text.textContent = 'Disconnected';
        }
      }

      escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      }
    }

    // Initialize dashboard when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        new DevelopmentDashboard();
      });
    } else {
      new DevelopmentDashboard();
    }
  </script>
</body>
</html>
`;
