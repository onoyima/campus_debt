import { useState, useEffect } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../../Components/AppLayout'
import Table from '../../Components/Table'
import api from '../../api'

export default function StaffComplianceIndex() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!localStorage.getItem('token')) { window.location.href = '/login'; return }
    fetchRecords()
    const interval = setInterval(fetchRecords, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchRecords = () => {
    api.get('/staff-compliance')
      .then((res) => setRecords(res.data.data || res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const handleDelete = async (record) => {
    if (!confirm(`Delete this staff compliance record?`)) return
    try {
      await api.delete(`/staff-compliance/${record.id}`)
      setRecords((prev) => prev.filter((r) => r.id !== record.id))
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed')
    }
  }

  const columns = [
    { key: 'staff_id', label: 'Staff ID' },
    { key: 'institutional_event_id', label: 'Event ID' },
    { key: 'attendance_status_id', label: 'Attendance Status ID' },
    { key: 'reported_to_qa', label: 'Reported to QA', render: (val) => val ? 'Yes' : 'No' },
    { key: 'reported_to_bursary', label: 'Reported to Bursary', render: (val) => val ? 'Yes' : 'No' },
    { key: 'deduction_processed', label: 'Deduction Processed', render: (val) => val ? 'Yes' : 'No' },
    { key: 'qa_approved', label: 'QA Approved', render: (val) => val ? 'Yes' : 'No' },
  ]

  return (
    <AppLayout>
      <Head title="Staff Compliance" />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Staff Compliance</h1>
      </div>
      <div className="bg-white rounded-lg shadow">
        <Table columns={columns} data={records} loading={loading} onDelete={handleDelete} />
      </div>
    </AppLayout>
  )
}
