import { useState, useEffect } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../../Components/AppLayout'
import FormInput from '../../Components/FormInput'
import api from '../../api'

export default function VenuesForm() {
  const isEdit = window.location.pathname.includes('/edit')
  const id = isEdit ? window.location.pathname.split('/')[2] : null

  const [form, setForm] = useState({ name: '', code: '', venue_type: '', capacity: '', is_active: true })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(isEdit)

  useEffect(() => {
    if (!localStorage.getItem('token')) { window.location.href = '/login'; return }
    if (isEdit && id) {
      api.get(`/venues/${id}`)
        .then((res) => {
          const v = res.data.data || res.data
          setForm({ name: v.name, code: v.code, venue_type: v.venue_type, capacity: v.capacity ?? '', is_active: v.is_active })
        })
        .catch(() => window.location.href = '/venues')
        .finally(() => setFetching(false))
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
        await api.put(`/venues/${id}`, form)
      } else {
        await api.post('/venues', form)
      }
      window.location.href = '/venues'
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save venue')
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
      <Head title={isEdit ? 'Edit Venue' : 'Create Venue'} />
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{isEdit ? 'Edit Venue' : 'Create Venue'}</h1>
      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
      <div className="bg-white rounded-lg shadow p-6 max-w-lg">
        <form onSubmit={handleSubmit}>
          <FormInput label="Name" name="name" value={form.name} onChange={handleChange} required />
          <FormInput label="Code" name="code" value={form.code} onChange={handleChange} required />
          <FormInput label="Type" name="venue_type" value={form.venue_type} onChange={handleChange} required />
          <FormInput label="Capacity" name="capacity" type="number" value={form.capacity} onChange={handleChange} />
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
            <a href="/venues" className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Cancel</a>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}
