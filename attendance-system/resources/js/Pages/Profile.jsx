import { useState, useEffect } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../Components/AppLayout'
import VeritasSpinner from '../Components/VeritasSpinner'
import api from '../api'

function InfoCard({ icon, label, value }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-start gap-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="w-9 h-9 rounded-lg bg-veritas-50 flex items-center justify-center text-base shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium text-gray-900 mt-0.5 break-words">{value || '—'}</p>
      </div>
    </div>
  )
}

function StatBadge({ label, value, color }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 text-center shadow-sm">
      <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mt-1">{label}</p>
    </div>
  )
}

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

  if (loading) {
    return (
      <AppLayout>
        <VeritasSpinner text="Loading profile..." />
      </AppLayout>
    )
  }

  const p = profile || {}
  const isStudent = p.type === 'student'
  const [imgError, setImgError] = useState(false)
  const initials = ((p.fname?.[0] || '') + (p.lname?.[0] || '')).toUpperCase() || 'U'
  const avatarSrc = p.passport || null
  const fullName = [p.title, p.fname, p.mname, p.lname].filter(Boolean).join(' ')

  return (
    <AppLayout>
      <Head title="Profile" />

      {/* Cover */}
      <div className="relative mb-20">
        <div className="h-48 sm:h-56 rounded-2xl bg-gradient-to-br from-veritas-600 via-veritas-500 to-veritas-400 shadow-lg overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />
        </div>
        <div className="absolute -bottom-12 left-6 sm:left-8 flex items-end gap-5">
          <div className="relative">
            {avatarSrc && !imgError ? (
              <img src={avatarSrc} alt={fullName} onError={() => setImgError(true)} className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover ring-4 ring-white shadow-xl" />
            ) : (
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-veritas-400 to-veritas-600 flex items-center justify-center text-3xl sm:text-4xl font-bold text-white ring-4 ring-white shadow-xl">
                {initials}
              </div>
            )}
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-green-400 border-2 border-white rounded-full" />
          </div>
          <div className="pb-1">
            <h1 className="text-xl sm:text-2xl font-bold text-white drop-shadow-sm">{fullName}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="px-2.5 py-0.5 bg-white/20 text-white text-[11px] font-semibold rounded-full uppercase tracking-wider backdrop-blur-sm">
                {isStudent ? 'Student' : 'Staff'}
              </span>
              {p.matric_no && (
                <span className="text-white/70 text-xs font-mono">{p.matric_no}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {isStudent ? (
            <>
              <StatBadge label="Level" value={p.level} />
              <StatBadge label="Program" value={p.program ? p.program.replace(/.*\(([^)]+)\).*|.*/, '$1') || '—' : '—'} />
              <StatBadge label="Department" value={p.department ? p.department.split(' ').slice(0, 2).join(' ') : '—'} />
              <StatBadge label="Faculty" value={p.faculty ? p.faculty.split(' ').slice(0, 2).join(' ') : '—'} />
            </>
          ) : (
            <>
              <StatBadge label="Roles" value={p.roles?.length || 0} />
              <StatBadge label="Status" value={p.staff_status === 1 ? 'Active' : p.staff_status === 0 ? 'Inactive' : '—'} />
              <StatBadge label="Gender" value={p.gender || '—'} />
              <StatBadge label="Title" value={p.title || '—'} />
            </>
          )}
        </div>

        {/* Academic / Professional */}
        {isStudent && (p.program || p.department || p.faculty) && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-veritas-50 flex items-center justify-center text-xs">🎓</span>
              Academic Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <InfoCard icon="📖" label="Program of Study" value={p.program} />
              <InfoCard icon="🏛️" label="Department" value={p.department} />
              <InfoCard icon="🏫" label="Faculty" value={p.faculty} />
            </div>
          </div>
        )}

        {!isStudent && p.roles?.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-veritas-50 flex items-center justify-center text-xs">🔐</span>
              System Roles
            </h2>
            <div className="flex flex-wrap gap-2">
              {p.roles.map((role, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-semibold border border-amber-100">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  {role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Personal Information */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-5 h-5 rounded-md bg-veritas-50 flex items-center justify-center text-xs">👤</span>
            Personal Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {!isStudent && <InfoCard icon="🎖️" label="Title" value={p.title} />}
            <InfoCard icon="👤" label="Surname" value={p.lname} />
            <InfoCard icon="👤" label="First Name" value={p.fname} />
            <InfoCard icon="👤" label="Middle Name" value={p.mname} />
            {!isStudent && <InfoCard icon="👤" label="Maiden Name" value={p.maiden_name} />}
            <InfoCard icon="⚥" label="Gender" value={p.gender} />
            <InfoCard icon="🎂" label="Date of Birth" value={p.dob} />
            <InfoCard icon="💍" label="Marital Status" value={p.marital_status} />
            <InfoCard icon="⛪" label="Religion" value={p.religion} />
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-5 h-5 rounded-md bg-veritas-50 flex items-center justify-center text-xs">📬</span>
            Contact & Address
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <InfoCard icon="📧" label="Email" value={p.email} />
            {!isStudent && <InfoCard icon="📧" label="Personal Email" value={p.p_email} />}
            <InfoCard icon="📞" label="Phone" value={p.phone} />
            <InfoCard icon="📍" label="Address" value={p.address} />
            <InfoCard icon="🏙️" label="City" value={p.city} />
            <InfoCard icon="🌍" label="State" value={p.state} />
            <InfoCard icon="🌐" label="Country" value={p.country} />
            <InfoCard icon="📍" label="LGA" value={p.lga} />
          </div>
        </div>

        {/* Account */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-5 h-5 rounded-md bg-veritas-50 flex items-center justify-center text-xs">⚙️</span>
            Account
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <InfoCard icon="🆔" label="User ID" value={`#${p.id}`} />
            <InfoCard icon="🏷️" label="Account Type" value={isStudent ? 'Student' : 'Staff'} />
            <InfoCard icon="✅" label="Status" value={p.staff_status === 0 ? 'Inactive' : 'Active'} />
          </div>
        </div>
      </div>
    </AppLayout>
  )
}