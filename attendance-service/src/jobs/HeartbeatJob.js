class HeartbeatJob {
  constructor(deviceManager, apiService, logger) {
    this.deviceManager = deviceManager;
    this.apiService = apiService;
    this.logger = logger;
  }

  async execute() {
    const devices = await this.deviceManager.getRegisteredDevices();
    let onlineCount = 0;
    let offlineCount = 0;

    for (const device of devices) {
      try {
        const result = await this.apiService.sendHeartbeat(device.id, {
          user_count: device.user_count,
          fingerprint_count: device.fingerprint_count,
          face_count: device.face_count,
          transaction_count: device.transaction_count,
        });

        if (result.success) {
          onlineCount++;
        }
      } catch (err) {
        offlineCount++;
        this.logger.warn(`Heartbeat failed for device ${device.device_id}`, {
          error: err.message,
        });
      }
    }

    this.logger.info(`Heartbeat cycle: ${onlineCount} online, ${offlineCount} offline`);
    return { online: onlineCount, offline: offlineCount };
  }
}

module.exports = HeartbeatJob;
