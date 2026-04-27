import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Clapperboard } from 'lucide-react'
import { useAuthStore } from '../context/authStore'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' })
  const { login, loading } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async e => {
    e.preventDefault()
    const res = await login(form)
    if (res.ok) { toast.success('Welcome back!'); navigate('/') }
    else toast.error(res.error)
  }

  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center mb-4 shadow-lg shadow-accent/20">
            <Clapperboard size={26} className="text-black" />
          </div>
          <h1 className="font-display text-3xl italic text-white">CineTrack</h1>
          <p className="text-zinc-600 text-sm mt-1">Your personal movie universe</p>
        </div>

        <div className="bg-surface-800 border border-white/5 rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-5">Sign in</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-zinc-600 block mb-1.5">Email</label>
              <input type="email" required className="input" placeholder="you@example.com"
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-zinc-600 block mb-1.5">Password</label>
              <input type="password" required className="input" placeholder="••••••••"
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full mt-2 py-2.5">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-zinc-600 mt-5">
          No account?{' '}
          <Link to="/register" className="text-accent hover:text-white font-medium transition-colors">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}