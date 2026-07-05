import { useState, useEffect } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../../Components/AppLayout'
import Pagination from '../../Components/Pagination'
import api from '../../api'

export default function CourseAssignmentsIndex() {
  const [data, setData] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedSemester, setSelectedSemester] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!localStorage.getItem('token')) { window.location.href = '/login'; return }
    setPage(1)
  }, [selectedSemester, search])

  useEffect(() => {
    fetchData()
  }, [page, selectedSemester, search])

  const fetchData = () => {
    setLoading(true)
    setError(null)
    const params = { page, per_page: 20 }
    if (selectedSemester) params.vu_semester_id = selectedSemester
    if (search) params.search = search
    api.get('/admin/course-assignments', { params })
      .then(res => {
        setData(res.data.data || [])
        setMeta(res.data.meta || null)
      })
      .catch(err => setError(err.response?.data?.message || 'Failed to load'))
      .finally(() => setLoading(false))
  }

  const semesters = meta?.semesters || []

  return (
    <AppLayout>
      <Head title="Course Assignments" />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Course Assignments</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Session #{meta?.academic_session_id || 103}
            {meta?.session_batch ? ` · ${meta.session_batch}` : ''}
            {meta?.active_semester_id ? ` · Semester ${semesters.find(s => s.id == meta.active_semester_id)?.semester_id || meta.active_semester_id}` : ''}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6 flex flex-wrap items-center gap-3 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search course code, title, or staff name..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-veritas-500 transition-colors" />
        </div>
        <select value={selectedSemester} onChange={(e) => setSelectedSemester(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-veritas-500">
          <option value="">Active Semester</option>
          {semesters.map(s => (
            <option key={s.id} value={s.id}>Semester {s.semester_id}</option>
          ))}
        </select>
        <span className="text-xs text-gray-400 ml-auto">{meta?.total || 0} courses</span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="p-6 space-y-4 animate-pulse">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex gap-4"><div className="h-5 bg-gray-100 rounded w-1/5" /><div className="h-5 bg-gray-100 rounded w-2/5" /><div className="h-5 bg-gray-100 rounded w-1/6" /></div>
            ))}
          </div>
        </div>
      ) : data.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <svg className="w-16 h-16 text-gray-200 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No Courses Found</h3>
          <p className="text-sm text-gray-400">No course assignments for this semester matching your search.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Course Code</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Course Title</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Cr</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Assigned Staff</th>
                </tr>
              </thead>
              <tbody>
                {data.map((course, i) => (
                  <tr key={course.course_id} className="border-b border-gray-50 hover:bg-gray-50/40 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-400">{(meta?.current_page - 1) * (meta?.per_page || 20) + i + 1}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 font-mono">{course.course_id}</td>
                    <td className="px-4 py-3"><span className="text-sm font-bold text-gray-900 font-mono">{course.course_code}</span></td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{course.course_title}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 text-center">{course.credit_load || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {course.staff.map(s => (
                          <span key={s.course_assigned_id} className="inline-flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100">
                            <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            {s.full_name}
                            <span className="text-blue-400">(#{s.staff_id})</span>
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {meta?.last_page > 1 && (
            <div className="px-6 py-4 border-t border-gray-50">
              <Pagination meta={meta} onPageChange={setPage} />
            </div>
          )}
        </div>
      )}
    </AppLayout>
  )
}
