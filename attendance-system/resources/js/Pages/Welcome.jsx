import { Head } from '@inertiajs/react'

export default function Welcome({ auth }) {
  return (
    <>
      <Head title="Attendance System" />
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Attendance &amp; Compliance System
        </h1>
        <p className="text-gray-600 mb-8">
          Institutional Event Tracking, Exam Eligibility &amp; Debt Recovery
        </p>
        <div className="flex gap-4">
          <a
            href="/login"
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Sign In
          </a>
        </div>
      </div>
    </>
  )
}
