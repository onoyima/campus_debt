import { useState, useEffect } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../../Components/AppLayout'
import Table from '../../Components/Table'
import api from '../../api'

export default function OfflineSyncIndex() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!localStorage.getItem('token')) { window.location.href = '/login'; return }
    fetchRecords()
    const interval = setInterval(fetchRecords, 15000)
    return () => clearInterval(interval)
  }, [])

  const fetchRecords = () => {
    api.get('/offline-sync')
      .then((res) => setRecords(res.data.data || res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const handleProcessAll = async () => {
    if (!confirm('Process all pending sync records?')) return
    try {
      await api.post('/offline-sync/process-all')
      fetchRecords()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to process all')
    }
  }

  const handleProcess = async (record) => {
    try {
      await api.post(`/offline-sync/${record.id}/process`)
      fetchRecords()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to process record')
    }
  }

  const columns = [
    { key: 'terminal_id', label: 'Terminal ID' },
    { key: 'table_name', label: 'Table' },
    { key: 'action', label: 'Action' },
    {
      key: 'status',
      label: 'Status',
      render: (val) => (
        <span className={`px-2 py-1 text-xs rounded-full ${
          val === 'synced' || val === 'completed' ? 'bg-green-100 text-green-800' : val === 'failed' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
        }`}>
          {val}
        </span>
      ),
    },
    { key: 'retry_count', label: 'Retries' },
    { key: 'created_at', label: 'Created At' },
    { key: 'synced_at', label: 'Synced At', render: (val) => val || '-' },
  ]

  return (
    <AppLayout>
      <Head title="Offline Sync Queue" />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Offline Sync Queue</h1>
        <button onClick={handleProcessAll} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">
          Process All
        </button>
      </div>
      <div className="bg-white rounded-lg shadow">
        <Table
          columns={columns}
          data={records}
          loading={loading}
          onEdit={(row) => handleProcess(row)}
        />
      </div>
    </AppLayout>
  )
}
