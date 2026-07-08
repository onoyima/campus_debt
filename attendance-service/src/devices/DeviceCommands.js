class DeviceCommands {
  constructor(deviceManager, apiService, logger) {
    this.deviceManager = deviceManager;
    this.apiService = apiService;
    this.logger = logger;
  }

  async pollPendingCommands() {
    try {
      const commands = await this.apiService.getPendingCommands();
      for (const cmd of commands) {
        await this.executeCommand(cmd);
      }
    } catch (err) {
      this.logger.error('Failed to poll pending commands', { error: err.message });
    }
  }

  async executeCommand(command) {
    const { id, device_id, command: action, payload } = command;
    this.logger.info('Executing device command', { commandId: id, deviceId: device_id, action });

    try {
      const connection = this.deviceManager.getConnection(device_id);
      if (!connection || !connection.connected) {
        await this.apiService.reportCommandResult(id, 'failed', 'Device not connected');
        return;
      }

      let result;
      switch (action) {
        case 'restart':
          result = await this.executeRestart(connection);
          break;
        case 'sync_users':
          result = await this.executeSyncUsers(connection, payload);
          break;
        case 'clear_logs':
          result = await this.executeClearLogs(connection);
          break;
        case 'get_info':
          result = await this.executeGetInfo(connection);
          break;
        case 'enable':
          result = await this.executeEnable(connection);
          break;
        case 'disable':
          result = await this.executeDisable(connection);
          break;
        case 'pull_attendance':
          result = await this.executePullAttendance(connection);
          break;
        default:
          result = { success: false, error: `Unknown command: ${action}` };
      }

      await this.apiService.reportCommandResult(id, result.success ? 'completed' : 'failed', result);
    } catch (err) {
      this.logger.error('Command execution failed', { commandId: id, error: err.message });
      await this.apiService.reportCommandResult(id, 'failed', { error: err.message });
    }
  }

  async executeRestart(connection) {
    await connection.restart();
    return { success: true };
  }

  async executeSyncUsers(connection, payload) {
    const users = payload?.users || [];
    let synced = 0;
    for (const user of users) {
      const ok = await connection.sendUser(user.user_id, user.name || `User_${user.user_id}`);
      if (ok) synced++;
    }
    return { success: true, synced };
  }

  async executeClearLogs(connection) {
    await connection.clearAttendanceLog();
    return { success: true };
  }

  async executeGetInfo(connection) {
    const info = await connection.getDeviceInfo();
    return { success: true, data: info };
  }

  async executeEnable(connection) {
    await connection.enableDevice();
    return { success: true };
  }

  async executeDisable(connection) {
    await connection.disableDevice();
    return { success: true };
  }

  async executePullAttendance(connection) {
    const records = await connection.pullAttendance();
    for (const record of records) {
      this.deviceManager.emit('attendance', {
        deviceId: connection.deviceConfig.device_id,
        terminalId: connection.deviceConfig.id,
        ...record,
      });
    }
    return { success: true, count: records.length };
  }
}

module.exports = DeviceCommands;
