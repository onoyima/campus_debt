import { useState, useEffect } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../../Components/AppLayout'
import FormInput from '../../Components/FormInput'
import api from '../../api'

export default function PenaltiesForm() {
  const isEdit = window.location.pathname.includes('/edit')
  const id = isEdit ? window.location.pathname.split('/')[2] : null

  const [form, setForm] = useState({
    name: '', description: '', penalty_type: 'fixed', amount: '', applicable_to: 'student',
    applies_to_late: false, applies_to_absence: false, effective_date: '', expiry_date: '', is_active: true,
  })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(isEdit)

  useEffect(() => {
    if (!localStorage.getItem('token')) { window.location.href = '/login'; return }
    if (isEdit && id) {
      api.get(`/penalty-schedule/${id}`)
        .then((res) => {
          const d = res.data.data || res.data
          setForm({
            name: d.name ?? '',
            description: d.description ?? '',
            penalty_type: d.penalty_type ?? 'fixed',
            amount: d.amount ?? '',
            applicable_to: d.applicable_to ?? 'student',
            applies_to_late: d.applies_to_late ?? false,
            applies_to_absence: d.applies_to_absence ?? false,
            effective_date: d.effective_date ?? '',
            expiry_date: d.expiry_date ?? '',
            is_active: d.is_active ?? true,
          })
        })
        .catch(() => window.location.href = '/penalties')
        .finally(() => setFetching(false))
    } else {
      setFetching(false)
    }
  }, [])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (isEdit) {
        await api.put(`/penalty-schedule/${id}`, form)
      } else {
        await api.post('/penalty-schedule', form)
      }
      window.location.href = '/penalties'
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save penalty')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <AppLayout>
        <div className="text-center py-12 text-gray-500">Loading...</div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <Head title={isEdit ? 'Edit Penalty' : 'Create Penalty'} />
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{isEdit ? 'Edit Penalty' : 'Create Penalty'}</h1>
      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
      <div className="bg-white rounded-lg shadow p-6 max-w-lg">
        <form onSubmit={handleSubmit}>
          <FormInput label="Name" name="name" value={form.name} onChange={handleChange} required />
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Penalty Type</label>
            <select name="penalty_type" value={form.penalty_type} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
              <option value="fixed">Fixed</option>
              <option value="variable">Variable</option>
            </select>
          </div>
          <FormInput label="Amount" name="amount" type="number" value={form.amount} onChange={handleChange} required />
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Applicable To</label>
            <select name="applicable_to" value={form.applicable_to} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
              <option value="student">Student</option>
              <option value="staff">Staff</option>
            </select>
          </div>
          <div className="mb-4">
            <label className="flex items-center">
              <input type="checkbox" name="applies_to_late" checked={form.applies_to_late} onChange={handleChange} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
              <span className="ml-2 text-sm text-gray-700">Applies to Late</span>
            </label>
          </div>
          <div className="mb-4">
            <label className="flex items-center">
              <input type="checkbox" name="applies_to_absence" checked={form.applies_to_absence} onChange={handleChange} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
              <span className="ml-2 text-sm text-gray-700">Applies to Absence</span>
            </label>
          </div>
          <FormInput label="Effective Date" name="effective_date" type="date" value={form.effective_date} onChange={handleChange} />
          <FormInput label="Expiry Date" name="expiry_date" type="date" value={form.expiry_date} onChange={handleChange} />
          <div className="mb-4">
            <label className="flex items-center">
              <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
              <span className="ml-2 text-sm text-gray-700">Active</span>
            </label>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {loading ? 'Saving...' : 'Save'}
            </button>
            <a href="/penalties" className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Cancel</a>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}
