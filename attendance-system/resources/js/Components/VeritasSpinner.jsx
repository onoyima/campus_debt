export default function VeritasSpinner({ size = 'md', text, fullscreen, inline }) {
  const sizes = {
    sm: { logo: 'w-6 h-6', wrapper: 'w-10 h-10', border: 'w-10 h-10', text: 'text-xs' },
    md: { logo: 'w-8 h-8', wrapper: 'w-14 h-14', border: 'w-14 h-14', text: 'text-sm' },
    lg: { logo: 'w-12 h-12', wrapper: 'w-20 h-20', border: 'w-20 h-20', text: 'text-base' },
    xl: { logo: 'w-16 h-16', wrapper: 'w-28 h-28', border: 'w-28 h-28', text: 'text-lg' },
  }
  const s = sizes[size] || sizes.md

  const spinner = (
    <div className={`flex flex-col items-center justify-center gap-3 ${inline ? '' : 'py-12'}`}>
      <div className="relative flex items-center justify-center">
        <div className={`${s.border} rounded-full border-2 border-veritas-100 border-t-veritas-500 animate-spin`} />
        <div className={`absolute ${s.wrapper} rounded-full bg-white flex items-center justify-center p-1.5 shadow-sm ring-2 ring-veritas-100`}>
          <img src="/veritas_university_logo.png" alt="" className={`${s.logo} object-contain`} />
        </div>
      </div>
      {text && <p className={`${s.text} text-gray-500 font-medium`}>{text}</p>}
    </div>
  )

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100 flex flex-col items-center">
          {spinner}
        </div>
      </div>
    )
  }

  return spinner
}
