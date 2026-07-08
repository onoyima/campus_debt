const EventEmitter = require('events');
const ZktecoJs = require('zkteco-js');
const { COMMANDS } = require('zkteco-js/src/helper/command');

const METHOD_NAMES = {
  0: 'fingerprint',
  1: 'face',
  2: 'pin',
  3: 'card',
  15: 'password',
};

class ZKTConnection extends EventEmitter {
  constructor(deviceConfig, options = {}) {
    super();
    this.deviceConfig = deviceConfig;
    this.options = {
      timeout: options.timeout || 5000,
      reconnectInterval: options.reconnectInterval || 30000,
      ...options,
    };

    this.rawDevice = null;
    this.connected = false;
    this.reconnecting = false;
    this.lastActivity = null;
    this.attendanceListenerActive = false;
    this._watchdog = null;
  }

  async connect() {
    if (this.connected && this.rawDevice) return true;

    const { ip_address, port, device_id } = this.deviceConfig;

    this.rawDevice = new ZktecoJs(
      ip_address || device_id,
      port || 4370,
      this.options.timeout,
      4000
    );

    try {
      await this.rawDevice.createSocket();
      this.connected = true;
      this.lastActivity = new Date();
      this.emit('connected', { deviceId: device_id, id: this.deviceConfig.id });

      // ZK protocol: disable → register events → enable
      try { await this.rawDevice.disableDevice(); } catch (e) { /* may fail on some firmware */ }
      this.startAttendanceListener();
      try { await this.rawDevice.enableDevice(); } catch (e) { /* may fail on some firmware */ }

      this._startWatchdog();
      return true;
    } catch (err) {
      this.connected = false;
      this.rawDevice = null;
      const errMsg = (err.code || err.message || err.toString() || '').substring(0, 200);
      this.emit('error', { deviceId: device_id, error: errMsg || 'Connection failed' });
      return false;
    }
  }

  disconnect() {
    this._stopWatchdog();
    this.attendanceListenerActive = false;
    this.reconnecting = false;

    if (this.rawDevice) {
      try { this.rawDevice.disconnect(); } catch (e) { }
      this.rawDevice = null;
    }
    this.connected = false;
  }

  _startWatchdog() {
    this._stopWatchdog();
    this._watchdog = setInterval(() => {
      if (!this.rawDevice || !this.rawDevice.ztcp || !this.rawDevice.ztcp.socket) {
        if (this.connected) {
          this.connected = false;
          this.emit('disconnected', {
            deviceId: this.deviceConfig.device_id,
            id: this.deviceConfig.id,
            hadError: false,
          });
        }
        this._stopWatchdog();
      }
    }, 2000);
  }

  _stopWatchdog() {
    if (this._watchdog) {
      clearInterval(this._watchdog);
      this._watchdog = null;
    }
  }

  sendCommand(command, data = Buffer.alloc(0)) {
    if (!this.rawDevice || !this.connected) {
      throw new Error('Not connected');
    }
    this.rawDevice.executeCmd(command, data).catch(() => {});
    this.lastActivity = new Date();
  }

  async sendCommandWithResponse(command, data = Buffer.alloc(0)) {
    if (!this.rawDevice || !this.connected) {
      throw new Error('Not connected');
    }
    try {
      const result = await this.rawDevice.executeCmd(command, data);
      this.lastActivity = new Date();
      return result;
    } catch (e) {
      throw e;
    }
  }

  startAttendanceListener() {
    if (this.attendanceListenerActive || !this.rawDevice || !this.connected) return;
    this.attendanceListenerActive = true;

    try {
      this.rawDevice.getRealTimeLogs((event) => {
        this.lastActivity = new Date();
        if (event && event.userId) {
          this.emit('attendance', {
            deviceId: this.deviceConfig.device_id,
            terminalId: this.deviceConfig.id,
            user_id: event.userId,
            timestamp: event.attTime
              ? new Date(event.attTime).toISOString().replace('T', ' ').substring(0, 19)
              : new Date().toISOString().replace('T', ' ').substring(0, 19),
            method: 'fingerprint',
            status: 255,
          });
        }
      });
    } catch (e) {
      this.attendanceListenerActive = false;
    }
  }

  async pullAttendance() {
    if (!this.rawDevice || !this.connected) return [];
    try {
      const result = await this.rawDevice.getAttendances();
      this.lastActivity = new Date();
      return (result.data || []).map(record => ({
        user_id: String(record.user_id || ''),
        timestamp: new Date(record.record_time).toISOString().replace('T', ' ').substring(0, 19),
        method: METHOD_NAMES[record.type] || 'unknown',
        status: record.state != null ? record.state : 255,
        sn: record.sn || 0,
      }));
    } catch (e) {
      return [];
    }
  }

  async getDeviceInfo() {
    if (!this.rawDevice || !this.connected) return null;
    try {
      const info = await this.rawDevice.getInfo();
      this.lastActivity = new Date();
      return {
        userCount: info.userCounts,
        logCount: info.logCounts,
        logCapacity: info.logCapacity,
      };
    } catch (e) {
      return null;
    }
  }

  async sendUser(userId, name, privilege = 0) {
    if (!this.rawDevice || !this.connected) return false;
    try {
      await this.rawDevice.setUser(0, String(userId), String(name || ''), '', privilege);
      return true;
    } catch (e) {
      return false;
    }
  }

  async restart() {
    if (!this.rawDevice || !this.connected) return false;
    try {
      await this.rawDevice.executeCmd(COMMANDS.CMD_RESTART, '');
      return true;
    } catch (e) {
      return false;
    }
  }

  async clearAttendanceLog() {
    if (!this.rawDevice || !this.connected) return false;
    try {
      await this.rawDevice.clearAttendanceLog();
      return true;
    } catch (e) {
      return false;
    }
  }

  async enableDevice() {
    if (!this.rawDevice || !this.connected) return false;
    try {
      await this.rawDevice.enableDevice();
      return true;
    } catch (e) {
      return false;
    }
  }

  async disableDevice() {
    if (!this.rawDevice || !this.connected) return false;
    try {
      await this.rawDevice.disableDevice();
      return true;
    } catch (e) {
      return false;
    }
  }

  scheduleReconnect() {
    if (this.reconnecting) return;
    this.reconnecting = true;
    setTimeout(async () => {
      try {
        await this.connect();
      } catch (e) {
        // ignore
      }
      this.reconnecting = false;
    }, this.options.reconnectInterval);
  }
}

module.exports = ZKTConnection;
