import { useState, useEffect, useRef, useCallback } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../../Components/AppLayout'
import VeritasSpinner from '../../Components/VeritasSpinner'
import api from '../../api'
import axios from 'axios'

function StatusBadge({ online }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
      online ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
      {online ? 'Connected' : 'Offline'}
    </span>
  )
}

export default function DeviceMonitor() {
  const [devices, setDevices] = useState([])
  const [connected, setConnected] = useState({ count: 0 })
  const [stats, setStats] = useState({})
  const [nodeStatus, setNodeStatus] = useState(null)
  const [nodeUrl, setNodeUrl] = useState('http://127.0.0.1:4000')
  const [attendanceLog, setAttendanceLog] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState({})
  const [errors, setErrors] = useState({})
  const wsRef = useRef(null)
  const logRef = useRef(null)

  const nodeApi = axios.create({ timeout: 8000 })

  const fetchData = useCallback(async () => {
    const newErrors = {}
    try {
      const r = await api.get('/node/config')
      const cfg = r.data.data || r.data
      setNodeStatus(cfg)
      if (cfg?.ws_url) setNodeUrl(cfg.ws_url)
    } catch (e) {
      setNodeStatus(null)
      newErrors.config = e.response?.status === 403 ? 'Staff access denied' : e.response?.data?.message || e.message
    }
    const base = nodeUrl
    try {
      const r = await nodeApi.get(`${base}/device-api/devices`)
      setDevices(r.data.data || r.data || [])
    } catch (e) {
      newErrors.devices = e.message
    }
    try {
      const r = await nodeApi.get(`${base}/device-api/devices/connected`)
      setConnected(r.data || { count: 0 })
    } catch (e) {
      newErrors.connected = e.message
    }
    try {
      const r = await nodeApi.get(`${base}/device-api/cache/stats`)
      setStats(r.data || {})
    } catch (e) {
      newErrors.stats = e.message
    }
    setErrors(newErrors)
  }, [nodeUrl])

  useEffect(() => {
    setLoading(true)
    fetchData().finally(() => setLoading(false))
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [fetchData])

  useEffect(() => {
    if (!nodeStatus?.ws_url) return
    const wsUrl = nodeStatus.ws_url.replace(/^http/, 'ws')
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws
    ws.onopen = () => console.log('Device Monitor WS connected')
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        if (msg.type === 'attendance_recorded' || msg.type === 'attendance') {
          setAttendanceLog(prev => [{ ...msg.data, _received: new Date().toLocaleTimeString() }, ...prev].slice(0, 50))
        }
      } catch {}
    }
    ws.onclose = () => console.log('Device Monitor WS disconnected')
    ws.onerror = () => {}
    return () => ws.close()
  }, [nodeStatus?.ws_url])

  const handleConnect = async (deviceId) => {
    setActionLoading(prev => ({ ...prev, [`connect-${deviceId}`]: true }))
    try {
      await nodeApi.post(`${nodeUrl}/device-api/devices/connect`, { device_id: deviceId })
      fetchData()
    } catch (err) {
      alert(err.response?.data?.error || 'Connection failed')
    } finally {
      setActionLoading(prev => ({ ...prev, [`connect-${deviceId}`]: false }))
    }
  }

  const handleDisconnect = async (deviceId) => {
    setActionLoading(prev => ({ ...prev, [`disconnect-${deviceId}`]: true }))
    try {
      await nodeApi.post(`${nodeUrl}/device-api/devices/disconnect`, { device_id: deviceId })
      fetchData()
    } catch (err) {
      alert(err.response?.data?.error || 'Disconnect failed')
    } finally {
      setActionLoading(prev => ({ ...prev, [`disconnect-${deviceId}`]: false }))
    }
  }

  const handleTest = async () => {
    const ip = prompt('Enter device IP address:')
    if (!ip) return
    const port = prompt('Enter port (default 4370):') || '4370'
    setActionLoading(prev => ({ ...prev, test: true }))
    try {
      const res = await nodeApi.post(`${nodeUrl}/devices/test`, { ip_address: ip, port: parseInt(port) })
      alert(res.data.connected ? 'Device connected!' : 'Connection failed: ' + JSON.stringify(res.data))
    } catch (err) {
      alert('Test failed: ' + (err.response?.data?.error || err.message))
    } finally {
      setActionLoading(prev => ({ ...prev, test: false }))
    }
  }

  const handlePull = async (ip, port) => {
    setActionLoading(prev => ({ ...prev, [`pull-${ip}`]: true }))
    try {
      const res = await nodeApi.post(`${nodeUrl}/devices/pull`, { ip_address: ip, port })
      setAttendanceLog(prev => [
        ...(res.data.records || []).map(r => ({ ...r, _received: new Date().toLocaleTimeString(), _type: 'pulled' })),
        ...prev,
      ].slice(0, 50))
      alert(`Pulled ${res.data.count || 0} records`)
    } catch (err) {
      alert('Pull failed: ' + (err.response?.data?.error || err.message))
    } finally {
      setActionLoading(prev => ({ ...prev, [`pull-${ip}`]: false }))
    }
  }

  const hasErrors = Object.keys(errors).length > 0

  return (
    <AppLayout>
      <Head title="Device Monitor" />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Device Monitor</h1>
        <div className="flex items-center gap-2">
          <span className={`text-xs flex items-center gap-1.5 ${nodeStatus?.node_service_connected ? 'text-green-600' : 'text-red-600'}`}>
            <span className={`w-2 h-2 rounded-full ${nodeStatus?.node_service_connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            Node Service {nodeStatus?.node_service_connected ? 'Online' : 'Offline'}
          </span>
          <button onClick={handleTest} disabled={actionLoading['test']}
            className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">
            {actionLoading['test'] ? <VeritasSpinner size="sm" /> : 'Test Device'}
          </button>
          <button onClick={fetchData} className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
            Refresh
          </button>
        </div>
      </div>

      {hasErrors && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <h3 className="text-sm font-semibold text-red-700 mb-1">Connection Errors</h3>
          <ul className="text-xs text-red-600 space-y-0.5">
            {Object.entries(errors).map(([key, msg]) => (
              <li key={key}>/{key}: {msg}</li>
            ))}
          </ul>
        </div>
      )}

      {loading ? (
        <VeritasSpinner text="Loading device status..." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-3 grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Connected</div>
              <div className="text-2xl font-bold text-green-600 mt-1">{connected.count || 0}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Registered</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{devices.length}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Pending Sync</div>
              <div className="text-2xl font-bold text-amber-600 mt-1">{stats.pendingSync || 0}</div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900">Devices</h2>
              <a href="/terminals/create" className="text-xs font-medium text-veritas-600 hover:text-veritas-800">+ Add Terminal</a>
            </div>
            {devices.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">
                No devices found. <a href="/terminals/create" className="text-veritas-600 hover:underline">Add a terminal</a> first.
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {devices.map((d, i) => (
                  <div key={d.id || i} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium text-gray-900">{d.device_id || d.ip_address}</span>
                        <StatusBadge online={d.connected || d.connection_status === 'online'} />
                      </div>
                      <div className="text-[11px] text-gray-400 space-x-2">
                        <span>{d.ip_address}:{d.port || 4370}</span>
                        {d.serial_number && <span>· S/N: {d.serial_number}</span>}
                        {d.device_model && <span>· {d.device_model}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 ml-3 shrink-0">
                      <button onClick={() => handleConnect(d.device_id || d.id)}
                        disabled={actionLoading[`connect-${d.device_id || d.id}`]}
                        className="px-2.5 py-1 text-[10px] font-medium bg-veritas-50 text-veritas-700 rounded-lg hover:bg-veritas-100 disabled:opacity-50">
                        {actionLoading[`connect-${d.device_id || d.id}`] ? <VeritasSpinner size="sm" /> : 'Connect'}
                      </button>
                      <button onClick={() => handleDisconnect(d.device_id || d.id)}
                        disabled={actionLoading[`disconnect-${d.device_id || d.id}`]}
                        className="px-2.5 py-1 text-[10px] font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 disabled:opacity-50">
                        {actionLoading[`disconnect-${d.device_id || d.id}`] ? <VeritasSpinner size="sm" /> : 'Disconnect'}
                      </button>
                      <button onClick={() => handlePull(d.ip_address, d.port || 4370)}
                        disabled={actionLoading[`pull-${d.ip_address}`]}
                        className="px-2.5 py-1 text-[10px] font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50">
                        {actionLoading[`pull-${d.ip_address}`] ? <VeritasSpinner size="sm" /> : 'Pull'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900">Live Attendance Feed</h2>
              <span className="text-[10px] font-medium text-gray-400">{attendanceLog.length} events</span>
            </div>
            <div ref={logRef} className="overflow-y-auto max-h-[400px]">
              {attendanceLog.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-400">
                  <p className="mb-1">Waiting for attendance events...</p>
                  <p className="text-[10px]">Make sure the Node service is running</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {attendanceLog.map((e, i) => (
                    <div key={i} className="px-4 py-2 text-[11px] hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-700">{e.user_id}</span>
                        <span className="text-gray-400">{e._received || e.timestamp}</span>
                      </div>
                      <div className="text-gray-400 mt-0.5">
                        <span>{e.method || 'fingerprint'} · {e.timestamp}</span>
                        {e._type === 'pulled' && <span className="ml-1.5 text-amber-500">(pulled)</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
