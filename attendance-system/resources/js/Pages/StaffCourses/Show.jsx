import { useState, useEffect } from 'react'
import { Head, Link } from '@inertiajs/react'
import AppLayout from '../../Components/AppLayout'
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

export default function StaffCourseShow() {
  const courseAssignedId = window.location.pathname.split('/').pop()
  const [course, setCourse] = useState(null)
  const [sessions, setSessions] = useState([])
  const [attendance, setAttendance] = useState([])
  const [venues, setVenues] = useState([])
  const [activeTab, setActiveTab] = useState('sessions')
  const [loading, setLoading] = useState(true)
  const [rescheduling, setRescheduling] = useState(null)

  useEffect(() => {
    if (!localStorage.getItem('token')) { window.location.href = '/login'; return }
    fetchData()
    fetchVenues()
  }, [])

  const fetchData = () => {
    setLoading(true)
    Promise.all([
      api.get('/staff/my-courses').then(r => {
        const found = (r.data.data || []).find(c => c.course_assigned_id == courseAssignedId)
        setCourse(found || null)
      }),
      api.get(`/staff/my-courses/${courseAssignedId}/sessions`).then(r => setSessions(r.data.data || [])),
      api.get(`/staff/my-courses/${courseAssignedId}/attendance`, { params: { per_page: 50 } }).then(r => setAttendance(r.data.data || [])),
    ]).catch(() => {}).finally(() => setLoading(false))
  }

  const fetchVenues = () => {
    api.get('/venues').then(r => setVenues(r.data.data || [])).catch(() => {})
  }

  const handleReschedule = async (sessionId) => {
    setRescheduling(prev => ({ ...prev, [sessionId]: true }))
    const form = window.rescheduleForms[sessionId]
    if (!form) return

    const payload = {}
    if (form.sessionDate.value) payload.session_date = form.sessionDate.value
    if (form.opensAt.value) payload.opens_at = form.opensAt.value
    if (form.closesAt.value) payload.closes_at = form.closesAt.value
    if (form.venueId.value) payload.venue_id = parseInt(form.venueId.value)
    if (form.notes?.value) payload.notes = form.notes.value

    try {
      await api.put(`/staff/my-courses/${courseAssignedId}/sessions/${sessionId}`, payload)
      fetchData()
      document.getElementById(`reschedule-${sessionId}`)?.classList.add('hidden')
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to update session')
    } finally {
      setRescheduling(prev => ({ ...prev, [sessionId]: false }))
    }
  }

  const downloadReport = () => {
    const token = localStorage.getItem('token')
    window.open(`/api/staff/my-courses/${courseAssignedId}/report?token=${token}`, '_blank')
  }

  if (loading) {
    return (
      <AppLayout>
        <Head title="Course Detail" />
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-100 rounded w-64" />
          <div className="h-4 bg-gray-100 rounded w-96" />
          <div className="h-64 bg-gray-100 rounded" />
        </div>
      </AppLayout>
    )
  }

  if (!course) {
    return (
      <AppLayout>
        <Head title="Course Not Found" />
        <div className="text-center py-16">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Course Not Found</h2>
          <p className="text-gray-400 mb-4">You are not assigned to this course.</p>
          <a href="/staff/courses" className="text-veritas-600 hover:underline">Back to My Courses</a>
        </div>
      </AppLayout>
    )
  }

  const totalPresent = attendance.filter(a => a.status_code === 'present').length
  const totalAbsent = attendance.filter(a => a.status_code === 'absent').length
  const totalLate = attendance.filter(a => a.status_code === 'late').length
  const totalExcused = attendance.filter(a => ['excused', 'exeat_leave', 'medical_leave', 'official_assignment', 'exam_leave'].includes(a.status_code)).length

  return (
    <AppLayout>
      <Head title={course.course_code} />

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/staff/courses" className="text-sm text-gray-400 hover:text-gray-600">&larr; My Courses</Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            <span className="font-mono text-veritas-600">{course.course_code}</span> {course.course_title}
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {course.total_sessions} sessions &middot; {course.total_attendance_records} attendance records
          </p>
        </div>
        <button onClick={downloadReport}
          className="flex items-center gap-2 px-4 py-2.5 bg-veritas-500 text-white rounded-xl font-semibold text-sm hover:bg-veritas-600 transition-all shadow-lg shadow-veritas-500/20 active:scale-95">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Download Report
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Total Sessions', value: course.total_sessions, color: 'bg-gray-50 text-gray-700' },
          { label: 'Present', value: totalPresent, color: 'bg-green-50 text-green-700' },
          { label: 'Absent', value: totalAbsent, color: 'bg-red-50 text-red-700' },
          { label: 'Late', value: totalLate, color: 'bg-amber-50 text-amber-700' },
          { label: 'Excused', value: totalExcused, color: 'bg-blue-50 text-blue-700' },
        ].map((s, i) => (
          <div key={s.label} className={`rounded-xl border border-gray-100 p-4 ${s.color} bg-white`}
            style={{ animation: `fadeInUp 0.3s ease-out ${i * 0.05}s both` }}>
            <p className="text-xs mb-1">{s.label}</p>
            <p className="text-xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1 w-fit">
        {[
          { key: 'sessions', label: 'Sessions', icon: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5' },
          { key: 'attendance', label: 'Attendance', icon: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={tab.icon} />
            </svg>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sessions Tab */}
      {activeTab === 'sessions' && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {sessions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-sm">No sessions created for this course yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-50">
                    {['Date', 'Title', 'Venue', 'Opens', 'Closes', 'Status', 'Attendance', 'Actions'].map(h => (
                      <th key={h} className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s, i) => (
                    <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                      style={{ animation: `fadeIn 0.3s ease-out ${i * 0.03}s both` }}>
                      <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{s.session_date}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 max-w-[200px] truncate">{s.title || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{s.venue_name || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{s.opens_at ? new Date(s.opens_at).toLocaleTimeString() : '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{s.closes_at ? new Date(s.closes_at).toLocaleTimeString() : '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-full border ${
                          s.status === 'active' ? 'bg-green-100 text-green-700 border-green-200' :
                          s.status === 'closed' ? 'bg-gray-100 text-gray-600 border-gray-200' :
                          'bg-blue-100 text-blue-700 border-blue-200'
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{s.present_count}/{s.total_attendance}</td>
                      <td className="px-6 py-4">
                        <button onClick={() => {
                          const el = document.getElementById(`reschedule-${s.id}`)
                          el?.classList.toggle('hidden')
                        }}
                          className="text-xs font-medium text-veritas-600 hover:text-veritas-800 bg-veritas-50 hover:bg-veritas-100 px-2.5 py-1.5 rounded-lg transition-colors">
                          Reschedule
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Reschedule Forms */}
          {sessions.map(s => (
            <div key={`reschedule-${s.id}`} id={`reschedule-${s.id}`} className="hidden border-t border-gray-100 bg-gray-50/50">
              <form ref={el => { if (el) window.rescheduleForms = { ...(window.rescheduleForms || {}), [s.id]: el } }}
                onSubmit={(e) => { e.preventDefault(); handleReschedule(s.id) }}
                className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Session Date</label>
                  <input type="date" name="sessionDate" defaultValue={s.session_date}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-veritas-500 focus:border-veritas-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Opens At</label>
                  <input type="datetime-local" name="opensAt"
                    defaultValue={s.opens_at ? new Date(s.opens_at).toISOString().slice(0, 16) : ''}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-veritas-500 focus:border-veritas-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Closes At</label>
                  <input type="datetime-local" name="closesAt"
                    defaultValue={s.closes_at ? new Date(s.closes_at).toISOString().slice(0, 16) : ''}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-veritas-500 focus:border-veritas-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Venue</label>
                  <select name="venueId" defaultValue={s.venue_id || ''}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-veritas-500 focus:border-veritas-500">
                    <option value="">Current: {s.venue_name || 'None'}</option>
                    {venues.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end gap-2">
                  <button type="submit" disabled={rescheduling?.[s.id]}
                    className="px-4 py-2 bg-veritas-500 text-white rounded-lg text-sm font-semibold hover:bg-veritas-600 transition-colors disabled:opacity-50">
                    {rescheduling?.[s.id] ? 'Saving...' : 'Save'}
                  </button>
                  <button type="button" onClick={() => document.getElementById(`reschedule-${s.id}`)?.classList.add('hidden')}
                    className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          ))}
        </div>
      )}

      {/* Attendance Tab */}
      {activeTab === 'attendance' && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {attendance.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-sm">No attendance records yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-50">
                    {['Student ID', 'Student Name', 'Session', 'Date', 'Status', 'Method', 'Time', 'Venue'].map(h => (
                      <th key={h} className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((a, i) => {
                    const statusClass = statusColors[a.status_code] || 'bg-gray-100 text-gray-600 border-gray-200'
                    return (
                      <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                        style={{ animation: `fadeIn 0.3s ease-out ${i * 0.02}s both` }}>
                        <td className="px-6 py-4 text-sm text-gray-500 font-mono">{a.student_id}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{a.student_name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 max-w-[160px] truncate">{a.session_title || '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{a.session_date || '-'}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-full border ${statusClass}`}>
                            {a.status_label || a.status_code || 'unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{a.attendance_method || '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-400 whitespace-nowrap">{a.timestamp ? new Date(a.timestamp).toLocaleTimeString() : '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{a.venue_name || '-'}</td>
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
