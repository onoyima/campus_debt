import { useState, useEffect } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../../Components/AppLayout'
import Table from '../../Components/Table'
import api from '../../api'

export default function TerminalLogsIndex() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!localStorage.getItem('token')) { window.location.href = '/login'; return }
    fetchLogs()
    const interval = setInterval(fetchLogs, 15000)
    return () => clearInterval(interval)
  }, [])

  const fetchLogs = () => {
    api.get('/terminal-logs')
      .then((res) => setLogs(res.data.data || res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const columns = [
    { key: 'terminal_id', label: 'Terminal ID' },
    { key: 'event', label: 'Event' },
    { key: 'ip_address', label: 'IP Address' },
    { key: 'created_at', label: 'Created At' },
  ]

  return (
    <AppLayout>
      <Head title="Terminal Logs" />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Terminal Logs</h1>
      </div>
      <div className="bg-white rounded-lg shadow">
        <Table columns={columns} data={logs} loading={loading} />
      </div>
    </AppLayout>
  )
}
