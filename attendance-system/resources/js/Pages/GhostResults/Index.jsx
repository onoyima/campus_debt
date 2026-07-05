import { useState, useEffect, useCallback } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../../Components/AppLayout'
import VeritasSpinner from '../../Components/VeritasSpinner'
import api from '../../api'

function GradeBadge({ grade, point }) {
  const colors = {
    A: 'bg-green-100 text-green-700 border-green-200',
    B: 'bg-blue-100 text-blue-700 border-blue-200',
    C: 'bg-amber-100 text-amber-700 border-amber-200',
    D: 'bg-orange-100 text-orange-700 border-orange-200',
    F: 'bg-red-100 text-red-700 border-red-200',
  }
  const cls = colors[grade] || 'bg-gray-100 text-gray-700 border-gray-200'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold border ${cls}`}>
      {grade}
      <span className="opacity-60 font-normal">{point}</span>
    </span>
  )
}

function CourseTable({ courses }) {
  const totalCredit = courses.reduce((s, r) => s + (r.credit_load || 0), 0)
  const totalWeight = courses.reduce((s, r) => s + (r.weight || 0), 0)
  const gpa = totalCredit > 0 ? (totalWeight / totalCredit).toFixed(2) : '0.00'

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-100 text-sm">
        <thead>
          <tr className="bg-gray-50 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            <th className="px-3 py-2.5 text-left">#</th>
            <th className="px-3 py-2.5 text-left">Code</th>
            <th className="px-3 py-2.5 text-left">Title</th>
            <th className="px-3 py-2.5 text-center">CL</th>
            <th className="px-3 py-2.5 text-center">CA1</th>
            <th className="px-3 py-2.5 text-center">CA2</th>
            <th className="px-3 py-2.5 text-center">CA3</th>
            <th className="px-3 py-2.5 text-center">Exam</th>
            <th className="px-3 py-2.5 text-center">Total</th>
            <th className="px-3 py-2.5 text-center">Grade</th>
            <th className="px-3 py-2.5 text-center">W.P</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {courses.map((r, i) => (
            <tr key={r.course_id || i} className="hover:bg-gray-50">
              <td className="px-3 py-2 text-gray-400">{i + 1}</td>
              <td className="px-3 py-2 font-mono text-xs font-medium text-gray-700">{r.code}</td>
              <td className="px-3 py-2 text-gray-700 max-w-[200px] truncate" title={r.title}>{r.title}</td>
              <td className="px-3 py-2 text-center font-medium">{r.credit_load}</td>
              <td className="px-3 py-2 text-center">{r.ca_one > 0 ? r.ca_one : '-'}</td>
              <td className="px-3 py-2 text-center">{r.ca_two > 0 ? r.ca_two : '-'}</td>
              <td className="px-3 py-2 text-center">{r.ca_three > 0 ? r.ca_three : '-'}</td>
              <td className="px-3 py-2 text-center">{r.examination > 0 ? r.examination : '-'}</td>
              <td className="px-3 py-2 text-center font-semibold">{r.total}</td>
              <td className="px-3 py-2 text-center"><GradeBadge grade={r.grade} point={r.point} /></td>
              <td className="px-3 py-2 text-center font-mono">{r.weight.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-gray-50 text-xs font-semibold text-gray-700">
          <tr>
            <td colSpan={3} className="px-3 py-2.5 text-right">Total:</td>
            <td className="px-3 py-2.5 text-center">{totalCredit}</td>
            <td colSpan={4}></td>
            <td></td>
            <td></td>
            <td className="px-3 py-2.5 text-center font-mono">{totalWeight.toFixed(1)}</td>
          </tr>
          <tr className="bg-veritas-50 text-veritas-700 font-bold">
            <td colSpan={10} className="px-3 py-2.5 text-right">GPA:</td>
            <td className="px-3 py-2.5 text-center text-sm">{gpa}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function ResultGroup({ label, groups }) {
  if (!groups || groups.length === 0) return null
  return (
    <div className="space-y-4">
      {groups.map((g, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{g.session}</span>
              <span className="text-[11px] font-medium text-veritas-600 bg-veritas-50 px-2 py-0.5 rounded-full">
                Semester {g.semester}
              </span>
            </div>
            <span className="text-xs text-gray-400">{g.courses.length} course{g.courses.length !== 1 ? 's' : ''}</span>
          </div>
          <CourseTable courses={g.courses} />
        </div>
      ))}
    </div>
  )
}

export default function GhostResults() {
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [results, setResults] = useState(null)
  const [loadingResults, setLoadingResults] = useState(false)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('approved')

  useEffect(() => {
    if (!localStorage.getItem('token')) { window.location.href = '/login'; return }
  }, [])

  useEffect(() => {
    if (!searchQ || searchQ.length < 2) { setSearchResults([]); return }
    const timer = setTimeout(() => {
      setSearching(true)
      api.get('/ghost/students', { params: { q: searchQ } }).then(r => {
        setSearchResults(r.data || [])
      }).catch(err => {
        console.error('Ghost search error:', err.response?.status, err.response?.data || err.message)
        setSearchResults([])
      }).finally(() => setSearching(false))
    }, 400)
    return () => clearTimeout(timer)
  }, [searchQ])

  const fetchResults = useCallback(() => {
    if (!selectedStudent) return
    setLoadingResults(true)
    setError(null)
    api.get('/ghost/results', { params: { student_id: selectedStudent.id } }).then(r => {
      setResults(r.data)
    }).catch(err => {
      setError(err.response?.data?.message || err.message || 'Failed to load results')
      setResults(null)
    }).finally(() => setLoadingResults(false))
  }, [selectedStudent])

  useEffect(() => {
    if (selectedStudent) fetchResults()
  }, [selectedStudent, fetchResults])

  return (
    <AppLayout>
      <Head title="Student Results" />

      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Student Results Viewer</h1>
        <p className="text-sm text-gray-500 mt-1">Search a student to view all approved and unapproved results</p>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-6">
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Search Student</label>
        <input type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)}
          placeholder="Name, ID, or Matric No..."
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-veritas-300 focus:border-veritas-400 outline-none transition-shadow" />

        {searchQ.length >= 2 && (
          <div className="mt-3 max-h-48 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-50">
            {searching ? (
              <div className="px-4 py-3 text-sm text-gray-400">Searching...</div>
            ) : searchResults.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-400">No students found</div>
            ) : (
              searchResults.map(s => (
                <button key={s.id} onClick={() => { setSelectedStudent(s); setSearchQ(`${s.fname} ${s.lname} (${s.matric_no || s.id})`); setSearchResults([]); setTab('approved') }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-veritas-50 ${selectedStudent?.id === s.id ? 'bg-veritas-50' : ''}`}>
                  <span className="font-medium text-gray-900">{s.fname} {s.mname} {s.lname}</span>
                  <span className="text-gray-400 ml-2 text-xs">{s.matric_no || `#${s.id}`}</span>
                  <span className="text-gray-400 ml-2 text-xs">· {s.program || ''}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Student Profile */}
      {selectedStudent && results?.student && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-6">
          <h2 className="text-sm font-bold text-gray-900 mb-3">Student Profile</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider min-w-[90px] shrink-0">Name</span>
              <span className="text-sm font-medium text-gray-900">{results.student.fname} {results.student.mname || ''} {results.student.lname}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider min-w-[90px] shrink-0">Matric No</span>
              <span className="text-sm font-medium text-gray-900">{results.student.matric_no || '—'}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider min-w-[90px] shrink-0">Email</span>
              <span className="text-sm font-medium text-gray-900">{results.student.email || '—'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      {selectedStudent && (
        loadingResults ? (
          <VeritasSpinner text="Loading results..." />
        ) : results ? (
          <div>
            <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
              <button onClick={() => setTab('approved')}
                className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${tab === 'approved' ? 'bg-white text-veritas-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                Approved ({results.approved?.reduce((s, g) => s + g.courses.length, 0) || 0})
              </button>
              <button onClick={() => setTab('unapproved')}
                className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${tab === 'unapproved' ? 'bg-white text-veritas-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                Unapproved ({results.unapproved?.reduce((s, g) => s + g.courses.length, 0) || 0})
              </button>
            </div>

            {tab === 'approved' && (
              results.approved?.length > 0 ? (
                <ResultGroup label="Approved" groups={results.approved} />
              ) : (
                <div className="text-center py-8 text-gray-400 text-sm bg-white rounded-xl border border-gray-100">No approved results found</div>
              )
            )}

            {tab === 'unapproved' && (
              results.unapproved?.length > 0 ? (
                <ResultGroup label="Unapproved" groups={results.unapproved} />
              ) : (
                <div className="text-center py-8 text-gray-400 text-sm bg-white rounded-xl border border-gray-100">No unapproved results found</div>
              )
            )}
          </div>
        ) : null
      )}
    </AppLayout>
  )
}
