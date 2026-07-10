const axios = require('axios');

class ApiService {
  constructor(config, logger) {
    this.baseUrl = config.laravelApiUrl;
    this.apiKey = config.laravelApiKey;
    this.logger = logger;

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(this.apiKey ? { 'X-API-Key': this.apiKey } : {}),
      },
    });
  }

  async getDevices() {
    const response = await this.client.get('/terminals/zk/list');
    return response.data.data || [];
  }

  async getTerminalConfig(terminalId) {
    const response = await this.client.get(`/terminals/${terminalId}/zk/config`);
    return response.data.data || null;
  }

  async registerDevice(data) {
    const response = await this.client.post('/terminals/zk/register', data);
    return response.data;
  }

  async pushAttendance(terminalId, records) {
    const response = await this.client.post('/terminals/zk/attendance', {
      terminal_id: terminalId,
      records,
    });
    return response.data;
  }

  async sendHeartbeat(terminalId, stats = {}) {
    const response = await this.client.post('/terminals/zk/heartbeat', {
      terminal_id: terminalId,
      ...stats,
    });
    return response.data;
  }

  _resolveClockType(scanTime, event) {
    const t = (s) => {
      if (!s) return null;
      const parts = s.split(':');
      return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2] || 0);
    };
    const scan = t(scanTime);
    if (scan === null) return 'in';
    const outOpen = t(event.clock_out_open_time);
    const outClose = t(event.clock_out_close_time);
    if (outOpen !== null && outClose !== null && scan >= outOpen && scan <= outClose) {
      return 'out';
    }
    return 'in';
  }

  _expectedParticipantType(event) {
    if (!event.participants?.length) return 'any';
    const types = [...new Set(event.participants.map(p => p.participant_type))];
    return types.length === 1 ? types[0] : 'any';
  }

  async syncOfflineRecords(records, terminalId) {
    let activeEvents = [];
    try {
      activeEvents = await this.getActiveEvents(terminalId);
    } catch (e) {
      this.logger?.warn?.('Failed to fetch active events', { error: e.message });
    }

    // Cache resolved user types to avoid redundant API calls
    const typeCache = {};

    const formatted = [];
    for (const r of records) {
      const payload = r.payload || r;
      const userId = payload.user_id || payload.student_id || payload.staff_id;
      const scanTs = payload.timestamp || r.created_at || new Date().toISOString();
      const scanDate = new Date(scanTs);
      const scanTime = `${String(scanDate.getHours()).padStart(2, '0')}:${String(scanDate.getMinutes()).padStart(2, '0')}:${String(scanDate.getSeconds()).padStart(2, '0')}`;

      // Resolve participant type via API (matches ZktService::resolveParticipantType logic)
      if (!typeCache[userId]) {
        try {
          const info = await this.resolveUserName(userId);
          typeCache[userId] = info.type || 'student';
        } catch {
          typeCache[userId] = 'student';
        }
      }
      const participantType = typeCache[userId];

      if (activeEvents.length > 0) {
        // Find the first active event (preferring one whose time window matches the scan time)
        let matchedEvent = activeEvents[0];
        for (const event of activeEvents) {
          if (event.attendance_open_time && event.attendance_close_time &&
              scanTime >= event.attendance_open_time && scanTime <= event.attendance_close_time) {
            matchedEvent = event;
            break;
          }
          if (event.clock_out_open_time && event.clock_out_close_time &&
              scanTime >= event.clock_out_open_time && scanTime <= event.clock_out_close_time) {
            matchedEvent = event;
            break;
          }
        }

        const clockType = this._resolveClockType(scanTime, matchedEvent);

        formatted.push({
          table_name: 'attendance_event_attendance',
          action: 'create',
          payload: {
            institutional_event_id: matchedEvent.id,
            participant_type: participantType,
            participant_id: parseInt(userId) || 0,
            status_id: 1,
            attendance_method: payload.method || 'fingerprint',
            clock_type: clockType,
            is_visitor: false,
            verified_by_terminal_id: payload.terminal_id || terminalId,
            timestamp: scanTs,
            venue_id: matchedEvent.venue_id,
            sync_status: 'synced',
          },
          device_timestamp: scanTs,
        });
      } else {
        formatted.push({
          table_name: 'attendance_staff_clocking',
          action: 'create',
          payload: {
            staff_id: parseInt(userId) || 0,
            clock_type: 'in',
            attendance_method: payload.method || 'fingerprint',
            status_id: 1,
            verified_by_terminal_id: payload.terminal_id || terminalId,
            timestamp: scanTs,
            sync_status: 'synced',
          },
          device_timestamp: scanTs,
        });
      }
    }

    const response = await this.client.post('/terminals/zk/sync-batch', {
      terminal_id: terminalId || 0,
      records: formatted,
    });
    return response.data;
  }

  async getPendingCommands() {
    try {
      const response = await this.client.get('/device-commands/pending');
      return response.data.data || [];
    } catch (err) {
      return [];
    }
  }

  async reportCommandResult(commandId, status, result) {
    try {
      await this.client.put(`/device-commands/${commandId}`, { status, result });
    } catch (err) {
      this.logger.warn('Failed to report command result', { commandId, status });
    }
  }

  async getActiveEvents(terminalId) {
    const response = await this.client.get('/institutional-events/current', {
      params: { terminal_id: terminalId },
    });
    return response.data.data || [];
  }

  async resolveUserName(userId) {
    try {
      const response = await this.client.get(`/participant/resolve/${userId}`);
      return response.data.data || { id: userId, name: `User #${userId}`, type: 'unknown' };
    } catch (err) {
      this.logger?.warn?.('Failed to resolve user name', { userId, error: err.message });
      return { id: userId, name: `User #${userId}`, type: 'unknown' };
    }
  }
}

module.exports = ApiService;
