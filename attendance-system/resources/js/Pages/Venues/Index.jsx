import { useState, useEffect } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../../Components/AppLayout'
import Table from '../../Components/Table'
import api from '../../api'

export default function VenuesIndex() {
  const [venues, setVenues] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!localStorage.getItem('token')) { window.location.href = '/login'; return }
    fetchVenues()
    const interval = setInterval(fetchVenues, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchVenues = () => {
    api.get('/venues')
      .then((res) => setVenues(res.data.data || res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const handleDelete = async (venue) => {
    if (!confirm(`Delete venue "${venue.name}"?`)) return
    try {
      await api.delete(`/venues/${venue.id}`)
      setVenues((prev) => prev.filter((v) => v.id !== venue.id))
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed')
    }
  }

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'code', label: 'Code' },
    { key: 'venue_type', label: 'Type' },
    { key: 'capacity', label: 'Capacity' },
    {
      key: 'is_active',
      label: 'Status',
      render: (val) => (
        <span className={`px-2 py-1 text-xs rounded-full ${val ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {val ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ]

  return (
    <AppLayout>
      <Head title="Venues" />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Venues</h1>
        <a href="/venues/create" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">
          Add Venue
        </a>
      </div>
      <div className="bg-white rounded-lg shadow">
        <Table columns={columns} data={venues} loading={loading} onEdit={(row) => window.location.href = `/venues/${row.id}/edit`} onDelete={handleDelete} />
      </div>
    </AppLayout>
  )
}
