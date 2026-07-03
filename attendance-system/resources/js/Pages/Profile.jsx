import { useState, useEffect } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../Components/AppLayout'
import api from '../api'

const DetailItem = ({ label, value, icon }) => (
  <div className="flex items-center gap-3 py-3 px-4 bg-gray-50 rounded-xl">
    {icon && <span className="text-lg shrink-0">{icon}</span>}
    <div className="min-w-0">
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{label}</p>
      <p className="text-sm font-medium text-gray-900 mt-0.5 truncate">{value || '—'}</p>
    </div>
  </div>
)

export default function Profile() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { window.location.href = '/login'; return }
    api.get('/me')
      .then((res) => setProfile(res.data.user || res.data))
      .catch(() => { window.location.href = '/login' })
      .finally(() => setLoading(false))
  }, [])

  const p = profile || {}
  const initials = ((p.fname?.[0] || '') + (p.lname?.[0] || '')).toUpperCase() || 'U'
  const avatarSrc = p.passport || null

  if (loading) {
    return (
      <AppLayout>
        <Head title="Profile" />
        <div className="max-w-3xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="flex items-center gap-5"><div className="w-20 h-20 rounded-full bg-gray-200" /><div className="space-y-2"><div className="h-5 bg-gray-200 rounded w-48" /><div className="h-4 bg-gray-200 rounded w-32" /></div></div>
            <div className="grid grid-cols-2 gap-4"><div className="h-16 bg-gray-200 rounded-xl col-span-2" /><div className="h-16 bg-gray-200 rounded-xl" /><div className="h-16 bg-gray-200 rounded-xl" /></div>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <Head title="Profile" />

      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-5">
          <div className="relative">
            {avatarSrc ? (
              <img src={avatarSrc} alt="" className="w-20 h-20 rounded-2xl object-cover ring-4 ring-white shadow-md" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-veritas-400 to-veritas-600 flex items-center justify-center text-2xl font-bold text-white shadow-md">{initials}</div>
            )}
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 border-2 border-white rounded-full" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{p.fname || ''} {p.mname || ''} {p.lname || ''}</h1>
            <p className="text-sm text-gray-400 capitalize">{p.type || 'user'} {p.matric_no ? <span className="text-gray-300">· {p.matric_no}</span> : ''}</p>
          </div>
          <div className="ml-auto hidden sm:block">
            <div className="px-3 py-1.5 bg-veritas-50 text-veritas-700 rounded-lg text-xs font-semibold capitalize">{p.type || 'user'}</div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-veritas-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
            Personal Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DetailItem label="Surname" value={p.lname} icon="👤" />
            <DetailItem label="First Name" value={p.fname} icon="👤" />
            <DetailItem label="Middle Name" value={p.mname} icon="👤" />
            <DetailItem label="Email" value={p.email} icon="📧" />
            <DetailItem label="Phone" value={p.phone} icon="📞" />
            <DetailItem label="ID" value={p.id} icon="🆔" />
            {p.matric_no && <DetailItem label="Matric No" value={p.matric_no} icon="🎓" />}
          </div>
        </div>

        {/* Account Info */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-veritas-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
            Account
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DetailItem label="Account Type" value={p.type || '—'} icon="🏷️" />
            <DetailItem label="Status" value="Active" icon="✅" />
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
