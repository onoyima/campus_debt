import { useState, useEffect } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../../Components/AppLayout'
import VeritasSpinner from '../../Components/VeritasSpinner'
import TerminalActivityModal from '../../Components/TerminalActivityModal'
import api from '../../api'

export default function EventShow() {
  const id = window.location.pathname.split('/')[2]
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activityModal, setActivityModal] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('token')) { window.location.href = '/login'; return }
    api.get(`/institutional-events/${id}?include=eventCategory,venue,participants,targetGroups,assignedTerminals`)
      .then((res) => setEvent(res.data.data || res.data))
      .catch(() => setError('Event not found.'))
      .finally(() => setLoading(false))
  }, [id])

  const handleToggleStatus = async (newStatus) => {
    if (!confirm(`Change status to "${newStatus}"?`)) return
    try {
      const res = await api.patch(`/institutional-events/${id}/toggle-status`, { status: newStatus })
      setEvent((prev) => ({ ...prev, status: newStatus }))
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status')
    }
  }

  const formatDate = (d) => {
    if (!d) return '—'
    return new Date(d.substring(0, 10) + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    })
  }

  if (loading) {
    return <AppLayout><VeritasSpinner text="Loading event details..." /></AppLayout>
  }

  if (error || !event) {
    return (
      <AppLayout>
        <div className="text-center py-16">
          <p className="text-gray-400">{error || 'Event not found.'}</p>
          <a href="/events" className="text-veritas-600 hover:text-veritas-800 text-sm mt-2 inline-block">Back to Events</a>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <Head title={event.title} />
      <div className="mb-6">
        <a href="/events" className="text-sm text-veritas-600 hover:text-veritas-800 mb-2 inline-block">&larr; Back to Events</a>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
            {event.description && <p className="text-sm text-gray-500 mt-1">{event.description}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`px-3 py-1 text-sm rounded-full font-medium ${
              event.status === 'active' ? 'bg-green-100 text-green-800' :
              event.status === 'completed' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>{event.status}</span>
            <a href={`/events/${id}/edit`} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">Edit</a>
            <a href={`/events/${id}/attendance-report`} className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 text-sm">Report</a>
            <a href={`/events/${id}/live`} className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm">Live Feed</a>
            {event.status === 'draft' && (
              <button onClick={() => handleToggleStatus('active')} className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 text-sm">Activate</button>
            )}
            {event.status === 'active' && (
              <button onClick={() => handleToggleStatus('completed')} className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm">Complete</button>
            )}
            {event.status === 'completed' && (
              <>
                <button onClick={() => handleToggleStatus('draft')} className="px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 text-sm">Reopen</button>
                <button onClick={() => handleToggleStatus('active')} className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 text-sm">Activate</button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Date & Time Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Date & Time</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400 block text-xs uppercase tracking-wider mb-1">Start Date</span>
                <span className="text-gray-900 font-medium">{formatDate(event.start_date)}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-xs uppercase tracking-wider mb-1">End Date</span>
                <span className="text-gray-900 font-medium">{event.end_date ? formatDate(event.end_date) : '—'}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-xs uppercase tracking-wider mb-1">Attendance Open</span>
                <span className="text-gray-900 font-medium">{event.attendance_open_time?.substring(0, 5) || '—'}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-xs uppercase tracking-wider mb-1">Attendance Close</span>
                <span className="text-gray-900 font-medium">{event.attendance_close_time?.substring(0, 5) || '—'}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-xs uppercase tracking-wider mb-1">Late Check-in Close</span>
                <span className="text-gray-900 font-medium">{event.late_check_in_close?.substring(0, 5) || '—'}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-xs uppercase tracking-wider mb-1">Grace Period</span>
                <span className="text-gray-900 font-medium">{event.grace_period_minutes ? `${event.grace_period_minutes} min` : '—'}</span>
              </div>
              {event.clock_out_open_time && (
                <div>
                  <span className="text-gray-400 block text-xs uppercase tracking-wider mb-1">Clock-out Open</span>
                  <span className="text-gray-900 font-medium">{event.clock_out_open_time.substring(0, 5)}</span>
                </div>
              )}
              {event.clock_out_close_time && (
                <div>
                  <span className="text-gray-400 block text-xs uppercase tracking-wider mb-1">Clock-out Close</span>
                  <span className="text-gray-900 font-medium">{event.clock_out_close_time.substring(0, 5)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Venue */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Venue</h2>
            {event.venue ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-veritas-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-veritas-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0zM19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{event.venue.name}</p>
                  {event.venue.description && <p className="text-xs text-gray-400">{event.venue.description}</p>}
                </div>
              </div>
            ) : <p className="text-sm text-gray-400">No venue assigned.</p>}
          </div>

          {/* Assigned Terminals */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Assigned Terminals / Machines</h2>
              <button onClick={() => setActivityModal(true)}
                className="text-xs text-veritas-600 hover:text-veritas-800 font-medium">
                View Activity
              </button>
            </div>
            {event.assigned_terminals && event.assigned_terminals.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {event.assigned_terminals.map((t) => (
                  <div key={t.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50">
                    <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">{t.device_id}</p>
                      <p className="text-xs text-gray-400">{t.ip_address} &middot; {t.terminal_type} &middot; {t.clocking_mode}</p>
                      <p className="text-xs text-gray-400">
                        {t.connection_status === 'online' ? (
                          <span className="text-emerald-600">&bull; Online</span>
                        ) : (
                          <span className="text-red-500">&bull; Offline</span>
                        )}
                        {t.last_heartbeat_at && <> &middot; Last ping: {new Date(t.last_heartbeat_at).toLocaleTimeString()}</>}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-400 mb-2">No terminals directly assigned.</p>
                {event.venue && (
                  <p className="text-xs text-gray-400">Will use terminals assigned to venue: <span className="font-medium">{event.venue.name}</span></p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Event Info Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Event Info</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-gray-400 text-xs uppercase tracking-wider">Type</dt>
                <dd className="text-gray-900 font-medium capitalize">{event.event_type?.replace(/_/g, ' ') || 'One-time'}</dd>
              </div>
              <div>
                <dt className="text-gray-400 text-xs uppercase tracking-wider">Category</dt>
                <dd className="text-gray-900 font-medium">{event.event_category?.name || <span className="text-gray-300">Uncategorized</span>}</dd>
              </div>
              <div>
                <dt className="text-gray-400 text-xs uppercase tracking-wider">Organizing Unit</dt>
                <dd className="text-gray-900 font-medium capitalize">{event.organizing_unit_type?.replace(/_/g, ' ') || <span className="text-gray-300">Not specified</span>}</dd>
              </div>
              <div>
                <dt className="text-gray-400 text-xs uppercase tracking-wider">Mandatory</dt>
                <dd>{event.is_mandatory ? <span className="text-rose-600 font-medium">Yes</span> : <span className="text-gray-400">No</span>}</dd>
              </div>
              <div>
                <dt className="text-gray-400 text-xs uppercase tracking-wider">Active</dt>
                <dd>{event.is_active ? <span className="text-emerald-600 font-medium">Yes</span> : <span className="text-gray-400">No</span>}</dd>
              </div>
              <div>
                <dt className="text-gray-400 text-xs uppercase tracking-wider">Event ID</dt>
                <dd className="text-gray-900 font-mono text-xs">{event.id}</dd>
              </div>
            </dl>
          </div>

          {/* Target Audience */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Target Audience</h2>
            {event.target_groups && event.target_groups.length > 0 ? (
              <div className="space-y-2">
                {event.target_groups.map((g) => (
                  <div key={g.id} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-gray-50">
                    <svg className="w-4 h-4 text-veritas-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                    </svg>
                    <span className="text-gray-700 capitalize">{g.target_type.replace(/_/g, ' ')}</span>
                    {g.target_id && <span className="text-xs text-gray-400">(ID: {g.target_id})</span>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No target audience configured.</p>
            )}
          </div>

          {/* Participants Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Participants</h2>
            {event.participants ? (
              <div>
                <div className="text-center mb-4">
                  <span className="text-3xl font-bold text-gray-900">{event.participants.length}</span>
                  <p className="text-xs text-gray-400 mt-1">Total Enrolled</p>
                </div>
                <div className="text-sm space-y-2">
                  {(() => {
                    const staff = event.participants.filter(p => p.participant_type === 'staff').length
                    const students = event.participants.filter(p => p.participant_type === 'student').length
                    return (
                      <>
                        <div className="flex justify-between py-1.5 px-3 rounded-lg bg-gray-50">
                          <span className="text-gray-600">Staff</span>
                          <span className="font-semibold text-gray-900">{staff}</span>
                        </div>
                        <div className="flex justify-between py-1.5 px-3 rounded-lg bg-gray-50">
                          <span className="text-gray-600">Students</span>
                          <span className="font-semibold text-gray-900">{students}</span>
                        </div>
                      </>
                    )
                  })()}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Participants not loaded.</p>
            )}
          </div>
        </div>
      </div>

      {activityModal && (
        <TerminalActivityModal eventId={id} onClose={() => setActivityModal(false)} />
      )}
    </AppLayout>
  )
}
