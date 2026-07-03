import { useState, useEffect } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../../Components/AppLayout'
import Table from '../../Components/Table'
import api from '../../api'

export default function EventsIndex() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!localStorage.getItem('token')) { window.location.href = '/login'; return }
    fetchEvents()
    const interval = setInterval(fetchEvents, 15000)
    return () => clearInterval(interval)
  }, [])

  const fetchEvents = () => {
    api.get('/institutional-events')
      .then((res) => setEvents(res.data.data || res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const handleDelete = async (event) => {
    if (!confirm(`Delete event "${event.title}"?`)) return
    try {
      await api.delete(`/institutional-events/${event.id}`)
      setEvents((prev) => prev.filter((e) => e.id !== event.id))
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed')
    }
  }

  const columns = [
    { key: 'title', label: 'Title' },
    { key: 'start_date', label: 'Date' },
    { key: 'category_name', label: 'Category' },
    { key: 'venue_name', label: 'Venue' },
    {
      key: 'is_mandatory',
      label: 'Mandatory',
      render: (val) => val ? 'Yes' : 'No',
    },
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
  ]

  return (
    <AppLayout>
      <Head title="Events" />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Institutional Events</h1>
        <a href="/events/create" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">
          Add Event
        </a>
      </div>
      <div className="bg-white rounded-lg shadow">
        <Table columns={columns} data={events} loading={loading} onEdit={(row) => window.location.href = `/events/${row.id}/edit`} onDelete={handleDelete} />
      </div>
    </AppLayout>
  )
}
