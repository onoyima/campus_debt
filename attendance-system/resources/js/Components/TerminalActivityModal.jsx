import { useState, useEffect } from 'react'
import api from '../api'

function ScanRow({ scan }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-[11px] border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
        <span className="font-medium text-gray-700">#{scan.participant_id}</span>
        <span className="text-gray-400 capitalize">{scan.participant_type}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
          scan.clock_type === 'out' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
        }`}>
          {scan.clock_type === 'out' ? 'CHECK-OUT' : 'CHECK-IN'}
        </span>
        <span className="text-gray-400">{new Date(scan.timestamp).toLocaleTimeString()}</span>
      </div>
    </div>
  )
}

export default function TerminalActivityModal({ eventId, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!eventId) return
    setLoading(true)
    api.get(`/institutional-events/${eventId}/terminal-activity`)
      .then(r => setData(r.data.data))
      .catch(e => setError(e.response?.data?.message || e.message))
      .finally(() => setLoading(false))
  }, [eventId])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Terminal Activity</h2>
            {data?.event && (
              <p className="text-xs text-gray-500 mt-0.5">{data.event.title} — {data.event.venue_name}</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-veritas-600 border-t-transparent rounded-full animate-spin" />
              <span className="ml-2 text-sm text-gray-500">Loading terminal activity...</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
          ) : data ? (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-gray-900">{data.stats?.total_terminals || 0}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">Terminals</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-green-600">{data.stats?.online || 0}</div>
                  <div className="text-[10px] text-green-500 mt-0.5">Online</div>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-red-600">{data.stats?.offline || 0}</div>
                  <div className="text-[10px] text-red-500 mt-0.5">Offline</div>
                </div>
              </div>

              {/* Terminals */}
              {data.terminals?.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No terminals assigned to this event's venue.</p>
              ) : (
                <div className="space-y-4">
                  {data.terminals.map(t => (
                    <div key={t.terminal_id} className="border border-gray-100 rounded-lg overflow-hidden">
                      <div className="px-4 py-2.5 bg-gray-50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${t.connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                          <span className="text-sm font-semibold text-gray-900">{t.name || t.device_id}</span>
                          <span className="text-[10px] text-gray-400 font-mono">{t.ip_address}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px]">
                          <span className="text-gray-500">{t.total_scans} scans</span>
                          {t.connected ? (
                            <span className="text-green-600 font-semibold">ONLINE</span>
                          ) : t.connection_status === 'unknown' ? (
                            <span className="text-gray-400">UNKNOWN</span>
                          ) : (
                            <span className="text-red-600 font-semibold">OFFLINE</span>
                          )}
                        </div>
                      </div>
                      {t.recent_scans?.length > 0 && (
                        <div className="px-4 py-2">
                          <div className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Recent Scans</div>
                          {t.recent_scans.map(s => (
                            <ScanRow key={s.id} scan={s} />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
