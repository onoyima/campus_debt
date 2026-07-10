import { useState, useEffect } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../../Components/AppLayout'
import VeritasSpinner from '../../Components/VeritasSpinner'
import Pagination from '../../Components/Pagination'
import TerminalActivityModal from '../../Components/TerminalActivityModal'
import api from '../../api'

const statusColors = {
  active: 'bg-green-100 text-green-800',
  completed: 'bg-blue-100 text-blue-800',
  draft: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
}

export default function EventsIndex() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showTrashed, setShowTrashed] = useState(false)
  const [meta, setMeta] = useState({})
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [actionLoading, setActionLoading] = useState({})
  const [activityEventId, setActivityEventId] = useState(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      fetchEvents()
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    if (!localStorage.getItem('token')) { window.location.href = '/login'; return }
    fetchEvents()
  }, [page, showTrashed])

  const fetchEvents = (trashed = false) => {
    setLoading(true)
    const params = { page, per_page: '15', include: 'eventCategory,venue,assignedTerminals' }
    if (trashed) params.trashed = '1'
    if (search) params.search = search
    api.get('/institutional-events', { params })
      .then((res) => {
        setEvents(res.data.data || res.data)
        setMeta(res.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const handleToggleStatus = async (event, newStatus) => {
    const labels = { draft: 'draft', active: 'active', completed: 'completed' }
    if (!confirm(`Change "${event.title}" status to ${labels[newStatus]}?`)) return
    setActionLoading(prev => ({ ...prev, [`toggle-${event.id}`]: true }))
    try {
      await api.patch(`/institutional-events/${event.id}/toggle-status`, { status: newStatus })
      setEvents((prev) => prev.map((e) => e.id === event.id ? { ...e, status: newStatus } : e))
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status')
    } finally {
      setActionLoading(prev => ({ ...prev, [`toggle-${event.id}`]: false }))
    }
  }

  const handleDelete = async (event) => {
    if (!confirm(`Delete event "${event.title}"?`)) return
    setActionLoading(prev => ({ ...prev, [`delete-${event.id}`]: true }))
    try {
      await api.delete(`/institutional-events/${event.id}`)
      setEvents((prev) => prev.filter((e) => e.id !== event.id))
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed')
    } finally {
      setActionLoading(prev => ({ ...prev, [`delete-${event.id}`]: false }))
    }
  }

  const handleRestore = async (id) => {
    if (!confirm('Restore this item?')) return
    setActionLoading(prev => ({ ...prev, [`restore-${id}`]: true }))
    try {
      await api.post(`/institutional-events/${id}/restore`)
      fetchEvents(showTrashed)
    } catch (e) { console.error(e) } finally {
      setActionLoading(prev => ({ ...prev, [`restore-${id}`]: false }))
    }
  }

  const handleForceDelete = async (id) => {
    if (!confirm('Permanently delete this item? This cannot be undone.')) return
    setActionLoading(prev => ({ ...prev, [`force-${id}`]: true }))
    try {
      await api.delete(`/institutional-events/${id}/force`)
      fetchEvents(showTrashed)
    } catch (e) { console.error(e) } finally {
      setActionLoading(prev => ({ ...prev, [`force-${id}`]: false }))
    }
  }

  const formatDate = (d) => {
    if (!d) return '—'
    const date = new Date(d.substring(0, 10) + 'T00:00:00')
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <AppLayout>
      <Head title="Events" />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Institutional Events</h1>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-veritas-500 focus:border-veritas-500"
          />
          <a href="/events/create" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">
            Add Event
          </a>
          <button onClick={() => { const next = !showTrashed; setShowTrashed(next); }}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
              showTrashed ? 'bg-red-50 text-red-700 border-red-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}>
            {showTrashed ? 'Active Records' : 'Trash'}
          </button>
        </div>
      </div>

      {loading ? (
        <VeritasSpinner text="Loading events..." />
      ) : events.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-400">No events found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Venue</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Terminals</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Participants</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {events.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900 max-w-[220px] truncate" title={row.title}>{row.title}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {row.event_type === 'recurring' ? 'Recurring' : 'One-time'}
                        {row.organizing_unit_type && (
                          <> &middot; {row.organizing_unit_type.replace(/_/g, ' ')}</>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(row.start_date)}{row.end_date && row.end_date !== row.start_date ? <> &mdash; {formatDate(row.end_date)}</> : ''}
                      <div className="text-xs text-gray-400 mt-0.5">
                        {row.attendance_open_time ? row.attendance_open_time.substring(0, 5) : ''}
                        {row.attendance_close_time ? <> &middot; {row.attendance_close_time.substring(0, 5)}</> : ''}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {row.event_category ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                          {row.event_category.name}
                        </span>
                      ) : <span className="text-gray-300">&mdash;</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {row.venue ? (
                        <span className="inline-flex items-center gap-1">
                          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0zM19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                          </svg>
                          {row.venue.name}
                        </span>
                      ) : <span className="text-gray-300">&mdash;</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-[160px]">
                      {row.assigned_terminals && row.assigned_terminals.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {row.assigned_terminals.map((t) => (
                            <span key={t.id} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-600">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                              </svg>
                              {t.device_id}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Venue defaults</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">
                        {row.participants_count ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${statusColors[row.status] || 'bg-gray-100 text-gray-800'}`}>
                        {row.status}
                      </span>
                      {row.is_mandatory && (
                        <span className="ml-1 text-[10px] font-bold uppercase text-rose-500 bg-rose-50 px-1 py-0.5 rounded">Req</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                      {row.deleted_at ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-700 uppercase">Trashed</span>
                          <button onClick={() => handleRestore(row.id)} disabled={actionLoading[`restore-${row.id}`]} className="text-[10px] text-veritas-600 hover:text-veritas-800 font-medium">
                            {actionLoading[`restore-${row.id}`] ? <VeritasSpinner size="sm" /> : 'Restore'}
                          </button>
                          <button onClick={() => handleForceDelete(row.id)} disabled={actionLoading[`force-${row.id}`]} className="text-[10px] text-red-500 hover:text-red-700 font-medium">
                            {actionLoading[`force-${row.id}`] ? <VeritasSpinner size="sm" /> : 'Delete Forever'}
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <a href={`/events/${row.id}`}
                            className="text-[10px] font-medium text-veritas-600 hover:text-veritas-800 bg-veritas-50 hover:bg-veritas-100 px-2.5 py-1 rounded-lg transition-colors">
                            View
                          </a>
                          <a href={`/events/${row.id}/attendance-report`}
                            className="text-[10px] font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors">
                            Report
                          </a>
                          <a href={`/events/${row.id}/edit`}
                            className="text-[10px] font-medium text-gray-600 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 px-2.5 py-1 rounded-lg transition-colors">
                            Edit
                          </a>
                          <button onClick={() => setActivityEventId(row.id)}
                            className="text-[10px] font-medium text-cyan-600 hover:text-cyan-800 bg-cyan-50 hover:bg-cyan-100 px-2.5 py-1 rounded-lg transition-colors">
                            Terminals
                          </button>
                          {row.status === 'draft' && (
                            <button onClick={() => handleToggleStatus(row, 'active')}
                              disabled={actionLoading[`toggle-${row.id}`]}
                              className="text-[10px] font-medium text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors">
                              {actionLoading[`toggle-${row.id}`] ? '...' : 'Activate'}
                            </button>
                          )}
                          {row.status === 'active' && (
                            <button onClick={() => handleToggleStatus(row, 'completed')}
                              disabled={actionLoading[`toggle-${row.id}`]}
                              className="text-[10px] font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors">
                              {actionLoading[`toggle-${row.id}`] ? '...' : 'Complete'}
                            </button>
                          )}
                          {row.status === 'completed' && (
                            <>
                              <button onClick={() => handleToggleStatus(row, 'draft')}
                                disabled={actionLoading[`toggle-${row.id}`]}
                                className="text-[10px] font-medium text-amber-600 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg transition-colors">
                                {actionLoading[`toggle-${row.id}`] ? '...' : 'Reopen'}
                              </button>
                              <button onClick={() => handleToggleStatus(row, 'active')}
                                disabled={actionLoading[`toggle-${row.id}`]}
                                className="text-[10px] font-medium text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors">
                                {actionLoading[`toggle-${row.id}`] ? '...' : 'Activate'}
                              </button>
                            </>
                          )}
                          <button onClick={() => { if (confirm(`Delete "${row.title}"?`)) handleDelete(row) }}
                            disabled={actionLoading[`delete-${row.id}`]}
                            className="text-[10px] font-medium text-red-500 hover:text-red-700 px-2 py-1">
                            {actionLoading[`delete-${row.id}`] ? '...' : 'Delete'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && <Pagination meta={meta} onPageChange={setPage} />}
        </div>
      )}

      {activityEventId && (
        <TerminalActivityModal eventId={activityEventId} onClose={() => setActivityEventId(null)} />
      )}
    </AppLayout>
  )
}
