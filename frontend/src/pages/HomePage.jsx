import { useState } from 'react'
import { Flame, TrendingUp } from 'lucide-react'
import ContentCard from '../components/content/ContentCard'
import { SkeletonGrid } from '../components/ui/SkeletonCard'
import { useTrending } from '../hooks/useQueries'

const TABS = [
  { key: 'all',   label: 'All' },
  { key: 'movie', label: 'Movies' },
  { key: 'tv',    label: 'Series' },
]

function Section({ title, icon: Icon, items, loading }) {
  return (
    <section className="mb-12">
      <div className="flex items-center gap-2 mb-5">
        <Icon size={18} className="text-accent" />
        <h2 className="text-base font-semibold text-white">{title}</h2>
      </div>
      {loading
        ? <SkeletonGrid count={10} />
        : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {items?.slice(0, 10).map(c => <ContentCard key={c.id} content={c} />)}
          </div>
        )
      }
    </section>
  )
}

export default function HomePage() {
  const [tab, setTab] = useState('all')
  const { data: trending, isLoading } = useTrending(tab)

  return (
    <div className="min-h-screen">
      {/* Hero header */}
      <div className="px-6 pt-8 pb-6 border-b border-white/5">
        <div className="max-w-7xl mx-auto flex items-end justify-between">
          <div>
            <p className="text-xs text-zinc-600 uppercase tracking-widest mb-1">Discover</p>
            <h1 className="font-display text-4xl italic text-white">What's trending</h1>
          </div>

          {/* Trend type tabs */}
          <div className="flex gap-1 bg-white/3 p-1 rounded-xl">
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  tab === key
                    ? 'bg-accent text-black'
                    : 'text-zinc-500 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-6 py-8 max-w-7xl mx-auto">
        <Section
          title="Trending This Week"
          icon={Flame}
          items={trending}
          loading={isLoading}
        />
      </div>
    </div>
  )
}