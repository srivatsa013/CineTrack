import { useState } from 'react'
import { useYearInReview } from '../hooks/useQueries'
import { Star, Film, Calendar, TrendingUp, Repeat, ChevronDown } from 'lucide-react'
import { Link } from 'react-router-dom'

const TMDB_SM = 'https://image.tmdb.org/t/p/w185'
const TMDB_MD = 'https://image.tmdb.org/t/p/w300'

const TYPE_COLORS = {
  movie:  { bg: 'bg-blue-500/20',   text: 'text-blue-400',   bar: '#3b82f6' },
  series: { bg: 'bg-violet-500/20', text: 'text-violet-400', bar: '#8b5cf6' },
  anime:  { bg: 'bg-orange-500/20', text: 'text-orange-400', bar: '#f97316' },
}

const GENRE_PALETTE = [
  '#e8ff47','#4ade80','#60a5fa','#f472b6','#fb923c',
  '#a78bfa','#34d399','#f87171','#38bdf8','#fbbf24',
]

// ── Subcomponents ─────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color = 'text-accent' }) {
  return (
    <div className="bg-surface-800 border border-white/5 rounded-2xl p-6 flex flex-col gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className={`text-3xl font-bold ${color}`}>{value}</p>
        <p className="text-white font-medium mt-0.5">{label}</p>
        {sub && <p className="text-zinc-600 text-xs mt-1">{sub}</p>}
      </div>
    </div>
  )
}

function BarChart({ data, maxVal, color = '#e8ff47', label }) {
  const max = maxVal || Math.max(...data.map(d => d.count), 1)
  return (
    <div>
      {label && <p className="text-xs text-zinc-600 uppercase tracking-widest mb-4">{label}</p>}
      <div className="flex items-end gap-1 h-28">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
            <div
              className="w-full rounded-t-sm transition-all duration-500 relative"
              style={{
                height: `${max > 0 ? Math.round((d.count / max) * 100) : 0}%`,
                background: color,
                minHeight: d.count > 0 ? 4 : 0,
                opacity: 0.85,
              }}
            >
              {d.count > 0 && (
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-white bg-black/80 px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {d.count}
                </div>
              )}
            </div>
            <span className="text-[9px] text-zinc-700 mt-1">{d.month || d.rating}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function GenreBar({ genre, count, total, avg, color, rank }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-zinc-700 w-4 shrink-0 tabular-nums">{rank}</span>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-white">{genre}</span>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500">{count} titles</span>
            <span className="flex items-center gap-0.5 text-xs text-accent">
              <Star size={9} fill="currentColor" /> {avg}
            </span>
          </div>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: color }}
          />
        </div>
      </div>
    </div>
  )
}

