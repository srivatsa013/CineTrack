import { Link } from 'react-router-dom'
import { Star } from 'lucide-react'
import clsx from 'clsx'

const TMDB_IMG = 'https://image.tmdb.org/t/p/w300'
const PLACEHOLDER = 'https://via.placeholder.com/300x450/111/333?text=+'
const TYPE_COLOR = { movie: 'bg-blue-500', series: 'bg-violet-500', anime: 'bg-orange-500' }

export default function ContentCard({ content, compact = false, className }) {
  const poster = content.poster_path ? `${TMDB_IMG}${content.poster_path}` : PLACEHOLDER
  const rating = content.avg_user_rating ?? content.vote_average
  const year = content.release_date?.slice(0, 4)

  if (compact) {
    return (
      <Link
        to={`/content/${content.id}`}
        className={clsx('compact-card relative block rounded-md overflow-hidden bg-surface-700 cursor-pointer', className)}
      >
        <div className="aspect-[2/3]">
          <img src={poster} alt={content.title} className="card-poster w-full h-full object-cover" loading="lazy" />
        </div>
        <div className="compact-overlay absolute inset-0 flex flex-col justify-end p-2">
          <p className="text-white text-[11px] font-semibold leading-tight line-clamp-2">{content.title}</p>
          {rating != null && (
            <span className="flex items-center gap-0.5 mt-0.5">
              <Star size={9} className="text-accent" fill="currentColor" />
              <span className="text-[10px] text-accent font-bold">{Number(rating).toFixed(1)}</span>
            </span>
          )}
        </div>
      </Link>
    )
  }

  return (
    <Link
      to={`/content/${content.id}`}
      className={clsx('content-card-wrap relative block rounded-xl overflow-hidden bg-surface-800 border border-white/5', className)}
    >
      <div className="aspect-[2/3] overflow-hidden relative">
        <img src={poster} alt={content.title} className="card-poster w-full h-full object-cover" loading="lazy" />
        <div
          className="card-overlay absolute inset-0 flex flex-col justify-end p-3"
          style={{ background: 'linear-gradient(to top,rgba(0,0,0,.95) 0%,rgba(0,0,0,.3) 50%,transparent 100%)' }}
        >
          <span className={clsx('text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full w-fit mb-1.5 uppercase tracking-wider', TYPE_COLOR[content.type] || 'bg-zinc-600')}>
            {content.type}
          </span>
          <p className="text-white text-xs font-semibold leading-tight line-clamp-2">{content.title}</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-zinc-400 text-[10px]">{year}</span>
            {rating != null && (
              <span className="flex items-center gap-0.5">
                <Star size={9} className="text-accent" fill="currentColor" />
                <span className="text-[10px] text-accent font-bold">{Number(rating).toFixed(1)}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}