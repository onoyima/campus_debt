const { WebSocketServer } = require('ws');

class WebSocketService {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.clients = new Set();
  }

  attach(server) {
    this.wss = new WebSocketServer({ server });

    this.wss.on('connection', (ws, req) => {
      this.clients.add(ws);
      this.logger.info(`WebSocket client connected (${this.clients.size} total)`);

      ws.on('close', () => {
        this.clients.delete(ws);
        this.logger.info(`WebSocket client disconnected (${this.clients.size} remaining)`);
      });

      ws.on('error', (err) => {
        this.logger.error('WebSocket error', { error: err.message });
        this.clients.delete(ws);
      });

      ws.send(JSON.stringify({
        type: 'connected',
        message: 'Attendance Service WebSocket connected',
        serverTime: new Date().toISOString(),
      }));
    });

    this.logger.info(`WebSocket server attached to HTTP server`);
  }

  broadcast(event, data) {
    const message = JSON.stringify({ type: event, data, timestamp: new Date().toISOString() });
    for (const ws of this.clients) {
      try {
        ws.send(message);
      } catch (err) {
        this.clients.delete(ws);
      }
    }
  }

  broadcastAttendance(record) {
    this.broadcast('attendance_recorded', record);
  }

  broadcastDeviceStatus(deviceId, status) {
    this.broadcast('device_status', { device_id: deviceId, status });
  }

  broadcastSyncProgress(synced, total) {
    this.broadcast('sync_progress', { synced, total });
  }
}

module.exports = WebSocketService;
