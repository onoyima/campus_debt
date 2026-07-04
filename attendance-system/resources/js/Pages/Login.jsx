import { Head } from '@inertiajs/react'
import { useState } from 'react'
import api from '../api'
import VeritasSpinner from '../Components/VeritasSpinner'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await api.post('/login', { email, password })
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      window.location.href = '/dashboard'
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head title="Sign In" />
      <div className="min-h-screen flex">
        {/* ─── Branding Side (hidden on mobile) ─── */}
        <div className="hidden lg:flex lg:w-1/2 bg-veritas-500 relative overflow-hidden items-center justify-center">
          {/* Decorative circles */}
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-white/5" />
          <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-white/5" />
          <div className="absolute top-1/3 left-1/4 w-64 h-64 rounded-full bg-white/5" />

          <div className="relative z-10 text-center px-12 max-w-lg">
            {/* Logo */}
            <div className="w-28 h-28 rounded-full bg-white shadow-2xl flex items-center justify-center p-6 mx-auto mb-8 animate-float">
              <img src="/veritas_university_logo.png" alt="Veritas University" className="w-full h-full object-contain" />
            </div>

            <h1 className="text-4xl font-bold text-white mb-4 tracking-wide">Veritas University</h1>
            <p className="text-white/70 text-lg mb-8 leading-relaxed">
              Attendance Management System — secure, smart, and seamless tracking for students and staff.
            </p>

            {/* Feature highlights */}
            <div className="space-y-4 text-left">
              {[
                { icon: '🔐', text: 'Biometric face & fingerprint verification' },
                { icon: '📊', text: 'Real-time attendance tracking & analytics' },
                { icon: '📱', text: 'Offline sync — works even without internet' },
                { icon: '🎓', text: 'Exam eligibility & clearance management' },
              ].map(f => (
                <div key={f.text} className="flex items-center gap-3 text-white/80">
                  <span className="text-xl">{f.icon}</span>
                  <span className="text-sm">{f.text}</span>
                </div>
              ))}
            </div>

            <p className="text-white/40 text-xs mt-10 tracking-wide">
              Powered by Veritas University ICT
            </p>
          </div>
        </div>

        {/* ─── Form Side ─── */}
        <div className="w-full lg:w-1/2 min-h-screen flex items-center justify-center px-6 py-12 bg-cream">
          <div className="w-full max-w-md">
            {/* Mobile logo (visible only on small screens) */}
            <div className="lg:hidden text-center mb-8">
              <div className="w-20 h-20 rounded-full bg-veritas-500 shadow-xl flex items-center justify-center p-4 mx-auto mb-4">
                <img src="/veritas_university_logo.png" alt="" className="w-full h-full object-contain" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Veritas Attendance</h1>
              <p className="text-gray-400 text-sm mt-1">Sign in to your account</p>
            </div>

            {/* Form Card */}
            <div className="bg-white rounded-2xl px-8 py-10 shadow-xl border border-gray-100">
              <div className="hidden lg:block mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
                <p className="text-gray-400 text-sm mt-1">Sign in to your account to continue.</p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-3">
                  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-veritas-500 tracking-wider mb-2">
                    EMAIL OR MATRIC NUMBER
                  </label>
                  <input
                    type="text" value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocused('email')}
                    onBlur={() => setFocused(null)}
                    placeholder="e.g. johndoe or johndoe@veritas.edu.ng"
                    className={`w-full px-4 py-3.5 border-2 rounded-xl text-gray-900 placeholder-gray-400 outline-none transition-all duration-200 ${
                      focused === 'email'
                        ? 'border-veritas-500 shadow-[0_0_0_3px_rgba(0,79,64,0.1)]'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-veritas-500 tracking-wider mb-2">
                    PASSWORD
                  </label>
                  <input
                    type="password" value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocused('password')}
                    onBlur={() => setFocused(null)}
                    placeholder="Enter your password"
                    className={`w-full px-4 py-3.5 border-2 rounded-xl text-gray-900 placeholder-gray-400 outline-none transition-all duration-200 ${
                      focused === 'password'
                        ? 'border-veritas-500 shadow-[0_0_0_3px_rgba(0,79,64,0.1)]'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    required
                  />
                </div>

                <button
                  type="submit" disabled={loading}
                  className="w-full py-3.5 px-4 bg-veritas-500 text-white font-bold rounded-xl hover:bg-veritas-600 disabled:opacity-60 transition-all duration-200 shadow-lg shadow-veritas-500/30 active:scale-[0.98]"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <VeritasSpinner size="sm" text="Signing In..." />
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Sign In <span className="text-lg">→</span>
                    </span>
                  )}
                </button>
              </form>

              <p className="text-gray-400 text-xs text-center mt-8 leading-relaxed">
                Use your university email or matric number to sign in.<br />
                Staff should use their staff email.
              </p>
            </div>

            {/* Mobile footer */}
            <p className="lg:hidden text-center text-gray-400 text-xs mt-8 tracking-wide">
              Powered by Veritas University ICT
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        .animate-float { animation: float 4s ease-in-out infinite; }
      `}</style>
    </>
  )
}
