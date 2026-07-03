import { useState, useEffect } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../../Components/AppLayout'
import Table from '../../Components/Table'
import api from '../../api'

export default function DebtsIndex() {
  const [debts, setDebts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ student_id: '', payment_status: '' })

  useEffect(() => {
    if (!localStorage.getItem('token')) { window.location.href = '/login'; return }
    fetchDebts()
    const interval = setInterval(fetchDebts, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchDebts = async (params = {}) => {
    setLoading(true)
    try {
      const res = await api.get('/debts', { params: { ...filters, ...params } })
      setDebts(res.data.data || res.data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const handleFilter = () => {
    fetchDebts()
  }

  const handleDelete = async (debt) => {
    if (!confirm(`Delete this debt record?`)) return
    try {
      await api.delete(`/debts/${debt.id}`)
      setDebts((prev) => prev.filter((d) => d.id !== debt.id))
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed')
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
  ]

  return (
    <AppLayout>
      <Head title="Debts" />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Debts</h1>
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
        </div>
      </div>
      <div className="bg-white rounded-lg shadow">
        <Table columns={columns} data={debts} loading={loading} onDelete={handleDelete} />
      </div>
    </AppLayout>
  )
}
