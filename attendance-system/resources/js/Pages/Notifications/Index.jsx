import { useState, useEffect } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../../Components/AppLayout'
import Table from '../../Components/Table'
import VeritasSpinner from '../../Components/VeritasSpinner'
import Pagination from '../../Components/Pagination'
import api from '../../api'

export default function NotificationsIndex() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
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
  }, [page])

  const fetchData = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    params.set('page', page)
    params.set('per_page', '15')
    api.get(`/notifications?${params}`)
      .then((res) => {
        setData(res.data.data || res.data)
        setMeta(res.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const handleMarkRead = async (row) => {
    setActionLoading(prev => ({ ...prev, [`mark-read-${row.id}`]: true }))
    try {
      await api.post(`/notifications/${row.id}/mark-read`)
      setData((prev) => prev.map((r) => r.id === row.id ? { ...r, status: 'read', read_at: new Date().toISOString() } : r))
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to mark as read')
    } finally {
      setActionLoading(prev => ({ ...prev, [`mark-read-${row.id}`]: false }))
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
        <button onClick={() => handleMarkRead(row)} disabled={actionLoading[`mark-read-${row.id}`]} className="text-indigo-600 hover:text-indigo-900 text-sm font-medium">
          {actionLoading[`mark-read-${row.id}`] ? <VeritasSpinner size="sm" /> : 'Mark as Read'}
        </button>
      ) : null,
    },
  ]

  return (
    <AppLayout>
      <Head title="Notifications" />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
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
      <div className="bg-white rounded-lg shadow">
        <Table columns={columns} data={data} loading={loading} />
        {!loading && <Pagination meta={meta} onPageChange={setPage} />}
      </div>
    </AppLayout>
  )
}
