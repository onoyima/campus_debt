import { useState, useEffect } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../../Components/AppLayout'
import Pagination from '../../Components/Pagination'
import api from '../../api'

export default function PortalRolesIndex() {
  const [data, setData] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!localStorage.getItem('token')) { window.location.href = '/login'; return }
    setPage(1)
  }, [search])

  useEffect(() => {
    fetchData()
  }, [page, search])

  const fetchData = () => {
    setLoading(true)
    setError(null)
    const params = { page, per_page: 20 }
    if (search) params.search = search
    api.get('/admin/portal-roles', { params })
      .then(res => {
        setData(res.data.data || [])
        setMeta(res.data.meta || null)
      })
      .catch(err => setError(err.response?.data?.message || 'Failed to load'))
      .finally(() => setLoading(false))
  }

  return (
    <AppLayout>
      <Head title="Portal Roles" />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Portal Staff Roles</h1>
          <p className="text-sm text-gray-400 mt-0.5">Staff role assignments from the school portal</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6 flex flex-wrap items-center gap-3 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search staff name, email, or role..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-veritas-500 transition-colors" />
        </div>
        <span className="text-xs text-gray-400 ml-auto">{meta?.total || 0} staff with roles</span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="p-6 space-y-4 animate-pulse">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex gap-4"><div className="h-5 bg-gray-100 rounded w-1/4" /><div className="h-5 bg-gray-100 rounded w-1/4" /><div className="h-5 bg-gray-100 rounded w-1/6" /></div>
            ))}
          </div>
        </div>
      ) : data.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <svg className="w-16 h-16 text-gray-200 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No Roles Found</h3>
          <p className="text-sm text-gray-400">No portal role assignments match your search.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Staff</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Portal Roles</th>
                </tr>
              </thead>
              <tbody>
                {data.map((staff, i) => (
                  <tr key={staff.staff_id} className="border-b border-gray-50 hover:bg-gray-50/40 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-400">{(meta?.current_page - 1) * (meta?.per_page || 20) + i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{staff.full_name}</div>
                      <div className="text-xs text-gray-400">ID: {staff.staff_id}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{staff.email || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {staff.roles.map(r => (
                          <span key={r.assignment_id}
                            className="inline-block text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-100 font-medium">
                            {r.role_name}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {meta?.last_page > 1 && (
            <div className="px-6 py-4 border-t border-gray-50">
              <Pagination meta={meta} onPageChange={setPage} />
            </div>
          )}
        </div>
      )}
    </AppLayout>
  )
}
