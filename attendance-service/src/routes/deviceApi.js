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

  router.get('/devices/connected', (req, res) => {
    res.json({ success: true, count: req.deviceManager.getConnectedCount() });
  });

  router.get('/cache/stats', (req, res) => {
    res.json({
      success: true,
      pendingSync: req.cache.getPendingCount(),
      connectedDevices: req.deviceManager.getConnectedCount(),
    });
  });

  router.post('/devices/connect', async (req, res) => {
    try {
      const { device_id } = req.body;
      const devices = await req.deviceManager.getRegisteredDevices();
      const device = devices.find((d) => d.device_id === device_id || d.id === device_id);
      if (!device) return res.status(404).json({ success: false, error: 'Device not found' });
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

  // Enhanced devices endpoint with real-time connection status, venue info, event count
  router.get('/devices/status', async (req, res) => {
    try {
      const devices = await req.deviceManager.getRegisteredDevices();
      const enriched = devices.map(d => {
        const conn = req.deviceManager.getConnection(d.device_id || d.id);
        return {
          id: d.id,
          device_id: d.device_id,
          ip_address: d.ip_address,
          port: d.port || 4370,
          serial_number: d.serial_number,
          device_model: d.device_model,
          clocking_mode: d.clocking_mode,
          venue_id: d.venue_id,
          name: d.name || d.device_id,
          connected: conn ? conn.connected : false,
          last_activity: conn?.lastActivity?.toISOString() || d.last_heartbeat_at || null,
          connection_status: conn?.connected ? 'online' : (d.connection_status || 'offline'),
        };
      });
      res.json({ success: true, data: enriched, count: enriched.length });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
};
