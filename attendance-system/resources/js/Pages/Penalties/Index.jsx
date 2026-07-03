import { useState, useEffect } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../../Components/AppLayout'
import Table from '../../Components/Table'
import api from '../../api'

export default function PenaltiesIndex() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!localStorage.getItem('token')) { window.location.href = '/login'; return }
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchData = () => {
    api.get('/penalty-schedule')
      .then((res) => setData(res.data.data || res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const handleDelete = async (row) => {
    if (!confirm(`Delete penalty "${row.name}"?`)) return
    try {
      await api.delete(`/penalty-schedule/${row.id}`)
      setData((prev) => prev.filter((r) => r.id !== row.id))
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed')
    }
  }

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'amount', label: 'Amount', render: (val) => Number(val).toLocaleString() },
    { key: 'penalty_type', label: 'Type' },
    { key: 'applicable_to', label: 'Applicable To' },
    {
      key: 'is_active',
      label: 'Status',
      render: (val) => (
        <span className={`px-2 py-1 text-xs rounded-full ${val ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {val ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    { key: 'effective_date', label: 'Effective Date' },
    { key: 'expiry_date', label: 'Expiry Date' },
  ]

  return (
    <AppLayout>
      <Head title="Penalty Schedule" />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Penalty Schedule</h1>
        <a href="/penalties/create" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">Add Penalty</a>
      </div>
      <div className="bg-white rounded-lg shadow">
        <Table columns={columns} data={data} loading={loading} onEdit={(row) => window.location.href = `/penalties/${row.id}/edit`} onDelete={handleDelete} />
      </div>
    </AppLayout>
  )
}
