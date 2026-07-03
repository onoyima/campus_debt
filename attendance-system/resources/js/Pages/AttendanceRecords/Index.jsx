import { useState, useEffect } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../../Components/AppLayout'
import Table from '../../Components/Table'
import api from '../../api'

export default function AttendanceRecordsIndex() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!localStorage.getItem('token')) { window.location.href = '/login'; return }
    fetchData()
    const interval = setInterval(fetchData, 15000)
    return () => clearInterval(interval)
  }, [])

  const fetchData = () => {
    api.get('/attendance-records')
      .then((res) => setData(res.data.data || res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const columns = [
    { key: 'student_id', label: 'Student ID' },
    { key: 'session_id', label: 'Session ID' },
    { key: 'status_id', label: 'Status ID' },
    { key: 'attendance_method', label: 'Method' },
    { key: 'timestamp', label: 'Timestamp' },
    { key: 'venue_id', label: 'Venue ID' },
    { key: 'device_id', label: 'Device ID' },
  ]

  return (
    <AppLayout>
      <Head title="Attendance Records" />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Attendance Records</h1>
      </div>
      <div className="bg-white rounded-lg shadow">
        <Table columns={columns} data={data} loading={loading} />
      </div>
    </AppLayout>
  )
}
