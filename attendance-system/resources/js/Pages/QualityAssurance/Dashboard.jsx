import { useState, useEffect } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../../Components/AppLayout'
import Table from '../../Components/Table'
import StatCard from '../../Components/StatCard'
import api from '../../api'

export default function QADashboard() {
  const [stats, setStats] = useState({ pendingReviews: 0, eligible: 0, ineligible: 0, activeSessions: 0 })
  const [pendingRecords, setPendingRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!localStorage.getItem('token')) { window.location.href = '/login'; return }
    fetchData()
    const interval = setInterval(fetchData, 15000)
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [pendingRes, eligibilityRes, sessionsRes, pendingRecordsRes] = await Promise.all([
        api.get('/staff-compliance', { params: { reported_to_qa: false, per_page: 1 } }),
        api.get('/exam-eligibility', { params: { per_page: 1 } }),
        api.get('/sessions', { params: { status: 'active', per_page: 1 } }),
        api.get('/staff-compliance', { params: { reported_to_qa: false } }),
      ])

      const allEligibility = eligibilityRes.data.data || eligibilityRes.data || []
      const eligibleCount = Array.isArray(allEligibility) ? allEligibility.filter((e) => e.status === 'eligible' || e.eligibility_status === 'eligible' || e.eligibility_status === 'qualified').length : 0
      const ineligibleCount = Array.isArray(allEligibility) ? allEligibility.filter((e) => e.status !== 'eligible' && e.eligibility_status !== 'eligible' && e.eligibility_status !== 'qualified').length : 0

      setStats({
        pendingReviews: Array.isArray(pendingRes.data?.data || pendingRes.data) ? (pendingRes.data?.data || pendingRes.data).length : (pendingRes.data?.total || 0),
        eligible: eligibleCount,
        ineligible: ineligibleCount,
        activeSessions: Array.isArray(sessionsRes.data?.data || sessionsRes.data) ? (sessionsRes.data?.data || sessionsRes.data).length : (sessionsRes.data?.total || 0),
      })
      setPendingRecords(pendingRecordsRes.data.data || pendingRecordsRes.data || [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const pendingColumns = [
    { key: 'staff_id', label: 'Staff ID' },
    { key: 'institutional_event_id', label: 'Event ID' },
    { key: 'attendance_status_id', label: 'Attendance Status ID' },
    { key: 'reported_to_qa', label: 'Reported', render: (val) => val ? 'Yes' : 'No' },
  ]

  return (
    <AppLayout>
      <Head title="QA Dashboard" />
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Quality Assurance Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard title="Pending Reviews" value={stats.pendingReviews} color="yellow" />
        <StatCard title="Eligible Students" value={stats.eligible} color="green" />
        <StatCard title="Ineligible Students" value={stats.ineligible} color="red" />
        <StatCard title="Active Sessions" value={stats.activeSessions} color="blue" />
      </div>
      <div className="bg-white rounded-lg shadow">
        <h2 className="text-lg font-semibold text-gray-900 px-6 py-4 border-b border-gray-200">Pending QA Review</h2>
        <Table columns={pendingColumns} data={pendingRecords} loading={loading} />
      </div>
    </AppLayout>
  )
}
