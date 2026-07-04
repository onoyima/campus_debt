import { useState, useEffect } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../../Components/AppLayout'
import Table from '../../Components/Table'
import VeritasSpinner from '../../Components/VeritasSpinner'
import Pagination from '../../Components/Pagination'
import api from '../../api'

export default function DebtsIndex() {
  const [debts, setDebts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ student_id: '', payment_status: '' })
  const [showTrashed, setShowTrashed] = useState(false)
  const [meta, setMeta] = useState({})
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [actionLoading, setActionLoading] = useState({})

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      fetchDebts()
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    if (!localStorage.getItem('token')) { window.location.href = '/login'; return }
    fetchDebts()
  }, [page, showTrashed])

  const fetchDebts = async (extraParams = {}) => {
    setLoading(true)
    try {
      const res = await api.get('/debts', { params: { ...filters, search: search || undefined, page, per_page: '15', trashed: showTrashed ? '1' : undefined, ...extraParams } })
      setDebts(res.data.data || res.data)
      setMeta(res.data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const handleFilter = () => {
    fetchDebts({ page: 1 })
  }

  const handleDelete = async (debt) => {
    if (!confirm(`Delete this debt record?`)) return
    setActionLoading(prev => ({ ...prev, [`delete-${debt.id}`]: true }))
    try {
      await api.delete(`/debts/${debt.id}`)
      setDebts((prev) => prev.filter((d) => d.id !== debt.id))
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed')
    } finally {
      setActionLoading(prev => ({ ...prev, [`delete-${debt.id}`]: false }))
    }
  }

  const handleRestore = async (id) => {
    if (!confirm('Restore this item?')) return
    setActionLoading(prev => ({ ...prev, [`restore-${id}`]: true }))
    try {
      await api.post(`/debts/${id}/restore`)
      fetchDebts()
    } catch (e) { console.error(e) } finally {
      setActionLoading(prev => ({ ...prev, [`restore-${id}`]: false }))
    }
  }

  const handleForceDelete = async (id) => {
    if (!confirm('Permanently delete this item? This cannot be undone.')) return
    setActionLoading(prev => ({ ...prev, [`force-${id}`]: true }))
    try {
      await api.delete(`/debts/${id}/force`)
      fetchDebts()
    } catch (e) { console.error(e) } finally {
      setActionLoading(prev => ({ ...prev, [`force-${id}`]: false }))
    }
  }

  const columns = [
    { key: 'student_name', label: 'Student' },
    { key: 'amount', label: 'Amount', render: (val) => Number(val).toLocaleString() },
    { key: 'reason', label: 'Reason' },
    { key: 'due_date', label: 'Due Date' },
    {
      key: 'payment_status',
      label: 'Status',
      render: (val) => (
        <span className={`px-2 py-1 text-xs rounded-full ${
          val === 'paid' ? 'bg-green-100 text-green-800' : val === 'partial' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
        }`}>
          {val}
        </span>
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
      <Head title="Debts" />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Debts</h1>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-veritas-500 focus:border-veritas-500"
          />
        </div>
      </div>
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Student ID</label>
            <input
              type="text"
              value={filters.student_id}
              onChange={(e) => setFilters((prev) => ({ ...prev, student_id: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
            <select
              value={filters.payment_status}
              onChange={(e) => setFilters((prev) => ({ ...prev, payment_status: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          <button onClick={handleFilter} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">
            Filter
          </button>
          <button onClick={() => setShowTrashed((prev) => !prev)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
              showTrashed ? 'bg-red-50 text-red-700 border-red-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}>
            {showTrashed ? 'Active Records' : 'Trash'}
          </button>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow">
        <Table columns={columns} data={debts} loading={loading} onDelete={showTrashed ? undefined : handleDelete} />
        {!loading && <Pagination meta={meta} onPageChange={setPage} />}
      </div>
    </AppLayout>
  )
}
