import { useState, useRef } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../../Components/AppLayout'
import VeritasSpinner from '../../Components/VeritasSpinner'
import api from '../../api'

export default function DebtsUpload() {
  const [file, setFile] = useState(null)
  const [eventId, setEventId] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  const handleFileChange = (e) => {
    setFile(e.target.files[0] || null)
    setResult(null)
    setError('')
  }

  const handleUpload = async () => {
    if (!file) { setError('Please select a file.'); return }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      if (eventId) formData.append('institutional_event_id', eventId)

      const res = await api.post('/debts/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResult(res.data)
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.errors?.file?.[0] || 'Upload failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) setFile(dropped)
  }

  return (
    <AppLayout>
      <Head title="Upload Debts" />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Bulk Upload Debts</h1>
        <a
          href={`${api.defaults.baseURL || ''}/debts/upload/template`}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
        >
          Download CSV Template
        </a>
      </div>

      <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Event (optional)</label>
          <input
            type="text"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            placeholder="Institutional event ID (if linking to an event)"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-veritas-500 focus:border-veritas-500"
          />
        </div>

        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-veritas-400 transition-colors"
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls,.txt"
            onChange={handleFileChange}
            className="hidden"
          />
          {file ? (
            <div>
              <p className="text-sm font-medium text-gray-800">{file.name}</p>
              <p className="text-xs text-gray-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
              <p className="text-xs text-veritas-600 mt-2">Click or drop to change file</p>
            </div>
          ) : (
            <div>
              <p className="text-gray-500">Drop a CSV or Excel file here, or click to browse</p>
              <p className="text-xs text-gray-400 mt-1">Columns: student_id, amount, reason, due_date, blocks_eligibility</p>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
        )}

        {result && (
          <div className="mt-4 p-4 bg-green-50 rounded-lg space-y-2">
            <p className="text-sm font-medium text-green-800">{result.message}</p>
            {result.failed?.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-medium text-red-600 mb-1">Failed rows:</p>
                <ul className="list-disc list-inside text-xs text-red-600 space-y-0.5 max-h-40 overflow-y-auto">
                  {result.failed.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || loading}
          className="mt-5 w-full px-4 py-2.5 bg-veritas-600 text-white rounded-lg hover:bg-veritas-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          {loading ? <VeritasSpinner size="sm" /> : 'Upload & Create Debts'}
        </button>
      </div>

      <div className="mt-8 bg-white rounded-lg shadow p-6 max-w-2xl">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">CSV Format</h2>
        <div className="bg-gray-50 rounded-lg p-4 text-xs font-mono text-gray-700 overflow-x-auto">
          <pre>{`student_id,amount,reason,due_date,blocks_eligibility
12345,5000,Property damage - broken window,2026-08-01,0
67890,2500,Manual event attendance penalty,2026-08-15,1`}</pre>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          <strong>student_id</strong> (required) — student portal ID<br />
          <strong>amount</strong> (required) — numeric debt amount<br />
          <strong>reason</strong> (required) — description of the debt<br />
          <strong>due_date</strong> (required) — YYYY-MM-DD format<br />
          <strong>blocks_eligibility</strong> (optional) — 0 or 1, defaults to 0 (financial only)
        </p>
      </div>
    </AppLayout>
  )
}
