import { useState, useEffect } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../../Components/AppLayout'
import api from '../../api'

export default function StudentMyDebts() {
  const [debts, setDebts] = useState([])
  const [totalOutstanding, setTotalOutstanding] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!localStorage.getItem('token')) { window.location.href = '/login'; return }
    fetchDebts()
  }, [])

  const fetchDebts = () => {
    setLoading(true)
    api.get('/student/my-debts')
      .then(res => {
        setDebts(res.data.data || [])
        setTotalOutstanding(res.data.total_outstanding || 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  return (
    <AppLayout>
      <Head title="My Debts" />

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Debts</h1>
            <p className="text-sm text-gray-400 mt-0.5">Your outstanding and cleared debts</p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-400 mb-1">Total Outstanding</p>
          <p className="text-2xl font-bold text-red-600">₦{totalOutstanding.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-400 mb-1">Total Debts</p>
          <p className="text-2xl font-bold text-gray-900">{debts.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-400 mb-1">Cleared</p>
          <p className="text-2xl font-bold text-green-600">{debts.filter(d => d.payment_status === 'paid').length}</p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="p-6 space-y-4 animate-pulse">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="h-4 bg-gray-100 rounded w-24" />
                <div className="h-4 bg-gray-100 rounded w-32" />
                <div className="h-4 bg-gray-100 rounded w-20" />
                <div className="h-4 bg-gray-100 rounded w-16" />
              </div>
            ))}
          </div>
        </div>
      ) : debts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <svg className="w-16 h-16 text-gray-200 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No Debts</h3>
          <p className="text-sm text-gray-400">You have no debt records.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50">
                  {['Reason', 'Amount', 'Status', 'Blocks Eligibility', 'Due Date', 'Session', 'Date'].map(h => (
                    <th key={h} className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {debts.map((d, i) => (
                  <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                    style={{ animation: `fadeIn 0.3s ease-out ${i * 0.03}s both` }}>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">{d.reason || d.penalty_name || '-'}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">₦{Number(d.amount).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-full border ${
                        d.payment_status === 'paid' ? 'bg-green-100 text-green-700 border-green-200' :
                        d.payment_status === 'unpaid' || d.payment_status === 'pending' ? 'bg-red-100 text-red-700 border-red-200' :
                        'bg-yellow-100 text-yellow-700 border-yellow-200'
                      }`}>
                        {d.payment_status || 'unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {d.blocks_eligibility
                        ? <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">Yes</span>
                        : <span className="text-xs text-gray-400">No</span>
                      }
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{d.due_date || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-[160px] truncate">{d.session_title || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-400">{d.created_at ? new Date(d.created_at).toLocaleDateString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </AppLayout>
  )
}
