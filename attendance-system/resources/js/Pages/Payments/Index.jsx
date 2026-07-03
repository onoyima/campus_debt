import { useState, useEffect } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../../Components/AppLayout'
import Table from '../../Components/Table'
import api from '../../api'

export default function PaymentsIndex() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!localStorage.getItem('token')) { window.location.href = '/login'; return }
    fetchPayments()
    const interval = setInterval(fetchPayments, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchPayments = () => {
    api.get('/debt-payments')
      .then((res) => setPayments(res.data.data || res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const handleDelete = async (payment) => {
    if (!confirm(`Delete this payment record?`)) return
    try {
      await api.delete(`/debt-payments/${payment.id}`)
      setPayments((prev) => prev.filter((p) => p.id !== payment.id))
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed')
    }
  }

  const columns = [
    { key: 'attendance_debt_id', label: 'Debt ID' },
    { key: 'amount', label: 'Amount', render: (val) => Number(val).toLocaleString() },
    { key: 'payment_reference', label: 'Reference' },
    { key: 'payment_method', label: 'Method' },
    { key: 'payment_date', label: 'Payment Date' },
    { key: 'verified_by', label: 'Verified By' },
    { key: 'verified_at', label: 'Verified At' },
  ]

  return (
    <AppLayout>
      <Head title="Payments" />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
      </div>
      <div className="bg-white rounded-lg shadow">
        <Table columns={columns} data={payments} loading={loading} onDelete={handleDelete} />
      </div>
    </AppLayout>
  )
}
