import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Star, Plus, Check, Eye, BookmarkPlus, Users, ChevronDown, FolderPlus } from 'lucide-react'
import {
  useContentDetail, useContentRatings, useSimilarContent,
  useAddToWatchlist, useMyRatings, useCollections, useAddToCollection,
} from '../hooks/useQueries'
import ContentCard from '../components/content/ContentCard'
import RatingModal from '../components/ratings/RatingModal'
import StarRating from '../components/ratings/StarRating'
import { SkeletonDetail } from '../components/ui/SkeletonCard'

const TMDB_W500  = 'https://image.tmdb.org/t/p/w500'
const TMDB_W1280 = 'https://image.tmdb.org/t/p/w1280'

const STATUS_OPTIONS = [
  { value: 'plan_to_watch', label: 'Plan to watch', icon: BookmarkPlus },
  { value: 'watching',      label: 'Watching',       icon: Eye },
  { value: 'completed',     label: 'Completed',      icon: Check },
  { value: 'dropped',       label: 'Dropped',        icon: null },
]

function AddToCollectionMenu({ contentId }) {
  const [open, setOpen] = useState(false)
  const { data: collections } = useCollections()
  const add = useAddToCollection()

  if (!collections?.length) return null

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-zinc-400 hover:text-white hover:border-white/20 text-sm transition-all duration-200"
      >
        <FolderPlus size={15} /> Add to list
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-52 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl z-20 overflow-hidden">
          {collections.map(col => (
            <button
              key={col.id}
              className="w-full text-left px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5 hover:text-white transition-colors flex items-center justify-between"
              onClick={() => { add.mutate({ colId: col.id, contentId }); setOpen(false) }}
            >
              <span className="truncate">{col.name}</span>
              <span className="text-xs text-zinc-700 shrink-0 ml-2">{col.content_count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ContentDetailPage() {
  const { id } = useParams()
  const { data: content, isLoading } = useContentDetail(id)
  const { data: ratingsData }        = useContentRatings(id)
  const { data: myRatingsData }      = useMyRatings()
  const { data: similar }            = useSimilarContent(id)
  const addToWatchlist               = useAddToWatchlist()

  const [showRatingModal, setShowRatingModal] = useState(false)
  const [showStatusMenu,  setShowStatusMenu]  = useState(false)

  const myRating = myRatingsData?.ratings?.find(r => r.content_id === id)

  if (isLoading) return <SkeletonDetail />
  if (!content)  return <div className="p-6 text-zinc-500">Content not found.</div>

  const backdrop  = content.backdrop_path ? `${TMDB_W1280}${content.backdrop_path}` : null
  const poster    = content.poster_path   ? `${TMDB_W500}${content.poster_path}`    : null
  const year      = content.release_date?.slice(0, 4)

  return (
    <div className="min-h-screen">
      {/* Backdrop */}
      {backdrop && (
        <div className="relative h-64 md:h-80 overflow-hidden">
          <img src={backdrop} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(to bottom, transparent 0%, rgba(10,10,10,0.7) 60%, rgba(10,10,10,1) 100%)' }} />
        </div>
      )}

      <div className="px-6 pb-12 max-w-5xl mx-auto">
        {/* Main info */}
        <div className={`flex gap-6 ${backdrop ? '-mt-28 relative z-10' : 'mt-8'}`}>
          {/* Poster */}
          {poster && (
            <div className="shrink-0 hidden sm:block w-40 md:w-48 rounded-xl overflow-hidden border border-white/10 shadow-2xl">
              <img src={poster} alt={content.title} className="w-full h-full object-cover" />
            </div>
          )}

          {/* Info */}
          <div className="flex-1 pt-2 min-w-0">
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
                content.type === 'movie' ? 'bg-blue-500/20 text-blue-400' :
                content.type === 'anime' ? 'bg-orange-500/20 text-orange-400' :
                'bg-violet-500/20 text-violet-400'
              }`}>{content.type}</span>
              {content.original_language && content.original_language !== 'en' && (
                <span className="text-[10px] bg-white/5 text-zinc-500 px-2 py-1 rounded-full uppercase">
                  {content.original_language}
                </span>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-semibold text-white mb-1 leading-tight">{content.title}</h1>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {year && <span className="text-sm text-zinc-500">{year}</span>}
              {content.genres?.slice(0, 3).map(g => (
                <span key={g} className="text-xs bg-white/5 text-zinc-400 px-2.5 py-1 rounded-full">{g}</span>
              ))}
            </div>

            {/* Ratings */}
            <div className="flex flex-wrap items-center gap-5 mb-5">
              {content.vote_average != null && (
                <div className="flex items-center gap-1.5">
                  <Star size={13} className="text-yellow-400" fill="currentColor" />
                  <span className="text-sm font-semibold text-yellow-400">{content.vote_average.toFixed(1)}</span>
                  <span className="text-xs text-zinc-600">TMDB</span>
                </div>
              )}
              {content.avg_user_rating != null && (
                <div className="flex items-center gap-1.5">
                  <Users size={13} className="text-accent" />
                  <span className="text-sm font-semibold text-accent">{content.avg_user_rating}</span>
                  <span className="text-xs text-zinc-600">({content.user_rating_count} ratings)</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowRatingModal(true)}
                className="btn-primary flex items-center gap-2 text-sm px-4 py-2"
              >
                <Star size={14} />
                {myRating ? `Your rating: ${myRating.rating}/5` : 'Rate this'}
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowStatusMenu(v => !v)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-zinc-400 hover:text-white hover:border-white/20 text-sm transition-all duration-200"
                >
                  <Plus size={14} /> Watchlist <ChevronDown size={12} />
                </button>
                {showStatusMenu && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl z-20 overflow-hidden">
                    {STATUS_OPTIONS.map(({ value, label }) => (
                      <button
                        key={value}
                        className="w-full text-left px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5 hover:text-white transition-colors"
                        onClick={() => { addToWatchlist.mutate({ content_id: id, status: value }); setShowStatusMenu(false) }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <AddToCollectionMenu contentId={id} />
            </div>
          </div>
        </div>

        {/* Overview */}
        {content.overview && (
          <div className="mt-8">
            <h2 className="text-xs font-semibold text-zinc-600 uppercase tracking-widest mb-3">Overview</h2>
            <p className="text-zinc-300 text-sm leading-relaxed max-w-2xl">{content.overview}</p>
          </div>
        )}

        {/* Cast + director */}
        {(content.cast?.length > 0 || content.director) && (
          <div className="mt-6 flex flex-wrap gap-8">
            {content.director && (
              <div>
                <p className="text-xs text-zinc-600 uppercase tracking-widest mb-1">Director</p>
                <p className="text-sm text-white">{content.director}</p>
              </div>
            )}
            {content.cast?.length > 0 && (
              <div>
                <p className="text-xs text-zinc-600 uppercase tracking-widest mb-1">Cast</p>
                <p className="text-sm text-zinc-300">{content.cast.slice(0, 5).join(', ')}</p>
              </div>
            )}
          </div>
        )}

        {/* Reviews */}
        {ratingsData?.ratings?.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xs font-semibold text-zinc-600 uppercase tracking-widest mb-5">
              Reviews <span className="text-zinc-700 ml-1 font-normal normal-case">({ratingsData.total})</span>
            </h2>
            <div className="space-y-3 max-w-2xl">
              {ratingsData.ratings.map(r => (
                <div key={r.id} className="bg-surface-800 border border-white/5 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-[11px] font-bold text-black">
                        {r.display_name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <span className="text-sm font-medium text-white">{r.display_name || r.username}</span>
                    </div>
                    <StarRating value={r.rating} readOnly max={5} size={13} />
                  </div>
                  {r.review && (
                    <p className="text-sm text-zinc-400 leading-relaxed mt-2">
                      {r.contains_spoiler && (
                        <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded mr-2">Spoiler</span>
                      )}
                      {r.review}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* More like this */}
        {similar?.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xs font-semibold text-zinc-600 uppercase tracking-widest mb-5">More Like This</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {similar.map(c => <ContentCard key={c.id} content={c} />)}
            </div>
          </div>
        )}
      </div>

      {showRatingModal && (
        <RatingModal content={content} existingRating={myRating} onClose={() => setShowRatingModal(false)} />
      )}
    </div>
  )
}