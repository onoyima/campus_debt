export default function Pagination({ meta, onPageChange }) {
  if (!meta || meta.last_page <= 1) return null

  const { current_page, last_page, from, to, total } = meta

  const pages = []
  const delta = 2
  for (let i = 1; i <= last_page; i++) {
    if (i === 1 || i === last_page || (i >= current_page - delta && i <= current_page + delta)) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...')
    }
  }

  return (
    <div className="flex items-center justify-between border-t border-gray-100 bg-white px-4 py-3 sm:px-6">
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <p className="text-sm text-gray-500">
          Showing <span className="font-medium">{from}</span> to <span className="font-medium">{to}</span> of{' '}
          <span className="font-medium">{total}</span> results
        </p>
        <nav className="isolate inline-flex -space-x-px rounded-lg shadow-sm">
          <button
            onClick={() => onPageChange(current_page - 1)}
            disabled={current_page <= 1}
            className="relative inline-flex items-center rounded-l-lg px-3 py-2 text-sm font-medium text-gray-500 ring-1 ring-inset ring-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          {pages.map((page, idx) =>
            page === '...' ? (
              <span key={`dots-${idx}`} className="relative inline-flex items-center px-3 py-2 text-sm text-gray-400 ring-1 ring-inset ring-gray-200">
                ...
              </span>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`relative inline-flex items-center px-3 py-2 text-sm font-semibold ring-1 ring-inset ring-gray-200 ${
                  page === current_page
                    ? 'z-10 bg-veritas-500 text-white ring-veritas-500'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            )
          )}
          <button
            onClick={() => onPageChange(current_page + 1)}
            disabled={current_page >= last_page}
            className="relative inline-flex items-center rounded-r-lg px-3 py-2 text-sm font-medium text-gray-500 ring-1 ring-inset ring-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </nav>
      </div>

      {/* Mobile view */}
      <div className="flex sm:hidden flex-1 items-center justify-between">
        <button
          onClick={() => onPageChange(current_page - 1)}
          disabled={current_page <= 1}
          className="relative inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium text-gray-500 ring-1 ring-inset ring-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <p className="text-sm text-gray-500">
          Page <span className="font-medium">{current_page}</span> of <span className="font-medium">{last_page}</span>
        </p>
        <button
          onClick={() => onPageChange(current_page + 1)}
          disabled={current_page >= last_page}
          className="relative inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium text-gray-500 ring-1 ring-inset ring-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  )
}
