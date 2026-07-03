import { useState, useEffect } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../Components/AppLayout'
import api from '../api'

const StatCard = ({ title, value, subtitle, icon: Icon, color = 'veritas', index }) => {
  const colorMap = {
    veritas: { bg: 'bg-veritas-50', text: 'text-veritas-700', ring: 'ring-veritas-500/20', bar: 'bg-veritas-500' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', ring: 'ring-blue-500/20', bar: 'bg-blue-500' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-500/20', bar: 'bg-amber-500' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-700', ring: 'ring-rose-500/20', bar: 'bg-rose-500' },
    violet: { bg: 'bg-violet-50', text: 'text-violet-700', ring: 'ring-violet-500/20', bar: 'bg-violet-500' },
    cyan: { bg: 'bg-cyan-50', text: 'text-cyan-700', ring: 'ring-cyan-500/20', bar: 'bg-cyan-500' },
  }
  const c = colorMap[color] || colorMap.veritas
  const numeric = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]/g, '')) || 0
  const barWidth = `${Math.min(100, Math.max(5, (numeric / 5000) * 100))}%`

  return (
    <div
      className={`group relative bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg hover:shadow-${color}-500/5 transition-all duration-500 hover:-translate-y-1 cursor-default overflow-hidden`}
      style={{ animation: `fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.1}s both` }}>
      <div className="absolute top-0 right-0 w-32 h-32 -translate-y-8 translate-x-8">
        <div className={`w-full h-full rounded-full ${c.bg} opacity-30 blur-2xl`} />
      </div>
      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <div className={`p-2.5 rounded-xl ${c.bg} ${c.text} ring-1 ${c.ring}`}>
            <Icon className="w-5 h-5" />
          </div>
          <span className="text-2xl font-bold tabular-nums text-gray-900">{value}</span>
        </div>
        <p className="text-sm font-semibold text-gray-900 mb-0.5">{title}</p>
        {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        <div className="mt-4 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full ${c.bar} rounded-full transition-all duration-1000 ease-out`} style={{ width: barWidth }} />
        </div>
      </div>
    </div>
  )
}

