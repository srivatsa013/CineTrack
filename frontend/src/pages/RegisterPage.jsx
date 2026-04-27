import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Clapperboard } from 'lucide-react'
import { useAuthStore } from '../context/authStore'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const [form, setForm] = useState({ username: '', email: '', password: '', display_name: '' })
  const { register, loading } = useAuthStore()
  const navigate = useNavigate()
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    const res = await register(form)
    if (res.ok) { toast.success('Account created!'); navigate('/') }
    else toast.error(res.error)
  }

  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-10">
          <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center mb-4 shadow-lg shadow-accent/20">
            <Clapperboard size={26} className="text-black" />
          </div>
          <h1 className="font-display text-3xl italic text-white">CineTrack</h1>
          <p className="text-zinc-600 text-sm mt-1">Join your private movie club</p>
        </div>

        <div className="bg-surface-800 border border-white/5 rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-5">Create account</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-xs text-zinc-600 block mb-1.5">Display name</label>
              <input className="input" placeholder="John Doe" value={form.display_name} onChange={set('display_name')} />
            </div>
            <div>
              <label className="text-xs text-zinc-600 block mb-1.5">Username <span className="text-accent">*</span></label>
              <input className="input" placeholder="johndoe" required minLength={3} value={form.username} onChange={set('username')} />
            </div>
            <div>
              <label className="text-xs text-zinc-600 block mb-1.5">Email <span className="text-accent">*</span></label>
              <input type="email" className="input" placeholder="you@example.com" required value={form.email} onChange={set('email')} />
            </div>
            <div>
              <label className="text-xs text-zinc-600 block mb-1.5">Password <span className="text-accent">*</span></label>
              <input type="password" className="input" placeholder="Min. 6 characters" required minLength={6} value={form.password} onChange={set('password')} />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full mt-2 py-2.5">
              {loading ? 'Creating…' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-zinc-600 mt-5">
          Already have an account?{' '}
          <Link to="/login" className="text-accent hover:text-white font-medium transition-colors">Sign in</Link>
        </p>
      </div>
    </div>
  )
}