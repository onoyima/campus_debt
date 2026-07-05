import { useState, useEffect } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../../Components/AppLayout'
import Pagination from '../../Components/Pagination'
import api from '../../api'

const statusColors = {
  present: 'bg-green-100 text-green-700 border-green-200',
  absent: 'bg-red-100 text-red-700 border-red-200',
  late: 'bg-amber-100 text-amber-700 border-amber-200',
  excused: 'bg-blue-100 text-blue-700 border-blue-200',
  proxy: 'bg-purple-100 text-purple-700 border-purple-200',
  exeat_leave: 'bg-teal-100 text-teal-700 border-teal-200',
  exam_leave: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  medical_leave: 'bg-pink-100 text-pink-700 border-pink-200',
  official_assignment: 'bg-cyan-100 text-cyan-700 border-cyan-200',
}

export default function StudentMyAttendance() {
  const [records, setRecords] = useState([])
  const [meta, setMeta] = useState({})
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!localStorage.getItem('token')) { window.location.href = '/login'; return }
    fetchRecords()
  }, [page])

  const fetchRecords = () => {
    setLoading(true)
    api.get('/student/my-attendance', { params: { page, per_page: 20 } })
      .then(res => {
        setRecords(res.data.data || [])
        setMeta(res.data.meta || {})
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  return (
    <AppLayout>
      <Head title="My Attendance" />

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-veritas-500 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Attendance</h1>
            <p className="text-sm text-gray-400 mt-0.5">Your attendance records across all courses</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="p-6 space-y-4 animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="h-4 bg-gray-100 rounded w-32" />
                <div className="h-4 bg-gray-100 rounded w-24" />
                <div className="h-4 bg-gray-100 rounded w-20" />
                <div className="h-4 bg-gray-100 rounded w-16" />
                <div className="h-4 bg-gray-100 rounded w-28" />
              </div>
            ))}
          </div>
        </div>
      ) : records.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <svg className="w-16 h-16 text-gray-200 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No Records</h3>
          <p className="text-sm text-gray-400">No attendance records found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50">
                  {['Session', 'Type', 'Date', 'Venue', 'Status', 'Method', 'Time'].map(h => (
                    <th key={h} className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => {
                  const statusClass = statusColors[r.status_code] || 'bg-gray-100 text-gray-600 border-gray-200'
                  return (
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                      style={{ animation: `fadeIn 0.3s ease-out ${i * 0.03}s both` }}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 max-w-[200px] truncate">{r.session_title || `Session #${r.session_id}`}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{r.session_type || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{r.session_date || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{r.venue_name || '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-full border ${statusClass}`}>
                          {r.status_label || r.status_code || 'unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{r.attendance_method || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-400 whitespace-nowrap">{r.timestamp ? new Date(r.timestamp).toLocaleTimeString() : '-'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {meta.last_page > 1 && (
            <div className="px-6 py-4 border-t border-gray-50">
              <Pagination meta={meta} onPageChange={setPage} />
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </AppLayout>
  )
}
