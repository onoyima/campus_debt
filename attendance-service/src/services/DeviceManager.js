const EventEmitter = require('events');
const ZKTConnection = require('../devices/ZKTConnection');
const DeviceListener = require('../devices/DeviceListener');
const DeviceCommands = require('../devices/DeviceCommands');
const ApiService = require('./ApiService');

class DeviceManager extends EventEmitter {
  constructor(config, syncService, cache, logger) {
    super();
    this.config = config;
    this.syncService = syncService;
    this.cache = cache;
    this.logger = logger;

    this.connections = new Map();
    this.apiService = new ApiService(config, logger);
    this.listener = new DeviceListener(this, syncService, logger);
    this.commands = new DeviceCommands(this, this.apiService, logger);

    this.on('attendance', (event) => this.listener.onAttendance(event));
  }

  async getRegisteredDevices() {
    const cached = this.cache.get('registered_devices');
    if (cached) return cached;

    try {
      const devices = await this.apiService.getDevices();
      this.cache.set('registered_devices', devices, 300000);
      return devices;
    } catch (err) {
      this.logger.error('Failed to fetch registered devices', { error: err.message });
      return [];
    }
  }

  async connectAndListen(deviceConfig) {
    const key = this.getDeviceKey(deviceConfig);

    if (this.connections.has(key)) {
      const existing = this.connections.get(key);
      if (existing.connected) return existing;
      existing.disconnect();
      this.connections.delete(key);
    }

    const connection = new ZKTConnection(deviceConfig, {
      timeout: this.config.zktConnectionTimeout,
      reconnectInterval: this.config.zktReconnectInterval,
    });

    connection.on('attendance', (event) => this.emit('attendance', event));
    connection.on('connected', (event) => this.listener.onConnected(event));
    connection.on('disconnected', (event) => this.listener.onDisconnected(event));
    connection.on('error', (event) => this.listener.onError(event));
    connection.on('timeout', (event) => this.listener.onTimeout(event));

    const ok = await connection.connect();
    if (ok) {
      this.connections.set(key, connection);
      this.logger.info(`Connected to device: ${deviceConfig.device_id} (${deviceConfig.ip_address}:${deviceConfig.port})`);
    }

    return connection;
  }

  getConnection(deviceId) {
    for (const [, conn] of this.connections) {
      if (conn.deviceConfig.device_id === deviceId) return conn;
    }
    return null;
  }

  getConnectedCount() {
    let count = 0;
    for (const [, conn] of this.connections) {
      if (conn.connected) count++;
    }
    return count;
  }

  disconnectAll() {
    for (const [key, conn] of this.connections) {
      conn.disconnect();
    }
    this.connections.clear();
    this.logger.info('All devices disconnected');
  }

  async checkHeartbeats() {
    const now = Date.now();
    const timeout = this.config.zktHeartbeatInterval;

    for (const [key, conn] of this.connections) {
      if (!conn.connected) continue;

      if (conn.lastActivity && (now - conn.lastActivity.getTime()) > timeout) {
        this.logger.warn(`Device heartbeat timeout: ${conn.deviceConfig.device_id}`);
        conn.disconnect();
        const device = conn.deviceConfig;
        this.connections.delete(key);
        await this.connectAndListen(device);
      }
    }
  }

  getDeviceKey(deviceConfig) {
    return `zkt_${deviceConfig.id || deviceConfig.serial_number || deviceConfig.device_id}`;
  }
}

module.exports = DeviceManager;
