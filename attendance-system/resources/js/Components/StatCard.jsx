const colorMap = {
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  green: 'bg-green-50 text-green-700 border-green-200',
  'veritas-green': 'bg-veritas-50 text-veritas-700 border-veritas-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
}

export default function StatCard({ title, value, icon, color = 'indigo' }) {
  const cardColor = colorMap[color] || colorMap.indigo
  return (
    <div className={`rounded-xl border p-6 ${cardColor} shadow-sm`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-75">{title}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
        </div>
        {icon && <span className="text-3xl opacity-75">{icon}</span>}
      </div>
    </div>
  )
}
