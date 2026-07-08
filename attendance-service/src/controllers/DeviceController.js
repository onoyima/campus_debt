class DeviceController {
  constructor(deviceManager, logger) {
    this.deviceManager = deviceManager;
    this.logger = logger;
  }

  async list(req, res) {
    try {
      const devices = await this.deviceManager.getRegisteredDevices();
      res.json({ success: true, data: devices, count: devices.length });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async connect(req, res) {
    try {
      const { device_id } = req.body;
      const devices = await this.deviceManager.getRegisteredDevices();
      const device = devices.find((d) => d.device_id === device_id || d.id === device_id);
      if (!device) {
        return res.status(404).json({ success: false, error: 'Device not found' });
      }
      const connection = await this.deviceManager.connectAndListen(device);
      res.json({ success: true, connected: connection ? connection.connected : false });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async disconnect(req, res) {
    try {
      const { device_id } = req.body;
      const conn = this.deviceManager.getConnection(device_id);
      if (conn) conn.disconnect();
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  connectedCount(req, res) {
    res.json({
      success: true,
      count: this.deviceManager.getConnectedCount(),
    });
  }
}

module.exports = DeviceController;
