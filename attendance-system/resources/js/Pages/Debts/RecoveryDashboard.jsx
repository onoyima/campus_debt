import { useState, useEffect } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../../Components/AppLayout'
import Table from '../../Components/Table'
import StatCard from '../../Components/StatCard'
import api from '../../api'

export default function RecoveryDashboard() {
  const [ledger, setLedger] = useState([])
  const [recentDebts, setRecentDebts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!localStorage.getItem('token')) { window.location.href = '/login'; return }
    fetchData()
    const interval = setInterval(fetchData, 15000)
    return () => clearInterval(interval)
  }, [])

  const fetchData = () => {
    Promise.all([
      api.get('/student-debt-ledger'),
      api.get('/debts'),
    ])
      .then(([ledgerRes, debtsRes]) => {
        setLedger(ledgerRes.data.data || ledgerRes.data)
        setRecentDebts((debtsRes.data.data || debtsRes.data).filter((d) => d.payment_status !== 'paid'))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const totalOutstanding = Array.isArray(ledger) ? ledger.reduce((sum, r) => sum + Number(r.outstanding || 0), 0) : 0
  const totalPaid = Array.isArray(ledger) ? ledger.reduce((sum, r) => sum + Number(r.total_paid || 0), 0) : 0
  const studentsOwing = Array.isArray(ledger) ? ledger.filter((r) => Number(r.outstanding || 0) > 0).length : 0
  const clearedStudents = Array.isArray(ledger) ? ledger.filter((r) => Number(r.outstanding || 0) === 0).length : 0

  const columns = [
    { key: 'student_id', label: 'Student ID' },
    { key: 'amount', label: 'Amount', render: (val) => Number(val).toLocaleString() },
    { key: 'reason', label: 'Reason' },
    { key: 'due_date', label: 'Due Date' },
    {
      key: 'payment_status',
      label: 'Status',
      render: (val) => (
        <span className={`px-2 py-1 text-xs rounded-full ${
          val === 'paid' ? 'bg-green-100 text-green-800' : val === 'partial' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
        }`}>
          {val}
        </span>
      ),
    },
  ]

  return (
    <AppLayout>
      <Head title="Debt Recovery Dashboard" />
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Debt Recovery Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Outstanding" value={Number(totalOutstanding).toLocaleString()} color="red" />
        <StatCard title="Total Paid" value={Number(totalPaid).toLocaleString()} color="green" />
        <StatCard title="Students Owing" value={studentsOwing} color="yellow" />
        <StatCard title="Cleared Students" value={clearedStudents} color="blue" />
      </div>
      <div className="bg-white rounded-lg shadow">
        <h2 className="text-lg font-semibold text-gray-900 px-6 py-4 border-b border-gray-200">Recent Unpaid Debts</h2>
        <Table columns={columns} data={recentDebts} loading={loading} />
      </div>
    </AppLayout>
  )
}
