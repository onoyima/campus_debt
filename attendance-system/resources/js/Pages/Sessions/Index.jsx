import { useState, useEffect } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../../Components/AppLayout'
import Table from '../../Components/Table'
import api from '../../api'

export default function SessionsIndex() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!localStorage.getItem('token')) { window.location.href = '/login'; return }
    fetchSessions()
    const interval = setInterval(fetchSessions, 15000)
    return () => clearInterval(interval)
  }, [])

  const fetchSessions = () => {
    api.get('/sessions')
      .then((res) => setSessions(res.data.data || res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const handleDelete = async (session) => {
    if (!confirm(`Delete session "${session.title}"?`)) return
    try {
      await api.delete(`/sessions/${session.id}`)
      setSessions((prev) => prev.filter((s) => s.id !== session.id))
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed')
    }
  }

  const columns = [
    { key: 'title', label: 'Title' },
    { key: 'session_date', label: 'Date' },
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
    { key: 'venue_name', label: 'Venue' },
    { key: 'records_count', label: 'Records Count' },
  ]

  return (
    <AppLayout>
      <Head title="Sessions" />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sessions</h1>
        <a href="/sessions/create" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">
          Add Session
        </a>
      </div>
      <div className="bg-white rounded-lg shadow">
        <Table columns={columns} data={sessions} loading={loading} onEdit={(row) => window.location.href = `/sessions/${row.id}/edit`} onDelete={handleDelete} />
      </div>
    </AppLayout>
  )
}
