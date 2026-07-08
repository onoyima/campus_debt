const express = require('express');
const ZKTConnection = require('../devices/ZKTConnection');

module.exports = (config, logger) => {
  const router = express.Router();

  router.post('/connect', async (req, res) => {
    const { ip_address, port, device_id } = req.body;
    if (!ip_address || !port) {
      return res.status(422).json({ success: false, error: 'ip_address and port required' });
    }

    const deviceConfig = {
      id: req.body.id || 0,
      device_id: device_id || `manual_${ip_address}_${port}`,
      ip_address,
      port,
      serial_number: req.body.serial_number || '',
    };

    const connection = new ZKTConnection(deviceConfig, { timeout: config.zktConnectionTimeout });
    const ok = await connection.connect();

    if (!ok) {
      return res.status(502).json({ success: false, error: 'Connection failed' });
    }

    connection.disconnect();
    res.json({ success: true, device: deviceConfig });
  });

  router.post('/test', async (req, res) => {
    const { ip_address, port } = req.body;
    if (!ip_address || !port) {
      return res.status(422).json({ success: false, error: 'ip_address and port required' });
    }

    const deviceConfig = {
      id: 0,
      device_id: 'test_device',
      ip_address,
      port,
      serial_number: '',
    };

    const connection = new ZKTConnection(deviceConfig, { timeout: 3000 });
    const ok = await connection.connect();
    let info = null;

    if (ok) {
      info = await connection.getDeviceInfo();
      connection.disconnect();
    }

    res.json({
      success: ok,
      connected: ok,
      deviceInfo: info,
    });
  });

  router.post('/pull', async (req, res) => {
    const { ip_address, port } = req.body;
    if (!ip_address || !port) {
      return res.status(422).json({ success: false, error: 'ip_address and port required' });
    }

    const deviceConfig = {
      id: req.body.id || 0,
      device_id: 'pull_device',
      ip_address,
      port,
      serial_number: '',
    };

    const connection = new ZKTConnection(deviceConfig, { timeout: 10000 });
    const ok = await connection.connect();

    if (!ok) {
      return res.status(502).json({ success: false, error: 'Connection failed' });
    }

    const records = await connection.pullAttendance();
    connection.disconnect();

    res.json({
      success: true,
      count: records.length,
      records,
    });
  });

  return router;
};
