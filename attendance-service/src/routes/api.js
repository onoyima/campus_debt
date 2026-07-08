const express = require('express');

module.exports = (config, logger) => {
  const router = express.Router();

  router.get('/devices', async (req, res) => {
    try {
      const devices = await req.deviceManager.getRegisteredDevices();
      res.json({ success: true, data: devices, count: devices.length });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/devices/connect', async (req, res) => {
    try {
      const { device_id } = req.body;
      const devices = await req.deviceManager.getRegisteredDevices();
      const device = devices.find((d) => d.device_id === device_id || d.id === device_id);
      if (!device) {
        return res.status(404).json({ success: false, error: 'Device not found' });
      }
      const connection = await req.deviceManager.connectAndListen(device);
      res.json({ success: true, connected: connection ? connection.connected : false });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/devices/disconnect', (req, res) => {
    try {
      const { device_id } = req.body;
      const conn = req.deviceManager.getConnection(device_id);
      if (conn) conn.disconnect();
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.get('/devices/connected', (req, res) => {
    res.json({
      success: true,
      count: req.deviceManager.getConnectedCount(),
    });
  });

  router.get('/sync/queue', (req, res) => {
    const pending = req.cache.getPendingSyncRecords();
    res.json({ success: true, count: pending.length, data: pending });
  });

  router.post('/sync/flush', async (req, res) => {
    try {
      const count = await req.syncService.flushAll();
      res.json({ success: true, synced: count });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.get('/cache/stats', (req, res) => {
    res.json({
      success: true,
      pendingSync: req.cache.getPendingCount(),
      connectedDevices: req.deviceManager.getConnectedCount(),
    });
  });

  return router;
};
