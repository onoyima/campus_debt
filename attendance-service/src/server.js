require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createLogger, format, transports } = require('winston');
const path = require('path');
const fs = require('fs');

const config = require('./config');
const ApiService = require('./services/ApiService');
const DeviceManager = require('./services/DeviceManager');
const AttendanceService = require('./services/AttendanceService');
const EventScheduler = require('./services/EventScheduler');
const SyncService = require('./services/SyncService');
const WebSocketService = require('./services/WebSocketService');
const CacheService = require('./services/CacheService');
const HeartbeatJob = require('./jobs/HeartbeatJob');
const SyncJob = require('./jobs/SyncJob');
const RetryJob = require('./jobs/RetryJob');

const logger = createLogger({
  level: config.logLevel,
  format: format.combine(format.timestamp(), format.errors({ stack: true }), format.json()),
  transports: [
    new transports.Console({ format: format.combine(format.colorize(), format.simple()) }),
    ...(config.logFile ? [new transports.File({ filename: config.logFile })] : []),
  ],
});

async function bootstrap() {
  logger.info('Starting Attendance Service...');

  const cache = new CacheService(config.cacheDbPath);
  cache.initialize();

  const apiService = new ApiService(config, logger);
  const syncService = new SyncService(config, cache, logger, apiService);

  // Pre-populate device cache from API so that the first request doesn't
  // trigger a round-trip back to Laravel (which can deadlock with php artisan serve).
  apiService.getDevices().then(devices => {
    if (devices && devices.length > 0) {
      cache.set('registered_devices', devices, 300000);
      logger.info(`Pre-populated device cache with ${devices.length} devices`);
    }
  }).catch(() => {
    logger.warn('Could not pre-populate device cache — will fetch on demand');
  });
  const deviceManager = new DeviceManager(config, syncService, cache, logger);
  const wsService = new WebSocketService(config, logger);
  const attendanceService = new AttendanceService(apiService, cache, syncService, logger);
  const eventScheduler = new EventScheduler(apiService, cache, logger);
  const heartbeatJob = new HeartbeatJob(deviceManager, apiService, logger);
  const syncJob = new SyncJob(syncService, logger);
  const retryJob = new RetryJob(cache, syncService, logger);

  // Wire WebSocket broadcasts to device lifecycle events
  deviceManager.on('attendance', async (event) => {
    // Enrich with device metadata for the live feed
    const conn = deviceManager.getConnection(event.deviceId);
    const dc = conn?.deviceConfig || {};

    // Resolve user name for the live feed display
    let userInfo = { name: `User #${event.user_id}`, type: 'unknown' };
    try {
      userInfo = await apiService.resolveUserName(event.user_id);
    } catch { /* fallback to user_id */ }

    const enriched = {
      ...event,
      user_name: userInfo.name || `User #${event.user_id}`,
      user_type: userInfo.type || 'unknown',
      device_ip: dc.ip_address || event.deviceId,
      device_name: dc.name || dc.device_id || event.deviceId,
      device_model: dc.device_model || null,
      venue_id: dc.venue_id || null,
      clocking_mode: dc.clocking_mode || null,
      serial_number: dc.serial_number || null,
      _received_at: new Date().toISOString(),
    };
    wsService.broadcastAttendance(enriched);
  });
  deviceManager.listener.onConnected = (event) => {
    logger.info(`Device connected: ${event.deviceId} (ID: ${event.id})`);
    wsService.broadcastDeviceStatus(event.deviceId, 'online');
    wsService.broadcast('device_heartbeat', {
      device_id: event.deviceId,
      id: event.id,
      status: 'online',
      timestamp: new Date().toISOString(),
    });
  };
  deviceManager.listener.onDisconnected = (event) => {
    logger.warn(`Device disconnected: ${event.deviceId} (ID: ${event.id})`, { hadError: event.hadError });
    wsService.broadcastDeviceStatus(event.deviceId, 'offline');
    wsService.broadcast('device_heartbeat', {
      device_id: event.deviceId,
      id: event.id,
      status: 'offline',
      had_error: !!event.hadError,
      timestamp: new Date().toISOString(),
    });
  };
  deviceManager.listener.onError = (event) => {
    logger.error(`Device error: ${event.deviceId}`, { error: event.error });
    wsService.broadcast('device_error', {
      device_id: event.deviceId,
      error: event.error,
      timestamp: new Date().toISOString(),
    });
  };
  deviceManager.listener.onTimeout = (event) => {
    logger.warn(`Device timeout: ${event.deviceId}`);
    wsService.broadcast('device_timeout', {
      device_id: event.deviceId,
      timestamp: new Date().toISOString(),
    });
  };

  const authMiddleware = require('./middleware/auth')(config, logger);

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use((req, res, next) => {
    req.deviceManager = deviceManager;
    req.syncService = syncService;
    req.cache = cache;
    req.wsService = wsService;
    req.attendanceService = attendanceService;
    req.logger = logger;
    next();
  });

  const apiRoutes = require('./routes/api')(config, logger);
  const deviceRoutes = require('./routes/devices')(config, logger);
  const deviceApiRoutes = require('./routes/deviceApi')(config, logger);
  app.use('/api', authMiddleware, apiRoutes);
  app.use('/devices', deviceRoutes);
  app.use('/device-api', deviceApiRoutes);

  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      connectedDevices: deviceManager.getConnectedCount(),
      pendingSync: cache.getPendingCount(),
      timestamp: new Date().toISOString(),
    });
  });

  const errorHandler = require('./middleware/errorHandler')(logger);
  app.use(errorHandler);

  const server = app.listen(config.port, config.host, () => {
    logger.info(`HTTP server listening on ${config.host}:${config.port}`);
  });

  wsService.attach(server);

  // Start event polling (every 60s)
  eventScheduler.startPolling(60000);

  // Start device command queue polling (every 10s)
  setInterval(() => deviceManager.commands.pollPendingCommands(), 10000);

  const cron = require('node-cron');

  cron.schedule(config.pollInterval, async () => {
    try {
      const devices = await deviceManager.getRegisteredDevices();
      for (const device of devices) {
        await deviceManager.connectAndListen(device);
      }
    } catch (err) {
      logger.error('Device polling cycle failed', { error: err.message });
    }
  });

  cron.schedule(config.syncInterval, async () => {
    try {
      const count = await syncJob.execute();
      if (count > 0) {
        logger.info(`Synced ${count} pending records to Laravel`);
      }
    } catch (err) {
      logger.error('Sync cycle failed', { error: err.message });
    }
  });

  cron.schedule('*/30 * * * * *', async () => {
    try {
      await heartbeatJob.execute();
    } catch (err) {
      logger.error('Heartbeat check failed', { error: err.message });
    }
  });

  // Retry pending attendance every 30s
  cron.schedule('*/30 * * * * *', async () => {
    try {
      const retried = await retryJob.execute();
      if (retried > 0) {
        logger.info(`RetryJob: Re-queued ${retried} pending records`);
      }
    } catch (err) {
      logger.error('Retry cycle failed', { error: err.message });
    }
  });

  process.on('SIGTERM', () => shutdown(deviceManager, cache, wsService, logger));
  process.on('SIGINT', () => shutdown(deviceManager, cache, wsService, logger));

  logger.info('Attendance Service started successfully');
}

async function shutdown(deviceManager, cache, wsService, logger) {
  logger.info('Shutting down Attendance Service...');
  deviceManager.disconnectAll();
  if (wsService && wsService.wss) {
    wsService.wss.close();
  }
  cache.close();
  process.exit(0);
}

bootstrap().catch((err) => {
  logger.error('Failed to start service', { error: err.message, stack: err.stack });
  process.exit(1);
});
