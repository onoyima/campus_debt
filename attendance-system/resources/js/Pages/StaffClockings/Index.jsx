import { useState, useEffect } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../../Components/AppLayout'
import Table from '../../Components/Table'
import api from '../../api'

export default function StaffClockingsIndex() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!localStorage.getItem('token')) { window.location.href = '/login'; return }
    fetchData()
    const interval = setInterval(fetchData, 15000)
    return () => clearInterval(interval)
  }, [])

  const fetchData = () => {
    api.get('/staff-clockings')
      .then((res) => setData(res.data.data || res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const columns = [
    { key: 'staff_id', label: 'Staff ID' },
    {
      key: 'clock_type',
      label: 'Clock Type',
      render: (val) => (
        <span className={`px-2 py-1 text-xs rounded-full ${val === 'clock_in' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
          {val}
        </span>
      ),
    },
    { key: 'timestamp', label: 'Timestamp' },
    { key: 'venue_id', label: 'Venue ID' },
    { key: 'attendance_method', label: 'Method' },
    { key: 'status_id', label: 'Status ID' },
  ]

  return (
    <AppLayout>
      <Head title="Staff Clockings" />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Staff Clockings</h1>
      </div>
      <div className="bg-white rounded-lg shadow">
        <Table columns={columns} data={data} loading={loading} />
      </div>
    </AppLayout>
  )
}
