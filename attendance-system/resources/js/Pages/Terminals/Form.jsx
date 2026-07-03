import { useState, useEffect } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../../Components/AppLayout'
import FormInput from '../../Components/FormInput'
import api from '../../api'

export default function TerminalsForm() {
  const isEdit = window.location.pathname.includes('/edit')
  const id = isEdit ? window.location.pathname.split('/')[2] : null

  const [form, setForm] = useState({
    venue_id: '', device_id: '', device_certificate: '', terminal_type: 'dedicated', os: '', firmware_version: '', is_active: true,
  })
  const [venues, setVenues] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(isEdit)

  useEffect(() => {
    if (!localStorage.getItem('token')) { window.location.href = '/login'; return }
    api.get('/venues').then((res) => setVenues(res.data.data || res.data)).catch(() => {})
    if (isEdit && id) {
      api.get(`/terminals/${id}`)
        .then((res) => {
          const d = res.data.data || res.data
          setForm({
            venue_id: d.venue_id ?? '',
            device_id: d.device_id ?? '',
            device_certificate: d.device_certificate ?? '',
            terminal_type: d.terminal_type ?? 'dedicated',
            os: d.os ?? '',
            firmware_version: d.firmware_version ?? '',
            is_active: d.is_active ?? true,
          })
        })
        .catch(() => window.location.href = '/terminals')
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
        await api.put(`/terminals/${id}`, form)
      } else {
        await api.post('/terminals', form)
      }
      window.location.href = '/terminals'
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save terminal')
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
      <Head title={isEdit ? 'Edit Terminal' : 'Create Terminal'} />
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{isEdit ? 'Edit Terminal' : 'Create Terminal'}</h1>
      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
      <div className="bg-white rounded-lg shadow p-6 max-w-lg">
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Venue</label>
            <select name="venue_id" value={form.venue_id} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
              <option value="">Select Venue</option>
              {venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <FormInput label="Device ID" name="device_id" value={form.device_id} onChange={handleChange} required />
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Device Certificate</label>
            <textarea name="device_certificate" value={form.device_certificate} onChange={handleChange} rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Terminal Type</label>
            <select name="terminal_type" value={form.terminal_type} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
              <option value="dedicated">Dedicated</option>
              <option value="mobile">Mobile</option>
            </select>
          </div>
          <FormInput label="OS" name="os" value={form.os} onChange={handleChange} />
          <FormInput label="Firmware Version" name="firmware_version" value={form.firmware_version} onChange={handleChange} />
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
            <a href="/terminals" className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Cancel</a>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}
