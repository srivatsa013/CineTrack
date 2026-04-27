import { useState } from 'react'
import { Sparkles, SlidersHorizontal, X, EyeOff, Info } from 'lucide-react'
import { useRecommendations, useMarkNotInterested, useGenrePrefs, useUpdateGenrePrefs } from '../hooks/useQueries'
import { SkeletonGrid } from '../components/ui/SkeletonCard'
import ContentCard from '../components/content/ContentCard'

const TABS = [
  { key: null,     label: 'All' },
  { key: 'movie',  label: 'Movies' },
  { key: 'series', label: 'Series' },
  { key: 'anime',  label: 'Anime' },
]

const ALL_GENRES = [
  'Action','Adventure','Animation','Comedy','Crime','Documentary',
  'Drama','Family','Fantasy','History','Horror','Music',
  'Mystery','Romance','Science Fiction','Thriller','War','Western',
]

function GenreSlider({ genre, value, onChange }) {
  const pct = Math.round(((value - 0.1) / 1.9) * 100)
  const label =
    value < 0.5 ? 'Avoid' :
    value < 0.9 ? 'Less'  :
    value > 1.8 ? 'Love'  :
    value > 1.4 ? 'More'  : 'Normal'
  const color =
    value < 0.9  ? 'text-red-400'   :
    value > 1.1  ? 'text-green-400' : 'text-zinc-600'

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-zinc-300 w-36 shrink-0">{genre}</span>
      <div className="flex-1 flex items-center gap-2">
        <input
          type="range" min="0.1" max="2.0" step="0.1"
          value={value}
          onChange={e => onChange(genre, parseFloat(e.target.value))}
          className="flex-1 accent-accent h-1"
        />
        <div className="w-4 h-4 rounded-full border border-white/10 flex items-center justify-center overflow-hidden">
          <div className="rounded-full bg-accent" style={{ width: `${pct}%`, height: `${pct}%`, minWidth: 4, minHeight: 4 }} />
        </div>
      </div>
      <span className={`text-xs w-12 text-right shrink-0 ${color}`}>{label}</span>
    </div>
  )
}

function GenrePanel({ onClose }) {
  const { data: savedPrefs } = useGenrePrefs()
  const [prefs, setPrefs] = useState(() => {
    const base = {}
    ALL_GENRES.forEach(g => base[g] = savedPrefs?.[g] ?? 1.0)
    return base
  })
  const updatePrefs = useUpdateGenrePrefs()

  const handleReset = () => {
    const r = {}
    ALL_GENRES.forEach(g => r[g] = 1.0)
    setPrefs(r)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-lg p-6 max-h-[85vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-lg font-semibold">Genre preferences</h2>
            <p className="text-xs text-zinc-600 mt-0.5">Shift sliders to tune your recommendations</p>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={17} /></button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-1">
          {ALL_GENRES.map(g => (
            <GenreSlider key={g} genre={g} value={prefs[g] ?? 1.0} onChange={(g, v) => setPrefs(p => ({ ...p, [g]: v }))} />
          ))}
        </div>

        <div className="flex gap-3 pt-4 border-t border-white/5 mt-2">
          <button onClick={handleReset} className="btn-ghost flex-1 border border-white/10 text-sm">Reset all</button>
          <button
            onClick={() => { updatePrefs.mutate(prefs); onClose() }}
            disabled={updatePrefs.isPending}
            className="btn-primary flex-1 text-sm"
          >
            {updatePrefs.isPending ? 'Saving…' : 'Save preferences'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function RecommendationsPage() {
  const [filter, setFilter] = useState(null)
  const [showGenre, setShowGenre] = useState(false)
  const { data: recs, isLoading, refetch } = useRecommendations(24, filter)
  const markNotInterested = useMarkNotInterested()

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="px-6 pt-8 pb-6 border-b border-white/5">
        <div className="max-w-7xl mx-auto flex items-end justify-between">
          <div>
            <p className="text-xs text-zinc-600 uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <Sparkles size={11} /> Personalised
            </p>
            <h1 className="font-display text-4xl italic text-white">For You</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowGenre(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-zinc-400 hover:text-white text-sm transition-all duration-200">
              <SlidersHorizontal size={14} /> Genres
            </button>
            <button onClick={() => refetch()}
              className="px-3 py-2 rounded-lg border border-white/10 text-zinc-400 hover:text-white text-sm transition-all duration-200">
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 max-w-7xl mx-auto">
        {/* Info strip */}
        <div className="flex items-start gap-3 bg-white/3 border border-white/5 rounded-xl p-4 mb-6">
          <Info size={14} className="text-zinc-600 mt-0.5 shrink-0" />
          <p className="text-xs text-zinc-500 leading-relaxed">
            Rate at least <span className="text-white">5 titles</span> for personalised results.
            Use <span className="text-white">Genres</span> to boost or reduce specific categories.
            Hover cards and click <EyeOff size={10} className="inline mx-0.5" /> to hide permanently.
          </p>
        </div>

        {/* Type tabs */}
        <div className="flex gap-1 mb-6 bg-white/3 p-1 rounded-xl w-fit">
          {TABS.map(({ key, label }) => (
            <button key={String(key)} onClick={() => setFilter(key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                filter === key ? 'bg-accent text-black' : 'text-zinc-500 hover:text-white'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {isLoading && <SkeletonGrid count={12} />}

        {!isLoading && recs?.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {recs.map(c => (
              <div key={c.id} className="relative group">
                <ContentCard content={c} />
                {/* Score bar */}
                <div className="absolute bottom-16 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="bg-black/60 rounded-full h-0.5 overflow-hidden">
                    <div className="h-full bg-accent rounded-full"
                      style={{ width: `${Math.round((c.recommendation_score || 0) * 100)}%` }} />
                  </div>
                </div>
                {/* Not interested */}
                <button
                  onClick={() => markNotInterested.mutate(c.id)}
                  title="Not interested"
                  className="absolute top-2 left-2 p-1.5 bg-black/70 backdrop-blur-sm text-zinc-400 hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
                >
                  <EyeOff size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {!isLoading && (!recs || recs.length === 0) && (
          <div className="text-center py-28">
            <Sparkles size={44} className="mx-auto mb-4 text-zinc-800" />
            <p className="font-display text-2xl italic text-zinc-600 mb-2">Nothing yet</p>
            <p className="text-zinc-700 text-sm max-w-xs mx-auto">
              Rate some titles you've already watched to get started. The more you rate, the better it gets.
            </p>
          </div>
        )}
      </div>

      {showGenre && <GenrePanel onClose={() => setShowGenre(false)} />}
    </div>
  )
}