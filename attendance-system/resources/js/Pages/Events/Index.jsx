import { useState, useEffect } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../../Components/AppLayout'
import Table from '../../Components/Table'
import VeritasSpinner from '../../Components/VeritasSpinner'
import Pagination from '../../Components/Pagination'
import TerminalActivityModal from '../../Components/TerminalActivityModal'
import api from '../../api'

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
    const params = { page, per_page: '15' }
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

  const columns = [
    { key: 'title', label: 'Title' },
    { key: 'start_date', label: 'Date' },
    { key: 'category_name', label: 'Category' },
    { key: 'venue_name', label: 'Venue' },
    {
      key: 'is_mandatory',
      label: 'Mandatory',
      render: (val) => val ? 'Yes' : 'No',
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => (
        <span className={`px-2 py-1 text-xs rounded-full ${
          val === 'active' ? 'bg-green-100 text-green-800' : val === 'completed' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {val}
        </span>
      ),
    },
    {
      key: '_actions',
      label: '',
      render: (_, row) => row.deleted_at ? null : (
        <div className="flex items-center gap-1">
          <a
            href={`/events/${row.id}/attendance-report`}
            className="text-[10px] font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors"
          >
            Report
          </a>
          <button
            onClick={() => setActivityEventId(row.id)}
            className="text-[10px] font-medium text-veritas-600 hover:text-veritas-800 bg-veritas-50 hover:bg-veritas-100 px-2.5 py-1 rounded-lg transition-colors"
          >
            Terminals
          </button>
        </div>
      ),
    },
    {
      key: '_trashed',
      label: '',
      render: (_, row) => row.deleted_at ? (
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-700 uppercase">Trashed</span>
          <button onClick={() => handleRestore(row.id)} disabled={actionLoading[`restore-${row.id}`]} className="text-[10px] text-veritas-600 hover:text-veritas-800 font-medium">
            {actionLoading[`restore-${row.id}`] ? <VeritasSpinner size="sm" /> : 'Restore'}
          </button>
          <button onClick={() => handleForceDelete(row.id)} disabled={actionLoading[`force-${row.id}`]} className="text-[10px] text-red-500 hover:text-red-700 font-medium">
            {actionLoading[`force-${row.id}`] ? <VeritasSpinner size="sm" /> : 'Delete Forever'}
          </button>
        </div>
      ) : null,
    },
  ]

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
      <div className="bg-white rounded-lg shadow">
        <Table columns={columns} data={events} loading={loading} onEdit={showTrashed ? undefined : (row) => window.location.href = `/events/${row.id}/edit`} onDelete={showTrashed ? undefined : handleDelete} />
        {!loading && <Pagination meta={meta} onPageChange={setPage} />}
      </div>

      {activityEventId && (
        <TerminalActivityModal eventId={activityEventId} onClose={() => setActivityEventId(null)} />
      )}
    </AppLayout>
  )
}
