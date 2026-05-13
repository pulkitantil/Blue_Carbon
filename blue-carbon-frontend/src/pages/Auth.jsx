import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Waves, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

export default function Auth() {
  const [mode, setMode] = useState('login')
  const [showPass, setShowPass] = useState(false)
  const navigate = useNavigate()
  const { login, register: registerUser, loading } = useAuthStore()
  const { register, handleSubmit, formState: { errors }, reset } = useForm()

  const onSubmit = async (data) => {
    try {
      if (mode === 'login') {
        await login(data.email, data.password)
        toast.success('Welcome back!')
      } else {
        await registerUser(data)
        toast.success('Account created!')
      }
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.message)
    }
  }

  const switchMode = (m) => { setMode(m); reset() }

  return (
    <div className="min-h-screen bg-dark-500 flex flex-col items-center justify-center px-4">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-ocean-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Back */}
        <button onClick={() => navigate('/')} className="btn-ghost mb-6 -ml-2">
          <ArrowLeft size={14} /> Back
        </button>

        {/* Card */}
        <div className="glass-card">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-ocean-500/20 border border-ocean-500/40 flex items-center justify-center">
              <Waves size={18} className="text-ocean-400" />
            </div>
            <div>
              <p className="font-bold text-slate-100">Blue Carbon Registry</p>
              <p className="text-xs text-ocean-400">Ethereum Sepolia</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-dark-400/50 rounded-xl mb-6">
            {['login','register'].map(m => (
              <button key={m} onClick={() => switchMode(m)}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all capitalize
                  ${mode === m ? 'bg-ocean-500/20 text-ocean-300 border border-ocean-500/30' : 'text-slate-500 hover:text-slate-300'}`}>
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                {...register('email', { required: 'Email required', pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' } })}
                className="input-field" placeholder="you@example.com" type="email"
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  {...register('password', { required: 'Password required', minLength: { value: 8, message: 'Min 8 characters' } })}
                  className="input-field pr-10" placeholder="••••••••"
                  type={showPass ? 'text' : 'password'}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>

            {mode === 'register' && (
              <>
                <div>
                  <label className="label">Role</label>
                  <select {...register('role')} className="input-field">
                    <option value="community">Community Member</option>
                    <option value="verifier">Verifier</option>
                    <option value="auditor">Auditor</option>
                  </select>
                </div>
                <div>
                  <label className="label">Organisation (optional)</label>
                  <input {...register('organisation')} className="input-field" placeholder="Your organisation" />
                </div>
                <div>
                  <label className="label">Country</label>
                  <input {...register('country')} className="input-field" placeholder="e.g. India" />
                </div>
                <div>
                  <label className="label">Wallet Address (optional)</label>
                  <input {...register('walletAddress')} className="input-field font-mono text-xs"
                    placeholder="0x..." />
                  <p className="text-xs text-slate-500 mt-1">You can add this later in your profile</p>
                </div>
              </>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-6 py-3">
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          Your wallet connects to Ethereum Sepolia Testnet
        </p>
      </div>
    </div>
  )
}
