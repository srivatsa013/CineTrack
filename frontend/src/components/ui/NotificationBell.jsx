import { useState, useRef, useEffect } from 'react'
import { Bell, UserPlus, UserCheck, Star } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../api/client'

const TYPE_CONFIG = {
  friend_request:  { icon: UserPlus,  color: 'text-blue-400',   label: 'sent you a friend request' },
  friend_accepted: { icon: UserCheck, color: 'text-green-400',  label: 'accepted your friend request' },
  friend_rated:    { icon: Star,      color: 'text-yellow-400', label: 'rated' },
}

function timeAgo(date) {
  if (!date) return ''
  const diff = Date.now() - new Date(date).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

const DROPDOWN_WIDTH  = 250
const DROPDOWN_HEIGHT = 150  // approximate max height

export default function NotificationBell() {
  const [open,    setOpen]    = useState(false)
  const [pos,     setPos]     = useState({ top: 0, left: 0 })
  const btnRef  = useRef(null)
  const dropRef = useRef(null)
  const qc      = useQueryClient()

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications/').then(r => r.data),
    refetchInterval: 30000,
  })

  const markAll = useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const markOne = useMutation({
    mutationFn: id => api.post(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const handleOpen = () => {
    if (btnRef.current) {
      const rect   = btnRef.current.getBoundingClientRect()
      const vw     = window.innerWidth
      const vh     = window.innerHeight

      // Horizontal: open to the RIGHT of the button (sidebar is on the left)
      let left = rect.right + 12
      // If it would overflow the right edge, flip to the left
      if (left + DROPDOWN_WIDTH > vw - 8) left = rect.left - DROPDOWN_WIDTH - 12

      // Vertical: anchor to button top and open UPWARD if not enough room below
      let top = rect.top
      if (top + DROPDOWN_HEIGHT > vh - 8) {
        // Not enough room below — anchor bottom of dropdown to button bottom
        top = Math.max(8, rect.bottom - DROPDOWN_HEIGHT)
      }

      setPos({ top, left })
    }
    setOpen(v => !v)
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = e => {
      if (
        btnRef.current  && !btnRef.current.contains(e.target) &&
        dropRef.current && !dropRef.current.contains(e.target)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const notifications = data?.notifications || []
  const unread        = data?.unread_count  || 0

  return (
    <>
      {/* Bell button */}
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="relative p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-all duration-200"
        title="Notifications"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-accent text-black text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown — rendered via portal-style fixed positioning */}
      {open && (
        <div
          ref={dropRef}
          style={{
            position: 'fixed',
            top:      pos.top,
            left:     pos.left,
            width:    DROPDOWN_WIDTH,
            zIndex:   99999,
          }}
          className="bg-[#161616] border border-white/10 rounded-xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <span className="text-sm font-semibold">Notifications</span>
            {unread > 0 && (
              <button
                onClick={() => markAll.mutate()}
                className="text-xs text-accent hover:text-white transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto" style={{ maxHeight: DROPDOWN_HEIGHT - 48 }}>
            {notifications.length === 0 && (
              <div className="py-10 text-center text-zinc-600 text-sm">All caught up ✓</div>
            )}
            {notifications.map(n => {
              const cfg  = TYPE_CONFIG[n.type] || TYPE_CONFIG.friend_request
              const Icon = cfg.icon
              return (
                <div
                  key={n.id}
                  onClick={() => { if (!n.read) markOne.mutate(n.id) }}
                  className={`flex gap-3 px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer ${!n.read ? 'bg-accent/5' : ''}`}
                >
                  <div className={`w-7 h-7 rounded-full bg-white/5 flex items-center justify-center shrink-0 ${cfg.color}`}>
                    <Icon size={13} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-300 leading-snug">
                      <span className="font-semibold text-white">{n.from_display_name || n.from_username}</span>
                      {' '}{cfg.label}
                      {n.content_title && <span className="text-accent"> {n.content_title}</span>}
                      {n.rating        && <span className="text-yellow-400"> ({n.rating}/5)</span>}
                    </p>
                    <p className="text-[10px] text-zinc-700 mt-0.5">{timeAgo(n.created_at)} ago</p>
                  </div>
                  {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-accent shrink-0 mt-1.5" />}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}