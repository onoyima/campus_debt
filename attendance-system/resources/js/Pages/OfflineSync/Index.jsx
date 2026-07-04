import { useState, useEffect } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../../Components/AppLayout'
import Table from '../../Components/Table'
import VeritasSpinner from '../../Components/VeritasSpinner'
import Pagination from '../../Components/Pagination'
import api from '../../api'

export default function OfflineSyncIndex() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [showTrashed, setShowTrashed] = useState(false)
  const [meta, setMeta] = useState({})
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [actionLoading, setActionLoading] = useState({})

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      fetchRecords()
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    if (!localStorage.getItem('token')) { window.location.href = '/login'; return }
    fetchRecords()
  }, [page, showTrashed])

  const fetchRecords = (trashed = showTrashed) => {
    setLoading(true)
    const params = new URLSearchParams()
    if (trashed) params.set('trashed', '1')
    if (search) params.set('search', search)
    params.set('page', page)
    params.set('per_page', '15')
    api.get(`/offline-sync?${params}`)
      .then((res) => {
        setRecords(res.data.data || res.data)
        setMeta(res.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const handleProcessAll = async () => {
    if (!confirm('Process all pending sync records?')) return
    try {
      await api.post('/offline-sync/process-all')
      fetchRecords()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to process all')
    }
  }

  const handleRestore = async (id) => {
    if (!confirm('Restore this sync record?')) return
    setActionLoading(prev => ({ ...prev, [`restore-${id}`]: true }))
    try {
      await api.post(`/offline-sync/${id}/restore`)
      fetchRecords()
    } catch (e) { console.error(e) } finally {
      setActionLoading(prev => ({ ...prev, [`restore-${id}`]: false }))
    }
  }

  const handleForceDelete = async (id) => {
    if (!confirm('Permanently delete this sync record? This cannot be undone.')) return
    setActionLoading(prev => ({ ...prev, [`force-${id}`]: true }))
    try {
      await api.delete(`/offline-sync/${id}/force`)
      fetchRecords()
    } catch (e) { console.error(e) } finally {
      setActionLoading(prev => ({ ...prev, [`force-${id}`]: false }))
    }
  }

  const handleProcess = async (record) => {
    setActionLoading(prev => ({ ...prev, [`process-${record.id}`]: true }))
    try {
      await api.post(`/offline-sync/${record.id}/process`)
      fetchRecords()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to process record')
    } finally {
      setActionLoading(prev => ({ ...prev, [`process-${record.id}`]: false }))
    }
  }

  const columns = [
    { key: 'terminal_id', label: 'Terminal ID' },
    { key: 'table_name', label: 'Table' },
    { key: 'action', label: 'Action' },
    {
      key: 'status',
      label: 'Status',
      render: (val) => (
        <span className={`px-2 py-1 text-xs rounded-full ${
          val === 'synced' || val === 'completed' ? 'bg-green-100 text-green-800' : val === 'failed' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
        }`}>
          {val}
        </span>
      ),
    },
    { key: 'retry_count', label: 'Retries' },
    { key: 'created_at', label: 'Created At' },
    { key: 'synced_at', label: 'Synced At', render: (val) => val || '-' },
    {
      key: 'trashed',
      label: 'Trash',
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
      <Head title="Offline Sync Queue" />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Offline Sync Queue</h1>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-veritas-500 focus:border-veritas-500"
          />
          <button onClick={() => { setShowTrashed(!showTrashed); }}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
              showTrashed ? 'bg-red-50 text-red-700 border-red-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}>
            {showTrashed ? 'Active Records' : 'Trash'}
          </button>
          <button onClick={handleProcessAll} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">
            Process All
          </button>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow">
        <Table
          columns={columns}
          data={records}
          loading={loading}
          onEdit={(row) => handleProcess(row)}
        />
        {!loading && <Pagination meta={meta} onPageChange={setPage} />}
      </div>
    </AppLayout>
  )
}
