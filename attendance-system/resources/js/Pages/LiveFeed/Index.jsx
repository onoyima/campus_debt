import { useState, useEffect, useRef, useCallback } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../../Components/AppLayout'
import VeritasSpinner from '../../Components/VeritasSpinner'
import api from '../../api'

const WS_EVENT_TYPES = ['attendance_recorded', 'attendance', 'device_status', 'device_heartbeat', 'device_error', 'device_timeout']

function DeviceCard({ device, onConnect, onDisconnect, actionLoading }) {
  const isOnline = device.connected
  const loadingKey = `connect-${device.device_id || device.id}`
  const isLoading = actionLoading[loadingKey]

  return (
    <div className={`rounded-xl border shadow-sm p-4 transition-all ${
      isOnline ? 'bg-white border-green-200' : 'bg-white border-red-200'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
            isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'
          }`} />
          <span className="text-sm font-semibold text-gray-900 truncate">{device.name || device.device_id}</span>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
          isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {isOnline ? 'ONLINE' : 'OFFLINE'}
        </span>
      </div>
      <div className="space-y-1 text-[11px] text-gray-500">
        <div className="flex justify-between">
          <span>IP</span>
          <span className="font-mono text-gray-700">{device.ip_address}:{device.port}</span>
        </div>
        {device.venue_name && (
          <div className="flex justify-between">
            <span>Venue</span>
            <span className="text-gray-700">{device.venue_name}</span>
          </div>
        )}
        {device.clocking_mode && (
          <div className="flex justify-between">
            <span>Mode</span>
            <span className="text-gray-700 capitalize">{device.clocking_mode}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Scans Today</span>
          <span className="font-semibold text-gray-700">{device.scans_today || 0}</span>
        </div>
        {device.last_activity && (
          <div className="flex justify-between">
            <span>Last Activity</span>
            <span className="text-gray-700">{new Date(device.last_activity).toLocaleTimeString()}</span>
          </div>
        )}
      </div>
      <div className="mt-3 flex gap-1.5">
        {!isOnline ? (
          <button onClick={() => onConnect(device.device_id || device.id)}
            disabled={isLoading}
            className="flex-1 px-2.5 py-1.5 text-[10px] font-medium bg-veritas-50 text-veritas-700 rounded-lg hover:bg-veritas-100 disabled:opacity-50">
            {isLoading ? <VeritasSpinner size="sm" /> : 'Connect'}
          </button>
        ) : (
          <button onClick={() => onDisconnect(device.device_id || device.id)}
            disabled={isLoading}
            className="flex-1 px-2.5 py-1.5 text-[10px] font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 disabled:opacity-50">
            {isLoading ? <VeritasSpinner size="sm" /> : 'Disconnect'}
          </button>
        )}
      </div>
    </div>
  )
}

export default function LiveFeed() {
  const [devices, setDevices] = useState([])
  const [stats, setStats] = useState({ total_devices: 0, online: 0, offline: 0, inactive: 0, scans_today: 0, node_connected: false })
  const [liveEvents, setLiveEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState({})
  const [errors, setErrors] = useState({})
  const [wsConnected, setWsConnected] = useState(false)
  const [nodeUrl, setNodeUrl] = useState('http://127.0.0.1:4000')
  const [nodeStatus, setNodeStatus] = useState(null)
  const feedRef = useRef(null)
  const wsRef = useRef(null)

  const fetchData = useCallback(async () => {
    const newErrors = {}
    try {
      const r = await api.get('/live-feed')
      const d = r.data.data || {}
      setDevices(d.devices || [])
      setStats(d.stats || {})
    } catch (e) {
      newErrors.feed = e.response?.data?.message || e.message
    }
    try {
      const cfg = await api.get('/node/config')
      const c = cfg.data.data || cfg.data
      setNodeStatus(c)
      if (c?.ws_url) setNodeUrl(c.ws_url)
    } catch (e) {
      newErrors.config = e.message
    }
    setErrors(newErrors)
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchData().finally(() => setLoading(false))
    const interval = setInterval(fetchData, 15000)
    return () => clearInterval(interval)
  }, [fetchData])

  useEffect(() => {
    if (!nodeStatus?.ws_url) return
    const wsUrl = nodeStatus.ws_url.replace(/^http/, 'ws')
    let ws
    let reconnectTimer

    const connect = () => {
      ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        setWsConnected(true)
      }

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data)
          if (WS_EVENT_TYPES.includes(msg.type)) {
            if (msg.type === 'attendance_recorded' || msg.type === 'attendance') {
              setLiveEvents(prev => [{
                ...msg.data,
                _type: 'scan',
                _received: new Date().toLocaleTimeString(),
              }, ...prev].slice(0, 200))
            } else if (msg.type === 'device_status' || msg.type === 'device_heartbeat') {
              setDevices(prev => prev.map(d => {
                const did = msg.data?.device_id || msg.data?.id
                if (d.device_id === did || String(d.id) === String(did)) {
                  return { ...d, connected: msg.data?.status === 'online', connection_status: msg.data?.status }
                }
                return d
              }))
              setLiveEvents(prev => [{
                _type: msg.type === 'device_heartbeat' ? 'heartbeat' : 'status',
                device_id: msg.data?.device_id,
                status: msg.data?.status,
                timestamp: msg.data?.timestamp,
                _received: new Date().toLocaleTimeString(),
              }, ...prev].slice(0, 200))
            } else if (msg.type === 'device_error' || msg.type === 'device_timeout') {
              setLiveEvents(prev => [{
                _type: 'error',
                device_id: msg.data?.device_id,
                error: msg.data?.error || 'timeout',
                timestamp: msg.data?.timestamp,
                _received: new Date().toLocaleTimeString(),
              }, ...prev].slice(0, 200))
            }
          } else if (msg.type === 'connected') {
            // initial handshake from WS server
          }
        } catch {}
      }

      ws.onclose = () => {
        setWsConnected(false)
        reconnectTimer = setTimeout(connect, 5000)
      }

      ws.onerror = () => {
        ws.close()
      }
    }

    connect()
    return () => {
      clearTimeout(reconnectTimer)
      if (ws) ws.close()
    }
  }, [nodeStatus?.ws_url])

  const handleConnect = async (deviceId) => {
    setActionLoading(prev => ({ ...prev, [`connect-${deviceId}`]: true }))
    try {
      await api.post('/node/devices/connect', { device_id: deviceId })
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
      await api.post('/node/devices/disconnect', { device_id: deviceId })
      fetchData()
    } catch (err) {
      alert(err.response?.data?.error || 'Disconnect failed')
    } finally {
      setActionLoading(prev => ({ ...prev, [`disconnect-${deviceId}`]: false }))
    }
  }

  return (
    <AppLayout>
      <Head title="Live Feed" />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Live Feed</h1>
          <p className="text-xs text-gray-500 mt-0.5">Real-time device monitoring and attendance events</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className={wsConnected ? 'text-green-600' : 'text-red-600'}>
              WS {wsConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <span className={`text-xs flex items-center gap-1.5 ${nodeStatus?.node_service_connected ? 'text-green-600' : 'text-red-600'}`}>
            <span className={`w-2 h-2 rounded-full ${nodeStatus?.node_service_connected ? 'bg-green-500' : 'bg-red-500'}`} />
            Node {nodeStatus?.node_service_connected ? 'Online' : 'Offline'}
          </span>
          <button onClick={fetchData} className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
            Refresh
          </button>
        </div>
      </div>

      {Object.keys(errors).length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <h3 className="text-sm font-semibold text-red-700 mb-1">Connection Errors</h3>
          <ul className="text-xs text-red-600 space-y-0.5">
            {Object.entries(errors).map(([k, v]) => (
              <li key={k}>/{k}: {v}</li>
            ))}
          </ul>
        </div>
      )}

      {loading ? (
        <VeritasSpinner text="Loading live feed..." />
      ) : (
        <div className="space-y-6">
          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Total Devices</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{stats.total_devices || 0}</div>
            </div>
            <div className="bg-white rounded-xl border border-green-100 p-4 shadow-sm">
              <div className="text-[10px] font-semibold text-green-500 uppercase tracking-wider">Online</div>
              <div className="text-2xl font-bold text-green-600 mt-1">{stats.online || 0}</div>
            </div>
            <div className="bg-white rounded-xl border border-red-100 p-4 shadow-sm">
              <div className="text-[10px] font-semibold text-red-500 uppercase tracking-wider">Offline</div>
              <div className="text-2xl font-bold text-red-600 mt-1">{stats.offline || 0}</div>
            </div>
            <div className="bg-white rounded-xl border border-amber-100 p-4 shadow-sm">
              <div className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider">Scans Today</div>
              <div className="text-2xl font-bold text-amber-600 mt-1">{stats.scans_today || 0}</div>
            </div>
            <div className={`bg-white rounded-xl border p-4 shadow-sm ${stats.node_connected ? 'border-green-100' : 'border-red-100'}`}>
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Node Service</div>
              <div className={`text-2xl font-bold mt-1 ${stats.node_connected ? 'text-green-600' : 'text-red-600'}`}>
                {stats.node_connected ? 'Online' : 'Offline'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Device Cards */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-gray-900">
                    Devices
                    <span className="ml-2 text-[10px] font-normal text-gray-400">({devices.length})</span>
                  </h2>
                </div>
                {devices.length === 0 ? (
                  <div className="p-8 text-center text-sm text-gray-400">
                    No devices found. <a href="/terminals/create" className="text-veritas-600 hover:underline">Add a terminal</a> first.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
                    {devices.map((d) => (
                      <DeviceCard
                        key={d.id || d.device_id}
                        device={d}
                        onConnect={handleConnect}
                        onDisconnect={handleDisconnect}
                        actionLoading={actionLoading}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Live Feed */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-sm font-bold text-gray-900">Live Event Feed</h2>
                <div className="flex items-center gap-2">
                  {wsConnected && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />}
                  <span className="text-[10px] font-medium text-gray-400">{liveEvents.length} events</span>
                </div>
              </div>
              <div ref={feedRef} className="overflow-y-auto max-h-[500px]">
                {liveEvents.length === 0 ? (
                  <div className="p-6 text-center text-sm text-gray-400">
                    <p className="mb-1">Waiting for events...</p>
                    <p className="text-[10px]">Connect to a device and scan a fingerprint</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {liveEvents.map((e, i) => (
                      <div key={i} className={`px-4 py-2 text-[11px] hover:bg-gray-50 ${
                        e._type === 'error' ? 'bg-red-50/50' :
                        e._type === 'heartbeat' ? 'bg-blue-50/30' : ''
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            {e._type === 'scan' && (
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                            )}
                            {e._type === 'heartbeat' && (
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                            )}
                            {e._type === 'error' && (
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                            )}
                            {e._type === 'status' && (
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${e.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
                            )}
                            <span className="font-medium text-gray-700">
                              {e._type === 'scan' ? (e.user_name || `#${e.user_id}`) :
                               e._type === 'heartbeat' ? (e.device_id || 'device') :
                               e._type === 'error' ? (e.device_id || 'device') :
                               e.device_id || 'system'}
                            </span>
                            {e._type === 'scan' && e.user_type && (
                              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                                e.user_type === 'staff' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {e.user_type}
                              </span>
                            )}
                          </div>
                          <span className="text-gray-400">{e._received}</span>
                        </div>
                        <div className="text-gray-400 mt-0.5 pl-3">
                          {e._type === 'scan' && (
                            <span>{e.method || 'fingerprint'} on {e.device_name || e.device_ip || e.device_id}</span>
                          )}
                          {e._type === 'heartbeat' && (
                            <span>Heartbeat — {e.status === 'online' ? 'connected' : 'disconnected'}</span>
                          )}
                          {e._type === 'error' && (
                            <span className="text-red-500">{e.error || 'Connection timeout'}</span>
                          )}
                          {e._type === 'status' && (
                            <span>Status changed to <strong>{e.status}</strong></span>
                          )}
                        </div>
                        {e.timestamp && (
                          <div className="text-[9px] text-gray-300 mt-0.5 pl-3">
                            {new Date(e.timestamp).toLocaleString()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
