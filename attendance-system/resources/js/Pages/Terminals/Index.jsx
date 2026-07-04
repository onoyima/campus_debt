import { useState, useEffect } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../../Components/AppLayout'
import Table from '../../Components/Table'
import VeritasSpinner from '../../Components/VeritasSpinner'
import Pagination from '../../Components/Pagination'
import api from '../../api'

export default function TerminalsIndex() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [showTrashed, setShowTrashed] = useState(false)
  const [meta, setMeta] = useState({})
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [actionLoading, setActionLoading] = useState({})

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      fetchData()
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    if (!localStorage.getItem('token')) { window.location.href = '/login'; return }
    fetchData()
  }, [page, showTrashed])

  const fetchData = (trashed = showTrashed) => {
    setLoading(true)
    const params = new URLSearchParams()
    if (trashed) params.set('trashed', '1')
    if (search) params.set('search', search)
    params.set('page', page)
    params.set('per_page', '15')
    const qs = params.toString()
    api.get(`/terminals${qs ? `?${qs}` : ''}`)
      .then((res) => {
        setData(res.data.data || res.data)
        setMeta(res.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const handleDelete = async (row) => {
    if (!confirm(`Delete terminal "${row.device_id}"?`)) return
    setActionLoading(prev => ({ ...prev, [`delete-${row.id}`]: true }))
    try {
      await api.delete(`/terminals/${row.id}`)
      setData((prev) => prev.filter((r) => r.id !== row.id))
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed')
    } finally {
      setActionLoading(prev => ({ ...prev, [`delete-${row.id}`]: false }))
    }
  }

  const handleRestore = async (id) => {
    if (!confirm('Restore this terminal?')) return
    setActionLoading(prev => ({ ...prev, [`restore-${id}`]: true }))
    try {
      await api.post(`/terminals/${id}/restore`)
      fetchData(showTrashed)
    } catch (err) {
      alert(err.response?.data?.message || 'Restore failed')
    } finally {
      setActionLoading(prev => ({ ...prev, [`restore-${id}`]: false }))
    }
  }

  const handleForceDelete = async (id) => {
    if (!confirm('Permanently delete this terminal? This cannot be undone.')) return
    setActionLoading(prev => ({ ...prev, [`force-${id}`]: true }))
    try {
      await api.delete(`/terminals/${id}/force`)
      fetchData(showTrashed)
    } catch (err) {
      alert(err.response?.data?.message || 'Force delete failed')
    } finally {
      setActionLoading(prev => ({ ...prev, [`force-${id}`]: false }))
    }
  }

  const modeLabel = (mode) => ({
    any: 'Unrestricted',
    class_only: 'Class Only',
    staff_only: 'Staff Only',
    event_only: 'Event Only',
  }[mode] || mode)

  const modeColor = (mode) => ({
    any: 'bg-blue-100 text-blue-800',
    class_only: 'bg-purple-100 text-purple-800',
    staff_only: 'bg-green-100 text-green-800',
    event_only: 'bg-orange-100 text-orange-800',
  }[mode] || 'bg-gray-100 text-gray-800')

  const columns = [
    { key: 'device_id', label: 'Device ID' },
    { key: 'terminal_type', label: 'Type' },
    {
      key: 'clocking_mode',
      label: 'Clocking Mode',
      render: (val) => (
        <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${modeColor(val)}`}>
          {modeLabel(val)}
        </span>
      ),
    },
    { key: 'os', label: 'OS' },
    { key: 'firmware_version', label: 'Firmware' },
    {
      key: 'is_active',
      label: 'Status',
      render: (val) => (
        <span className={`px-2 py-1 text-xs rounded-full ${val ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {val ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    { key: 'venue_name', label: 'Venue' },
    {
      key: 'trashed',
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
      <Head title="Terminals" />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Terminals</h1>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-veritas-500 focus:border-veritas-500"
          />
          <button onClick={() => { const next = !showTrashed; setShowTrashed(next); }}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
              showTrashed ? 'bg-red-50 text-red-700 border-red-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}>
            {showTrashed ? 'Active Records' : 'Trash'}
          </button>
          <a href="/terminals/create" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">Add Terminal</a>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow">
        <Table columns={columns} data={data} loading={loading} onEdit={(row) => window.location.href = `/terminals/${row.id}/edit`} onDelete={handleDelete} />
        {!loading && <Pagination meta={meta} onPageChange={setPage} />}
      </div>
    </AppLayout>
  )
}
