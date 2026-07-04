import { useState, useEffect } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../../Components/AppLayout'
import Table from '../../Components/Table'
import VeritasSpinner from '../../Components/VeritasSpinner'
import Pagination from '../../Components/Pagination'
import api from '../../api'

export default function StaffComplianceIndex() {
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

  const fetchRecords = (trashed = false) => {
    setLoading(true)
    const params = { page, per_page: '15' }
    if (trashed) params.trashed = '1'
    if (search) params.search = search
    api.get('/staff-compliance', { params })
      .then((res) => {
        setRecords(res.data.data || res.data)
        setMeta(res.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const handleDelete = async (record) => {
    if (!confirm(`Delete this staff compliance record?`)) return
    setActionLoading(prev => ({ ...prev, [`delete-${record.id}`]: true }))
    try {
      await api.delete(`/staff-compliance/${record.id}`)
      setRecords((prev) => prev.filter((r) => r.id !== record.id))
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed')
    } finally {
      setActionLoading(prev => ({ ...prev, [`delete-${record.id}`]: false }))
    }
  }

  const handleRestore = async (id) => {
    if (!confirm('Restore this item?')) return
    setActionLoading(prev => ({ ...prev, [`restore-${id}`]: true }))
    try {
      await api.post(`/staff-compliance/${id}/restore`)
      fetchRecords(showTrashed)
    } catch (e) { console.error(e) } finally {
      setActionLoading(prev => ({ ...prev, [`restore-${id}`]: false }))
    }
  }

  const handleForceDelete = async (id) => {
    if (!confirm('Permanently delete this item? This cannot be undone.')) return
    setActionLoading(prev => ({ ...prev, [`force-${id}`]: true }))
    try {
      await api.delete(`/staff-compliance/${id}/force`)
      fetchRecords(showTrashed)
    } catch (e) { console.error(e) } finally {
      setActionLoading(prev => ({ ...prev, [`force-${id}`]: false }))
    }
  }

  const columns = [
    { key: 'staff_id', label: 'Staff ID' },
    { key: 'institutional_event_id', label: 'Event ID' },
    { key: 'attendance_status_id', label: 'Attendance Status ID' },
    { key: 'reported_to_qa', label: 'Reported to QA', render: (val) => val ? 'Yes' : 'No' },
    { key: 'reported_to_bursary', label: 'Reported to Bursary', render: (val) => val ? 'Yes' : 'No' },
    { key: 'deduction_processed', label: 'Deduction Processed', render: (val) => val ? 'Yes' : 'No' },
    { key: 'qa_approved', label: 'QA Approved', render: (val) => val ? 'Yes' : 'No' },
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
      <Head title="Staff Compliance" />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Staff Compliance</h1>
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
        </div>
      </div>
      <div className="bg-white rounded-lg shadow">
        <Table columns={columns} data={records} loading={loading} onDelete={showTrashed ? undefined : handleDelete} />
        {!loading && <Pagination meta={meta} onPageChange={setPage} />}
      </div>
    </AppLayout>
  )
}
