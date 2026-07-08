class SyncService {
  constructor(config, cache, logger, apiService) {
    this.config = config;
    this.cache = cache;
    this.logger = logger;
    this.apiService = apiService;
    this.queue = [];
  }

  enqueue(type, payload) {
    const id = `${type}_${payload.terminal_id || ''}_${payload.user_id || ''}_${payload.timestamp || Date.now()}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    const record = {
      id,
      type,
      payload,
      status: 'pending',
      created_at: new Date().toISOString(),
      retry_count: 0,
    };

    this.queue.push(record);
    this.cache.addSyncRecord(record);
    this.logger.debug('Enqueued sync record', { type, id: record.id });
  }

  async flushAll() {
    const pending = this.cache.getPendingSyncRecords();
    if (pending.length === 0) return 0;

    let synced = 0;
    const batch = [];
    let terminalId = null;

    for (const record of pending) {
      batch.push(record);
      if (!terminalId && record.payload?.terminal_id) {
        terminalId = record.payload.terminal_id;
      }

      if (batch.length >= 100) {
        try {
          await this.apiService.syncOfflineRecords(batch, terminalId);
          for (const r of batch) {
            this.cache.markSynced(r.id);
          }
          synced += batch.length;
        } catch (err) {
          this.logger.error('Batch sync failed', { error: err.message, batchSize: batch.length });
        }
        batch.length = 0;
      }
    }

    if (batch.length > 0) {
      try {
        await this.apiService.syncOfflineRecords(batch, terminalId);
        for (const r of batch) {
          this.cache.markSynced(r.id);
        }
        synced += batch.length;
      } catch (err) {
        this.logger.error('Final batch sync failed', { error: err.message, batchSize: batch.length });
      }
    }

    return synced;
  }

  getQueueLength() {
    return this.queue.length;
  }
}

module.exports = SyncService;
