import { useState, useEffect } from 'react'
import api from '../../api'

const modelLabels = {
  'App\\Models\\Attendance\\AttendanceVenue': 'Venue',
  'App\\Models\\Attendance\\AttendanceTerminal': 'Terminal',
  'App\\Models\\Attendance\\AttendanceVenueTerminalLog': 'Terminal Log',
  'App\\Models\\Attendance\\AttendanceSession': 'Session',
  'App\\Models\\Attendance\\AttendanceRecord': 'Record',
  'App\\Models\\Attendance\\AttendanceExcuse': 'Excuse',
  'App\\Models\\Attendance\\AttendanceStaffClocking': 'Staff Clocking',
  'App\\Models\\Attendance\\AttendanceEventCategory': 'Event Category',
  'App\\Models\\Attendance\\AttendanceInstitutionalEvent': 'Event',
  'App\\Models\\Attendance\\AttendanceEventParticipant': 'Event Participant',
  'App\\Models\\Attendance\\AttendanceEventAttendance': 'Event Attendance',
  'App\\Models\\Attendance\\AttendancePenaltySchedule': 'Penalty',
  'App\\Models\\Attendance\\AttendanceDebt': 'Debt',
  'App\\Models\\Attendance\\AttendanceDebtPayment': 'Debt Payment',
  'App\\Models\\Attendance\\AttendanceStudentDebtLedger': 'Debt Ledger',
  'App\\Models\\Attendance\\AttendanceExamEligibility': 'Eligibility',
  'App\\Models\\Attendance\\AttendanceBiometricTemplate': 'Biometric',
  'App\\Models\\Attendance\\AttendanceBiometricVerificationLog': 'Verification Log',
  'App\\Models\\Attendance\\AttendanceOfflinePendingSync': 'Offline Sync',
  'App\\Models\\Attendance\\AttendanceSyncConflictLog': 'Sync Conflict',
  'App\\Models\\Attendance\\AttendanceStaffCompliance': 'Staff Compliance',
  'App\\Models\\Attendance\\AttendanceRole': 'Role',
  'App\\Models\\Attendance\\AttendanceStaffRole': 'Staff Role',
  'App\\Models\\Attendance\\AttendanceNotification': 'Notification',
  'App\\Models\\Attendance\\AttendanceStatusType': 'Status Type',
  'App\\Models\\Attendance\\AttendanceExamEligibilityStatus': 'Eligibility Status',
  'App\\Models\\Attendance\\AttendanceExamEligibilityLog': 'Eligibility Log',
  'App\\Models\\Attendance\\AttendanceEventTargetGroup': 'Target Group',
  'App\\Models\\Attendance\\AttendanceEventPenaltyAssignment': 'Penalty Assignment',
  'App\\Models\\Attendance\\AttendanceQaComplianceReport': 'QA Report',
}

const eventColors = {
  created: 'bg-emerald-100 text-emerald-800',
  updated: 'bg-blue-100 text-blue-800',
  deleted: 'bg-red-100 text-red-800',
  restored: 'bg-amber-100 text-amber-800',
}

function shortModel(fqn) {
  return modelLabels[fqn] || fqn.split('\\').pop().replace(/^Attendance/, '')
}

