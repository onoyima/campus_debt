import { useState, useEffect } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../../Components/AppLayout'
import api from '../../api'

const statusColors = {
  eligible: 'bg-green-100 text-green-700 border-green-200',
  qualified: 'bg-green-100 text-green-700 border-green-200',
  not_eligible: 'bg-red-100 text-red-700 border-red-200',
  attendance_deficiency: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  outstanding_debt: 'bg-orange-100 text-orange-700 border-orange-200',
  pending_clearance: 'bg-blue-100 text-blue-700 border-blue-200',
}

const statusLabels = {
  eligible: 'Eligible',
  qualified: 'Qualified',
  not_eligible: 'Not Eligible',
  attendance_deficiency: 'Low Attendance',
  outstanding_debt: 'Outstanding Debt',
  pending_clearance: 'Pending Clearance',
}

export default function StudentDashboardIndex() {
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [studentId, setStudentId] = useState(localStorage.getItem('student_dashboard_id') || '')

  useEffect(() => {
    if (!localStorage.getItem('token')) { window.location.href = '/login'; return }
    if (studentId) {
      fetchOverview()
      const interval = setInterval(fetchOverview, 15000)
      return () => clearInterval(interval)
    } else {
      setLoading(false)
    }
  }, [studentId])

  const fetchOverview = async () => {
    setLoading(true)
    try {
      const res = await api.get('/student-dashboard/overview', { params: { student_id: studentId } })
      setOverview(res.data.data || res.data)
    } catch {}
    finally { setLoading(false) }
  }

  const handleStudentIdSubmit = (e) => {
    e.preventDefault()
    if (studentId) {
      localStorage.setItem('student_dashboard_id', studentId)
      fetchOverview()
    }
  }

  /* ---------- IDLE STATE ---------- */
  if (!studentId || (!loading && !overview)) {
    return (
      <AppLayout>
        <Head title="Student Dashboard" />
        <div className="max-w-md mx-auto mt-12">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-veritas-50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-veritas-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5zm0 7l-9-5 9-5 9 5-9 5zm0-7l-9-5 9-5 9 5-9 5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Student Dashboard</h1>
            <p className="text-gray-400 text-sm mt-2">Enter a student ID to view their attendance overview.</p>
          </div>
          <form onSubmit={handleStudentIdSubmit} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <label className="block text-xs font-bold text-veritas-500 tracking-wider mb-2">STUDENT ID</label>
            <div className="flex gap-3">
              <input type="text" value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="e.g. 691"
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 outline-none focus:border-veritas-500 transition-colors"
                required />
              <button type="submit"
                className="px-6 py-3 bg-veritas-500 text-white font-semibold rounded-xl hover:bg-veritas-600 transition-all shadow-lg shadow-veritas-500/20 active:scale-95">
                View
              </button>
            </div>
          </form>
        </div>
      </AppLayout>
    )
  }

  const courses = overview?.courses || overview?.eligibility || []

  return (
    <AppLayout>
      <Head title="Student Dashboard" />

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-10 h-10 rounded-xl bg-veritas-500 flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 7l-9-5 9-5 9 5-9 5zm0-7l-9-5 9-5 9 5-9 5z" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Student Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">Student ID: #{studentId}</p>
        </div>
        <button onClick={() => { setStudentId(''); localStorage.removeItem('student_dashboard_id'); }}
          className="ml-auto text-sm text-gray-400 hover:text-gray-600 underline">Change ID</button>
      </div>

      {/* Stats */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[
            { label: 'Total Courses', value: overview?.total_courses ?? overview?.courses_count ?? courses.length ?? '-', icon: '📚', color: 'bg-blue-50 text-blue-600' },
            { label: 'Overall Attendance', value: overview?.overall_attendance_percentage != null ? `${Number(overview.overall_attendance_percentage).toFixed(1)}%` : '-', icon: '📊', color: 'bg-green-50 text-green-600' },
            { label: 'Outstanding Debts', value: `₦${(overview?.outstanding_debts ?? 0).toLocaleString()}`, icon: '💰', color: 'bg-red-50 text-red-600' },
          ].map((stat, i) => (
            <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
              style={{ animation: `fadeInUp 0.4s ease-out ${i * 0.1}s both` }}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center text-xl`}>{stat.icon}</div>
                <div>
                  <p className="text-sm text-gray-400">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-0.5">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gray-100" />
                <div className="flex-1">
                  <div className="h-3 bg-gray-100 rounded w-1/2 mb-2" />
                  <div className="h-6 bg-gray-100 rounded w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Course Eligibility Table */}
      {!loading && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Course Eligibility</h2>
            <p className="text-sm text-gray-400 mt-0.5">Attendance and eligibility status per course</p>
          </div>
          {courses.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-sm">No course data available for this student.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-50">
                    {['Course', 'Attendance', 'Required', 'Status', 'Reasons'].map(h => (
                      <th key={h} className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {courses.map((course, i) => {
                    const status = course.eligibility_status || course.status || 'unknown'
                    const statusClass = statusColors[status] || 'bg-gray-100 text-gray-600 border-gray-200'
                    const label = statusLabels[status] || status
                    return (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                        style={{ animation: `fadeIn 0.3s ease-out ${i * 0.05}s both` }}>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {course.course_name || course.course_id || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {course.attendance_percentage != null ? `${Number(course.attendance_percentage).toFixed(1)}%` : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {course.required_attendance_percentage != null ? `${Number(course.required_attendance_percentage).toFixed(1)}%` : '-'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full border ${statusClass}`}>
                            {label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400 max-w-xs truncate">
                          {course.reasons || course.reasons_json || '-'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </AppLayout>
  )
}
