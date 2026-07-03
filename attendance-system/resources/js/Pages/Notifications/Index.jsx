import { useState, useEffect } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../../Components/AppLayout'
import Table from '../../Components/Table'
import api from '../../api'

export default function NotificationsIndex() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!localStorage.getItem('token')) { window.location.href = '/login'; return }
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchData = () => {
    api.get('/notifications')
      .then((res) => setData(res.data.data || res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const handleMarkRead = async (row) => {
    try {
      await api.post(`/notifications/${row.id}/mark-read`)
      setData((prev) => prev.map((r) => r.id === row.id ? { ...r, status: 'read', read_at: new Date().toISOString() } : r))
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to mark as read')
    }
  }

  const columns = [
    { key: 'title', label: 'Title' },
    {
      key: 'message',
      label: 'Message',
      render: (val) => val && val.length > 80 ? val.substring(0, 80) + '...' : val,
    },
    {
      key: 'notification_type',
      label: 'Type',
      render: (val) => (
        <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">{val}</span>
      ),
    },
    {
      key: 'priority',
      label: 'Priority',
      render: (val) => {
        const colors = { high: 'bg-red-100 text-red-800', medium: 'bg-yellow-100 text-yellow-800', low: 'bg-gray-100 text-gray-800' }
        return <span className={`px-2 py-1 text-xs rounded-full ${colors[val] || 'bg-gray-100 text-gray-800'}`}>{val}</span>
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => (
        <span className={`px-2 py-1 text-xs rounded-full ${val === 'read' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>{val}</span>
      ),
    },
    { key: 'read_at', label: 'Read At' },
    { key: 'created_at', label: 'Created At' },
    {
      key: 'id',
      label: 'Actions',
      render: (val, row) => row.status !== 'read' ? (
        <button onClick={() => handleMarkRead(row)} className="text-indigo-600 hover:text-indigo-900 text-sm font-medium">
          Mark as Read
        </button>
      ) : null,
    },
  ]

  return (
    <AppLayout>
      <Head title="Notifications" />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
      </div>
      <div className="bg-white rounded-lg shadow">
        <Table columns={columns} data={data} loading={loading} />
      </div>
    </AppLayout>
  )
}
