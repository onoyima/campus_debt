import { useState, useEffect } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../../Components/AppLayout'
import api from '../../api'

export default function StaffCoursesIndex() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!localStorage.getItem('token')) { window.location.href = '/login'; return }
    fetchCourses()
  }, [])

  const fetchCourses = () => {
    setLoading(true)
    api.get('/staff/my-courses')
      .then(res => setCourses(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  return (
    <AppLayout>
      <Head title="My Courses" />

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-veritas-500 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Courses</h1>
            <p className="text-sm text-gray-400 mt-0.5">Courses assigned to you this session</p>
          </div>
        </div>
        <button onClick={fetchCourses} className="p-2 rounded-lg bg-white border border-gray-200 text-gray-400 hover:text-veritas-600 hover:border-veritas-200 transition-all">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-1/3 mb-3" />
              <div className="h-5 bg-gray-100 rounded w-2/3 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/2 mb-4" />
              <div className="flex gap-2">
                <div className="h-8 bg-gray-100 rounded w-16" />
                <div className="h-8 bg-gray-100 rounded w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <svg className="w-16 h-16 text-gray-200 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No Courses Assigned</h3>
          <p className="text-sm text-gray-400">You have not been assigned to any courses this session.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course, i) => (
            <a key={course.course_assigned_id}
              href={`/staff/courses/${course.course_assigned_id}`}
              className="block bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:border-veritas-200 transition-all duration-300 group"
              style={{ animation: `fadeInUp 0.4s ease-out ${i * 0.06}s both` }}>
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-bold text-veritas-600 bg-veritas-50 px-2 py-1 rounded-md font-mono">
                  {course.course_code}
                </span>
                {course.credit_load && (
                  <span className="text-xs text-gray-400">{course.credit_load} credits</span>
                )}
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-3 group-hover:text-veritas-700 transition-colors line-clamp-2">
                {course.course_title}
              </h3>
              <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {course.total_sessions} sessions
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                  {course.total_attendance_records} records
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Attendance:</span>
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: course.total_sessions > 0 ? `${Math.min(100, (course.present_count / Math.max(1, course.total_attendance_records)) * 100)}%` : '0%' }} />
                </div>
                <span className="text-xs font-semibold text-gray-700">
                  {course.total_attendance_records > 0
                    ? `${Math.round((course.present_count / course.total_attendance_records) * 100)}%`
                    : '-'}
                </span>
              </div>
            </a>
          ))}
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </AppLayout>
  )
}
