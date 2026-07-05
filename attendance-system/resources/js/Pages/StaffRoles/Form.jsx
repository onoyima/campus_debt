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

  const [staffQuery, setStaffQuery] = useState('')
  const [staffResults, setStaffResults] = useState([])
  const [searchingStaff, setSearchingStaff] = useState(false)
  const [staffDropdownOpen, setStaffDropdownOpen] = useState(false)
  const [selectedStaffName, setSelectedStaffName] = useState('')

  useEffect(() => {
    if (!localStorage.getItem('token')) { window.location.href = '/login'; return }
    api.get('/roles').then((res) => setRoles(res.data.data || res.data)).catch(() => {})
    if (isEdit && id) {
      api.get(`/staff-roles/${id}`)
        .then((res) => {
          const sr = res.data.data || res.data
          setForm({ staff_id: sr.staff_id ?? '', attendance_role_id: sr.attendance_role_id ?? '' })
          if (sr.staff_id) {
            api.get('/staff-search', { params: { q: sr.staff_id } })
              .then(res2 => {
                const found = (res2.data || []).find(s => s.id == sr.staff_id)
                if (found) {
                  setSelectedStaffName(found.full_name)
                  setStaffQuery(found.full_name)
                }
              })
              .catch(() => {})
          }
        })
        .catch(() => window.location.href = '/staff-roles')
        .finally(() => setFetching(false))
    } else {
      setFetching(false)
    }
  }, [])

  useEffect(() => {
    if (!staffQuery || staffQuery.length < 2 || selectedStaffName) {
      setStaffResults([])
      return
    }
    const timer = setTimeout(() => {
      setSearchingStaff(true)
      api.get('/staff-search', { params: { q: staffQuery } })
        .then(res => setStaffResults(res.data || []))
        .catch(() => setStaffResults([]))
        .finally(() => setSearchingStaff(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [staffQuery])

  const selectStaff = (staff) => {
    setForm(prev => ({ ...prev, staff_id: staff.id }))
    setSelectedStaffName(staff.full_name)
    setStaffQuery(staff.full_name)
    setStaffDropdownOpen(false)
  }

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
          <div className="mb-4 relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Staff</label>
            <input type="text" value={staffQuery}
              onChange={(e) => { setStaffQuery(e.target.value); setStaffDropdownOpen(true); setSelectedStaffName(''); setForm(prev => ({ ...prev, staff_id: '' })) }}
              onFocus={() => staffQuery.length >= 2 && setStaffDropdownOpen(true)}
              onBlur={() => setTimeout(() => setStaffDropdownOpen(false), 200)}
              placeholder="Search staff by name, email, or ID..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              required />
            {staffDropdownOpen && staffResults.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {staffResults.map(s => (
                  <div key={s.id}
                    onMouseDown={() => selectStaff(s)}
                    className="px-3 py-2 hover:bg-indigo-50 cursor-pointer border-b border-gray-50 last:border-0">
                    <div className="text-sm font-medium text-gray-900">{s.full_name}</div>
                    <div className="text-xs text-gray-400">ID: {s.id} · {s.email || 'No email'}</div>
                  </div>
                ))}
              </div>
            )}
            {searchingStaff && <div className="text-xs text-gray-400 mt-1">Searching...</div>}
            {form.staff_id && selectedStaffName && (
              <div className="text-xs text-green-600 mt-1">Selected: {selectedStaffName} (ID: {form.staff_id})</div>
            )}
          </div>
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
