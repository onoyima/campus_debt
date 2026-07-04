import { useState, useEffect } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../../Components/AppLayout'
import Table from '../../Components/Table'
import VeritasSpinner from '../../Components/VeritasSpinner'
import Pagination from '../../Components/Pagination'
import api from '../../api'

export default function ExamClearanceIndex() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [meta, setMeta] = useState({})
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      fetchRecords()
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    if (!localStorage.getItem('token')) { window.location.href = '/login'; return }
    fetchRecords()
  }, [page])

  const fetchRecords = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    params.set('page', page)
    params.set('per_page', '15')
    api.get(`/exam-eligibility?${params}`)
      .then((res) => {
        setRecords(res.data.data || res.data)
        setMeta(res.data)
      })
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
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-veritas-500 focus:border-veritas-500"
          />
          <a href="/exam-clearance/verify" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">
            Verify Student
          </a>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow">
        <Table columns={columns} data={records} loading={loading} />
        {!loading && <Pagination meta={meta} onPageChange={setPage} />}
      </div>
    </AppLayout>
  )
}
