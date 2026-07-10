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
    title: '', event_category_id: '', venue_id: '', organizer_id: '', organizing_unit_type: '',
    start_date: '', end_date: '', attendance_open_time: '', attendance_close_time: '',
    clock_out_open_time: '', clock_out_close_time: '', grace_period_minutes: '', is_mandatory: false,
  })
  const [venues, setVenues] = useState([])
  const [categories, setCategories] = useState([])
  const [audienceGroups, setAudienceGroups] = useState([])
  const [audienceLoading, setAudienceLoading] = useState(true)
  const [audienceError, setAudienceError] = useState(null)
  const [selectedAudience, setSelectedAudience] = useState([])
  const [terminals, setTerminals] = useState([])
  const [selectedTerminals, setSelectedTerminals] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(isEdit)

  useEffect(() => {
    if (!localStorage.getItem('token')) { window.location.href = '/login'; return }
    api.get('/venues').then((res) => setVenues(res.data.data || res.data)).catch(() => {})
    api.get('/event-categories').then((res) => setCategories(res.data.data || res.data)).catch(() => {})
    api.get('/event-target-audiences').then((res) => { setAudienceGroups(res.data.data || []); setAudienceLoading(false) }).catch(() => { setAudienceError('Failed to load target audience options.'); setAudienceLoading(false) })
    api.get('/terminals').then((res) => setTerminals(res.data.data || [])).catch(() => {})

    if (isEdit && id) {
      api.get(`/institutional-events/${id}?include=targetGroups,assignedTerminals`)
        .then((res) => {
          const e = res.data.data || res.data
          const fmtDate = (d) => d ? d.substring(0, 10) : ''
          const fmtTime = (t) => t ? t.substring(0, 5) : ''
          setForm({
            title: e.title ?? '',
            event_category_id: e.event_category_id ?? '',
            venue_id: e.venue_id ?? '',
            organizer_id: e.organizer_id ?? '', organizing_unit_type: e.organizing_unit_type ?? '',
            start_date: fmtDate(e.start_date),
            end_date: fmtDate(e.end_date),
            attendance_open_time: fmtTime(e.attendance_open_time),
            attendance_close_time: fmtTime(e.attendance_close_time),
            clock_out_open_time: fmtTime(e.clock_out_open_time),
            clock_out_close_time: fmtTime(e.clock_out_close_time),
            grace_period_minutes: e.grace_period_minutes ?? '', is_mandatory: e.is_mandatory ?? false,
          })
          if (e.target_groups && e.target_groups.length > 0) {
            setSelectedAudience(
              e.target_groups.map((g) => ({
                target_type: g.target_type,
                target_id: g.target_id,
              }))
            )
          }
          if (e.assigned_terminals && e.assigned_terminals.length > 0) {
            setSelectedTerminals(e.assigned_terminals.map((t) => t.id))
          }
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

  const toggleAudience = (option) => {
    setSelectedAudience((prev) => {
      const key = `${option.target_type}-${option.target_id ?? ''}`
      const exists = prev.some(
        (a) => a.target_type === option.target_type && a.target_id === (option.target_id ?? null)
      )
      if (exists) {
        return prev.filter(
          (a) => !(a.target_type === option.target_type && a.target_id === (option.target_id ?? null))
        )
      }
      return [...prev, { target_type: option.target_type, target_id: option.target_id ?? null }]
    })
  }

  const isSelected = (option) => {
    return selectedAudience.some(
      (a) => a.target_type === option.target_type && a.target_id === (option.target_id ?? null)
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const payload = {
        ...form,
        organizer_id: form.organizer_id || null,
        grace_period_minutes: form.grace_period_minutes ? parseInt(form.grace_period_minutes, 10) : null,
        clock_out_open_time: form.clock_out_open_time || null,
        clock_out_close_time: form.clock_out_close_time || null,
        target_audience: selectedAudience.length > 0 ? selectedAudience : [],
        terminal_ids: selectedTerminals.length > 0 ? selectedTerminals : [],
      }
      if (isEdit) {
        await api.put(`/institutional-events/${id}`, payload)
      } else {
        await api.post('/institutional-events', payload)
      }
      window.location.href = '/events'
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save event')
    } finally {
      setLoading(false)
    }
  }

  const categoriesColors = [
    { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', ring: 'ring-blue-500/30' },
    { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', ring: 'ring-green-500/30' },
    { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', ring: 'ring-purple-500/30' },
    { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', ring: 'ring-amber-500/30' },
    { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', ring: 'ring-rose-500/30' },
    { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700', ring: 'ring-cyan-500/30' },
    { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700', ring: 'ring-teal-500/30' },
    { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', ring: 'ring-indigo-500/30' },
  ]

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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <form onSubmit={handleSubmit}>
            <FormInput label="Title" name="title" value={form.title} onChange={handleChange} required />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select name="event_category_id" value={form.event_category_id} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-veritas-500 focus:border-veritas-500">
                  <option value="">Select Category</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Venue</label>
                <select name="venue_id" value={form.venue_id} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-veritas-500 focus:border-veritas-500">
                  <option value="">Select Venue</option>
                  {venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Organizing Unit</label>
                <select name="organizing_unit_type" value={form.organizing_unit_type} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-veritas-500 focus:border-veritas-500">
                  <option value="">Select Organizing Unit</option>
                  <option value="university_management">University Management</option>
                  <option value="vice_chancellor">Vice Chancellor</option>
                  <option value="registrar">Registrar</option>
                  <option value="director_of_research">Director of Research</option>
                  <option value="dean">Dean</option>
                  <option value="hod">Head of Department</option>
                  <option value="director">Director</option>
                  <option value="secretary">Secretary</option>
                  <option value="convener">Convener</option>
                </select>
              </div>
              <FormInput label="Start Date" name="start_date" type="date" value={form.start_date} onChange={handleChange} required />
              <FormInput label="End Date" name="end_date" type="date" value={form.end_date} onChange={handleChange} required />
              <FormInput label="Attendance Open Time" name="attendance_open_time" type="time" value={form.attendance_open_time} onChange={handleChange} required />
              <FormInput label="Attendance Close Time" name="attendance_close_time" type="time" value={form.attendance_close_time} onChange={handleChange} required />
              <FormInput label="Clock-out Open Time" name="clock_out_open_time" type="time" value={form.clock_out_open_time} onChange={handleChange} />
              <FormInput label="Event Closure Time" name="clock_out_close_time" type="time" value={form.clock_out_close_time} onChange={handleChange} />
              <FormInput label="Grace Period (minutes)" name="grace_period_minutes" type="number" min="0" value={form.grace_period_minutes} onChange={handleChange} />
            </div>
            <div className="mb-4 mt-4">
              <label className="flex items-center">
                <input type="checkbox" name="is_mandatory" checked={form.is_mandatory} onChange={handleChange} className="rounded border-gray-300 text-veritas-600 focus:ring-veritas-500" />
                <span className="ml-2 text-sm text-gray-700">Mandatory Attendance</span>
              </label>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Terminals</label>
              <select
                multiple
                value={selectedTerminals.map(String)}
                onChange={(e) => {
                  const opts = Array.from(e.target.options).filter((o) => o.selected).map((o) => Number(o.value))
                  setSelectedTerminals(opts)
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-veritas-500 focus:border-veritas-500 min-h-[100px]">
                {terminals.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.device_id} {t.ip_address ? `(${t.ip_address})` : ''} - {t.clocking_mode}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                {selectedTerminals.length > 0
                  ? `${selectedTerminals.length} terminal(s) selected`
                  : 'Leave empty to use venue-based terminals'}
              </p>
            </div>
            <div className="flex gap-3 mt-6">
              <button type="submit" disabled={loading} className="px-4 py-2 bg-veritas-500 text-white rounded-lg hover:bg-veritas-600 disabled:opacity-50 flex items-center gap-2">
                {loading ? (
                  <><VeritasSpinner size="sm" /> Saving...</>
                ) : 'Save Event'}
              </button>
              <a href="/events" className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Cancel</a>
            </div>
          </form>
        </div>

        {/* Target Audience Panel */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Target Audience</h2>
            <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-md">{selectedAudience.length} selected</span>
          </div>
          <p className="text-xs text-gray-400 mb-4">Select who should attend this event.</p>

          {audienceLoading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-veritas-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-gray-400">Loading options...</p>
            </div>
          ) : audienceError ? (
            <div className="text-center py-8">
              <p className="text-xs text-red-500">{audienceError}</p>
            </div>
          ) : audienceGroups.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-xs text-gray-400">No audience options available.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
              {audienceGroups.map((group, gi) => {
                const cc = categoriesColors[gi % categoriesColors.length]
                return (
                  <div key={group.category} className="border border-gray-100 rounded-xl overflow-hidden">
                    <div className={`px-3 py-2 ${cc.bg} ${cc.text} text-xs font-semibold uppercase tracking-wider`}>
                      {group.category}
                      <span className="ml-2 font-normal opacity-60">{group.type}</span>
                    </div>
                    <div className="divide-y divide-gray-50 max-h-48 overflow-y-auto">
                      {group.options.map((opt) => {
                        const sel = isSelected(opt)
                        return (
                          <label
                            key={`${opt.target_type}-${opt.target_id ?? ''}`}
                            className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors text-sm ${
                              sel ? `${cc.bg} ${cc.text}` : 'text-gray-600 hover:bg-gray-50'
                            }`}>
                            <input
                              type="checkbox"
                              checked={sel}
                              onChange={() => toggleAudience(opt)}
                              className="rounded border-gray-300 text-veritas-600 focus:ring-veritas-500 shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{opt.label}</p>
                              {opt.description && (
                                <p className="text-xs text-gray-400 truncate">{opt.description}</p>
                              )}
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {selectedAudience.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Selected ({selectedAudience.length})</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedAudience.map((a) => (
                  <span key={`${a.target_type}-${a.target_id ?? ''}`}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-veritas-50 text-veritas-700 text-xs font-medium rounded-full">
                    {a.target_type.replace(/_/g, ' ')}
                    <button onClick={() => toggleAudience(a)} className="hover:text-red-500">&times;</button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