const ActivityItem = ({ icon, label, time, color = 'gray' }) => (
  <div className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0 group hover:bg-gray-50/50 px-3 -mx-3 rounded-xl transition-colors">
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${color === 'emerald' ? 'bg-emerald-50 text-emerald-600' : color === 'amber' ? 'bg-amber-50 text-amber-600' : color === 'blue' ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-500'}`}>
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-gray-700 truncate">{label}</p>
      <p className="text-xs text-gray-400">{time}</p>
    </div>
  </div>
)

const QuickActionCard = ({ label, href, icon: Icon, desc }) => (
  <a href={href}
    className="relative group flex items-start gap-4 p-4 rounded-xl bg-white border border-gray-100 hover:border-veritas-200 hover:shadow-md hover:shadow-veritas-500/5 transition-all duration-300">
    <div className="p-2.5 rounded-xl bg-veritas-50 text-veritas-600 shrink-0 group-hover:scale-110 group-hover:bg-veritas-100 transition-all duration-300">
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <p className="text-sm font-semibold text-gray-900 group-hover:text-veritas-700 transition-colors">{label}</p>
      {desc && <p className="text-xs text-gray-400 mt-0.5">{desc}</p>}
    </div>
    <svg className="w-4 h-4 text-gray-300 group-hover:text-veritas-400 group-hover:translate-x-0.5 transition-all ml-auto mt-1.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
  </a>
)

function OverviewIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg> }
function TerminalIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" /></svg> }
function CalendarIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg> }
function ClipboardIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" /></svg> }
function ScaleIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.589-1.202L18.75 4.971zm-13.5 0A48.5 48.5 0 0112 4.5c2.291 0 4.545.16 6.75.47m-13.5 0l-2.62 10.726c-.122.499.106 1.028.589 1.202a5.989 5.989 0 002.031.352 5.989 5.989 0 002.031-.352c.483-.174.711-.703.589-1.202L5.25 4.971z" /></svg> }
function AcademicIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" /></svg> }

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [timeAgo, setTimeAgo] = useState('just now')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { window.location.href = '/login'; return }
    fetchStats()
    const interval = setInterval(fetchStats, 20000)
    return () => clearInterval(interval)
  }, [])

  const fetchStats = () => {
    api.get('/dashboard/stats')
      .then((res) => { setStats(res.data); setTimeAgo(new Date().toLocaleTimeString()) })
      .catch((err) => {
        if (err.response?.status !== 401) {
          setError(err.response?.data?.message || 'Failed to load stats')
        }
      })
      .finally(() => setLoading(false))
  }

  const cards = [
    { title: 'Total Venues', value: stats?.venues ?? 0, subtitle: 'Registered locations', icon: OverviewIcon, color: 'veritas' },
    { title: 'Active Terminals', value: stats?.active_terminals ?? 0, subtitle: 'Hardware online', icon: TerminalIcon, color: 'blue' },
    { title: 'Sessions Today', value: stats?.sessions_today ?? 0, subtitle: 'Scheduled sessions', icon: CalendarIcon, color: 'amber' },
    { title: 'Records Today', value: stats?.records_today ?? 0, subtitle: 'Attendance captured', icon: ClipboardIcon, color: 'violet' },
    { title: 'Outstanding Debts', value: `₦${(stats?.outstanding_debts ?? 0).toLocaleString()}`, subtitle: 'Unpaid penalties', icon: ScaleIcon, color: 'rose' },
    { title: 'Eligible Students', value: stats?.eligible_students ?? 0, subtitle: 'Exam cleared', icon: AcademicIcon, color: 'cyan' },
  ]

  const actions = [
    { label: 'New Session', href: '/sessions/create', icon: CalendarIcon, desc: 'Schedule an attendance session' },
    { label: 'Add Venue', href: '/venues/create', icon: OverviewIcon, desc: 'Register a new venue' },
    { label: 'View Records', href: '/attendance-records', icon: ClipboardIcon, desc: 'Browse attendance logs' },
    { label: 'Biometrics', href: '/biometrics', icon: TerminalIcon, desc: 'Manage biometric devices' },
  ]

  const activities = [
    { icon: '📱', label: 'Biometric enrollment completed', time: '2 min ago', color: 'emerald' },
    { icon: '📋', label: 'New attendance record batch synced', time: '5 min ago', color: 'blue' },
    { icon: '💰', label: 'Debt payment verified', time: '12 min ago', color: 'amber' },
    { icon: '🎓', label: 'Eligibility check run for 42 students', time: '18 min ago', color: 'emerald' },
    { icon: '⚠️', label: 'Terminal T-003 went offline', time: '25 min ago', color: 'amber' },
  ]

  return (
    <AppLayout>
      <Head title="Dashboard" />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-veritas-500 to-veritas-700 flex items-center justify-center shadow-lg shadow-veritas-500/20">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
              <p className="text-sm text-gray-400 mt-0.5">Attendance system overview</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-100 rounded-lg text-xs text-gray-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Updated {timeAgo}
            </div>
            <button onClick={fetchStats} className="p-2 rounded-lg bg-white border border-gray-100 text-gray-400 hover:text-veritas-600 hover:border-veritas-200 hover:bg-veritas-50 transition-all">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-100" />
                  <div className="flex-1">
                    <div className="h-3 bg-gray-100 rounded w-1/3 mb-2" />
                    <div className="h-4 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-8 bg-gray-100 rounded w-3/4 mb-4" />
                <div className="h-2 bg-gray-100 rounded w-full" />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="bg-gradient-to-r from-red-50 to-red-50/50 border border-red-200 rounded-2xl p-6 mb-6 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-red-700 text-sm font-medium flex-1">{error}</p>
            <button onClick={fetchStats} className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors">Retry</button>
          </div>
        )}

        {/* Stats Grid */}
        {!loading && !error && stats && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
              {cards.map((card, i) => (
                <StatCard key={card.title} {...card} index={i} />
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Quick Actions */}
              <div className="lg:col-span-2 space-y-5">
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-base font-semibold text-gray-900">Quick Actions</h2>
                    <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-md">Shortcuts</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {actions.map((action) => (
                      <QuickActionCard key={action.href} {...action} />
                    ))}
                  </div>
                </div>

                {/* System Health */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-base font-semibold text-gray-900">System Health</h2>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                      <span className="text-xs text-gray-400">All systems nominal</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { label: 'API', status: 'Operational', color: 'green' },
                      { label: 'Database', status: 'Connected', color: 'green' },
                      { label: 'Biometrics', status: 'Online', color: 'green' },
                      { label: 'Sync', status: 'Active', color: 'green' },
                    ].map((s) => (
                      <div key={s.label} className="text-center p-3 rounded-xl bg-gray-50">
                        <p className="text-xs font-semibold text-gray-500 mb-1">{s.label}</p>
                        <div className="flex items-center justify-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full bg-${s.color}-400`} />
                          <span className="text-sm font-medium text-gray-900">{s.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-gray-900">Activity</h2>
                  <span className="text-xs text-veritas-600 font-medium bg-veritas-50 px-2 py-1 rounded-md">Live</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {activities.map((a, i) => (
                    <ActivityItem key={i} {...a} />
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Empty State */}
        {!loading && !error && !stats && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-2xl bg-veritas-50 flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-veritas-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No Data Available</h3>
            <p className="text-sm text-gray-400 max-w-xs">Stats will appear here once the system starts recording attendance.</p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </AppLayout>
  )
}
