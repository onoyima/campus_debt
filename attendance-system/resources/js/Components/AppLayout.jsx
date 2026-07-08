import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import api from '../api'

const linkIcons = {
  'Dashboard': 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  'Venues': 'M15 10.5a3 3 0 11-6 0 3 3 0 016 0zM19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z',
  'Terminals': 'M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25',
  'Terminal Logs': 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z',
  'Device Monitor': 'M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605',
  'Live Feed': 'M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605',
  'Sessions': 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5',
  'Records': 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z',
  'Excuses': 'M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z',
  'Staff Clocking': 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z',
  'Biometrics': 'M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3',
  'Events': 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5',
  'Categories': 'M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z',
  'Debts': 'M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  'Debt Recovery': 'M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182',
  'Penalties': 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
  'Payments': 'M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v9.75m0-9.75v.375c0 .621.504 1.125 1.125 1.125h.75M2.25 6h18m0 9.75h-18m0 0v.375c0 .621.504 1.125 1.125 1.125h.75',
  'Eligibility': 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  'Eligibility Engine': 'M4.5 12a7.5 7.5 0 0015 0m-15 0a7.5 7.5 0 1115 0m-15 0H3m16.5 0H21m-1.5 0H12m-8.457 3.077l1.41-.513m14.095-5.13l1.41-.513M5.106 17.785l1.15-.964m11.49-9.642l1.149-.964M7.501 19.795l.75-1.3m7.5-12.99l.75-1.3m-6.063 16.658l.26-1.477m2.605-14.772l.26-1.477m0 17.726l-.26-1.477M10.698 4.614l-.26-1.477M16.5 19.794l-.75-1.299M7.5 4.205L12 12m6.894 5.785l-1.149-.964M6.256 7.178l-1.15-.964m15.352 8.864l-1.41-.513M4.954 9.435l-1.41-.514M12.002 12l-3.75 6.495',
  'Exam Clearance': 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  'Hall Verification': 'M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z',
  'Staff Compliance': 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z',
  'QA Dashboard': 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z',
  'Roles': 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
  'Staff Roles': 'M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z',
  'Notifications': 'M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0',
  'Bulk Upload': 'M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5',
  'Offline Sync': 'M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182',
  'Audit Log': 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  'Student Dashboard': 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z',
  'Exeats': 'M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9',
  'Staff Personal': 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z',
}

