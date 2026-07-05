import { useState, useEffect } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../../Components/AppLayout'
import Table from '../../Components/Table'
import VeritasSpinner from '../../Components/VeritasSpinner'
import Pagination from '../../Components/Pagination'
import api from '../../api'

export default function StaffRolesIndex() {
  const [staffRoles, setStaffRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ staff_id: '' })
  const [showTrashed, setShowTrashed] = useState(false)
  const [meta, setMeta] = useState({})
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [actionLoading, setActionLoading] = useState({})
  const [fetchError, setFetchError] = useState(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      fetchStaffRoles()
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    if (!localStorage.getItem('token')) { window.location.href = '/login'; return }
    fetchStaffRoles()
  }, [page, showTrashed])

  const fetchStaffRoles = async (params = {}) => {
    setLoading(true)
    setFetchError(null)
    try {
      const res = await api.get('/staff-roles', { params: { ...filter, search: search || undefined, page, per_page: '15', include: 'role', trashed: showTrashed ? '1' : undefined, ...params } })
      setStaffRoles(res.data.data || res.data)
      setMeta(res.data.meta || res.data)
    } catch (err) {
      setFetchError(err.response?.data?.message || err.message || 'Failed to load staff roles')
      setStaffRoles([])
    } finally {
      setLoading(false)
    }
  }

  const handleFilter = () => {
    fetchStaffRoles()
  }

  const handleDelete = async (sr) => {
    if (sr.deleted_at) {
      await handleForceDelete(sr.id)
      return
    }
    if (!confirm(`Delete this staff role assignment?`)) return
    setActionLoading(prev => ({ ...prev, [`delete-${sr.id}`]: true }))
    try {
      await api.delete(`/staff-roles/${sr.id}`)
      setStaffRoles((prev) => prev.filter((s) => s.id !== sr.id))
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed')
    } finally {
      setActionLoading(prev => ({ ...prev, [`delete-${sr.id}`]: false }))
    }
  }

  const handleRestore = async (id) => {
    if (!confirm('Restore this staff role assignment?')) return
    setActionLoading(prev => ({ ...prev, [`restore-${id}`]: true }))
    try {
      await api.post(`/staff-roles/${id}/restore`)
      fetchStaffRoles()
    } catch (e) { console.error(e) } finally {
      setActionLoading(prev => ({ ...prev, [`restore-${id}`]: false }))
    }
  }

  const handleForceDelete = async (id) => {
    if (!confirm('Permanently delete this staff role assignment? This cannot be undone.')) return
    setActionLoading(prev => ({ ...prev, [`force-${id}`]: true }))
    try {
      await api.delete(`/staff-roles/${id}/force`)
      fetchStaffRoles()
    } catch (e) { console.error(e) } finally {
      setActionLoading(prev => ({ ...prev, [`force-${id}`]: false }))
    }
  }

  const columns = [
    { key: 'staff_id', label: 'Staff ID' },
    { key: 'role', label: 'Role', render: (_, row) => row.role?.display_name || row.role?.name || '-' },
    { key: 'assigned_at', label: 'Assigned At' },
    {
      key: 'trashed',
      label: 'Status',
      render: (_, row) => row.deleted_at ? (
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-700 uppercase">Trashed</span>
          <button onClick={() => handleRestore(row.id)} disabled={actionLoading[`restore-${row.id}`]} className="text-[10px] text-veritas-600 hover:text-veritas-800 font-medium">
            {actionLoading[`restore-${row.id}`] ? <VeritasSpinner size="sm" /> : 'Restore'}
          </button>
          <button onClick={() => handleForceDelete(row.id)} disabled={actionLoading[`force-${row.id}`]} className="text-[10px] text-red-500 hover:text-red-700 font-medium">
            {actionLoading[`force-${row.id}`] ? <VeritasSpinner size="sm" /> : 'Delete Forever'}
          </button>
        </div>
      ) : null,
    },
  ]

  return (
    <AppLayout>
      <Head title="Staff Role Assignments" />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Staff Role Assignments</h1>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-veritas-500 focus:border-veritas-500"
          />
          <button onClick={() => { setShowTrashed(!showTrashed); }}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
              showTrashed ? 'bg-red-50 text-red-700 border-red-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}>
            {showTrashed ? 'Active Records' : 'Trash'}
          </button>
          <a href="/staff-roles/create" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">
            Add Assignment
          </a>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Staff ID</label>
            <input
              type="text"
              value={filter.staff_id}
              onChange={(e) => setFilter((prev) => ({ ...prev, staff_id: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <button onClick={handleFilter} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">
            Filter
          </button>
        </div>
      </div>
      {fetchError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{fetchError}</div>
      )}
      <div className="bg-white rounded-lg shadow">
        <Table columns={columns} data={staffRoles} loading={loading} onEdit={(row) => window.location.href = `/staff-roles/${row.id}/edit`} onDelete={handleDelete} />
        {!loading && <Pagination meta={meta} onPageChange={setPage} />}
      </div>
    </AppLayout>
  )
}
