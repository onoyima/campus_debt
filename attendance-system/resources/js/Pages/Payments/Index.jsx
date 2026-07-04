import { useState, useEffect } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../../Components/AppLayout'
import Table from '../../Components/Table'
import VeritasSpinner from '../../Components/VeritasSpinner'
import Pagination from '../../Components/Pagination'
import api from '../../api'

export default function PaymentsIndex() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [meta, setMeta] = useState({})
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [actionLoading, setActionLoading] = useState({})

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      fetchPayments()
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    if (!localStorage.getItem('token')) { window.location.href = '/login'; return }
    fetchPayments()
  }, [page])

  const fetchPayments = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    params.set('page', page)
    params.set('per_page', '15')
    api.get(`/debt-payments?${params}`)
      .then((res) => {
        setPayments(res.data.data || res.data)
        setMeta(res.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const handleDelete = async (payment) => {
    if (!confirm(`Delete this payment record?`)) return
    setActionLoading(prev => ({ ...prev, [`delete-${payment.id}`]: true }))
    try {
      await api.delete(`/debt-payments/${payment.id}`)
      setPayments((prev) => prev.filter((p) => p.id !== payment.id))
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed')
    } finally {
      setActionLoading(prev => ({ ...prev, [`delete-${payment.id}`]: false }))
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
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-veritas-500 focus:border-veritas-500"
          />
        </div>
      </div>
      <div className="bg-white rounded-lg shadow">
        <Table columns={columns} data={payments} loading={loading} onDelete={handleDelete} />
        {!loading && <Pagination meta={meta} onPageChange={setPage} />}
      </div>
    </AppLayout>
  )
}
