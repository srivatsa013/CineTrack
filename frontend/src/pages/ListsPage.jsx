import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Trash2, ArrowRight, Star, ChevronDown, ChevronUp,
  Plus, X, Lock, Unlock, FolderOpen, BookOpen, List,
  Users, UserPlus, Crown, Film
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  useWatchlist, useUpdateWatchlist, useRemoveFromWatchlist,
  useAddEpisodeNote, useDeleteEpisodeNote,
  useSharedWatchlists, useSharedWatchlist,
  useCreateSharedWatchlist, useInviteToSharedWatchlist,
  useRemoveFromSharedWatchlist,
} from '../hooks/useQueries'
import { collectionsApi, sharedWatchlistApi } from '../api/client'
import { SkeletonRow } from '../components/ui/SkeletonCard'
import StarRating from '../components/ratings/StarRating'
import ContentCard from '../components/content/ContentCard'
import { useAuthStore } from '../context/authStore'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const TMDB_SM = 'https://image.tmdb.org/t/p/w92'
const TMDB_MD = 'https://image.tmdb.org/t/p/w185'

const WATCH_STATUSES = [
  { value: undefined,        label: 'All' },
  { value: 'plan_to_watch',  label: 'Plan to Watch' },
  { value: 'watching',       label: 'Watching' },
  { value: 'completed',      label: 'Completed' },
  { value: 'on_hold',        label: 'On Hold' },
  { value: 'dropped',        label: 'Dropped' },
]

const STATUS_COLORS = {
  plan_to_watch: 'text-blue-400 bg-blue-400/10',
  watching:      'text-green-400 bg-green-400/10',
  completed:     'text-accent bg-accent/10',
  on_hold:       'text-yellow-400 bg-yellow-400/10',
  dropped:       'text-red-400 bg-red-400/10',
}

// ─────────────────────────────────────────────────────────────────────────────
// EPISODE JOURNAL
// ─────────────────────────────────────────────────────────────────────────────