function PosterRow({ items, size = 'sm' }) {
  const imgBase = size === 'sm' ? TMDB_SM : TMDB_MD
  return (
    <div className="flex gap-3">
      {items.map((item, i) => (
        <Link
          key={item.content_id || i}
          to={item.content_id ? `/content/${item.content_id}` : '#'}
          className="content-card-wrap flex-1 block rounded-xl overflow-hidden border border-white/5"
        >
          <div className="aspect-[2/3]">
            <img
              src={item.poster_path ? `${imgBase}${item.poster_path}` : 'https://via.placeholder.com/185x278/111/333?text=+'}
              alt={item.title}
              className="card-poster w-full h-full object-cover"
            />
          </div>
          <div className="p-2 text-center">
            <p className="text-[10px] text-zinc-400 line-clamp-1">{item.title}</p>
            {item.rating && (
              <span className="flex items-center justify-center gap-0.5 mt-0.5">
                <Star size={8} className="text-accent" fill="currentColor" />
                <span className="text-[10px] text-accent font-bold">{item.rating}</span>
              </span>
            )}
            {item.rewatch_count > 0 && (
              <p className="text-[10px] text-zinc-600 mt-0.5">↻ {item.rewatch_count}×</p>
            )}
          </div>
        </Link>
      ))}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function YearInReviewPage() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const { data, isLoading } = useYearInReview(year)
  const availableYears = [currentYear, currentYear - 1, currentYear - 2]

  return (
    <div className="min-h-screen pb-16">
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a0a 50%, #0a0a0a 100%)' }}>
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, #e8ff47 0%, transparent 50%), radial-gradient(circle at 80% 50%, #4ade80 0%, transparent 50%)'
        }} />
        <div className="relative px-6 py-14 max-w-4xl mx-auto text-center">
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Your Year in Film</p>
          <h1 className="font-display text-6xl italic text-white mb-4">
            {year} <span className="text-accent">Wrapped</span>
          </h1>

          {/* Year selector */}
          <div className="relative inline-block">
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="appearance-none bg-white/10 border border-white/10 text-white rounded-xl px-4 py-2 pr-8 text-sm cursor-pointer focus:outline-none focus:border-accent/50"
            >
              {availableYears.map(y => (
                <option key={y} value={y} className="bg-surface-800">{y}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="px-6 max-w-4xl mx-auto mt-8 space-y-10">
        {isLoading && (
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
          </div>
        )}

        {!isLoading && data?.empty && (
          <div className="text-center py-20">
            <Film size={48} className="mx-auto mb-4 text-zinc-800" />
            <p className="font-display text-2xl italic text-zinc-600">No films logged in {year}</p>
            <p className="text-zinc-700 text-sm mt-2">Start rating titles to build your year in review.</p>
          </div>
        )}

        {!isLoading && data && !data.empty && (
          <>
            {/* Top stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={Film}       label="Titles rated"    value={data.total_titles}    color="text-accent" />
              <StatCard icon={Star}       label="Average rating"  value={`${data.avg_rating}/5`} color="text-yellow-400" sub="across all titles" />
              <StatCard icon={Calendar}   label="Most active"     value={data.most_active_month || '—'} color="text-blue-400" sub="month of the year" />
              <StatCard icon={TrendingUp} label="Top genre"       value={data.top_genres?.[0]?.genre || '—'} color="text-green-400" sub={`${data.top_genres?.[0]?.count || 0} titles`} />
            </div>

            {/* Monthly activity */}
            <div className="bg-surface-800 border border-white/5 rounded-2xl p-6">
              <BarChart data={data.monthly_activity} color="#e8ff47" label="Monthly activity" />
            </div>

            {/* Top genres */}
            <div className="bg-surface-800 border border-white/5 rounded-2xl p-6">
              <p className="text-xs text-zinc-600 uppercase tracking-widest mb-5">Top genres</p>
              <div className="space-y-4">
                {data.top_genres?.map((g, i) => (
                  <GenreBar
                    key={g.genre}
                    genre={g.genre}
                    count={g.count}
                    total={data.total_titles}
                    avg={g.avg_rating}
                    color={GENRE_PALETTE[i % GENRE_PALETTE.length]}
                    rank={i + 1}
                  />
                ))}
              </div>
            </div>

            {/* Top rated */}
            {data.top_rated?.length > 0 && (
              <div className="bg-surface-800 border border-white/5 rounded-2xl p-6">
                <p className="text-xs text-zinc-600 uppercase tracking-widest mb-5">Highest rated</p>
                <PosterRow items={data.top_rated} size="sm" />
              </div>
            )}

            {/* Rating distribution */}
            <div className="bg-surface-800 border border-white/5 rounded-2xl p-6">
              <BarChart
                data={data.rating_distribution.map(d => ({ ...d, month: `${d.rating}★` }))}
                color="#e8ff47"
                label="Rating distribution"
              />
            </div>

            {/* Type breakdown */}
            {data.type_breakdown && Object.keys(data.type_breakdown).length > 0 && (
              <div className="bg-surface-800 border border-white/5 rounded-2xl p-6">
                <p className="text-xs text-zinc-600 uppercase tracking-widest mb-5">What you watched</p>
                <div className="flex gap-4">
                  {Object.entries(data.type_breakdown).map(([type, count]) => {
                    const colors = TYPE_COLORS[type] || TYPE_COLORS.movie
                    return (
                      <div key={type} className={`flex-1 rounded-xl p-4 ${colors.bg} border border-white/5`}>
                        <p className={`text-3xl font-bold ${colors.text}`}>{count}</p>
                        <p className="text-zinc-400 text-sm capitalize mt-1">{type === 'series' ? 'Series' : type.charAt(0).toUpperCase() + type.slice(1)}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Most rewatched */}
            {data.most_rewatched?.length > 0 && (
              <div className="bg-surface-800 border border-white/5 rounded-2xl p-6">
                <p className="text-xs text-zinc-600 uppercase tracking-widest mb-5">
                  <Repeat size={11} className="inline mr-1.5" />Most rewatched
                </p>
                <PosterRow items={data.most_rewatched} size="sm" />
              </div>
            )}

            {/* First and last */}
            {(data.first_watch || data.last_watch) && (
              <div className="grid grid-cols-2 gap-4">
                {data.first_watch && (
                  <div className="bg-surface-800 border border-white/5 rounded-2xl p-5">
                    <p className="text-xs text-zinc-600 uppercase tracking-widest mb-3">First of the year</p>
                    <p className="font-medium text-white">{data.first_watch.title}</p>
                    <p className="text-xs text-zinc-600 mt-1">{data.first_watch.date}</p>
                  </div>
                )}
                {data.last_watch && (
                  <div className="bg-surface-800 border border-white/5 rounded-2xl p-5">
                    <p className="text-xs text-zinc-600 uppercase tracking-widest mb-3">Last of the year</p>
                    <p className="font-medium text-white">{data.last_watch.title}</p>
                    <p className="text-xs text-zinc-600 mt-1">{data.last_watch.date}</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}