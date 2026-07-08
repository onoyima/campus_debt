class DeviceListener {
  constructor(deviceManager, syncService, logger) {
    this.deviceManager = deviceManager;
    this.syncService = syncService;
    this.logger = logger;
  }

  onAttendance(event) {
    this.logger.info('Attendance event received from device', {
      deviceId: event.deviceId,
      userId: event.user_id,
      method: event.method,
      timestamp: event.timestamp,
    });

    this.syncService.enqueue('attendance', {
      terminal_id: event.terminalId,
      user_id: event.user_id,
      timestamp: event.timestamp,
      method: event.method,
      status: event.status,
      received_at: new Date().toISOString(),
    });
  }

  onConnected({ deviceId, id }) {
    this.logger.info(`Device connected: ${deviceId} (ID: ${id})`);
  }

  onDisconnected({ deviceId, id, hadError }) {
    this.logger.warn(`Device disconnected: ${deviceId} (ID: ${id})`, { hadError });
  }

  onError({ deviceId, error }) {
    this.logger.error(`Device error: ${deviceId}`, { error });
  }

  onTimeout({ deviceId }) {
    this.logger.warn(`Device timeout: ${deviceId}`);
  }
}

module.exports = DeviceListener;