const allNavSections = [
  // ── GHOST ADMIN ONLY ──
  { label: 'Ghost Admin', icon: linkIcons['Eligibility'], links: [
    { href: '/ghost/results', label: 'Student Results', icon: linkIcons['Eligibility'] },
  ], userTypes: ['staff'], ghostOnly: true },
  // ── STAFF WITH ROLES: admin overview ──
  { label: 'Dashboard', icon: linkIcons['Dashboard'], links: [
    { href: '/dashboard', label: 'System Overview', icon: linkIcons['Dashboard'] },
  ], userTypes: ['staff'], requiredRoles: [], requireAnyRole: true },
  // ── ALL STAFF: personal dashboard ──
  { label: 'My Dashboard', icon: linkIcons['Staff Personal'], links: [
    { href: '/staff-dashboard', label: 'My Dashboard', icon: linkIcons['Staff Personal'] },
    { href: '/staff/courses', label: 'My Courses', icon: linkIcons['Sessions'] },
  ], userTypes: ['staff'], requiredRoles: [] },
  // ── ADMIN SECTIONS (role-gated) ──
  { label: 'Staff Admin', icon: linkIcons['Staff Personal'], links: [
    { href: '/staff-clockings', label: 'Staff Clockings', icon: linkIcons['Staff Clocking'] },
    { href: '/biometrics', label: 'Biometrics', icon: linkIcons['Biometrics'] },
    { href: '/course-assignments', label: 'Course Assignments', icon: linkIcons['Sessions'] },
    { href: '/portal-roles', label: 'Portal Roles', icon: linkIcons['Staff Roles'] },
  ], userTypes: ['staff'], requiredRoles: ['system_administrator'] },
  { label: 'Infrastructure', icon: linkIcons['Venues'], links: [
    { href: '/venues', label: 'Venues', icon: linkIcons['Venues'] },
    { href: '/terminals', label: 'Terminals', icon: linkIcons['Terminals'] },
    { href: '/terminal-logs', label: 'Terminal Logs', icon: linkIcons['Terminal Logs'] },
    { href: '/device-monitor', label: 'Device Monitor', icon: linkIcons['Device Monitor'] },
    { href: '/live-feed', label: 'Live Feed', icon: linkIcons['Live Feed'] },
  ], userTypes: ['staff'], requiredRoles: ['system_administrator'] },
  { label: 'Attendance', icon: linkIcons['Records'], links: [
    { href: '/sessions', label: 'Sessions', icon: linkIcons['Sessions'] },
    { href: '/sessions/upload', label: 'Bulk Upload', icon: linkIcons['Bulk Upload'] },
    { href: '/attendance-records', label: 'Records', icon: linkIcons['Records'] },
    { href: '/excuses', label: 'Excuses', icon: linkIcons['Excuses'] },
  ], userTypes: ['staff'], requiredRoles: ['examination_officer', 'qa_officer', 'system_administrator'] },
  { label: 'Events', icon: linkIcons['Events'], links: [
    { href: '/events', label: 'Events', icon: linkIcons['Events'] },
    { href: '/event-categories', label: 'Categories', icon: linkIcons['Categories'] },
  ], userTypes: ['staff'], requiredRoles: ['event_convener', 'system_administrator'] },
  { label: 'Finance', icon: linkIcons['Debts'], links: [
    { href: '/debts', label: 'Debts', icon: linkIcons['Debts'] },
    { href: '/debts/upload', label: 'Bulk Upload', icon: linkIcons['Bulk Upload'] },
    { href: '/debts/recovery', label: 'Debt Recovery', icon: linkIcons['Debt Recovery'] },
    { href: '/penalties', label: 'Penalties', icon: linkIcons['Penalties'] },
    { href: '/payments', label: 'Payments', icon: linkIcons['Payments'] },
  ], userTypes: ['staff'], requiredRoles: ['bursary_officer', 'debt_recovery_officer', 'system_administrator'] },
  { label: 'Exams', icon: linkIcons['Eligibility'], links: [
    { href: '/eligibility', label: 'Eligibility', icon: linkIcons['Eligibility'] },
    { href: '/eligibility/engine', label: 'Eligibility Engine', icon: linkIcons['Eligibility Engine'] },
    { href: '/exam-clearance', label: 'Exam Clearance', icon: linkIcons['Exam Clearance'] },
    { href: '/exam-clearance/verify', label: 'Hall Verification', icon: linkIcons['Hall Verification'] },
  ], userTypes: ['staff'], requiredRoles: ['examination_officer', 'qa_officer', 'system_administrator'] },
  { label: 'Compliance', icon: linkIcons['Staff Compliance'], links: [
    { href: '/staff-compliance', label: 'Staff Compliance', icon: linkIcons['Staff Compliance'] },
    { href: '/quality-assurance', label: 'QA Dashboard', icon: linkIcons['QA Dashboard'] },
  ], userTypes: ['staff'], requiredRoles: ['examination_officer', 'qa_officer', 'system_administrator'] },
  { label: 'System', icon: linkIcons['Roles'], links: [
    { href: '/audit-logs', label: 'Audit Log', icon: linkIcons['Audit Log'] },
    { href: '/roles', label: 'Roles', icon: linkIcons['Roles'] },
    { href: '/staff-roles', label: 'Staff Roles', icon: linkIcons['Staff Roles'] },
    { href: '/notifications', label: 'Notifications', icon: linkIcons['Notifications'] },
    { href: '/offline-sync', label: 'Offline Sync', icon: linkIcons['Offline Sync'] },
  ], userTypes: ['staff'], requiredRoles: ['system_administrator'] },
  // ── STUDENT SECTIONS ──
  { label: 'My Dashboard', icon: linkIcons['Student Dashboard'], links: [
    { href: '/student-dashboard', label: 'My Dashboard', icon: linkIcons['Student Dashboard'] },
    { href: '/student/my-attendance', label: 'My Attendance', icon: linkIcons['Records'] },
    { href: '/student/my-debts', label: 'My Debts', icon: linkIcons['Debts'] },
    { href: '/exeats', label: 'Exeats', icon: linkIcons['Exeats'] },
    { href: '/biometrics', label: 'Biometrics', icon: linkIcons['Biometrics'] },
  ], userTypes: ['student'], requiredRoles: [] },
]

