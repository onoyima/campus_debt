class SyncJob {
  constructor(syncService, logger) {
    this.syncService = syncService;
    this.logger = logger;
  }

  async execute() {
    const count = await this.syncService.flushAll();
    if (count > 0) {
      this.logger.info(`SyncJob: Flushed ${count} pending records`);
    }
    return count;
  }
}

module.exports = SyncJob;
