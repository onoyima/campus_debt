import { useState, useEffect } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../../Components/AppLayout'
import Table from '../../Components/Table'
import api from '../../api'

export default function StaffRolesIndex() {
  const [staffRoles, setStaffRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ staff_id: '' })

  useEffect(() => {
    if (!localStorage.getItem('token')) { window.location.href = '/login'; return }
    fetchStaffRoles()
    const interval = setInterval(fetchStaffRoles, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchStaffRoles = async (params = {}) => {
    setLoading(true)
    try {
      const res = await api.get('/staff-roles', { params: { ...filter, ...params } })
      setStaffRoles(res.data.data || res.data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const handleFilter = () => {
    fetchStaffRoles()
  }

  const handleDelete = async (sr) => {
    if (!confirm(`Delete this staff role assignment?`)) return
    try {
      await api.delete(`/staff-roles/${sr.id}`)
      setStaffRoles((prev) => prev.filter((s) => s.id !== sr.id))
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed')
    }
  }

  const columns = [
    { key: 'staff_id', label: 'Staff ID' },
    { key: 'role_name', label: 'Role' },
    { key: 'assigned_at', label: 'Assigned At' },
  ]

  return (
    <AppLayout>
      <Head title="Staff Role Assignments" />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Staff Role Assignments</h1>
        <a href="/staff-roles/create" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">
          Add Assignment
        </a>
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
      <div className="bg-white rounded-lg shadow">
        <Table columns={columns} data={staffRoles} loading={loading} onEdit={(row) => window.location.href = `/staff-roles/${row.id}/edit`} onDelete={handleDelete} />
      </div>
    </AppLayout>
  )
}
