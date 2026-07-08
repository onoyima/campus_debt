class AttendanceService {
  constructor(apiService, cache, syncService, logger) {
    this.apiService = apiService;
    this.cache = cache;
    this.syncService = syncService;
    this.logger = logger;
  }

  async verifyAndRecord(terminalId, userId, timestamp, method) {
    try {
      const result = await this.apiService.pushAttendance(terminalId, [
        { user_id: userId, timestamp, method },
      ]);

      if (result.success) {
        this.logger.info('Attendance recorded via API', {
          terminalId,
          userId,
          method,
          timestamp,
        });
        return { success: true, data: result };
      }

      this.logger.warn('API rejected attendance, queuing for retry', {
        terminalId,
        userId,
        reason: result.message,
      });

      this.syncService.enqueue('failed_attendance', {
        terminal_id: terminalId,
        user_id: userId,
        timestamp,
        method,
        error: result.message,
      });

      return { success: false, error: result.message };
    } catch (err) {
      this.logger.error('Failed to push attendance to API, caching offline', {
        terminalId,
        userId,
        error: err.message,
      });

      this.cache.addPendingAttendance(terminalId, userId, timestamp, method);
      return { success: false, error: 'Offline - queued for sync', queued: true };
    }
  }

  async getActiveEvents(terminalId) {
    try {
      return await this.apiService.getActiveEvents(terminalId);
    } catch (err) {
      this.logger.warn('Failed to fetch active events, using cached', { terminalId });
      return this.cache.get(`active_events_${terminalId}`) || [];
    }
  }

  async getTerminalConfig(terminalId) {
    try {
      return await this.apiService.getTerminalConfig(terminalId);
    } catch (err) {
      this.logger.warn('Failed to fetch terminal config, using cached', { terminalId });
      return this.cache.get(`terminal_config_${terminalId}`);
    }
  }
}

module.exports = AttendanceService;
