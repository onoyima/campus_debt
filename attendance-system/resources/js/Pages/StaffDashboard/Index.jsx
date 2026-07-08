import { useState, useEffect } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../../Components/AppLayout'
import api from '../../api'

export default function StaffDashboardIndex() {
  const [user, setUser] = useState({})
  const [todayClockings, setTodayClockings] = useState([])
  const [overview, setOverview] = useState(null)
  const [lastAction, setLastAction] = useState(null)
  const [clocking, setClocking] = useState(false)
  const [loading, setLoading] = useState(true)
  const [myEvents, setMyEvents] = useState([])
  const [eventsLoading, setEventsLoading] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { window.location.href = '/login'; return }
    const stored = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}') } catch { return {} } })()
    setUser(stored)
    if (!stored.id) {
      api.get('/me').then(r => {
        const u = r.data.user
        localStorage.setItem('user', JSON.stringify(u))
        setUser(u)
      }).catch(() => { window.location.href = '/login' })
    }
    fetchTodayClockings()
    fetchOverview()
    fetchMyEvents()
  }, [])

  const fetchTodayClockings = () => {
    api.get('/staff-clockings/my', { params: { per_page: 10 } })
      .then(res => {
        const list = res.data.data || res.data || []
        const today = new Date().toDateString()
        setTodayClockings(list.filter(c => new Date(c.clocked_at).toDateString() === today))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const fetchOverview = () => {
    api.get('/staff-dashboard/overview')
      .then(res => setOverview(res.data.data || res.data))
      .catch(() => {})
  }

  const fetchMyEvents = () => {
    setEventsLoading(true)
    api.get('/staff-dashboard/my-events')
      .then(res => setMyEvents(res.data.data || []))
      .catch(() => {})
      .finally(() => setEventsLoading(false))
  }

  const handleClock = async (type) => {
    setClocking(true)
    try {
      const endpoint = type === 'in' ? '/staff-clockings/clock-in' : '/staff-clockings/clock-out'
      const res = await api.post(endpoint)
      setLastAction({ type, message: res.data.message, time: new Date() })
      fetchTodayClockings()
    } catch (e) {
      setLastAction({ type: 'error', message: e.response?.data?.message || 'Failed to clock' })
    } finally {
      setClocking(false)
      setTimeout(() => setLastAction(null), 5000)
    }
  }

  const todayIn = todayClockings.find(c => c.clock_type === 'in')
  const todayOut = todayClockings.find(c => c.clock_type === 'out')

  return (
    <AppLayout>
      <Head title="Staff Dashboard" />

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-10 h-10 rounded-xl bg-veritas-500 flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">{user.fname || ''} {user.lname || ''}</p>
        </div>
      </div>

      {/* Stats Cards */}
      {overview && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Registered Events</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{overview.total_events_registered ?? 0}</p>
            <p className="text-xs text-gray-400 mt-1">{overview.upcoming_events ?? 0} upcoming</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Attended</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{overview.total_events_attended ?? 0}</p>
            <p className="text-xs text-gray-400 mt-1">with fingerprint scan</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Absent</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{(overview.total_events_registered ?? 0) - (overview.total_events_attended ?? 0)}</p>
            <p className="text-xs text-gray-400 mt-1">missed events</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Participation</p>
            <p className="text-2xl font-bold text-veritas-600 mt-1">{overview.attendance_percentage != null ? `${overview.attendance_percentage}%` : '0%'}</p>
            <p className="text-xs text-gray-400 mt-1">overall rate</p>
          </div>
        </div>
      )}

      {/* Clock In/Out */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Today's Attendance</h2>
          <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => handleClock('in')} disabled={clocking || !!todayIn}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 ${
              todayIn
                ? 'bg-green-50 text-green-700 border-2 border-green-200 cursor-not-allowed'
                : 'bg-veritas-500 text-white hover:bg-veritas-600 shadow-lg shadow-veritas-500/20'
            }`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {todayIn ? `Clocked In at ${new Date(todayIn.clocked_at).toLocaleTimeString()}` : 'Clock In'}
          </button>
          <button onClick={() => handleClock('out')} disabled={clocking || !!todayOut || !todayIn}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 ${
              todayOut
                ? 'bg-blue-50 text-blue-700 border-2 border-blue-200 cursor-not-allowed'
                : !todayIn
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-500/20'
            }`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {todayOut ? `Clocked Out at ${new Date(todayOut.clocked_at).toLocaleTimeString()}` : 'Clock Out'}
          </button>
          {clocking && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <div className="w-4 h-4 border-2 border-veritas-500 border-t-transparent rounded-full animate-spin" />
              Processing...
            </div>
          )}
        </div>
        {lastAction && (
          <div className={`mt-3 text-sm ${lastAction.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
            {lastAction.message}
          </div>
        )}
      </div>

      {/* Today's Clocking History */}
      {todayClockings.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Today's Clocking History</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {todayClockings.map((c, i) => (
              <div key={c.id || i} className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50/50 transition-colors">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                  c.clock_type === 'in' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'
                }`}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={c.clock_type === 'in' ? 'M5 13l4 4L19 7' : 'M5 12h14'} />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700 capitalize">{c.clock_type === 'in' ? 'Clock In' : 'Clock Out'}</p>
                  <p className="text-xs text-gray-400">{new Date(c.clocked_at).toLocaleTimeString()}</p>
                </div>
                <span className="text-xs text-gray-400">{c.attendance_method || 'manual'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Today's Event Attendance (fingerprint scans) */}
      {overview?.today_event_attendance && overview.today_event_attendance.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mt-6">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Today's Event Attendance</h2>
            <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-md">Fingerprint records</span>
          </div>
          <div className="divide-y divide-gray-50">
            {overview.today_event_attendance.map((ea, i) => (
              <div key={ea.id || i} className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50/50 transition-colors">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                  ea.clock_type === 'in' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'
                }`}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={ea.clock_type === 'in' ? 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z' : 'M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z'} />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">{ea.event_title || `Event #${ea.institutional_event_id}`}</p>
                  <p className="text-xs text-gray-400">{ea.clock_type === 'in' ? 'Checked in' : 'Checked out'} · {new Date(ea.clocked_at).toLocaleTimeString()} · {ea.attendance_method}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Attendance History */}
      {overview?.recent_events && overview.recent_events.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mt-6">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Recent Attendance</h2>
            <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-md">Last {overview.recent_events.length} scans</span>
          </div>
          <div className="divide-y divide-gray-50">
            {overview.recent_events.map((ea, i) => (
              <div key={ea.id || i} className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50/50 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-veritas-50 flex items-center justify-center text-sm text-veritas-600">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">{ea.event_title || `Event #${ea.event_id}`}</p>
                  <p className="text-xs text-gray-400">{ea.clock_type === 'in' ? 'Check in' : 'Check out'} · {new Date(ea.clocked_at).toLocaleDateString()} {new Date(ea.clocked_at).toLocaleTimeString()}</p>
                </div>
                <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-md">{ea.clock_type}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Absences */}
      {overview?.absences && overview.absences.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mt-6">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Missed Events</h2>
            <span className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded-md">{overview.absences.length} absent</span>
          </div>
          <div className="divide-y divide-gray-50">
            {overview.absences.map((event, i) => (
              <div key={event.id || i} className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50/50 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-sm text-red-600">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">{event.title}</p>
                  <p className="text-xs text-gray-400">{event.start_date ? new Date(event.start_date).toLocaleDateString() : '—'} · {event.venue_name || 'No venue'}</p>
                </div>
                <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-md">{event.status || 'missed'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Registered Events Table */}
      {overview?.registered_events && overview.registered_events.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mt-6">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">All Registered Events</h2>
            <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-md">{overview.registered_events.length} events</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Event</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Venue</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Attendance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {overview.registered_events.map((event, i) => (
                  <tr key={event.id || i} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-3 text-gray-900 font-medium">{event.title}</td>
                    <td className="px-6 py-3 text-gray-500">
                      {event.start_date ? new Date(event.start_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-3 text-gray-500">{event.venue_name || '—'}</td>
                    <td className="px-6 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-md ${
                        event.status === 'completed' ? 'bg-green-50 text-green-700' :
                        event.status === 'active' ? 'bg-blue-50 text-blue-700' :
                        event.status === 'cancelled' ? 'bg-red-50 text-red-700' :
                        'bg-amber-50 text-amber-700'
                      }`}>
                        {event.status || 'upcoming'}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      {event.attended ? (
                        <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-md">Present</span>
                      ) : (
                        <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-md">Absent</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* My Events */}
      {!eventsLoading && myEvents.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mt-6">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">My Events</h2>
            <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-md">{myEvents.length} events</span>
          </div>
          <div className="divide-y divide-gray-50">
            {myEvents.map((event, i) => {
              const attColors = {
                present: 'bg-green-50 text-green-700',
                late: 'bg-amber-50 text-amber-700',
                absent: 'bg-red-50 text-red-700',
                pending: 'bg-blue-50 text-blue-700',
              }
              return (
                <div key={event.id || i} className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{event.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {event.start_date ? new Date(event.start_date).toLocaleDateString() : '—'}
                      {event.venue_name ? ` · ${event.venue_name}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {event.check_in_time && (
                      <span className="text-xs text-gray-500">
                        In: {new Date(event.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                    {event.check_out_time && (
                      <span className="text-xs text-gray-500">
                        Out: {new Date(event.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                    <span className={`text-xs font-semibold px-2 py-1 rounded-md ${attColors[event.attendance_status] || 'bg-gray-50 text-gray-600'}`}>
                      {event.attendance_status ? event.attendance_status.charAt(0).toUpperCase() + event.attendance_status.slice(1) : 'Unknown'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && todayClockings.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <svg className="w-12 h-12 text-gray-200 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-400 text-sm">No clocking records for today. Click "Clock In" to start your day.</p>
        </div>
      )}
    </AppLayout>
  )
}
