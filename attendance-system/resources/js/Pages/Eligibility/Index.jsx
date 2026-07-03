import { useState, useEffect } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../../Components/AppLayout'
import Table from '../../Components/Table'
import api from '../../api'

export default function EligibilityIndex() {
  const [eligibility, setEligibility] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!localStorage.getItem('token')) { window.location.href = '/login'; return }
    fetchEligibility()
    const interval = setInterval(fetchEligibility, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchEligibility = () => {
    api.get('/exam-eligibility')
      .then((res) => setEligibility(res.data.data || res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const handleDelete = async (item) => {
    if (!confirm(`Delete this eligibility record?`)) return
    try {
      await api.delete(`/exam-eligibility/${item.id}`)
      setEligibility((prev) => prev.filter((e) => e.id !== item.id))
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed')
    }
  }

  const columns = [
    { key: 'student_name', label: 'Student' },
    { key: 'course_name', label: 'Course' },
    { key: 'attendance_percentage', label: 'Percentage', render: (val) => `${Number(val).toFixed(1)}%` },
    {
      key: 'status',
      label: 'Status',
      render: (val) => (
        <span className={`px-2 py-1 text-xs rounded-full ${
          val === 'eligible' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {val}
        </span>
      ),
    },
  ]

  return (
    <AppLayout>
      <Head title="Eligibility" />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Exam Eligibility</h1>
      </div>
      <div className="bg-white rounded-lg shadow">
        <Table columns={columns} data={eligibility} loading={loading} onDelete={handleDelete} />
      </div>
    </AppLayout>
  )
}
