import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Star, Film, List, Clock, Edit2, Check } from 'lucide-react'
import { useMyRatings, useWatchlist } from '../hooks/useQueries'
import { useAuthStore } from '../context/authStore'
import { authApi } from '../api/client'
import { SkeletonProfile } from '../components/ui/SkeletonCard'
import toast from 'react-hot-toast'

const TMDB_SM = 'https://image.tmdb.org/t/p/w185'
const TMDB_MD = 'https://image.tmdb.org/t/p/w300'

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function StatBox({ value, label }) {
  return (
    <div className="text-center">
      <p className="text-2xl font-semibold text-white tabular-nums">{value}</p>
      <p className="text-xs text-zinc-500 mt-0.5 uppercase tracking-wider">{label}</p>
    </div>
  )
}

export default function ProfilePage() {
  const { user, refreshMe } = useAuthStore()
  const { data: ratingsData, isLoading } = useMyRatings()
  const { data: watchlistAll } = useWatchlist(undefined)
  const { data: completed } = useWatchlist('completed')

  const [editingBio, setEditingBio] = useState(false)
  const [bioVal, setBioVal] = useState(user?.bio || '')

  const ratings = ratingsData?.ratings || []
  const avgRating = ratings.length
    ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1)
    : null

  // Last 4 rated as "recent activity"
  const recentRatings = ratings.slice(0, 8)

  // Top 4 highest-rated as "favorites"
  const favorites = [...ratings].sort((a, b) => b.rating - a.rating).slice(0, 4)

  // Backdrop: use poster from top rated item
  const backdropContent = ratings[0]
  const backdropUrl = backdropContent?.content_poster
    ? `https://image.tmdb.org/t/p/w1280${backdropContent.content_poster}`
    : null

  const handleSaveBio = async () => {
    try {
      await authApi.updateProfile({ bio: bioVal })
      await refreshMe()
      toast.success('Bio updated')
      setEditingBio(false)
    } catch { toast.error('Failed to save') }
  }

  // Build diary (ratings by date, most recent first)
  const diary = [...ratings]
    .filter(r => r.updated_at)
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .slice(0, 12)

  // Group diary by month
  const diaryGrouped = diary.reduce((acc, r) => {
    const d = new Date(r.updated_at)
    const key = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    const day = d.getDate()
    if (!acc[key]) acc[key] = []
    acc[key].push({ ...r, day })
    return acc
  }, {})

  if (isLoading) return <SkeletonProfile />

  return (
    <div className="min-h-screen">
      {/* Hero backdrop */}
      <div className="relative h-52 md:h-64 overflow-hidden">
        {backdropUrl ? (
          <>
            <img src={backdropUrl} alt="" className="w-full h-full object-cover object-top" />
            <div className="absolute inset-0" style={{background:'linear-gradient(to bottom, rgba(10,10,10,0) 0%, rgba(10,10,10,0.7) 70%, rgba(10,10,10,1) 100%)'}} />
          </>
        ) : (
          <div className="w-full h-full" style={{background:'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'}} />
        )}
      </div>

      <div className="px-6 max-w-5xl mx-auto -mt-16 relative z-10">
        {/* Avatar + name row */}
        <div className="flex items-end gap-5 mb-6">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-surface-900 bg-accent flex items-center justify-center text-3xl font-bold text-black shrink-0">
            {user?.display_name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="pb-1 flex-1 min-w-0">
            <h1 className="text-2xl font-semibold text-white">{user?.display_name}</h1>
            <p className="text-zinc-500 text-sm">@{user?.username}</p>
          </div>
        </div>

        {/* Bio */}
        <div className="mb-6">
          {editingBio ? (
            <div className="flex gap-2 max-w-md">
              <input
                className="input text-sm flex-1"
                value={bioVal}
                onChange={e => setBioVal(e.target.value)}
                placeholder="Write a short bio..."
                maxLength={200}
                autoFocus
              />
              <button onClick={handleSaveBio} className="btn-primary px-3 py-2"><Check size={15} /></button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-zinc-400 text-sm italic">{user?.bio || 'No bio yet'}</p>
              <button onClick={() => setEditingBio(true)} className="text-zinc-700 hover:text-zinc-400 transition-colors">
                <Edit2 size={13} />
              </button>
            </div>
          )}
        </div>

        {/* Stats strip */}
        <div className="flex items-center gap-8 mb-10 pb-6 border-b border-white/5">
          <StatBox value={ratingsData?.total || 0} label="Films" />
          <StatBox value={completed?.total || 0} label="Completed" />
          <StatBox value={watchlistAll?.total || 0} label="Watchlist" />
          <StatBox value={avgRating || '—'} label="Avg Rating" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Left column */}
          <div className="md:col-span-2 space-y-10">
            {/* Favorite films */}
            {favorites.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">Favorite Films</h2>
                <div className="flex gap-3">
                  {favorites.map((r) => (
                    <Link key={r.id} to={`/content/${r.content_id}`}
                      className="content-card-wrap flex-1 block rounded-lg overflow-hidden border border-white/5">
                      <div className="aspect-[2/3]">
                        <img
                          src={r.content_poster ? `${TMDB_MD}${r.content_poster}` : 'https://via.placeholder.com/300x450/111/333?text=+'}
                          alt={r.content_title}
                          className="card-poster w-full h-full object-cover"
                        />
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Recent activity */}
            {recentRatings.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">Recent Activity</h2>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {recentRatings.map((r) => (
                    <Link key={r.id} to={`/content/${r.content_id}`}
                      className="compact-card relative block rounded-md overflow-hidden">
                      <div className="aspect-[2/3]">
                        <img
                          src={r.content_poster ? `${TMDB_SM}${r.content_poster}` : 'https://via.placeholder.com/185x278/111/333?text=+'}
                          alt={r.content_title}
                          className="card-poster w-full h-full object-cover"
                        />
                      </div>
                      <div className="compact-overlay absolute inset-0 flex flex-col justify-end p-1.5">
                        <div className="flex items-center gap-0.5">
                          <Star size={8} className="text-accent" fill="currentColor" />
                          <span className="text-[9px] text-accent font-bold">{r.rating}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right column — Diary */}
          <div>
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">Diary</h2>
            {Object.keys(diaryGrouped).length === 0 && (
              <p className="text-zinc-700 text-sm">Start rating films to build your diary.</p>
            )}
            {Object.entries(diaryGrouped).map(([month, entries]) => (
              <div key={month} className="mb-5">
                <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-2">{month}</p>
                <div className="space-y-1.5">
                  {entries.map((r) => (
                    <Link key={r.id} to={`/content/${r.content_id}`}
                      className="flex items-center gap-3 group hover:bg-white/3 rounded-lg px-2 py-1.5 -mx-2 transition-colors">
                      <span className="text-xs text-zinc-600 w-5 shrink-0 tabular-nums">{r.day}</span>
                      <p className="flex-1 text-sm text-zinc-300 group-hover:text-white transition-colors line-clamp-1 min-w-0">
                        {r.content_title}
                      </p>
                      <span className="flex items-center gap-0.5 shrink-0">
                        {Array.from({length: r.rating}).map((_, i) => (
                          <Star key={i} size={8} className="text-accent" fill="currentColor" />
                        ))}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}