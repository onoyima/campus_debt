import { useState, useEffect } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../../Components/AppLayout'
import Table from '../../Components/Table'
import api from '../../api'

export default function ExcusesIndex() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!localStorage.getItem('token')) { window.location.href = '/login'; return }
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchData = () => {
    api.get('/excuses')
      .then((res) => setData(res.data.data || res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const handleDelete = async (row) => {
    if (!confirm('Delete this excuse?')) return
    try {
      await api.delete(`/excuses/${row.id}`)
      setData((prev) => prev.filter((r) => r.id !== row.id))
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed')
    }
  }

  const columns = [
    { key: 'student_id', label: 'Student ID' },
    { key: 'excuse_type', label: 'Type' },
    {
      key: 'reason',
      label: 'Reason',
      render: (val) => val && val.length > 60 ? val.substring(0, 60) + '...' : val,
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => (
        <span className={`px-2 py-1 text-xs rounded-full ${
          val === 'approved' ? 'bg-green-100 text-green-800' : val === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
        }`}>
          {val}
        </span>
      ),
    },
    { key: 'approved_by', label: 'Approved By' },
    { key: 'created_at', label: 'Created At' },
  ]

  return (
    <AppLayout>
      <Head title="Excuses" />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Excuses</h1>
      </div>
      <div className="bg-white rounded-lg shadow">
        <Table columns={columns} data={data} loading={loading} onDelete={handleDelete} />
      </div>
    </AppLayout>
  )
}
