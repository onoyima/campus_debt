import { useState, useEffect } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../../Components/AppLayout'
import FormInput from '../../Components/FormInput'
import api from '../../api'
import VeritasSpinner from '../../Components/VeritasSpinner'

export default function EventsForm() {
  const isEdit = window.location.pathname.includes('/edit')
  const id = isEdit ? window.location.pathname.split('/')[2] : null

  const [form, setForm] = useState({
    title: '', event_category_id: '', venue_id: '', organizer_id: '',
    start_date: '', end_date: '', attendance_open_time: '', attendance_close_time: '', is_mandatory: false,
  })
  const [venues, setVenues] = useState([])
  const [categories, setCategories] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(isEdit)

  useEffect(() => {
    if (!localStorage.getItem('token')) { window.location.href = '/login'; return }
    api.get('/venues').then((res) => setVenues(res.data.data || res.data)).catch(() => {})
    api.get('/event-categories').then((res) => setCategories(res.data.data || res.data)).catch(() => {})
    if (isEdit && id) {
      api.get(`/institutional-events/${id}`)
        .then((res) => {
          const e = res.data.data || res.data
          setForm({
            title: e.title ?? '',
            event_category_id: e.event_category_id ?? '',
            venue_id: e.venue_id ?? '',
            organizer_id: e.organizer_id ?? '',
            start_date: e.start_date ?? '',
            end_date: e.end_date ?? '',
            attendance_open_time: e.attendance_open_time ?? '',
            attendance_close_time: e.attendance_close_time ?? '',
            is_mandatory: e.is_mandatory ?? false,
          })
        })
        .catch(() => window.location.href = '/events')
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
        await api.put(`/institutional-events/${id}`, form)
      } else {
        await api.post('/institutional-events', form)
      }
      window.location.href = '/events'
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save event')
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
      <Head title={isEdit ? 'Edit Event' : 'Create Event'} />
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{isEdit ? 'Edit Event' : 'Create Event'}</h1>
      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
      <div className="bg-white rounded-lg shadow p-6 max-w-lg">
        <form onSubmit={handleSubmit}>
          <FormInput label="Title" name="title" value={form.title} onChange={handleChange} required />
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select name="event_category_id" value={form.event_category_id} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
              <option value="">Select Category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Venue</label>
            <select name="venue_id" value={form.venue_id} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
              <option value="">Select Venue</option>
              {venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <FormInput label="Organizer ID" name="organizer_id" value={form.organizer_id} onChange={handleChange} required />
          <FormInput label="Start Date" name="start_date" type="date" value={form.start_date} onChange={handleChange} required />
          <FormInput label="End Date" name="end_date" type="date" value={form.end_date} onChange={handleChange} required />
          <FormInput label="Attendance Open Time" name="attendance_open_time" type="time" value={form.attendance_open_time} onChange={handleChange} required />
          <FormInput label="Attendance Close Time" name="attendance_close_time" type="time" value={form.attendance_close_time} onChange={handleChange} required />
          <div className="mb-4">
            <label className="flex items-center">
              <input type="checkbox" name="is_mandatory" checked={form.is_mandatory} onChange={handleChange} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
              <span className="ml-2 text-sm text-gray-700">Mandatory</span>
            </label>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
              {loading ? (
                <><VeritasSpinner size="sm" /> Saving...</>
              ) : 'Save'}
            </button>
            <a href="/events" className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Cancel</a>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}
