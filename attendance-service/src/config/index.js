const path = require('path');
const fs = require('fs');

const dataDir = path.resolve(__dirname, '..', '..', 'data');
const logDir = path.resolve(__dirname, '..', '..', 'logs');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

module.exports = {
  laravelApiUrl: process.env.LARAVEL_API_URL || 'http://localhost:8000/api',
  laravelApiKey: process.env.LARAVEL_API_KEY || '',

  port: parseInt(process.env.PORT, 10) || 4000,
  host: process.env.HOST || '0.0.0.0',
  wsPort: parseInt(process.env.WS_PORT, 10) || 4001,

  zktConnectionTimeout: parseInt(process.env.ZKT_CONNECTION_TIMEOUT, 10) || 5000,
  zktReconnectInterval: parseInt(process.env.ZKT_RECONNECT_INTERVAL, 10) || 30000,
  zktHeartbeatInterval: parseInt(process.env.ZKT_HEARTBEAT_INTERVAL, 10) || 60000,

  cacheDbPath: process.env.DB_PATH || path.join(dataDir, 'cache.sqlite'),

  logLevel: process.env.LOG_LEVEL || 'info',
  logFile: process.env.LOG_FILE || path.join(logDir, 'service.log'),

  pollInterval: process.env.POLL_INTERVAL || '*/10 * * * * *',
  syncInterval: process.env.SYNC_INTERVAL || '*/5 * * * * *',
};
