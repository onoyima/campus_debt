const path = require('path');
const fs = require('fs');

class CacheService {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.memoryCache = new Map();
    this.ttls = new Map();
  }

  initialize() {
    if (typeof window === 'undefined' && !global._sqliteInitialized) {
      try {
        const Database = require('better-sqlite3');
        const dir = path.dirname(this.dbPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        this.db = new Database(this.dbPath);
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS sync_records (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            payload TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at TEXT DEFAULT (datetime('now')),
            retry_count INTEGER DEFAULT 0,
            synced_at TEXT
          );
          CREATE TABLE IF NOT EXISTS pending_attendance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            terminal_id INTEGER NOT NULL,
            user_id TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            method TEXT DEFAULT 'fingerprint',
            created_at TEXT DEFAULT (datetime('now')),
            synced INTEGER DEFAULT 0
          );
          CREATE TABLE IF NOT EXISTS cache_store (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            expires_at INTEGER
          );
        `);
        global._sqliteInitialized = true;
        this.log('Cache database initialized at', this.dbPath);
      } catch (e) {
        this.log('SQLite not available, using in-memory cache only');
        this.db = null;
      }
    }
  }

  log(...args) {
    if (process.env.LOG_LEVEL === 'debug') {
      console.debug('[Cache]', ...args);
    }
  }

  set(key, value, ttlMs = 0) {
    this.memoryCache.set(key, value);
    if (ttlMs > 0) {
      this.ttls.set(key, Date.now() + ttlMs);
    }
    if (this.db) {
      const expiresAt = ttlMs > 0 ? Date.now() + ttlMs : null;
      this.db.prepare('INSERT OR REPLACE INTO cache_store (key, value, expires_at) VALUES (?, ?, ?)').run(
        key, JSON.stringify(value), expiresAt
      );
    }
  }

  get(key) {
    if (this.ttls.has(key) && Date.now() > this.ttls.get(key)) {
      this.memoryCache.delete(key);
      this.ttls.delete(key);
      return null;
    }
    if (this.memoryCache.has(key)) return this.memoryCache.get(key);
    if (this.db) {
      const row = this.db.prepare('SELECT value, expires_at FROM cache_store WHERE key = ?').get(key);
      if (row) {
        if (row.expires_at && Date.now() > row.expires_at) {
          this.db.prepare('DELETE FROM cache_store WHERE key = ?').run(key);
          return null;
        }
        const value = JSON.parse(row.value);
        this.memoryCache.set(key, value);
        return value;
      }
    }
    return null;
  }

  addSyncRecord(record) {
    if (this.db) {
      this.db.prepare(
        'INSERT OR IGNORE INTO sync_records (id, type, payload, status) VALUES (?, ?, ?, ?)'
      ).run(record.id, record.type, JSON.stringify(record.payload), 'pending');
    }
  }

  getPendingSyncRecords() {
    if (this.db) {
      const rows = this.db.prepare(
        'SELECT * FROM sync_records WHERE status = ? ORDER BY created_at ASC LIMIT 500'
      ).all('pending');
      return rows.map((r) => ({
        ...r,
        payload: typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload,
      }));
    }
    return [];
  }

  markSynced(id) {
    if (this.db) {
      this.db.prepare(
        "UPDATE sync_records SET status = 'synced', synced_at = datetime('now') WHERE id = ?"
      ).run(id);
    }
  }

  getPendingCount() {
    if (this.db) {
      const row = this.db.prepare(
        "SELECT COUNT(*) as count FROM sync_records WHERE status = 'pending'"
      ).get();
      return row.count;
    }
    return 0;
  }

  addPendingAttendance(terminalId, userId, timestamp, method) {
    if (this.db) {
      this.db.prepare(
        'INSERT INTO pending_attendance (terminal_id, user_id, timestamp, method) VALUES (?, ?, ?, ?)'
      ).run(terminalId, userId, timestamp, method);
    }
  }

  getPendingAttendance() {
    if (this.db) {
      return this.db.prepare(
        'SELECT * FROM pending_attendance WHERE synced = 0 ORDER BY id ASC'
      ).all();
    }
    return [];
  }

  close() {
    if (this.db) {
      this.db.close();
    }
    this.memoryCache.clear();
    this.ttls.clear();
  }
}

module.exports = CacheService;
