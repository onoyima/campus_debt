class EventScheduler {
  constructor(apiService, cache, logger) {
    this.apiService = apiService;
    this.cache = cache;
    this.logger = logger;
    this.activeIntervals = new Map();
  }

  async syncActiveEvents() {
    try {
      const events = await this.apiService.getActiveEvents(0);
      for (const event of events) {
        this.cache.set(`event_${event.id}`, event, 300000);
      }
      this.logger.debug(`Synced ${events.length} active events`);
    } catch (err) {
      this.logger.warn('Failed to sync active events', { error: err.message });
    }
  }

  getActiveEventForVenue(venueId) {
    const events = this.cache.get('active_events_cache');
    if (!events) return null;
    return events.find((e) => e.venue_id === venueId && e.status === 'active') || null;
  }

  startPolling(intervalMs = 60000) {
    this.stopPolling();
    this.syncActiveEvents();
    const interval = setInterval(() => this.syncActiveEvents(), intervalMs);
    this.activeIntervals.set('event_polling', interval);
    this.logger.info(`Event polling started every ${intervalMs}ms`);
  }

  stopPolling() {
    for (const [key, interval] of this.activeIntervals) {
      clearInterval(interval);
    }
    this.activeIntervals.clear();
  }
}

module.exports = EventScheduler;