function Clock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return (
    <div className="flex items-center gap-2 text-xs text-gray-400 tabular-nums">
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      <span>{days[time.getDay()]}, {months[time.getMonth()]} {time.getDate()}</span>
      <span className="font-mono font-medium">{time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</span>
    </div>
  )
}

function UserMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false)
  const [imgErr, setImgErr] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const initials = ((user.fname?.[0] || '') + (user.lname?.[0] || '')).toUpperCase() || 'U'
  const avatarSrc = user.passport || null
  const showImg = avatarSrc && !imgErr

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-gray-50 transition-colors group">
        {showImg ? (
          <img src={avatarSrc} alt="" onError={() => setImgErr(true)} className="w-9 h-9 rounded-full object-cover ring-2 ring-gray-100 group-hover:ring-veritas-200 transition-all" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-veritas-400 to-veritas-600 flex items-center justify-center text-sm font-bold text-white ring-2 ring-gray-100 group-hover:ring-veritas-200 transition-all shadow-sm">
            {initials}
          </div>
        )}
        <div className="hidden md:block text-left">
          <p className="text-sm font-semibold text-gray-900 leading-tight">{(user.fname || '') + ' ' + (user.lname || '')}</p>
          <p className="text-[10px] text-gray-400 capitalize leading-tight">{user.type || 'user'} · {user.matric_no || ''}</p>
        </div>
        <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <div className="absolute right-0 mt-1.5 w-60 bg-white rounded-xl shadow-lg border border-gray-100 z-40 overflow-hidden">
          <div className="p-4 border-b border-gray-50">
            <div className="flex items-center gap-3">
              {showImg ? (
                <img src={avatarSrc} alt="" onError={() => setImgErr(true)} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-veritas-400 to-veritas-600 flex items-center justify-center text-sm font-bold text-white">{initials}</div>
              )}
              <div>
                <p className="text-sm font-semibold text-gray-900">{user.fname || ''} {user.lname || ''}</p>
                <p className="text-xs text-gray-400">{user.email || ''}</p>
              </div>
            </div>
          </div>
          <div className="py-1">
            <a href="/profile" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
              My Profile
            </a>
            <button onClick={onLogout} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function CollapsibleSection({ section, collapsed, currentPath, onNavigate, defaultOpen }) {
  const [expanded, setExpanded] = useState(defaultOpen)

  const hasActive = useCallback(() => {
    return section.links.some(l => currentPath === l.href || currentPath.startsWith(l.href + '/'))
  }, [currentPath, section.links])

  useEffect(() => {
    if (hasActive()) setExpanded(true)
  }, [hasActive])

  if (collapsed) {
    return (
      <div className="mb-2">
        <div className="flex justify-center py-2">
          <div className={`p-2 rounded-xl transition-colors ${hasActive() ? 'bg-veritas-50 text-veritas-600' : 'text-gray-400'}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={section.icon} />
            </svg>
          </div>
        </div>
        <div className="mx-2 h-px bg-gray-100" />
      </div>
    )
  }

  return (
    <div className="mb-0.5">
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors ${
          hasActive() ? 'text-veritas-700' : 'text-gray-400 hover:text-gray-600'
        }`}>
        <svg className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        {section.label}
      </button>
      {expanded && (
        <div className="ml-1 space-y-0.5 mb-1.5 border-l-2 border-gray-100 ml-4 pl-2">
          {section.links.map((link) => {
            const isActive = currentPath === link.href || currentPath.startsWith(link.href + '/')
            return (
              <a key={link.href} href={link.href} onClick={onNavigate}
                className={`group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-veritas-50 text-veritas-700 border-l-2 border-veritas-500 -ml-3 pl-2.5'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}>
                <svg className={`w-4 h-4 shrink-0 ${isActive ? 'text-veritas-500' : 'text-gray-400 group-hover:text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={link.icon} />
                </svg>
                {link.label}
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [currentPath, setCurrentPath] = useState('/dashboard')
  const [user, setUser] = useState({})

  useEffect(() => {
    setCurrentPath(window.location.pathname)
    const onPop = () => setCurrentPath(window.location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    const stored = (() => {
      try { return JSON.parse(localStorage.getItem('user') || '{}') } catch { return {} }
    })()
    setUser(stored)
    const token = localStorage.getItem('token')
    if (token) {
      api.get('/me').then(r => {
        const fresh = r.data.user
        localStorage.setItem('user', JSON.stringify(fresh))
        setUser(fresh)
      }).catch(() => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.href = '/login'
      })
    }
  }, [])

  const navSections = useMemo(() => {
    const uid = Number(user.id)
    const isGhost = [506, 577, 596].includes(uid)
    const userRoles = user.roles || []
    const userType = user.type || ''
    const hasAnyRole = userRoles.length > 0
    return allNavSections.filter(s => {
      if (s.ghostOnly && !isGhost) return false
      if (!s.userTypes.includes(userType)) return false
      if (isGhost) return true
      if (s.requireAnyRole) return hasAnyRole
      if (s.requiredRoles && s.requiredRoles.length > 0) {
        return s.requiredRoles.some(r => userRoles.includes(r))
      }
      return true
    })
  }, [user.type, user.roles, user.id])

  const handleLogout = () => {
    api.post('/logout').catch(() => {})
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/login'
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* ─── FIXED NAVBAR ─── */}
      <header className="h-16 bg-white border-b border-gray-200 shrink-0 z-30 flex items-center">
        <div className="flex items-center justify-between w-full px-4 lg:px-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
            </button>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
              <svg className={`h-5 w-5 transition-transform duration-200 ${sidebarCollapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
            </button>
            <a href="/dashboard" className="flex items-center gap-2.5 mr-4">
              <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-veritas-500 to-veritas-700 flex items-center justify-center p-1.5 shadow-sm">
                <img src="/veritas_university_logo.png" alt="" className="w-full h-full object-contain brightness-0 invert" />
              </span>
              <span className="text-gray-900 font-bold text-base tracking-tight hidden sm:block">Attendance <span className="text-veritas-500">System</span></span>
            </a>
            <div className="hidden lg:block pl-4 border-l border-gray-200">
              <Clock />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <UserMenu user={user} onLogout={handleLogout} />
          </div>
        </div>
      </header>

      {/* ─── BODY (sidebar + main) ─── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/30 z-20 lg:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        )}

        {/* ─── FIXED SIDEBAR ─── */}
        <aside className={`shrink-0 bg-white border-r border-gray-200 z-20 transition-all duration-300 ease-in-out overflow-hidden ${
          sidebarOpen ? 'w-64 fixed inset-y-16 left-0' : 'w-0'
        } lg:relative lg:inset-auto lg:block ${sidebarCollapsed ? 'lg:w-16' : 'lg:w-64'}`}>
          <nav className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto py-3 px-2 scrollbar-thin">
              {navSections.map((section) => (
                <CollapsibleSection
                  key={section.label}
                  section={section}
                  collapsed={sidebarCollapsed}
                  currentPath={currentPath}
                  onNavigate={() => setSidebarOpen(false)}
                  defaultOpen={section.links.some(l => currentPath.startsWith(l.href))}
                />
              ))}
            </div>
            <div className={`shrink-0 border-t border-gray-100 p-3 ${sidebarCollapsed ? 'text-center' : ''}`}>
              {sidebarCollapsed ? (
                <div className="w-8 h-8 mx-auto rounded-full bg-gradient-to-br from-veritas-400 to-veritas-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                  {((user.fname?.[0] || '') + (user.lname?.[0] || '')).toUpperCase() || 'U'}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-veritas-400 to-veritas-600 flex items-center justify-center text-xs font-bold text-white shadow-sm shrink-0">
                    {((user.fname?.[0] || '') + (user.lname?.[0] || '')).toUpperCase() || 'U'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-gray-900 truncate">{user.fname || ''} {user.lname || ''}</p>
                    <p className="text-[10px] text-gray-400 truncate capitalize">{user.type || 'user'}</p>
                  </div>
                </div>
              )}
            </div>
          </nav>
        </aside>

        {/* ─── SCROLLABLE MAIN ─── */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
