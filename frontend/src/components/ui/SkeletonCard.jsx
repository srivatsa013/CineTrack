import clsx from 'clsx'

export function SkeletonCard({ compact = false, className }) {
  if (compact) {
    return <div className={clsx('skeleton aspect-[2/3] rounded-md', className)} />
  }
  return (
    <div className={clsx('rounded-xl overflow-hidden', className)}>
      <div className="skeleton aspect-[2/3]" />
    </div>
  )
}

export function SkeletonGrid({ count = 10, compact = false }) {
  const cols = compact
    ? 'grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-1.5'
    : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4'
  return (
    <div className={`grid ${cols}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} compact={compact} />
      ))}
    </div>
  )
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 p-3 rounded-xl border border-white/5">
      <div className="skeleton w-12 h-16 rounded-lg shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-3 w-2/3 rounded" />
        <div className="skeleton h-3 w-1/3 rounded" />
      </div>
    </div>
  )
}

export function SkeletonProfile() {
  return (
    <div>
      <div className="skeleton w-full h-56" />
      <div className="px-6 -mt-10">
        <div className="skeleton w-24 h-24 rounded-full mb-4" />
        <div className="skeleton h-6 w-48 rounded mb-2" />
        <div className="skeleton h-4 w-64 rounded mb-6" />
        <div className="flex gap-8">
          {Array.from({length:4}).map((_,i)=>(
            <div key={i} className="text-center">
              <div className="skeleton h-7 w-12 rounded mb-1 mx-auto" />
              <div className="skeleton h-3 w-14 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function SkeletonDetail() {
  return (
    <div className="p-6 max-w-5xl mx-auto animate-pulse">
      <div className="skeleton w-full h-72 rounded-none mb-0" />
      <div className="flex gap-6 mt-6">
        <div className="skeleton w-44 h-64 rounded-xl shrink-0" />
        <div className="flex-1 space-y-3">
          <div className="skeleton h-8 w-2/3 rounded" />
          <div className="skeleton h-4 w-1/3 rounded" />
          <div className="skeleton h-20 w-full rounded mt-4" />
        </div>
      </div>
    </div>
  )
}