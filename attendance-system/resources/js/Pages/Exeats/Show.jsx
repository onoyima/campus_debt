import { useState, useEffect } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../../Components/AppLayout'
import api from '../../api'

export default function ExeatsShow() {
  const id = window.location.pathname.split('/')[2]
  const [exeat, setExeat] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!localStorage.getItem('token')) { window.location.href = '/login'; return }
    if (id) {
      api.get(`/exeats/${id}`)
        .then((res) => setExeat(res.data.data || res.data))
        .catch(() => window.location.href = '/exeats')
        .finally(() => setLoading(false))
    }
  }, [])

  if (loading) {
    return (
      <AppLayout>
        <div className="text-center py-12 text-gray-500">Loading...</div>
      </AppLayout>
    )
  }

  if (!exeat) {
    return (
      <AppLayout>
        <div className="text-center py-12 text-gray-500">Exeat not found</div>
      </AppLayout>
    )
  }

  const statusBadge = (val) => (
    <span className={`px-2 py-1 text-xs rounded-full ${
      val === 'approved' ? 'bg-green-100 text-green-800' : val === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
    }`}>{val}</span>
  )

  return (
    <AppLayout>
      <Head title="Exeat Details" />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Exeat Details</h1>
        <a href="/exeats" className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm">Back</a>
      </div>
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div><span className="text-sm text-gray-500">Student ID:</span><p className="font-medium">{exeat.student_id}</p></div>
          <div><span className="text-sm text-gray-500">Matric No:</span><p className="font-medium">{exeat.matric_no}</p></div>
          <div><span className="text-sm text-gray-500">Departure Date:</span><p className="font-medium">{exeat.departure_date}</p></div>
          <div><span className="text-sm text-gray-500">Return Date:</span><p className="font-medium">{exeat.return_date}</p></div>
          <div><span className="text-sm text-gray-500">Category:</span><p className="font-medium">{exeat.category}</p></div>
          <div><span className="text-sm text-gray-500">Status:</span><p className="font-medium">{statusBadge(exeat.status)}</p></div>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow">
        <h2 className="text-lg font-semibold text-gray-900 px-6 py-4 border-b border-gray-200">Approvals</h2>
        {exeat.approvals && exeat.approvals.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approver</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {exeat.approvals.map((a, idx) => (
                  <tr key={a.id || idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{a.approver_name || a.approved_by}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{statusBadge(a.status)}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{a.comment || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{a.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">No approvals found</div>
        )}
      </div>
    </AppLayout>
  )
}
