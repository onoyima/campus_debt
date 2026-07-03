import { useState, useEffect, useRef, useCallback } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '../../Components/AppLayout'
import api from '../../api'

const TabButton = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${active ? 'bg-veritas-500 text-white shadow-lg shadow-veritas-500/30' : 'bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-50 border border-gray-200'}`}>
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d={icon} /></svg>
    {label}
  </button>
)

const StatusBadge = ({ active }) => (
  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
    <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
    {active ? 'Active' : 'Inactive'}
  </span>
)

export default function BiometricsEnroll() {
  const [tab, setTab] = useState('enrollments')
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedType, setSelectedType] = useState('face')
  const [capturedImage, setCapturedImage] = useState(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [enrolling, setEnrolling] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState(null)
  const [enrollMsg, setEnrollMsg] = useState(null)
  const [cameraError, setCameraError] = useState(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  const user = (() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}') } catch { return {} }
  })()
  const isStaff = user.type === 'staff'

  const fetchTemplates = useCallback(() => {
    if (!localStorage.getItem('token')) return
    api.get('/biometric-templates', {
      params: { user_id: user.id, user_type: user.type, per_page: 50 }
    }).then(res => setTemplates(res.data.data || [])).catch(() => {}).finally(() => setLoading(false))
  }, [user.id, user.type])

  useEffect(() => { fetchTemplates() }, [fetchTemplates])
  useEffect(() => {
    return () => { if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()) } }
  }, [])

  const startCamera = async () => {
    setCameraError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      setCameraActive(true)
    } catch (err) {
      setCameraError(err.message || 'Camera access denied. Use file upload instead.')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setCameraActive(false)
    if (videoRef.current) videoRef.current.srcObject = null
  }

  const capturePhoto = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    setCapturedImage(dataUrl)
    stopCamera()
  }

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setCapturedImage(ev.target.result)
    reader.readAsDataURL(file)
  }

  const handleEnroll = async () => {
    if (!capturedImage) return
    setEnrolling(true)
    setEnrollMsg(null)
    try {
      const res = await api.post(isStaff ? '/biometric-templates/enroll' : '/biometric-templates', {
        template_type: selectedType,
        template_data: capturedImage,
      })
      setEnrollMsg({ type: 'success', text: res.data.message || 'Enrolled successfully!' })
      setCapturedImage(null)
      fetchTemplates()
    } catch (err) {
      setEnrollMsg({ type: 'error', text: err.response?.data?.message || err.response?.data?.error || 'Enrollment failed.' })
    } finally {
      setEnrolling(false)
    }
  }

  const handleVerify = async () => {
    if (!capturedImage) return
    setVerifying(true)
    setVerifyResult(null)
    try {
      const res = await api.post(isStaff ? '/biometric-templates/verify-me' : '/biometric-templates/verify', {
        method: selectedType,
        captured_data: capturedImage,
      })
      setVerifyResult(res.data.data || res.data)
    } catch (err) {
      setVerifyResult(err.response?.data?.data || { success: false, result: 'failed', error_message: err.response?.data?.message || 'Verification failed.' })
    } finally {
      setVerifying(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Remove this biometric template?')) return
    try {
      await api.delete(`/biometric-templates/${id}`)
      setTemplates(prev => prev.filter(t => t.id !== id))
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed')
    }
  }

  const retakePhoto = () => {
    setCapturedImage(null)
    setCameraError(null)
  }

  const renderCamera = () => {
    if (selectedType === 'fingerprint') {
      return (
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center hover:border-veritas-300 transition-colors">
            {capturedImage ? (
              <div className="space-y-4">
                <img src={capturedImage} alt="Captured fingerprint" className="mx-auto max-h-48 rounded-xl shadow-sm" />
                <button onClick={retakePhoto} className="text-sm text-gray-500 hover:text-gray-700 underline">Retake</button>
              </div>
            ) : (
              <div className="space-y-4">
                <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" /></svg>
                <p className="text-gray-500 text-sm">Upload a fingerprint scan image</p>
                <label className="inline-flex items-center gap-2 px-6 py-3 bg-veritas-500 text-white rounded-xl hover:bg-veritas-600 cursor-pointer transition-colors shadow-lg shadow-veritas-500/30 text-sm font-semibold">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                  Choose Image
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
            )}
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {!cameraActive && !capturedImage && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center hover:border-veritas-300 transition-colors">
              <svg className="w-20 h-20 mx-auto text-gray-200 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" /></svg>
              <p className="text-gray-500 text-sm mb-6">Position your face in good lighting and click start</p>
              <div className="flex items-center justify-center gap-4">
                <button onClick={startCamera} className="flex items-center gap-2 px-6 py-3 bg-veritas-500 text-white rounded-xl hover:bg-veritas-600 transition-colors shadow-lg shadow-veritas-500/30 text-sm font-semibold">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" /></svg>
                  Start Camera
                </button>
                <span className="text-gray-300 text-sm">or</span>
                <label className="flex items-center gap-2 px-6 py-3 bg-white text-gray-700 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors text-sm font-semibold">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                  Upload Photo
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
            </div>
            {cameraError && (
              <div className="p-4 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-sm flex items-center gap-3">
                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                {cameraError}
              </div>
            )}
          </div>
        )}

        {cameraActive && (
          <div className="space-y-4">
            <div className="relative rounded-2xl overflow-hidden bg-black shadow-lg">
              <video ref={videoRef} autoPlay playsInline className="w-full max-h-96 object-contain" />
              <div className="absolute inset-0 border-4 border-veritas-400/30 rounded-2xl pointer-events-none" />
              <div className="absolute inset-x-0 bottom-4 flex justify-center">
                <button onClick={capturePhoto} className="w-16 h-16 rounded-full bg-white/90 backdrop-blur-sm shadow-xl flex items-center justify-center hover:bg-white transition-colors">
                  <div className="w-12 h-12 rounded-full border-4 border-veritas-500" />
                </button>
              </div>
            </div>
            <div className="flex justify-center gap-3">
              <button onClick={stopCamera} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
            </div>
          </div>
        )}

        {capturedImage && (
          <div className="space-y-4">
            <img src={capturedImage} alt="Captured" className="mx-auto max-h-72 rounded-2xl shadow-lg border border-gray-200" />
            <div className="flex items-center justify-center gap-3">
              <button onClick={retakePhoto} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Retake</button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <AppLayout>
      <Head title="Biometric Enrollment" />
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Biometric Enrollment</h1>
            <p className="text-sm text-gray-400 mt-1">Manage your face and fingerprint biometric templates</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-veritas-50 rounded-xl">
            <span className="w-2 h-2 rounded-full bg-veritas-500 animate-pulse" />
            <span className="text-xs font-semibold text-veritas-600">{templates.filter(t => t.is_active).length} Active</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <TabButton active={tab === 'enrollments'} onClick={() => setTab('enrollments')} icon="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" label="My Enrollments" />
          <TabButton active={tab === 'enroll'} onClick={() => setTab('enroll')} icon="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" label="Enroll New" />
          <TabButton active={tab === 'verify'} onClick={() => setTab('verify')} icon="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" label="Verify" />
        </div>

        {/* ─── TAB: My Enrollments ─── */}
        {tab === 'enrollments' && (
          <div className="space-y-4">
            {loading ? (
              <div className="space-y-4">
                {[1,2,3].map(i => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
                    <div className="flex items-center justify-between"><div className="h-5 bg-gray-200 rounded w-32" /><div className="h-6 bg-gray-200 rounded w-20" /></div>
                    <div className="flex gap-6 mt-4"><div className="h-4 bg-gray-100 rounded w-24" /><div className="h-4 bg-gray-100 rounded w-24" /><div className="h-4 bg-gray-100 rounded w-24" /></div>
                  </div>
                ))}
              </div>
            ) : templates.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
                <svg className="w-16 h-16 mx-auto text-gray-200 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" /></svg>
                <p className="text-gray-500 font-medium mb-2">No biometric templates enrolled</p>
                <p className="text-gray-400 text-sm">Go to the Enroll tab to add your face or fingerprint</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {templates.map(t => (
                  <div key={t.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${t.template_type === 'face' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d={t.template_type === 'face' ? 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z' : 'M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3'} />
                          </svg>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 capitalize">{t.template_type} Template</p>
                          <p className="text-xs text-gray-400">ID: {t.id} · v{t.algorithm_version}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge active={!!t.is_active} />
                        <button onClick={() => handleDelete(t.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 mt-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
                        Enrolled {new Date(t.enrolled_at).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                        By ID {t.enrolled_by || '—'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB: Enroll ─── */}
        {tab === 'enroll' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8 shadow-sm">
            {/* Type selector */}
            <div className="flex items-center gap-4 mb-6">
              <label className="text-sm font-semibold text-gray-700">Biometric Type:</label>
              <div className="flex gap-2">
                {['face', 'fingerprint'].map(type => (
                  <button key={type} onClick={() => { setSelectedType(type); setCapturedImage(null); stopCamera() }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                      selectedType === type
                        ? 'bg-veritas-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={type === 'face' ? 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z' : 'M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3'} />
                    </svg>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Camera / Upload */}
            {renderCamera()}

            {/* Enroll button */}
            {capturedImage && (
              <div className="mt-6">
                {enrollMsg && (
                  <div className={`mb-4 p-4 rounded-xl text-sm flex items-center gap-3 ${
                    enrollMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={enrollMsg.type === 'success' ? 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z' : 'M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z'} />
                    </svg>
                    {enrollMsg.text}
                  </div>
                )}
                <button onClick={handleEnroll} disabled={enrolling}
                  className="w-full sm:w-auto px-8 py-3.5 bg-veritas-500 text-white font-bold rounded-xl hover:bg-veritas-600 disabled:opacity-60 transition-all shadow-lg shadow-veritas-500/30 active:scale-[0.98] flex items-center justify-center gap-2">
                  {enrolling ? (
                    <><svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Enrolling...</>
                  ) : (
                    <><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>Enroll {selectedType === 'face' ? 'Face' : 'Fingerprint'}</>
                  )}
                </button>
              </div>
            )}

            {/* Info card */}
            {!capturedImage && (
              <div className="mt-6 p-4 bg-veritas-50 rounded-xl border border-veritas-100">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-veritas-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>
                  <div>
                    <p className="text-sm font-semibold text-veritas-700">Enrollment Tips</p>
                    <ul className="text-xs text-veritas-600 mt-1 space-y-1 list-disc list-inside">
                      <li>Ensure good lighting and a plain background for face capture</li>
                      <li>Remove glasses, masks, or anything obscuring your face</li>
                      <li>For fingerprint, provide a clear, high-contrast scan</li>
                      <li>Each biometric type can have only one active template</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB: Verify ─── */}
        {tab === 'verify' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8 shadow-sm">
            {/* Type selector */}
            <div className="flex items-center gap-4 mb-6">
              <label className="text-sm font-semibold text-gray-700">Verify using:</label>
              <div className="flex gap-2">
                {['face', 'fingerprint'].map(type => (
                  <button key={type} onClick={() => { setSelectedType(type); setCapturedImage(null); setVerifyResult(null); stopCamera() }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                      selectedType === type
                        ? 'bg-veritas-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={type === 'face' ? 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z' : 'M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3'} />
                    </svg>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Capture */}
            {renderCamera()}

            {/* Verify button */}
            {capturedImage && (
              <div className="mt-6">
                <button onClick={handleVerify} disabled={verifying}
                  className="w-full sm:w-auto px-8 py-3.5 bg-veritas-500 text-white font-bold rounded-xl hover:bg-veritas-600 disabled:opacity-60 transition-all shadow-lg shadow-veritas-500/30 active:scale-[0.98] flex items-center justify-center gap-2">
                  {verifying ? (
                    <><svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Verifying...</>
                  ) : (
                    <><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>Verify Identity</>
                  )}
                </button>
              </div>
            )}

            {/* Verification result */}
            {verifyResult && (
              <div className={`mt-6 p-5 rounded-2xl border-2 ${verifyResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${verifyResult.success ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={verifyResult.success ? 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z' : 'M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z'} />
                    </svg>
                  </div>
                  <div>
                    <p className={`text-lg font-bold ${verifyResult.success ? 'text-green-700' : 'text-red-700'}`}>
                      {verifyResult.success ? 'Identity Verified' : 'Verification Failed'}
                    </p>
                    <p className="text-sm text-gray-500 capitalize">{selectedType} recognition</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-white/80 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-400 mb-1">Confidence</p>
                    <p className={`text-lg font-bold ${verifyResult.confidence_score >= 0.75 ? 'text-green-600' : 'text-amber-600'}`}>
                      {((verifyResult.confidence_score || 0) * 100).toFixed(1)}%
                    </p>
                  </div>
                  {verifyResult.liveness_score !== undefined && verifyResult.liveness_score !== null && (
                    <div className="bg-white/80 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-400 mb-1">Liveness</p>
                      <p className={`text-lg font-bold ${(verifyResult.liveness_score || 0) >= 0.5 ? 'text-green-600' : 'text-red-600'}`}>
                        {((verifyResult.liveness_score || 0) * 100).toFixed(1)}%
                      </p>
                    </div>
                  )}
                  <div className="bg-white/80 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-400 mb-1">Duration</p>
                    <p className="text-lg font-bold text-gray-600">{verifyResult.duration_ms || 0}ms</p>
                  </div>
                  <div className="bg-white/80 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-400 mb-1">Result</p>
                    <p className={`text-lg font-bold capitalize ${verifyResult.result === 'verified' ? 'text-green-600' : 'text-red-600'}`}>
                      {verifyResult.result || '—'}
                    </p>
                  </div>
                </div>
                {verifyResult.error_message && (
                  <p className="mt-3 text-sm text-red-600 bg-red-100/50 rounded-xl p-3">{verifyResult.error_message}</p>
                )}
              </div>
            )}

            {!capturedImage && !verifyResult && (
              <div className="mt-6 p-4 bg-veritas-50 rounded-xl border border-veritas-100">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-veritas-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>
                  <div>
                    <p className="text-sm font-semibold text-veritas-700">Verification Tips</p>
                    <p className="text-xs text-veritas-600 mt-1">Capture a live photo or upload an image to verify against your enrolled biometric template. Make sure you have enrolled first!</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Hidden canvas for photo capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </AppLayout>
  )
}
