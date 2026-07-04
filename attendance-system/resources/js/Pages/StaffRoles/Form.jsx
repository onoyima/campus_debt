import { useState, useEffect } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../../Components/AppLayout'
import FormInput from '../../Components/FormInput'
import api from '../../api'
import VeritasSpinner from '../../Components/VeritasSpinner'

export default function StaffRolesForm() {
  const isEdit = window.location.pathname.includes('/edit')
  const id = isEdit ? window.location.pathname.split('/')[2] : null

  const [form, setForm] = useState({ staff_id: '', attendance_role_id: '' })
  const [roles, setRoles] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(isEdit)

  useEffect(() => {
    if (!localStorage.getItem('token')) { window.location.href = '/login'; return }
    api.get('/roles').then((res) => setRoles(res.data.data || res.data)).catch(() => {})
    if (isEdit && id) {
      api.get(`/staff-roles/${id}`)
        .then((res) => {
          const sr = res.data.data || res.data
          setForm({ staff_id: sr.staff_id ?? '', attendance_role_id: sr.attendance_role_id ?? '' })
        })
        .catch(() => window.location.href = '/staff-roles')
        .finally(() => setFetching(false))
    } else {
      setFetching(false)
    }
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (isEdit) {
        await api.put(`/staff-roles/${id}`, form)
      } else {
        await api.post('/staff-roles', form)
      }
      window.location.href = '/staff-roles'
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save staff role assignment')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <AppLayout>
        <VeritasSpinner text="Loading..." />
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <Head title={isEdit ? 'Edit Staff Role Assignment' : 'Create Staff Role Assignment'} />
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{isEdit ? 'Edit Staff Role Assignment' : 'Create Staff Role Assignment'}</h1>
      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
      <div className="bg-white rounded-lg shadow p-6 max-w-lg">
        <form onSubmit={handleSubmit}>
          <FormInput label="Staff ID" name="staff_id" type="number" value={form.staff_id} onChange={handleChange} required />
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select name="attendance_role_id" value={form.attendance_role_id} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
              <option value="">Select Role</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.display_name || r.name}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
              {loading ? (
                <><VeritasSpinner size="sm" /> Saving...</>
              ) : 'Save'}
            </button>
            <a href="/staff-roles" className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Cancel</a>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}
