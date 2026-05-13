import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { creditsAPI } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { Coins, TrendingDown, ArrowDownRight, ExternalLink, RefreshCw, CheckCircle } from 'lucide-react'

function RetireModal({ onClose, onRetire, userWallet }) {
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(null)
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { beneficiary: userWallet || '' }
  })

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const res = await onRetire(data)
      setDone(res)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (done) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="glass-card w-full max-w-md text-center">
        <div className="w-14 h-14 rounded-full bg-ocean-900/50 border border-ocean-500/40 flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={24} className="text-ocean-400" />
        </div>
        <h3 className="font-bold text-slate-100 mb-2">Credits Retired!</h3>
        <p className="text-slate-400 text-sm mb-4">{done.amount} BCT permanently retired</p>
        <a href={`https://sepolia.etherscan.io/tx/${done.txHash}`} target="_blank" rel="noopener noreferrer"
          className="tx-link flex items-center justify-center gap-1 mb-6">
          View on Etherscan <ExternalLink size={11} />
        </a>
        <button onClick={onClose} className="btn-primary mx-auto">Done</button>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="glass-card w-full max-w-md">
        <h3 className="font-bold text-slate-100 mb-1">Retire Carbon Credits</h3>
        <p className="text-xs text-slate-500 mb-6">Permanently burn BCT tokens to claim a carbon offset certificate</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Amount (BCT) *</label>
            <input {...register('amount', { required: 'Required', min: { value: 0.000000001, message: 'Must be > 0' } })}
              className="input-field" placeholder="e.g. 10.5" type="number" step="0.000000001" />
            {errors.amount && <p className="text-red-400 text-xs mt-1">{errors.amount.message}</p>}
          </div>

          <div>
            <label className="label">Project ID *</label>
            <input {...register('projectId', { required: 'Required' })} className="input-field font-mono" placeholder="e.g. 1" />
            {errors.projectId && <p className="text-red-400 text-xs mt-1">{errors.projectId.message}</p>}
          </div>

          <div>
            <label className="label">Beneficiary Address *</label>
            <input {...register('beneficiary', { required: 'Required', pattern: { value: /^0x[a-fA-F0-9]{40}$/, message: 'Invalid address' } })}
              className="input-field font-mono text-xs" placeholder="0x..." />
            {errors.beneficiary && <p className="text-red-400 text-xs mt-1">{errors.beneficiary.message}</p>}
          </div>

          <div>
            <label className="label">Retirement Reason *</label>
            <textarea {...register('reason', { required: 'Required' })} rows={3}
              className="input-field resize-none"
              placeholder="e.g. Annual corporate carbon offset 2025 — Acme Corp" />
            {errors.reason && <p className="text-red-400 text-xs mt-1">{errors.reason.message}</p>}
          </div>

          <div className="glass-card bg-amber-900/10 border-amber-500/20 !p-3">
            <p className="text-xs text-amber-300 font-medium mb-0.5">⚠️ This action is irreversible</p>
            <p className="text-xs text-slate-500">Retiring credits permanently burns the BCT tokens from the blockchain. This cannot be undone.</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={loading}
              className="flex-1 justify-center py-2.5 rounded-xl text-sm font-semibold bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-2 transition-all">
              {loading ? '...' : <><TrendingDown size={14} /> Retire Credits</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Credits() {
  const { user }                    = useAuthStore()
  const [address, setAddress]       = useState(user?.walletAddress || '')
  const [balance, setBalance]       = useState(null)
  const [issuances, setIssuances]   = useState([])
  const [retirements, setRetirements] = useState([])
  const [loading, setLoading]       = useState(false)
  const [showRetire, setShowRetire] = useState(false)
  const [tab, setTab]               = useState('issuances')

  const fetchBalance = async (addr) => {
    if (!addr || !/^0x[a-fA-F0-9]{40}$/.test(addr)) return
    setLoading(true)
    try {
      const res = await creditsAPI.balance(addr)
      setBalance(res.data)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.walletAddress) fetchBalance(user.walletAddress)
    creditsAPI.issuances({ limit: 20 }).then(r => setIssuances(r.data || [])).catch(() => {})
    creditsAPI.retirements({ limit: 20 }).then(r => setRetirements(r.data || [])).catch(() => {})
  }, [user])

  const handleRetire = async (data) => {
    const res = await creditsAPI.retire(data)
    if (address) fetchBalance(address)
    creditsAPI.retirements({ limit: 20 }).then(r => setRetirements(r.data || []))
    return res.data
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title">Carbon Credits</h1>
          <p className="page-subtitle">Blue Carbon Token (BCT) — 1 BCT = 1 tonne CO₂e</p>
        </div>
        <button onClick={() => setShowRetire(true)} className="btn-primary">
          <TrendingDown size={14} /> Retire Credits
        </button>
      </div>

      {/* Balance checker */}
      <div className="glass-card mb-6">
        <h2 className="section-title flex items-center gap-2">
          <Coins size={16} className="text-ocean-400" /> Check BCT Balance
        </h2>
        <div className="flex gap-3">
          <input
            value={address}
            onChange={e => setAddress(e.target.value)}
            className="input-field flex-1 font-mono text-sm"
            placeholder="0x wallet address..."
          />
          <button onClick={() => fetchBalance(address)} disabled={loading} className="btn-primary shrink-0">
            {loading ? <RefreshCw size={14} className="animate-spin" /> : 'Check'}
          </button>
        </div>

        {balance && (
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="bg-dark-400/50 rounded-xl p-4 border border-dark-200/30">
              <p className="text-xs text-slate-500 mb-1">Your Balance</p>
              <p className="text-2xl font-bold text-ocean-400">
                {parseFloat(balance.balanceBCT).toFixed(4)}
                <span className="text-sm text-slate-500 ml-1">BCT</span>
              </p>
            </div>
            <div className="bg-dark-400/50 rounded-xl p-4 border border-dark-200/30">
              <p className="text-xs text-slate-500 mb-1">Total Supply</p>
              <p className="text-2xl font-bold text-slate-300">
                {parseFloat(balance.totalSupplyBCT).toFixed(4)}
                <span className="text-sm text-slate-500 ml-1">BCT</span>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Info cards */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {[
          { icon: Coins,         label: 'Total Issuances',  value: issuances.length,   color: 'text-ocean-400' },
          { icon: TrendingDown,  label: 'Total Retirements', value: retirements.length, color: 'text-amber-400' },
          { icon: ArrowDownRight,label: 'Total Retired BCT', value: retirements.reduce((a, r) => a + parseFloat(r.amount || 0), 0).toFixed(2), color: 'text-red-400' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="glass-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500">{label}</span>
              <Icon size={14} className={color} />
            </div>
            <p className={`text-xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="glass-card">
        <div className="flex gap-1 p-1 bg-dark-400/50 rounded-xl mb-6 w-fit">
          {['issuances', 'retirements'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 text-sm font-medium rounded-lg capitalize transition-all
                ${tab === t ? 'bg-ocean-500/20 text-ocean-300 border border-ocean-500/30' : 'text-slate-500 hover:text-slate-300'}`}>
              {t}
            </button>
          ))}
        </div>

        {tab === 'issuances' && (
          <>
            <h2 className="section-title">Credit Issuance History</h2>
            {issuances.length === 0 ? (
              <div className="text-center py-10">
                <Coins size={28} className="text-slate-700 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No credits issued yet</p>
              </div>
            ) : (
              <div className="space-y-0">
                {issuances.map(i => (
                  <div key={i._id} className="table-row flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-200">
                        <span className="text-ocean-400">+{parseFloat(i.bctAmount || 0).toFixed(4)} BCT</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Project #{i.projectOnChainId} · Report #{i.reportOnChainId}
                      </p>
                      <p className="text-xs text-slate-600">{new Date(i.issuedAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="badge-green">Issued</span>
                      {i.txHash && (
                        <a href={`https://sepolia.etherscan.io/tx/${i.txHash}`} target="_blank" rel="noopener noreferrer"
                          className="text-slate-500 hover:text-ocean-400 transition-colors">
                          <ExternalLink size={13} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'retirements' && (
          <>
            <h2 className="section-title">Retirement / Offset History</h2>
            {retirements.length === 0 ? (
              <div className="text-center py-10">
                <TrendingDown size={28} className="text-slate-700 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No credits retired yet</p>
              </div>
            ) : (
              <div className="space-y-0">
                {retirements.map(r => (
                  <div key={r._id} className="table-row">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-200">
                          <span className="text-amber-400">-{parseFloat(r.amount || 0).toFixed(4)} BCT</span>
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 font-mono">{r.beneficiary?.slice(0,16)}...</p>
                        <p className="text-xs text-slate-600">{new Date(r.retiredAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="badge-yellow">Retired</span>
                        {r.txHash && (
                          <a href={`https://sepolia.etherscan.io/tx/${r.txHash}`} target="_blank" rel="noopener noreferrer"
                            className="text-slate-500 hover:text-ocean-400 transition-colors">
                            <ExternalLink size={13} />
                          </a>
                        )}
                      </div>
                    </div>
                    {r.reason && (
                      <p className="text-xs text-slate-500 mt-1 italic">"{r.reason}"</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* How it works */}
      <div className="glass-card mt-6">
        <h2 className="section-title">How BCT Credits Work</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { step: '01', title: 'MRV Verified',    desc: 'A verifier approves your field measurement report on-chain.' },
            { step: '02', title: 'BCT Issued',      desc: '1 BCT token is minted per verified tonne of CO₂e stored.' },
            { step: '03', title: 'Credits Retired', desc: 'Organisations buy and burn BCT to offset their emissions.' },
          ].map(({ step, title, desc }) => (
            <div key={step} className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-ocean-900/50 border border-ocean-500/30 flex items-center justify-center shrink-0">
                <span className="text-xs font-mono text-ocean-400">{step}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-200 mb-1">{title}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showRetire && (
        <RetireModal
          onClose={() => setShowRetire(false)}
          onRetire={handleRetire}
          userWallet={user?.walletAddress}
        />
      )}
    </div>
  )
}
