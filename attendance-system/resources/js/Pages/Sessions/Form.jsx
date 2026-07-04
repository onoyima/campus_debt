import { useState, useEffect } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../../Components/AppLayout'
import FormInput from '../../Components/FormInput'
import api from '../../api'
import VeritasSpinner from '../../Components/VeritasSpinner'

export default function SessionsForm() {
  const isEdit = window.location.pathname.includes('/edit')
  const id = isEdit ? window.location.pathname.split('/')[2] : null

  const [form, setForm] = useState({ staff_id: '', session_type: '', session_date: '', opens_at: '', closes_at: '', venue_id: '' })
  const [venues, setVenues] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(isEdit)

  useEffect(() => {
    if (!localStorage.getItem('token')) { window.location.href = '/login'; return }
    api.get('/venues').then((res) => setVenues(res.data.data || res.data)).catch(() => {})
    if (isEdit && id) {
      api.get(`/sessions/${id}`)
        .then((res) => {
          const s = res.data.data || res.data
          setForm({
            staff_id: s.staff_id ?? '',
            session_type: s.session_type ?? '',
            session_date: s.session_date ?? '',
            opens_at: s.opens_at ?? '',
            closes_at: s.closes_at ?? '',
            venue_id: s.venue_id ?? '',
          })
        })
        .catch(() => window.location.href = '/sessions')
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
        await api.put(`/sessions/${id}`, form)
      } else {
        await api.post('/sessions', form)
      }
      window.location.href = '/sessions'
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save session')
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
      <Head title={isEdit ? 'Edit Session' : 'Create Session'} />
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{isEdit ? 'Edit Session' : 'Create Session'}</h1>
      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
      <div className="bg-white rounded-lg shadow p-6 max-w-lg">
        <form onSubmit={handleSubmit}>
          <FormInput label="Staff ID" name="staff_id" value={form.staff_id} onChange={handleChange} required />
          <FormInput label="Session Type" name="session_type" value={form.session_type} onChange={handleChange} required />
          <FormInput label="Session Date" name="session_date" type="date" value={form.session_date} onChange={handleChange} required />
          <FormInput label="Opens At" name="opens_at" type="time" value={form.opens_at} onChange={handleChange} required />
          <FormInput label="Closes At" name="closes_at" type="time" value={form.closes_at} onChange={handleChange} required />
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Venue</label>
            <select name="venue_id" value={form.venue_id} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
              <option value="">Select Venue</option>
              {venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
              {loading ? (
                <><VeritasSpinner size="sm" /> Saving...</>
              ) : 'Save'}
            </button>
            <a href="/sessions" className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Cancel</a>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}
