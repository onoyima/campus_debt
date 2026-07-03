import { useState, useEffect } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../../Components/AppLayout'
import Table from '../../Components/Table'
import api from '../../api'

export default function ExeatsIndex() {
  const [exeats, setExeats] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!localStorage.getItem('token')) { window.location.href = '/login'; return }
    fetchExeats()
    const interval = setInterval(fetchExeats, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchExeats = () => {
    api.get('/exeats')
      .then((res) => setExeats(res.data.data || res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'student_id', label: 'Student ID' },
    { key: 'matric_no', label: 'Matric No' },
    { key: 'departure_date', label: 'Departure Date' },
    { key: 'return_date', label: 'Return Date' },
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
  ]

  return (
    <AppLayout>
      <Head title="Exeat Requests" />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Exeat Requests</h1>
      </div>
      <div className="bg-white rounded-lg shadow">
        <Table columns={columns} data={exeats} loading={loading} onEdit={(row) => window.location.href = `/exeats/${row.id}`} />
      </div>
    </AppLayout>
  )
}
