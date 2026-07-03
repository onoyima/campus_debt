import { useState } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../../Components/AppLayout'
import api from '../../api'

export default function ExamClearanceVerify() {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!search.trim()) return
    setLoading(true)
    setSearched(true)
    try {
      const res = await api.get('/exam-eligibility', { params: { student_id: search } })
      setResults(res.data.data || res.data || [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppLayout>
      <Head title="Verify Clearance" />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Verify Student Clearance</h1>
        <a href="/exam-clearance" className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm">Back</a>
      </div>
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <form onSubmit={handleSearch} className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search by Student ID, Matric No, or Name</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter student ID, matric no, or name"
            />
          </div>
          <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>

      {searched && !loading && results.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">No records found for the given search criteria.</div>
      )}

      {Array.isArray(results) && results.length > 0 && (
        <div className="space-y-4">
          {results.map((item, idx) => (
            <div key={item.id || idx} className="bg-white rounded-lg shadow p-6">
              <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-200">
                <div><span className="text-sm text-gray-500">Student ID:</span><p className="font-medium">{item.student_id}</p></div>
                <div><span className="text-sm text-gray-500">Matric No:</span><p className="font-medium">{item.matric_no || item.student?.matric_no || '-'}</p></div>
                <div><span className="text-sm text-gray-500">Name:</span><p className="font-medium">{item.student_name || item.student?.name || '-'}</p></div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Course Eligibility</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Course ID</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Attendance %</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reasons</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {(item.courses || item.eligibility || [item]).map((course, ci) => (
                        <tr key={ci} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm text-gray-700">{course.course_id}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{course.attendance_percentage != null ? `${Number(course.attendance_percentage).toFixed(1)}%` : '-'}</td>
                          <td className="px-4 py-2 text-sm">
                            <span className={`px-2 py-1 text-xs rounded-full ${course.eligibility_status === 'qualified' || course.eligibility_status === 'eligible' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {course.eligibility_status || course.status}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-700">{course.reasons || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  )
}