function EpisodeJournal({ item }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ episode_ref: '', description: '', episode_rating: 0, watched_on: '' })
  const addNote    = useAddEpisodeNote()
  const deleteNote = useDeleteEpisodeNote()
  const notes      = item.episode_notes || []

  const handleAdd = () => {
    if (!form.episode_ref || !form.description) return
    addNote.mutate({ entryId: item.id, data: { ...form, episode_rating: form.episode_rating || null, watched_on: form.watched_on || null } })
    setForm({ episode_ref: '', description: '', episode_rating: 0, watched_on: '' })
    setShowForm(false)
  }

  return (
    <div className="mt-4 pt-4 border-t border-white/5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BookOpen size={13} className="text-zinc-500" />
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Episode Journal</p>
        </div>
        <button onClick={() => setShowForm(v => !v)} className="flex items-center gap-1 text-xs text-accent hover:text-white transition-colors">
          <Plus size={11} /> Add entry
        </button>
      </div>

      {showForm && (
        <div className="bg-white/3 rounded-xl p-4 mb-4 border border-white/5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-600 block mb-1">Episode / reference</label>
              <input className="input text-sm py-1.5" placeholder="S02E05, The finale…"
                value={form.episode_ref} onChange={e => setForm(f => ({ ...f, episode_ref: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-zinc-600 block mb-1">Watched on</label>
              <input type="date" className="input text-sm py-1.5"
                value={form.watched_on} onChange={e => setForm(f => ({ ...f, watched_on: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-600 block mb-1">Your thoughts — anything goes</label>
            <textarea className="input resize-none h-20 text-sm" maxLength={1000}
              placeholder="What happened, how you felt, favourite moments…"
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-zinc-600 block mb-2">Episode rating</label>
            <StarRating value={form.episode_rating} onChange={v => setForm(f => ({ ...f, episode_rating: v }))} max={5} size={18} />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="btn-ghost text-sm px-3 py-1.5 border border-white/10">Cancel</button>
            <button onClick={handleAdd} disabled={!form.episode_ref || !form.description || addNote.isPending} className="btn-primary text-sm px-4 py-1.5">
              Save entry
            </button>
          </div>
        </div>
      )}

      {notes.length === 0 && !showForm && <p className="text-xs text-zinc-700 italic">No journal entries yet.</p>}
      <div className="space-y-2">
        {notes.map(note => (
          <div key={note.note_id} className="group flex gap-3 bg-white/3 rounded-lg p-3 border border-white/5">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xs font-semibold text-accent">{note.episode_ref}</span>
                {note.episode_rating && <span className="flex items-center gap-0.5 text-xs text-yellow-400"><Star size={9} fill="currentColor" /> {note.episode_rating}/5</span>}
                {note.watched_on && <span className="text-xs text-zinc-600">{note.watched_on}</span>}
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{note.description}</p>
            </div>
            <button onClick={() => deleteNote.mutate({ entryId: item.id, noteId: note.note_id })}
              className="shrink-0 p-1 text-zinc-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// WATCHLIST ENTRY PANEL
// ─────────────────────────────────────────────────────────────────────────────

function EntryPanel({ item, onSave }) {
  const [form, setForm] = useState({
    rewatch_count: item.rewatch_count || 0,
    progress: item.progress || '',
    started_date: item.started_date || '',
    finished_date: item.finished_date || '',
    notes: item.notes || '',
  })
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="mt-3 pt-3 border-t border-white/5 space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="text-xs text-zinc-600 block mb-1">Times watched</label>
          <input type="number" min="0" className="input text-sm py-1.5" value={form.rewatch_count} onChange={set('rewatch_count')} />
        </div>
        <div>
          <label className="text-xs text-zinc-600 block mb-1">{item.content_type === 'movie' ? 'Progress (mins)' : 'Episode'}</label>
          <input type="number" min="0" className="input text-sm py-1.5" placeholder="e.g. 12" value={form.progress} onChange={set('progress')} />
        </div>
        <div>
          <label className="text-xs text-zinc-600 block mb-1">Started</label>
          <input type="date" className="input text-sm py-1.5" value={form.started_date} onChange={set('started_date')} />
        </div>
        <div>
          <label className="text-xs text-zinc-600 block mb-1">Finished</label>
          <input type="date" className="input text-sm py-1.5" value={form.finished_date} onChange={set('finished_date')} />
        </div>
      </div>
      <div>
        <label className="text-xs text-zinc-600 block mb-1">Private notes</label>
        <textarea className="input resize-none h-14 text-sm" value={form.notes} onChange={set('notes')} placeholder="Any notes…" />
      </div>
      <div className="flex justify-end">
        <button onClick={() => onSave(item.id, {
          rewatch_count: Number(form.rewatch_count),
          progress: form.progress ? Number(form.progress) : null,
          started_date: form.started_date || null,
          finished_date: form.finished_date || null,
          notes: form.notes || null,
        })} className="btn-primary text-sm px-5">Save</button>
      </div>
      {item.content_type !== 'movie' && <EpisodeJournal item={item} />}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// COLLECTIONS TAB
// ─────────────────────────────────────────────────────────────────────────────

function CollectionCard({ col, onDelete }) {
  const posters = col.preview_posters?.slice(0, 4) || []
  return (
    <Link to={`/lists/collection/${col.id}`} className="content-card-wrap block rounded-xl border border-white/5 bg-surface-800 overflow-hidden group">
      <div className="grid grid-cols-2 gap-0.5 aspect-video bg-surface-700">
        {posters.length === 0
          ? <div className="col-span-2 flex items-center justify-center"><FolderOpen size={28} className="text-zinc-700" /></div>
          : posters.map((p, i) => <img key={i} src={`${TMDB_MD}${p}`} alt="" className="w-full h-full object-cover" />)
        }
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-sm text-white truncate group-hover:text-accent transition-colors">{col.name}</p>
            {col.description && <p className="text-xs text-zinc-600 mt-0.5 line-clamp-1">{col.description}</p>}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {col.is_private ? <Lock size={11} className="text-zinc-700" /> : <Unlock size={11} className="text-zinc-700" />}
          </div>
        </div>
        <p className="text-xs text-zinc-600 mt-1.5">{col.content_count} title{col.content_count !== 1 ? 's' : ''}</p>
      </div>
    </Link>
  )
}

function CollectionDetail({ colId }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['collection', colId],
    queryFn: () => collectionsApi.get(colId).then(r => r.data),
    enabled: !!colId,
  })
  const removeItem = useMutation({
    mutationFn: cid => collectionsApi.removeContent(colId, cid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collection', colId] }),
  })

  if (isLoading) return <div className="p-6"><div className="skeleton h-8 w-48 rounded mb-4" /></div>
  if (!data) return null

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <button onClick={() => navigate('/lists')} className="text-zinc-500 hover:text-white text-sm mb-5 flex items-center gap-1 transition-colors">← Back to lists</button>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">{data.name}</h1>
        {data.description && <p className="text-zinc-500 text-sm mt-1">{data.description}</p>}
        <p className="text-xs text-zinc-700 mt-1">{data.content_count} titles</p>
      </div>
      {data.content?.length === 0 && (
        <div className="text-center py-20 text-zinc-700"><FolderOpen size={40} className="mx-auto mb-3" /><p>No titles yet. Add from any content page.</p></div>
      )}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
        {data.content?.map(c => (
          <div key={c.id} className="group relative">
            <Link to={`/content/${c.id}`} className="compact-card block rounded-lg overflow-hidden">
              <div className="aspect-[2/3]">
                <img src={c.poster_path ? `https://image.tmdb.org/t/p/w300${c.poster_path}` : 'https://via.placeholder.com/300x450/111/333?text=+'} alt={c.title} className="card-poster w-full h-full object-cover" />
              </div>
              <div className="compact-overlay absolute inset-0 flex flex-col justify-end p-2">
                <p className="text-white text-[11px] font-semibold line-clamp-2">{c.title}</p>
              </div>
            </Link>
            <button onClick={() => removeItem.mutate(c.id)} className="absolute top-1 right-1 p-1 bg-black/70 text-zinc-400 hover:text-red-400 rounded opacity-0 group-hover:opacity-100 transition-all">
              <X size={11} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MOVIE NIGHTS TAB
// ─────────────────────────────────────────────────────────────────────────────

function CreateMovieNightModal({ onClose }) {
  const [form, setForm] = useState({ name: '', description: '', invite_usernames: [] })
  const [usernameInput, setUsernameInput] = useState('')
  const create = useCreateSharedWatchlist()

  const addUsername = () => {
    const u = usernameInput.trim()
    if (u && !form.invite_usernames.includes(u)) setForm(f => ({ ...f, invite_usernames: [...f.invite_usernames, u] }))
    setUsernameInput('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
        <h2 className="text-lg font-semibold mb-1">New movie night</h2>
        <p className="text-xs text-zinc-600 mb-5">A shared list everyone in the group can add to</p>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-zinc-600 block mb-1.5">List name</label>
            <input className="input" placeholder="e.g. Friday Night Films" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-zinc-600 block mb-1.5">Description (optional)</label>
            <input className="input text-sm" placeholder="What's this list for?" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-zinc-600 block mb-1.5">Invite friends by username</label>
            <div className="flex gap-2">
              <input className="input text-sm flex-1" placeholder="username" value={usernameInput}
                onChange={e => setUsernameInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addUsername()} />
              <button onClick={addUsername} className="btn-primary px-3 py-2"><UserPlus size={14} /></button>
            </div>
            {form.invite_usernames.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.invite_usernames.map(u => (
                  <span key={u} className="flex items-center gap-1 bg-white/5 text-zinc-300 text-xs px-2.5 py-1 rounded-full">
                    @{u}
                    <button onClick={() => setForm(f => ({ ...f, invite_usernames: f.invite_usernames.filter(x => x !== u) }))}><X size={10} className="text-zinc-500 hover:text-white" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-ghost flex-1 border border-white/10">Cancel</button>
          <button onClick={() => create.mutate(form, { onSuccess: onClose })} disabled={!form.name || create.isPending} className="btn-primary flex-1">
            {create.isPending ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}

function SharedListCard({ list }) {
  const posters = list.content?.slice(0, 4).map(c => c.poster_path).filter(Boolean) || []
  return (
    <Link to={`/lists/movie-night/${list.id}`} className="content-card-wrap block bg-surface-800 border border-white/5 rounded-2xl overflow-hidden">
      <div className="grid grid-cols-2 gap-0.5 aspect-video bg-surface-700">
        {posters.length === 0
          ? <div className="col-span-2 flex items-center justify-center"><Film size={28} className="text-zinc-700" /></div>
          : posters.map((p, i) => <img key={i} src={`${TMDB_MD}${p}`} alt="" className="w-full h-full object-cover" />)
        }
      </div>
      <div className="p-4">
        <p className="font-semibold text-white group-hover:text-accent transition-colors">{list.name}</p>
        {list.description && <p className="text-xs text-zinc-600 mt-0.5 line-clamp-1">{list.description}</p>}
        <div className="flex items-center gap-2 mt-2">
          <div className="flex -space-x-1.5">
            {list.members?.slice(0, 4).map(m => (
              <div key={m.id} className="w-6 h-6 rounded-full bg-accent border-2 border-surface-800 flex items-center justify-center text-[9px] font-bold text-black">
                {m.display_name?.[0]?.toUpperCase() || m.username?.[0]?.toUpperCase() || '?'}
              </div>
            ))}
          </div>
          <span className="text-xs text-zinc-600">{list.members?.length || 0} {list.members?.length === 1 ? 'person' : 'people'} · {list.content_count} titles</span>
        </div>
      </div>
    </Link>
  )
}

function MovieNightDetail({ listId }) {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const { data, isLoading } = useSharedWatchlist(listId)
  const invite        = useInviteToSharedWatchlist()
  const removeContent = useRemoveFromSharedWatchlist()
  const [inviteInput, setInviteInput] = useState('')

  const deleteList = useMutation({
    mutationFn: () => sharedWatchlistApi.delete(listId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['shared-watchlists'] }); navigate('/lists?tab=movie-nights'); toast.success('List deleted') },
  })
  const removeMember = useMutation({
    mutationFn: memberId => sharedWatchlistApi.removeMember(listId, memberId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shared-watchlist', listId] }),
  })

  if (isLoading) return <div className="p-6"><div className="skeleton h-8 w-48 rounded mb-4" /></div>
  if (!data) return <div className="p-6 text-zinc-500">Not found.</div>

  const isOwner = data.owner_id === user?.id

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <button onClick={() => navigate('/lists')} className="text-zinc-500 hover:text-white text-sm mb-5 flex items-center gap-1 transition-colors">← Back to lists</button>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">{data.name}</h1>
          {data.description && <p className="text-zinc-500 text-sm mt-1">{data.description}</p>}
          <p className="text-xs text-zinc-700 mt-1">{data.content?.length || 0} titles</p>
        </div>
        {isOwner && (
          <button onClick={() => { if (confirm('Delete this list?')) deleteList.mutate() }}
            className="p-2 text-zinc-700 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all">
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* Members */}
      <div className="bg-surface-800 border border-white/5 rounded-2xl p-5 mb-6">
        <p className="text-xs text-zinc-600 uppercase tracking-widest mb-4">Members</p>
        <div className="flex flex-wrap gap-3 mb-4">
          {data.members?.map(m => (
            <div key={m.id} className="flex items-center gap-2 bg-white/3 rounded-xl px-3 py-2 border border-white/5">
              <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-xs font-bold text-black">
                {m.display_name?.[0]?.toUpperCase() || '?'}
              </div>
              <div>
                <p className="text-sm font-medium text-white flex items-center gap-1.5">
                  {m.display_name || m.username}
                  {m.is_owner && <Crown size={11} className="text-accent" />}
                </p>
                <p className="text-[10px] text-zinc-600">@{m.username}</p>
              </div>
              {isOwner && !m.is_owner && (
                <button onClick={() => removeMember.mutate(m.id)} className="ml-2 text-zinc-700 hover:text-red-400 transition-colors"><X size={13} /></button>
              )}
            </div>
          ))}
        </div>
        {isOwner && (
          <div className="flex gap-2">
            <input className="input text-sm flex-1" placeholder="Invite by username…" value={inviteInput} onChange={e => setInviteInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { invite.mutate({ id: listId, username: inviteInput.trim() }, { onSuccess: () => setInviteInput('') }) } }} />
            <button onClick={() => invite.mutate({ id: listId, username: inviteInput.trim() }, { onSuccess: () => setInviteInput('') })}
              disabled={!inviteInput.trim() || invite.isPending} className="btn-primary px-4 flex items-center gap-1.5 text-sm">
              <UserPlus size={14} /> Invite
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {data.content?.length === 0 ? (
        <div className="text-center py-20 text-zinc-700">
          <Film size={40} className="mx-auto mb-3" />
          <p>No titles yet. Go to any film page and add it to this list.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {data.content?.map(c => (
            <div key={c.id} className="relative group">
              <ContentCard content={c} />
              <button onClick={() => removeContent.mutate({ id: listId, contentId: c.id })}
                className="absolute top-2 right-2 p-1.5 bg-black/70 text-zinc-400 hover:text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN LISTS PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function ListsPage() {
  const { colId, nightId } = useParams()
  const [tab,           setTab]          = useState('watchlist')
  const [watchStatus,   setWatchStatus]  = useState(undefined)
  const [expanded,      setExpanded]     = useState(null)
  const [showCreateCol, setShowCreateCol]= useState(false)
  const [showCreateNight, setShowCreateNight] = useState(false)

  const { data: watchlistData, isLoading: watchLoading } = useWatchlist(watchStatus)
  const { data: collections,   isLoading: colLoading    } = useQuery({
    queryKey: ['collections'],
    queryFn: () => collectionsApi.list().then(r => r.data.collections),
  })
  const { data: sharedLists, isLoading: sharedLoading } = useSharedWatchlists()

  const update = useUpdateWatchlist()
  const remove = useRemoveFromWatchlist()
  const qc     = useQueryClient()

  // Sub-page: collection detail
  if (colId)   return <CollectionDetail colId={colId} />
  // Sub-page: movie night detail
  if (nightId) return <MovieNightDetail listId={nightId} />

  const watchItems = watchlistData?.watchlist || []
  const handleSave = (id, data) => { update.mutate({ id, data }); setExpanded(null) }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-white">My Lists</h1>
        <div>
          {tab === 'collections'   && <button onClick={() => setShowCreateCol(true)}   className="btn-primary text-sm flex items-center gap-2 px-3 py-2"><Plus size={14} /> New list</button>}
          {tab === 'movie-nights'  && <button onClick={() => setShowCreateNight(true)} className="btn-primary text-sm flex items-center gap-2 px-3 py-2"><Plus size={14} /> New night</button>}
        </div>
      </div>

      {/* 3-tab switcher */}
      <div className="flex gap-1 mb-6 bg-white/3 p-1 rounded-xl w-fit">
        {[
          { key: 'watchlist',    label: 'Watchlist',    count: watchlistData?.total },
          { key: 'collections',  label: 'Collections',  count: collections?.length },
          { key: 'movie-nights', label: 'Movie Nights', count: sharedLists?.length },
        ].map(({ key, label, count }) => (
          <button key={key} onClick={() => setTab(key)}
            className={clsx('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
              tab === key ? 'bg-surface-700 text-white shadow' : 'text-zinc-500 hover:text-white')}>
            {label}
            {count > 0 && <span className="bg-white/10 text-zinc-400 text-[10px] px-1.5 py-0.5 rounded-full tabular-nums">{count}</span>}
          </button>
        ))}
      </div>

      {/* ── WATCHLIST ─────────────────────────────────────────────────────── */}
      {tab === 'watchlist' && (
        <>
          <div className="flex flex-wrap gap-1.5 mb-5">
            {WATCH_STATUSES.map(({ value, label }) => (
              <button key={String(value)} onClick={() => setWatchStatus(value)}
                className={clsx('px-3 py-1 rounded-full text-xs font-medium transition-all duration-200',
                  watchStatus === value ? 'bg-accent text-black' : 'bg-white/5 text-zinc-500 hover:text-white hover:bg-white/10')}>
                {label}
              </button>
            ))}
          </div>

          {watchLoading && <div className="space-y-2">{Array.from({length:6}).map((_,i)=><SkeletonRow key={i}/>)}</div>}

          {!watchLoading && watchItems.length === 0 && (
            <div className="text-center py-20 text-zinc-700">
              <List size={40} className="mx-auto mb-3" />
              <p>Nothing here yet. Search for titles and add them to your watchlist.</p>
            </div>
          )}

          <div className="space-y-1.5">
            {watchItems.map(item => (
              <div key={item.id} className={clsx('bg-surface-800 border border-white/5 rounded-xl p-3 transition-all duration-200', expanded === item.id && 'border-white/10')}>
                <div className="flex items-center gap-3 group">
                  <Link to={`/content/${item.content_id}`} className="shrink-0">
                    <img src={item.content_poster ? `${TMDB_SM}${item.content_poster}` : 'https://via.placeholder.com/92x138/111/333?text=+'} alt={item.content_title} className="w-10 h-14 object-cover rounded-lg" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to={`/content/${item.content_id}`} className="font-medium text-sm text-white hover:text-accent line-clamp-1 transition-colors">{item.content_title}</Link>
                    <div className="flex items-center flex-wrap gap-1.5 mt-1">
                      <span className={clsx('text-[10px] font-medium px-2 py-0.5 rounded-full capitalize', STATUS_COLORS[item.status] || 'text-zinc-500 bg-zinc-500/10')}>{item.status?.replace(/_/g,' ')}</span>
                      {item.content_type && <span className="text-[10px] text-zinc-600 capitalize">{item.content_type}</span>}
                      {item.user_rating  && <span className="flex items-center gap-0.5 text-[10px] text-accent"><Star size={8} fill="currentColor"/>{item.user_rating}/5</span>}
                      {item.rewatch_count > 0 && <span className="text-[10px] text-zinc-600">↻ {item.rewatch_count}×</span>}
                      {item.progress > 0 && <span className="text-[10px] text-zinc-600">{item.content_type==='movie'?`${item.progress}m`:`Ep.${item.progress}`}</span>}
                      {item.episode_notes?.length > 0 && <span className="text-[10px] text-accent/60">{item.episode_notes.length} journal {item.episode_notes.length===1?'entry':'entries'}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.status !== 'completed' && (
                      <button onClick={() => update.mutate({ id: item.id, data: { status: 'completed' } })} className="text-[11px] text-green-400 hover:bg-green-400/10 px-2 py-1 rounded-lg transition-colors">Done</button>
                    )}
                    <button onClick={() => setExpanded(expanded === item.id ? null : item.id)} className="p-1.5 text-zinc-600 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                      {expanded === item.id ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                    </button>
                    <button onClick={() => remove.mutate(item.id)} className="p-1.5 text-zinc-700 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"><Trash2 size={14}/></button>
                    <Link to={`/content/${item.content_id}`} className="p-1.5 text-zinc-700 hover:text-white hover:bg-white/5 rounded-lg transition-all"><ArrowRight size={14}/></Link>
                  </div>
                </div>
                {expanded === item.id && <EntryPanel item={item} onSave={handleSave} />}
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── COLLECTIONS ───────────────────────────────────────────────────── */}
      {tab === 'collections' && (
        <>
          {colLoading && <div className="grid grid-cols-2 md:grid-cols-3 gap-4">{Array.from({length:4}).map((_,i)=><div key={i} className="skeleton aspect-[4/3] rounded-xl"/>)}</div>}

          {!colLoading && (!collections || collections.length === 0) && (
            <div className="text-center py-20 text-zinc-700">
              <FolderOpen size={40} className="mx-auto mb-3"/>
              <p className="mb-4">Create lists like "Watch with family" or "Halloween picks".</p>
              <button onClick={() => setShowCreateCol(true)} className="btn-primary text-sm">Create your first list</button>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {collections?.map(col => (
              <CollectionCard key={col.id} col={col}
                onDelete={() => { collectionsApi.delete(col.id).then(() => { qc.invalidateQueries({ queryKey: ['collections'] }); toast.success('Deleted') }) }}
              />
            ))}
          </div>
        </>
      )}

      {/* ── MOVIE NIGHTS ──────────────────────────────────────────────────── */}
      {tab === 'movie-nights' && (
        <>
          {sharedLoading && <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{Array.from({length:3}).map((_,i)=><div key={i} className="skeleton aspect-[4/3] rounded-2xl"/>)}</div>}

          {!sharedLoading && (!sharedLists || sharedLists.length === 0) && (
            <div className="text-center py-20 text-zinc-700">
              <Users size={40} className="mx-auto mb-3"/>
              <p className="mb-4">No movie night lists yet. Create one and invite your friends.</p>
              <button onClick={() => setShowCreateNight(true)} className="btn-primary text-sm">Create your first movie night</button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {sharedLists?.map(list => <SharedListCard key={list.id} list={list} />)}
          </div>
        </>
      )}

      {/* Modals */}
      {showCreateCol && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h2 className="text-lg font-semibold mb-5">New collection</h2>
            <CreateColForm onClose={() => setShowCreateCol(false)} />
          </div>
        </div>
      )}
      {showCreateNight && <CreateMovieNightModal onClose={() => setShowCreateNight(false)} />}
    </div>
  )
}

function CreateColForm({ onClose }) {
  const [form, setForm] = useState({ name: '', description: '', is_private: true })
  const qc = useQueryClient()
  const create = useMutation({
    mutationFn: data => collectionsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['collections'] }); toast.success('Collection created!'); onClose() },
    onError: err => toast.error(err.response?.data?.detail || 'Failed'),
  })
  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-zinc-600 block mb-1">Name</label>
        <input className="input" placeholder="e.g. Watch with family" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
      </div>
      <div>
        <label className="text-xs text-zinc-600 block mb-1">Description</label>
        <textarea className="input resize-none h-16 text-sm" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={form.is_private} onChange={e => setForm(f => ({ ...f, is_private: e.target.checked }))} className="accent-accent w-4 h-4" />
        <span className="text-sm text-zinc-400">Private</span>
      </label>
      <div className="flex gap-3 pt-2">
        <button onClick={onClose} className="btn-ghost flex-1 border border-white/10">Cancel</button>
        <button onClick={() => create.mutate(form)} disabled={!form.name || create.isPending} className="btn-primary flex-1">
          {create.isPending ? 'Creating…' : 'Create'}
        </button>
      </div>
    </div>
  )
}