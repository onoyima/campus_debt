import { useState, useEffect, useRef } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../../Components/AppLayout'
import VeritasSpinner from '../../Components/VeritasSpinner'
import api from '../../api'

const statusColors = {
  present: 'bg-green-100 text-green-700',
  late: 'bg-yellow-100 text-yellow-800',
  absent: 'bg-red-100 text-red-700',
  pending: 'bg-gray-100 text-gray-600',
}

function ScanEntry({ scan, isNew }) {
  return (
    <div className={`flex items-center justify-between py-2.5 px-4 border-b border-gray-50 last:border-0 transition-all duration-500 ${
      isNew ? 'bg-green-50/70 animate-pulse' : 'hover:bg-gray-50'
    }`}>
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-2 h-2 rounded-full bg-green-500 shrink-0 animate-pulse" />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900 truncate">{scan.name}</span>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
              scan.participant_type === 'staff' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {scan.participant_type}
            </span>
          </div>
          {scan.department && (
            <p className="text-[11px] text-gray-400 truncate">{scan.department}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
          statusColors[scan.status] || 'bg-gray-100 text-gray-800'
        }`}>
          {scan.status}
        </span>
        <span className="text-[11px] text-gray-400 font-mono">
          {new Date(scan.check_in_time).toLocaleTimeString()}
        </span>
      </div>
    </div>
  )
}

export default function EventLiveFeed() {
  const id = window.location.pathname.split('/')[2]
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [newIds, setNewIds] = useState(new Set())
  const feedRef = useRef(null)
  const prevIdsRef = useRef(new Set())

  useEffect(() => {
    if (!localStorage.getItem('token')) { window.location.href = '/login'; return }
    fetchFeed()
    const interval = setInterval(fetchFeed, 3000)
    return () => clearInterval(interval)
  }, [id])

  const fetchFeed = async () => {
    try {
      const res = await api.get(`/institutional-events/${id}/live-feed`)
      const d = res.data.data
      const scanIds = new Set((d.scans || []).map(s => s.id))

      if (prevIdsRef.current.size > 0) {
        const newScanIds = new Set([...scanIds].filter(x => !prevIdsRef.current.has(x)))
        if (newScanIds.size > 0) {
          setNewIds(newScanIds)
          setTimeout(() => setNewIds(new Set()), 2000)
        }
      }
      prevIdsRef.current = scanIds

      setData(d)
      setError(null)
    } catch (e) {
      setError(e.response?.data?.message || e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = 0
    }
  }, [data?.scans])

  if (loading && !data) {
    return (
      <AppLayout>
        <Head title="Live Feed" />
        <div className="flex items-center justify-center h-64"><VeritasSpinner text="Loading live feed..." /></div>
      </AppLayout>
    )
  }

  if (error && !data) {
    return (
      <AppLayout>
        <Head title="Live Feed" />
        <div className="text-center py-12 text-gray-500">Failed to load: {error}</div>
      </AppLayout>
    )
  }

  const eventStatus = data?.event?.status
  const isLive = eventStatus === 'active' || eventStatus === 'draft'

  return (
    <AppLayout>
      <Head title={`${data?.event?.title || 'Event'} — Live Feed`} />
      <div className="mb-6">
        <a href={`/events/${id}`} className="text-sm text-veritas-600 hover:text-veritas-800 mb-2 inline-block">&larr; Back to Event</a>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{data?.event?.title || 'Live Feed'}</h1>
            <p className="text-xs text-gray-500 mt-0.5">Real-time attendance scans</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs">
              <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              <span className={isLive ? 'text-green-600 font-medium' : 'text-gray-500'}>
                {isLive ? 'LIVE' : 'Closed'}
              </span>
            </div>
            <span className="text-xs text-gray-400">{data?.stats?.total_scanned || 0} scanned</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{data?.stats?.present || 0}</div>
          <div className="text-xs text-gray-500 mt-0.5">Present</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{data?.stats?.late || 0}</div>
          <div className="text-xs text-gray-500 mt-0.5">Late</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{data?.stats?.total_scanned || 0}</div>
          <div className="text-xs text-gray-500 mt-0.5">Total Scanned</div>
        </div>
      </div>

      {/* Scan feed */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900">Scans</h2>
          <div className="flex items-center gap-2">
            {isLive && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />}
            <span className="text-[10px] text-gray-400">{data?.scans?.length || 0} entries</span>
          </div>
        </div>
        <div ref={feedRef} className="overflow-y-auto max-h-[600px]">
          {!data?.scans || data.scans.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">
              <p className="mb-1">No scans yet</p>
              <p className="text-[10px]">Waiting for participants to scan their fingerprints...</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {data.scans.map((scan) => (
                <ScanEntry key={scan.id} scan={scan} isNew={newIds.has(scan.id)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
