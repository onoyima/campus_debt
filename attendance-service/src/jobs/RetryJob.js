class RetryJob {
  constructor(cache, syncService, logger) {
    this.cache = cache;
    this.syncService = syncService;
    this.logger = logger;
  }

  async execute() {
    const pendingAttendance = this.cache.getPendingAttendance();

    if (pendingAttendance.length === 0) return 0;

    let retried = 0;
    for (const record of pendingAttendance) {
      try {
        this.syncService.enqueue('attendance', {
          terminal_id: record.terminal_id,
          user_id: record.user_id,
          timestamp: record.timestamp,
          method: record.method,
        });
        retried++;
      } catch (err) {
        this.logger.error('Retry failed for attendance record', {
          id: record.id,
          error: err.message,
        });
      }
    }

    this.logger.info(`RetryJob: Re-queued ${retried} pending attendance records`);
    return retried;
  }
}

module.exports = RetryJob;
