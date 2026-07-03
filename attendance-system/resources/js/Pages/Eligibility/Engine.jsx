import { useState } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../../Components/AppLayout'
import api from '../../api'

export default function EligibilityEngine() {
  const [studentId, setStudentId] = useState('')
  const [courseId, setCourseId] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleEvaluate = async () => {
    if (!studentId || !courseId) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.post('/eligibility-engine/evaluate-course', {
        student_id: parseInt(studentId),
        course_id: parseInt(courseId),
      })
      setResults(res.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Evaluation failed')
    } finally {
      setLoading(false)
    }
  }

  const handleEvaluateAll = async () => {
    if (!confirm('This will evaluate eligibility for all students and courses. Continue?')) return
    setBulkLoading(true)
    setError(null)
    try {
      const res = await api.post('/eligibility-engine/evaluate-all')
      setResults({ message: `Evaluated ${res.data?.length || 0} records.` })
    } catch (err) {
      setError(err.response?.data?.message || 'Bulk evaluation failed')
    } finally {
      setBulkLoading(false)
    }
  }

  return (
    <AppLayout>
      <Head title="Eligibility Engine" />
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Exam Eligibility Engine</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Evaluate Specific Course</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Student ID</label>
              <input
                type="number"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter student ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Course Assignment ID</label>
              <input
                type="number"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter course assigned ID"
              />
            </div>
            <button
              onClick={handleEvaluate}
              disabled={loading || !studentId || !courseId}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Evaluating...' : 'Evaluate'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Bulk Operations</h2>
          <p className="text-sm text-gray-600 mb-4">
            Evaluate eligibility for all students across all courses. This may take a while.
          </p>
          <button
            onClick={handleEvaluateAll}
            disabled={bulkLoading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {bulkLoading ? 'Processing...' : 'Evaluate All'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      {results && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Results</h2>
          <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-x-auto">
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}
    </AppLayout>
  )
}
