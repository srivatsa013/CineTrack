import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Home, Search, List, Users, Sparkles, Clapperboard, LogOut, User, CalendarDays } from 'lucide-react'
import { useAuthStore } from '../../context/authStore'
import NotificationBell from '../ui/NotificationBell'
import clsx from 'clsx'

const NAV = [
  { to: '/',               icon: Home,         label: 'Home' },
  { to: '/search',         icon: Search,       label: 'Search' },
  { to: '/recommendations',icon: Sparkles,     label: 'For You' },
  { to: '/lists',          icon: List,         label: 'My Lists' },
  { to: '/social',         icon: Users,        label: 'Friends' },
  { to: '/year-in-review', icon: CalendarDays, label: 'Year in Review' },
  { to: '/profile',        icon: User,         label: 'Profile' },
]

function NavLink({ to, icon: Icon, label, active }) {
  return (
    <Link
      to={to}
      className={clsx(
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
        active ? 'bg-accent/10 text-accent' : 'text-zinc-500 hover:text-white hover:bg-white/5'
      )}
    >
      <Icon size={16} className="shrink-0" />
      <span className="truncate">{label}</span>
      {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent shrink-0" />}
    </Link>
  )
}

export default function Layout({ children }) {
  const { pathname } = useLocation()
  const navigate     = useNavigate()
  const { user, logout } = useAuthStore()

  const isActive = (to) => to === '/' ? pathname === '/' : pathname.startsWith(to)
  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="flex min-h-screen bg-surface-900">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-52 border-r border-white/5 fixed inset-y-0 left-0 z-30 bg-surface-900">
        <div className="px-5 py-5 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shrink-0">
              <Clapperboard size={15} className="text-black" />
            </div>
            <span className="font-display text-white text-lg italic">CineTrack</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, icon, label }) => (
            <NavLink key={to} to={to} icon={icon} label={label} active={isActive(to)} />
          ))}
        </nav>

        <div className="p-3 border-t border-white/5 space-y-1">
          <div className="flex items-center justify-between px-2 py-1">
            <NotificationBell />
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-[10px] font-bold text-black shrink-0">
                {user?.display_name?.[0]?.toUpperCase() || '?'}
              </div>
              <span className="text-xs text-zinc-400 truncate">{user?.display_name}</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-600 hover:text-red-400 hover:bg-white/5 rounded-lg transition-all duration-200"
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden glass fixed top-0 inset-x-0 z-30 flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
            <Clapperboard size={13} className="text-black" />
          </div>
          <span className="font-display text-white italic">CineTrack</span>
        </div>
        <NotificationBell />
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 glass flex">
        {NAV.slice(0, 5).map(({ to, icon: Icon, label }) => (
          <Link key={to} to={to}
            className={clsx('flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] transition-colors duration-200',
              isActive(to) ? 'text-accent' : 'text-zinc-600')}>
            <Icon size={19} />
            {label}
          </Link>
        ))}
      </nav>

      <main className="flex-1 md:ml-52 pb-16 md:pb-0 pt-14 md:pt-0 min-h-screen">
        {children}
      </main>
    </div>
  )
}