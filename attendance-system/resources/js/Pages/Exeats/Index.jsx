import { useState, useEffect } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../../Components/AppLayout'
import Table from '../../Components/Table'
import VeritasSpinner from '../../Components/VeritasSpinner'
import Pagination from '../../Components/Pagination'
import api from '../../api'

export default function ExeatsIndex() {
  const [exeats, setExeats] = useState([])
  const [loading, setLoading] = useState(true)
  const [meta, setMeta] = useState({})
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      fetchExeats()
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    if (!localStorage.getItem('token')) { window.location.href = '/login'; return }
    fetchExeats()
  }, [page])

  const fetchExeats = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    params.set('page', page)
    params.set('per_page', '15')
    api.get(`/exeats?${params}`)
      .then((res) => {
        setExeats(res.data.data || res.data)
        setMeta(res.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'student_id', label: 'Student ID' },
    { key: 'matric_no', label: 'Matric No' },
    { key: 'departure_date', label: 'Departure Date' },
    { key: 'return_date', label: 'Return Date' },
    {
      key: 'status',
      label: 'Status',
      render: (val) => (
        <span className={`px-2 py-1 text-xs rounded-full ${
          val === 'approved' ? 'bg-green-100 text-green-800' : val === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
        }`}>
          {val}
        </span>
      ),
    },
  ]

  return (
    <AppLayout>
      <Head title="Exeat Requests" />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Exeat Requests</h1>
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
        <Table columns={columns} data={exeats} loading={loading} onEdit={(row) => window.location.href = `/exeats/${row.id}`} />
        {!loading && <Pagination meta={meta} onPageChange={setPage} />}
      </div>
    </AppLayout>
  )
}
