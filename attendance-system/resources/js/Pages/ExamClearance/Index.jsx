import { useState, useEffect } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../../Components/AppLayout'
import Table from '../../Components/Table'
import api from '../../api'

export default function ExamClearanceIndex() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!localStorage.getItem('token')) { window.location.href = '/login'; return }
    fetchRecords()
    const interval = setInterval(fetchRecords, 15000)
    return () => clearInterval(interval)
  }, [])

  const fetchRecords = () => {
    api.get('/exam-eligibility')
      .then((res) => setRecords(res.data.data || res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const columns = [
    { key: 'student_id', label: 'Student ID' },
    { key: 'course_id', label: 'Course ID' },
    {
      key: 'attendance_percentage',
      label: 'Attendance %',
      render: (val) => val != null ? `${Number(val).toFixed(1)}%` : '-',
    },
    {
      key: 'eligibility_status',
      label: 'Status',
      render: (val) => (
        <span className={`px-2 py-1 text-xs rounded-full ${val === 'qualified' || val === 'eligible' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {val}
        </span>
      ),
    },
    { key: 'school_fees_cleared', label: 'School Fees Cleared', render: (val) => val ? 'Yes' : 'No' },
    { key: 'attendance_debts_cleared', label: 'Attendance Debts Cleared', render: (val) => val ? 'Yes' : 'No' },
    { key: 'last_evaluated_at', label: 'Last Evaluated' },
  ]

  return (
    <AppLayout>
      <Head title="Examination Clearance" />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Examination Clearance</h1>
        <a href="/exam-clearance/verify" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">
          Verify Student
        </a>
      </div>
      <div className="bg-white rounded-lg shadow">
        <Table columns={columns} data={records} loading={loading} />
      </div>
    </AppLayout>
  )
}
