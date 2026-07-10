import { useState, useEffect, useMemo } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../../Components/AppLayout'
import api from '../../api'

const statusColors = {
  present: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  late: 'bg-amber-50 text-amber-700 border-amber-200',
  absent: 'bg-rose-50 text-rose-700 border-rose-200',
  pending: 'bg-blue-50 text-blue-700 border-blue-200',
}

const eventStatusColors = {
  active: 'bg-green-50 text-green-700',
  draft: 'bg-gray-50 text-gray-600',
  completed: 'bg-indigo-50 text-indigo-700',
  cancelled: 'bg-red-50 text-red-600',
}

function StatusBadge({ status }) {
  const color = statusColors[status] || 'bg-gray-50 text-gray-600 border-gray-200'
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full border ${color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === 'present' ? 'bg-emerald-500' : status === 'late' ? 'bg-amber-500' : status === 'absent' ? 'bg-rose-500' : 'bg-blue-500'}`} />
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown'}
    </span>
  )
}

function EventCard({ event }) {
  const startDate = event.start_date ? new Date(event.start_date.substring(0, 10) + 'T00:00:00') : null
  const endDate = event.end_date ? new Date(event.end_date.substring(0, 10) + 'T00:00:00') : null
  const isMultiDay = endDate && endDate.getTime() !== startDate?.getTime()

  const checkIn = event.check_in_time ? new Date(event.check_in_time * 1000) : null
  const checkOut = event.check_out_time ? new Date(event.check_out_time * 1000) : null

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-sm transition-shadow">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base font-semibold text-gray-900 truncate">{event.title}</h3>
              {event.is_mandatory && (
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded">Mandatory</span>
              )}
            </div>
            {event.description && (
              <p className="text-sm text-gray-500 line-clamp-2 mb-2">{event.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
                {startDate ? startDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                {isMultiDay && ` — ${endDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}`}
              </span>
              {event.venue_name && (
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0zM19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                  {event.venue_name}
                </span>
              )}
              {event.category && (
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                  </svg>
                  {event.category}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <StatusBadge status={event.attendance_status} />
            <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${eventStatusColors[event.status] || 'bg-gray-50 text-gray-600'}`}>
              {event.status}
            </span>
          </div>
        </div>

        {(checkIn || checkOut) && (
          <div className="mt-4 flex items-center gap-4 text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2">
            {checkIn && (
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
                Check-in: {checkIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            {checkOut && (
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0110.5 3h6a2.25 2.25 0 012.25 2.25v13.5A2.25 2.25 0 0116.5 21h-6a2.25 2.25 0 01-2.25-2.25V15m-3 0l-3-3m0 0l3-3m-3 3H15" />
                </svg>
                Check-out: {checkOut.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        )}

        {event.windows && (
          <div className="mt-3 flex items-center gap-2 text-[10px] text-gray-400 font-mono">
            <span className="text-emerald-600">{event.windows.check_in_open?.split(' ')[1]}</span>
            <span className="text-gray-300">→</span>
            <span className="text-emerald-600">{event.windows.check_in_close?.split(' ')[1]}</span>
            <span className="text-gray-300 mx-0.5">·</span>
            <span className="text-amber-600">{event.windows.late_check_in_open?.split(' ')[1]}</span>
            <span className="text-gray-300">→</span>
            <span className="text-amber-600">{event.windows.late_check_in_close?.split(' ')[1]}</span>
            <span className="text-gray-300 mx-0.5">·</span>
            <span className="text-blue-600">{event.windows.check_out_open?.split(' ')[1]}</span>
            <span className="text-gray-300">→</span>
            <span className="text-blue-600">{event.windows.check_out_close?.split(' ')[1]}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function MyEvents() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')

  useEffect(() => {
    if (!localStorage.getItem('token')) { window.location.href = '/login'; return }
    const user = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}') } catch { return {} } })()
    const params = {}
    if (user.type === 'student') params.student_id = user.id
    api.get('/my-events', { params })
      .then(res => setEvents(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const now = new Date()
  const categorized = useMemo(() => {
    const active = []
    const upcoming = []
    const completed = []
    for (const ev of events) {
      const parseDt = (s) => s ? new Date(s.replace(' ', 'T')) : null
      const checkInClose = parseDt(ev.windows?.check_in_close)
      const checkOutClose = parseDt(ev.windows?.check_out_close)
      if (ev.status === 'completed') {
        completed.push(ev)
      } else if (ev.status === 'active' && checkInClose && now >= checkInClose) {
        active.push(ev)
      } else if (ev.status === 'active' || ev.status === 'draft') {
        upcoming.push(ev)
      } else {
        completed.push(ev)
      }
    }
    return { active, upcoming, completed }
  }, [events])

  const filtered = activeTab === 'all' ? events : categorized[activeTab] || []

  return (
    <AppLayout>
      <Head title="My Events" />

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-veritas-500 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Events</h1>
            <p className="text-sm text-gray-400 mt-0.5">Events you are enrolled in and your attendance status</p>
          </div>
        </div>
        <span className="text-xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-lg">{events.length} events</span>
      </div>

      {!loading && events.length > 0 && (
        <div className="flex items-center gap-1 mb-5 bg-white rounded-xl p-1 border border-gray-100 w-fit">
          {[
            { key: 'all', label: 'All', count: events.length },
            { key: 'active', label: 'Active', count: categorized.active.length },
            { key: 'upcoming', label: 'Upcoming', count: categorized.upcoming.length },
            { key: 'completed', label: 'Completed', count: categorized.completed.length },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab.key
                  ? 'bg-veritas-500 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 text-xs ${activeTab === tab.key ? 'text-veritas-200' : 'text-gray-400'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
              <div className="flex justify-between">
                <div className="space-y-3 flex-1">
                  <div className="h-5 bg-gray-100 rounded w-48" />
                  <div className="h-3 bg-gray-50 rounded w-64" />
                  <div className="flex gap-4">
                    <div className="h-3 bg-gray-50 rounded w-28" />
                    <div className="h-3 bg-gray-50 rounded w-24" />
                  </div>
                </div>
                <div className="h-6 bg-gray-50 rounded-full w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <svg className="w-16 h-16 text-gray-200 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No {activeTab !== 'all' ? activeTab : ''} Events</h3>
          <p className="text-sm text-gray-400">
            {activeTab === 'all' ? 'You are not enrolled in any events yet.' : `No ${activeTab} events found.`}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((event, i) => (
            <EventCard key={event.id || i} event={event} />
          ))}
        </div>
      )}
    </AppLayout>
  )
}
