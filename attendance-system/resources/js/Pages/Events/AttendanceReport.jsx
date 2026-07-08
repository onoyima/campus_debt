import { useState, useEffect } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../../Components/AppLayout'
import Table from '../../Components/Table'
import VeritasSpinner from '../../Components/VeritasSpinner'
import Pagination from '../../Components/Pagination'
import api from '../../api'

const statusColors = {
  present: 'bg-green-100 text-green-800',
  late: 'bg-yellow-100 text-yellow-800',
  absent: 'bg-red-100 text-red-700',
  pending: 'bg-gray-100 text-gray-600',
}

export default function AttendanceReport() {
  const id = window.location.pathname.split('/')[2]
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      fetchReport(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [search, statusFilter, typeFilter])

  useEffect(() => {
    if (!localStorage.getItem('token')) { window.location.href = '/login'; return }
    fetchReport(page)
  }, [page])

  const fetchReport = (p = 1) => {
    setLoading(true)
    const params = { page: p, per_page: 20 }
    if (search) params.search = search
    if (statusFilter) params.status = statusFilter
    if (typeFilter) params.participant_type = typeFilter
    api.get(`/institutional-events/${id}/attendance-report`, { params })
      .then((res) => setReport(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const handleExport = async (format) => {
    const params = { format }
    if (statusFilter) params.status = statusFilter
    if (typeFilter) params.participant_type = typeFilter
    try {
      const res = await api.get(`/institutional-events/${id}/export-attendance`, {
        params,
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      const disposition = res.headers['content-disposition']
      const match = disposition && disposition.match(/filename="?(.+?)"?$/)
      a.download = match ? match[1] : `attendance-${id}.${format}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert('Export failed')
    }
  }

  if (!report && loading) {
    return (
      <AppLayout>
        <Head title="Attendance Report" />
        <div className="flex items-center justify-center h-64"><VeritasSpinner /></div>
      </AppLayout>
    )
  }

  if (!report) {
    return (
      <AppLayout>
        <Head title="Attendance Report" />
        <div className="text-center py-12 text-gray-500">Failed to load report.</div>
      </AppLayout>
    )
  }

  const columns = [
    { key: 'participant_id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'participant_type', label: 'Type', render: (v) => <span className="capitalize">{v}</span> },
    { key: 'department', label: 'Department' },
    { key: 'faculty', label: 'Faculty' },
    {
      key: 'status',
      label: 'Status',
      render: (v) => (
        <span className={`px-2 py-1 text-xs rounded-full ${statusColors[v] || 'bg-gray-100 text-gray-800'}`}>
          {v}
        </span>
      ),
    },
    { key: 'check_in_time', label: 'Check In', render: (v) => v ? new Date(v).toLocaleString() : '-' },
    { key: 'check_out_time', label: 'Check Out', render: (v) => v ? new Date(v).toLocaleString() : '-' },
    { key: 'is_visitor', label: 'Visitor', render: (v) => v ? <span className="text-xs font-medium text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">Yes</span> : '-' },
  ]

  const stats = [
    { label: 'Expected', value: report.expected_participants, color: 'text-gray-900' },
    { label: 'Present', value: report.present, color: 'text-green-600' },
    { label: 'Late', value: report.late, color: 'text-yellow-600' },
    { label: 'Absent', value: report.absent, color: 'text-red-600' },
    { label: 'Pending', value: report.pending, color: 'text-gray-500' },
    { label: 'Visitors', value: report.visitor_count, color: 'text-purple-600' },
    { label: 'Rate', value: report.attendance_rate != null ? `${report.attendance_rate}%` : '-', color: 'text-veritas-600' },
  ]

  return (
    <AppLayout>
      <Head title={`${report.event?.title} - Attendance Report`} />

      <div className="mb-6">
        <a href="/events" className="text-sm text-veritas-600 hover:text-veritas-800 mb-2 inline-block">&larr; Back to Events</a>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{report.event?.title}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {report.event?.start_date && new Date(report.event.start_date).toLocaleDateString()} &middot; {report.event?.venue_name || 'No venue'}
              {report.event?.assigned_terminals?.length > 0 && (
                <> &middot; {report.event.assigned_terminals.length} terminal(s) assigned</>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => handleExport('csv')} className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">CSV</button>
            <button onClick={() => handleExport('xlsx')} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">Excel</button>
            <button onClick={() => handleExport('pdf')} className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">PDF</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-3 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-lg shadow p-4 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200 flex items-center gap-3 flex-wrap">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or ID..."
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-veritas-500 focus:border-veritas-500 w-52"
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-veritas-500 focus:border-veritas-500">
            <option value="">All Statuses</option>
            <option value="present">Present</option>
            <option value="late">Late</option>
            <option value="absent">Absent</option>
            <option value="pending">Pending</option>
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-veritas-500 focus:border-veritas-500">
            <option value="">All Types</option>
            <option value="staff">Staff</option>
            <option value="student">Student</option>
          </select>
          <span className="text-xs text-gray-400 ml-auto">{report.meta?.total || 0} record(s)</span>
        </div>
        <Table columns={columns} data={report.breakdown || []} loading={loading} />
        {!loading && <Pagination meta={report.meta} onPageChange={setPage} />}
      </div>
    </AppLayout>
  )
}
