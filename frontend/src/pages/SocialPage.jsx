import { useState } from 'react'
import { Link } from 'react-router-dom'
import { UserPlus, Star, Users, MessageCircle } from 'lucide-react'
import { useFriends, useFeed, useSendFriendRequest, useAcceptFriendRequest } from '../hooks/useQueries'
import { useAuthStore } from '../context/authStore'

const TMDB_SM = 'https://image.tmdb.org/t/p/w92'

function timeAgo(date) {
  if (!date) return ''
  const diff = Date.now() - new Date(date).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function Avatar({ name, size = 9 }) {
  return (
    <div className={`w-${size} h-${size} rounded-full bg-accent flex items-center justify-center text-sm font-bold text-black shrink-0`}>
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  )
}

export default function SocialPage() {
  const [tab, setTab]         = useState('feed')
  const [addInput, setAddInput] = useState('')
  const { data: friends }       = useFriends()
  const { data: feedData, isLoading } = useFeed()
  const sendRequest             = useSendFriendRequest()
  const acceptRequest           = useAcceptFriendRequest()
  const { user }               = useAuthStore()
  const pendingRequests         = user?.friend_requests || []

  const handleAdd = async e => {
    e.preventDefault()
    if (!addInput.trim()) return
    await sendRequest.mutateAsync(addInput.trim())
    setAddInput('')
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="px-6 pt-8 pb-6 border-b border-white/5">
        <div className="max-w-3xl mx-auto flex items-end justify-between">
          <div>
            <p className="text-xs text-zinc-600 uppercase tracking-widest mb-1">Social</p>
            <h1 className="font-display text-4xl italic text-white">Friends</h1>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 max-w-3xl mx-auto">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white/3 p-1 rounded-xl w-fit">
          {['feed', 'friends'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 capitalize ${
                tab === t ? 'bg-accent text-black' : 'text-zinc-500 hover:text-white'
              }`}>{t}</button>
          ))}
        </div>

        {/* ── FEED ──────────────────────────────────────────────── */}
        {tab === 'feed' && (
          <>
            {isLoading && (
              <div className="space-y-3">
                {Array.from({length:4}).map((_,i) => (
                  <div key={i} className="skeleton h-24 rounded-xl" />
                ))}
              </div>
            )}

            {!isLoading && feedData?.feed?.length === 0 && (
              <div className="text-center py-20 text-zinc-700">
                <MessageCircle size={40} className="mx-auto mb-3" />
                <p className="font-medium">No activity yet</p>
                <p className="text-sm mt-1 text-zinc-800">Add friends to see their ratings here</p>
              </div>
            )}

            <div className="space-y-2">
              {feedData?.feed?.map(item => (
                <div key={item.id} className="bg-surface-800 border border-white/5 rounded-xl p-4 flex gap-3 hover:border-white/10 transition-colors">
                  <Avatar name={item.display_name || item.username} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-sm text-zinc-300 leading-snug">
                        <span className="font-semibold text-white">{item.display_name || item.username}</span>
                        <span className="text-zinc-600"> rated </span>
                        <Link to={`/content/${item.content_id}`} className="text-accent hover:text-white transition-colors">
                          {item.content_title}
                        </Link>
                      </p>
                      <span className="text-xs text-zinc-700 shrink-0">{timeAgo(item.timestamp)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {item.content_poster && (
                        <img src={`${TMDB_SM}${item.content_poster}`} alt="" className="w-8 h-11 object-cover rounded" />
                      )}
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          {Array.from({length: item.rating}).map((_,i) => (
                            <Star key={i} size={10} className="text-accent" fill="currentColor" />
                          ))}
                          <span className="text-xs text-zinc-600 ml-1">{item.rating}/5</span>
                        </div>
                        {item.review && (
                          <p className="text-xs text-zinc-500 line-clamp-2 italic">"{item.review}"</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── FRIENDS ───────────────────────────────────────────── */}
        {tab === 'friends' && (
          <div className="space-y-6">
            {/* Add friend */}
            <div className="bg-surface-800 border border-white/5 rounded-xl p-5">
              <h2 className="text-xs font-semibold text-zinc-600 uppercase tracking-widest mb-3">Add friend</h2>
              <form onSubmit={handleAdd} className="flex gap-2">
                <input className="input flex-1 text-sm" placeholder="Enter username…"
                  value={addInput} onChange={e => setAddInput(e.target.value)} />
                <button type="submit" disabled={sendRequest.isPending}
                  className="btn-primary px-4 flex items-center gap-1.5 text-sm">
                  <UserPlus size={14} /> Add
                </button>
              </form>
            </div>

            {/* Pending */}
            {pendingRequests.length > 0 && (
              <div className="bg-surface-800 border border-white/5 rounded-xl p-5">
                <h2 className="text-xs font-semibold text-zinc-600 uppercase tracking-widest mb-3">
                  Pending requests ({pendingRequests.length})
                </h2>
                <div className="space-y-2">
                  {pendingRequests.map(id => (
                    <div key={id} className="flex items-center justify-between">
                      <span className="text-sm text-zinc-400 font-mono">…{id.slice(-8)}</span>
                      <button onClick={() => acceptRequest.mutate(id)} className="btn-primary text-xs px-3 py-1.5">Accept</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Friends list */}
            <div>
              <h2 className="text-xs font-semibold text-zinc-600 uppercase tracking-widest mb-3">
                Friends ({friends?.length || 0})
              </h2>
              {(!friends || friends.length === 0) ? (
                <div className="text-center py-10 bg-surface-800 border border-white/5 rounded-xl text-zinc-700">
                  <Users size={32} className="mx-auto mb-2" />
                  <p className="text-sm">No friends yet. Add some above!</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {friends.map(f => (
                    <div key={f.id} className="bg-surface-800 border border-white/5 rounded-xl p-4 flex items-center gap-3 hover:border-white/10 transition-colors">
                      <Avatar name={f.display_name || f.username} />
                      <div className="flex-1">
                        <p className="font-medium text-sm text-white">{f.display_name || f.username}</p>
                        <p className="text-xs text-zinc-600">@{f.username}</p>
                      </div>
                      <Link to={`/social/compare/${f.id}`}
                        className="text-xs text-accent hover:text-white transition-colors px-3 py-1.5 bg-accent/10 hover:bg-accent/20 rounded-lg">
                        Compare
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}