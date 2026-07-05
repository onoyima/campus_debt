import { useState, useEffect } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../../Components/AppLayout'
import api from '../../api'

export default function StaffDashboardIndex() {
  const [user, setUser] = useState({})
  const [todayClockings, setTodayClockings] = useState([])
  const [lastAction, setLastAction] = useState(null)
  const [clocking, setClocking] = useState(false)
  const [loading, setLoading] = useState(true)

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
