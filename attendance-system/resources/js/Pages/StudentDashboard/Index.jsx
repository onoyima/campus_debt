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

function getLoggedInStudent() {
  try {
    const stored = JSON.parse(localStorage.getItem('user') || '{}')
    if (stored.type === 'student' && stored.id) return stored
  } catch {}
  return null
}

export default function StudentDashboardIndex() {
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)
  const student = getLoggedInStudent()
  const [studentId, setStudentId] = useState(student?.id || '')
  const [user, setUser] = useState(student || {})

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { window.location.href = '/login'; return }
    if (!student?.id) {
      api.get('/me').then(r => {
        const u = r.data.user
        localStorage.setItem('user', JSON.stringify(u))
        setUser(u)
        if (u.type === 'student' && u.id) {
          setStudentId(u.id)
        }
      }).catch(() => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.href = '/login'
      })
    }
  }, [])

  useEffect(() => {
    if (!localStorage.getItem('token')) { window.location.href = '/login'; return }
    if (studentId) {
      fetchOverview()
      const interval = setInterval(fetchOverview, 30000)
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

  const courses = overview?.courses || overview?.eligibility_status || []

  return (
    <AppLayout>
      <Head title="Student Dashboard" />

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-10 h-10 rounded-xl bg-veritas-500 flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">{user.matric_no ? `${user.fname} ${user.lname} · ${user.matric_no}` : `Student #${studentId}`}</p>
        </div>
        {!user.id && (
          <button onClick={() => { setStudentId(''); localStorage.removeItem('student_dashboard_id'); }}
            className="ml-auto text-sm text-gray-400 hover:text-gray-600 underline">Change ID</button>
        )}
      </div>

      {/* Manual ID entry (fallback if not logged in as student) */}
      {!studentId && !user.id && (
        <div className="max-w-md mx-auto mt-8 mb-10">
          <div className="text-center mb-6">
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
      )}

      {/* Stats */}
      {studentId && !loading && overview && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Registered Courses', value: overview?.total_courses ?? courses.length ?? '-', icon: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z', color: 'bg-blue-50 text-blue-600' },
            { label: 'Overall Attendance', value: overview?.overall_attendance_percentage != null ? `${Number(overview.overall_attendance_percentage).toFixed(1)}%` : '-', icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z', color: 'bg-green-50 text-green-600' },
            { label: 'Required Threshold', value: courses[0]?.required_attendance_percentage != null ? `${courses[0].required_attendance_percentage}%` : '80%', icon: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z', color: 'bg-amber-50 text-amber-600' },
            { label: 'Outstanding Debts', value: `₦${(overview?.outstanding_debts_total ?? 0).toLocaleString()}`, icon: 'M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'bg-red-50 text-red-600' },
          ].map((stat, i) => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-all"
              style={{ animation: `fadeInUp 0.4s ease-out ${i * 0.08}s both` }}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center shrink-0`}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={stat.icon} />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-400 truncate">{stat.label}</p>
                  <p className="text-lg font-bold text-gray-900 mt-0.5">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && studentId && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100" />
                <div className="flex-1">
                  <div className="h-3 bg-gray-100 rounded w-2/3 mb-2" />
                  <div className="h-5 bg-gray-100 rounded w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Course Attendance Table */}
      {studentId && !loading && overview && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Course Attendance</h2>
              <p className="text-sm text-gray-400 mt-0.5">Your registered courses and attendance status</p>
            </div>
            {overview?.academic_session_id && (
              <span className="text-xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-lg">
                Session #{overview.academic_session_id} · Semester {overview.vu_semester_id || 'N/A'}
              </span>
            )}
          </div>
          {courses.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-12 h-12 text-gray-200 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
              <p className="text-gray-400 text-sm">No course data available. Eligibility may not have been evaluated yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-50">
                    {['#', 'Course Code', 'Course Title', 'Attendance', 'Required', 'Status', 'Details'].map(h => (
                      <th key={h} className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {courses.map((course, i) => {
                    const status = course.eligibility_status_code || course.status || 'unknown'
                    const statusClass = statusColors[status] || 'bg-gray-100 text-gray-600 border-gray-200'
                    const label = statusLabels[status] || status
                    const displayCode = course.course_code || `Course #${course.course_assigned_id || course.course_id || ''}`
                    const displayTitle = course.course_title || ''
                    const reasons = Array.isArray(course.reasons) ? course.reasons : (course.reasons_json || [])
                    const pct = course.attendance_percentage
                    const req = course.required_attendance_percentage
                    const barColor = pct >= req ? 'bg-green-500' : pct >= req * 0.75 ? 'bg-amber-500' : 'bg-red-500'
                    return (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                        style={{ animation: `fadeIn 0.3s ease-out ${i * 0.04}s both` }}>
                        <td className="px-6 py-4 text-sm text-gray-400 w-8">{i + 1}</td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-bold text-gray-900 font-mono">{displayCode}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                          {displayTitle || '-'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 w-24">
                              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div className={`h-full ${barColor} rounded-full transition-all duration-500`}
                                  style={{ width: `${Math.min(100, Math.max(0, pct || 0))}%` }} />
                              </div>
                            </div>
                            <span className={`text-sm font-semibold tabular-nums ${pct >= req ? 'text-green-600' : 'text-red-600'}`}>
                              {pct != null ? `${Number(pct).toFixed(1)}%` : '-'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {req != null ? `${Number(req).toFixed(0)}%` : '-'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-full border ${statusClass}`}>
                            {label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            {course.attended_classes != null && (
                              <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md">
                                {course.attended_classes}/{course.total_classes} classes
                              </span>
                            )}
                            {reasons.length > 0 && (
                              <span className="text-xs text-gray-400 max-w-[200px] truncate block" title={reasons.join('; ')}>
                                {reasons[0]}
                              </span>
                            )}
                          </div>
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
