import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { projectsAPI, creditsAPI } from '../services/api'
import { Leaf, FileText, Coins, TrendingUp, ArrowRight, ExternalLink, Plus } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const mockChartData = [
  { month: 'Oct', carbon: 0 },
  { month: 'Nov', carbon: 120 },
  { month: 'Dec', carbon: 340 },
  { month: 'Jan', carbon: 580 },
  { month: 'Feb', carbon: 720 },
  { month: 'Mar', carbon: 850 },
  { month: 'Apr', carbon: 1020 },
]

function StatusBadge({ status }) {
  const map = {
    PENDING:      'badge-yellow',
    UNDER_REVIEW: 'badge-blue',
    VERIFIED:     'badge-green',
    REJECTED:     'badge-red',
    SUSPENDED:    'badge-red',
  }
  return <span className={map[status] || 'badge-blue'}>{status?.replace('_',' ')}</span>
}

export default function Dashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [stats, setStats]       = useState(null)
  const [projects, setProjects] = useState([])
  const [balance, setBalance]   = useState(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
      projectsAPI.stats(),
      projectsAPI.list({ limit: 5 }),
      user?.walletAddress ? creditsAPI.balance(user.walletAddress) : Promise.resolve(null),
    ]).then(([s, p, b]) => {
      setStats(s.data)
      console.log(p.data)
      setProjects(p.data || [])
      if (b) setBalance(b.data)
    }).finally(() => setLoading(false))
  }, [user])

  const statCards = [
    { icon: Leaf,       label: 'Total Projects',    value: stats?.chain?.totalProjects    ?? '—', color: 'text-ocean-400' },
    { icon: FileText,   label: 'MRV Reports',       value: stats?.chain?.totalReports     ?? '—', color: 'text-blue-400' },
    { icon: TrendingUp, label: 'Carbon Registered', value: stats?.chain?.totalCarbonTonnes ? `${stats.chain.totalCarbonTonnes}t` : '—', color: 'text-green-400' },
    { icon: Coins,      label: 'Your BCT Balance',  value: balance ? `${parseFloat(balance.balanceBCT).toFixed(2)} BCT` : '—', color: 'text-amber-400' },
  ]

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Welcome back, <span className="text-ocean-400">{user?.email}</span>
          </p>
        </div>
        <button onClick={() => navigate('/register-project')} className="btn-primary">
          <Plus size={14} /> New Project
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="glass-card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-500 uppercase tracking-wider">{label}</span>
              <Icon size={16} className={color} />
            </div>
            <p className={`text-2xl font-bold ${color}`}>{loading ? '...' : value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Carbon chart */}
        <div className="lg:col-span-2 glass-card">
          <h2 className="section-title">Carbon Registration Activity</h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={mockChartData}>
              <defs>
                <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#00bfae" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00bfae" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid rgba(0,191,174,0.2)', borderRadius: '10px', fontSize: '12px' }}
                labelStyle={{ color: '#94a3b8' }}
                itemStyle={{ color: '#00bfae' }}
              />
              <Area type="monotone" dataKey="carbon" stroke="#00bfae" strokeWidth={2} fill="url(#cg)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Quick actions */}
        <div className="glass-card">
          <h2 className="section-title">Quick Actions</h2>
          <div className="space-y-2">
            {[
              { label: 'Register Project',  path: '/register-project', icon: Leaf },
              { label: 'Submit MRV Data',   path: '/mrv/submit',       icon: FileText },
              { label: 'View Credits',      path: '/credits',          icon: Coins },
              { label: 'Browse Projects',   path: '/projects',         icon: TrendingUp },
            ].map(({ label, path, icon: Icon }) => (
              <button key={path} onClick={() => navigate(path)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl
                           bg-dark-400/50 hover:bg-dark-400 border border-dark-200/30
                           hover:border-ocean-500/30 transition-all group text-sm">
                <div className="flex items-center gap-3">
                  <Icon size={14} className="text-ocean-400" />
                  <span className="text-slate-300">{label}</span>
                </div>
                <ArrowRight size={12} className="text-slate-600 group-hover:text-ocean-400 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recent projects */}
      <div className="glass-card mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title mb-0">Recent Projects</h2>
          <button onClick={() => navigate('/projects')} className="btn-ghost text-xs">
            View all <ArrowRight size={12} />
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-12">
            <Leaf size={32} className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No projects yet</p>
            <button onClick={() => navigate('/register-project')} className="btn-primary mx-auto mt-4">
              Register First Project
            </button>
          </div>
        ) : (
          <div className="space-y-0">
            {projects.map(p => (
              <div key={p._id || p.id} className="table-row flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-ocean-900/40 border border-ocean-500/20 flex items-center justify-center">
                    <Leaf size={12} className="text-ocean-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-200">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.location?.countryCode} · {p.ecosystemType}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={p.status} />
                  <Link to={`/projects/${p.onChainId || p.id}`} aria-label="View project details" className="text-slate-500 hover:text-ocean-400">
                    <ExternalLink size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Wallet link prompt */}
      {!user?.walletAddress && (
        <div className="mt-6 glass-card border-ocean-500/20 bg-ocean-900/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-ocean-300">Link your wallet</p>
              <p className="text-xs text-slate-500 mt-0.5">Connect your Ethereum wallet to register projects on-chain</p>
            </div>
            <button onClick={() => navigate('/auth')} className="btn-secondary text-xs">
              Connect <ArrowRight size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