export default function Index() {
  const [logs, setLogs] = useState([])
  const [meta, setMeta] = useState({})
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(null)
  const [filters, setFilters] = useState({ event: '', auditable_type: '', date_from: '', date_to: '' })
  const [eventTypes, setEventTypes] = useState([])

  useEffect(() => {
    api.get('/audit-logs/event-types').then(r => setEventTypes(r.data || [])).catch(() => {})
  }, [])

  useEffect(() => {
    const params = new URLSearchParams({ page, per_page: 50 })
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v) })
    api.get(`/audit-logs?${params}`).then(r => {
      setLogs(r.data.data || [])
      setMeta(r.data)
    }).catch(() => {})
  }, [page, filters])

  const handleFilter = (key, value) => {
    setFilters(f => ({ ...f, [key]: value }))
    setPage(1)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Trail</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track every change made across the system</p>
        </div>
        <span className="text-sm text-gray-400 tabular-nums">{meta.total || 0} total entries</span>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-wrap gap-3">
        <select value={filters.event} onChange={e => handleFilter('event', e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm bg-white">
          <option value="">All Events</option>
          {['created', 'updated', 'deleted', 'restored'].map(e => (
            <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>
          ))}
        </select>
        <input type="text" placeholder="Model (e.g. Venue, Session)..."
          value={filters.auditable_type}
          onChange={e => handleFilter('auditable_type', e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm w-48" />
        <input type="date" value={filters.date_from}
          onChange={e => handleFilter('date_from', e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm" />
        <input type="date" value={filters.date_to}
          onChange={e => handleFilter('date_to', e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm" />
        {(filters.event || filters.auditable_type || filters.date_from || filters.date_to) && (
          <button onClick={() => { setFilters({ event: '', auditable_type: '', date_from: '', date_to: '' }); setPage(1) }}
            className="px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 border border-gray-200">
            Clear
          </button>
        )}
      </div>

      <div className="flex gap-6">
        {/* List */}
        <div className={`${selected ? 'w-1/2' : 'w-full'} transition-all`}>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-100">
              {logs.map(log => (
                <button key={log.id} onClick={() => setSelected(selected?.id === log.id ? null : log)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3 ${
                    selected?.id === log.id ? 'bg-veritas-50' : ''
                  }`}>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${eventColors[log.event] || 'bg-gray-100 text-gray-600'}`}>
                    {log.event}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{shortModel(log.auditable_type)} #{log.auditable_id}</p>
                    <p className="text-xs text-gray-400">by {log.user_type ? `${log.user_type} #${log.user_id}` : 'system'}</p>
                  </div>
                  <time className="text-xs text-gray-400 shrink-0">{log.created_at}</time>
                </button>
              ))}
              {logs.length === 0 && (
                <div className="px-4 py-12 text-center text-gray-400 text-sm">No audit entries found.</div>
              )}
            </div>
          </div>

          {meta.last_page > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                Previous
              </button>
              <span className="text-gray-500">Page {meta.current_page} of {meta.last_page}</span>
              <button disabled={page >= meta.last_page} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                Next
              </button>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selected && (
          <div className="w-1/2 bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 text-sm">Entry #{selected.id}</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-4 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-gray-400 text-xs block">Event</span><span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase mt-0.5 ${eventColors[selected.event] || ''}`}>{selected.event}</span></div>
                <div><span className="text-gray-400 text-xs block">Model</span><span className="font-medium">{shortModel(selected.auditable_type)}</span></div>
                <div><span className="text-gray-400 text-xs block">Record ID</span><span className="font-mono">#{selected.auditable_id}</span></div>
                <div><span className="text-gray-400 text-xs block">User</span><span>{selected.user_type ? `${selected.user_type} #${selected.user_id}` : 'System'}</span></div>
                <div className="col-span-2"><span className="text-gray-400 text-xs block">Timestamp</span><span>{selected.created_at}</span></div>
                <div className="col-span-2"><span className="text-gray-400 text-xs block">IP Address</span><span className="font-mono">{selected.ip_address || 'N/A'}</span></div>
              </div>

              {selected.old_values && Object.keys(selected.old_values).length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Old Values</h4>
                  <pre className="bg-gray-50 rounded-lg p-3 text-xs font-mono overflow-x-auto max-h-60">{JSON.stringify(selected.old_values, null, 2)}</pre>
                </div>
              )}
              {selected.new_values && Object.keys(selected.new_values).length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">New Values</h4>
                  <pre className="bg-gray-50 rounded-lg p-3 text-xs font-mono overflow-x-auto max-h-60">{JSON.stringify(selected.new_values, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
