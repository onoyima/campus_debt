import { useState, useEffect } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../../Components/AppLayout'
import Table from '../../Components/Table'
import api from '../../api'

export default function RolesIndex() {
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!localStorage.getItem('token')) { window.location.href = '/login'; return }
    fetchRoles()
    const interval = setInterval(fetchRoles, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchRoles = () => {
    api.get('/roles')
      .then((res) => setRoles(res.data.data || res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const handleDelete = async (role) => {
    if (!confirm(`Delete role "${role.name}"?`)) return
    try {
      await api.delete(`/roles/${role.id}`)
      setRoles((prev) => prev.filter((r) => r.id !== role.id))
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed')
    }
  }

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'display_name', label: 'Display Name' },
    {
      key: 'description',
      label: 'Description',
      render: (val) => val ? (val.length > 50 ? val.substring(0, 50) + '...' : val) : '-',
    },
  ]

  return (
    <AppLayout>
      <Head title="Roles" />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Roles</h1>
        <a href="/roles/create" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">
          Add Role
        </a>
      </div>
      <div className="bg-white rounded-lg shadow">
        <Table columns={columns} data={roles} loading={loading} onEdit={(row) => window.location.href = `/roles/${row.id}/edit`} onDelete={handleDelete} />
      </div>
    </AppLayout>
  )
}
