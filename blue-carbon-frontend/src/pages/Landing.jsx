import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Waves, ArrowRight, Shield, Zap, Globe, Leaf, ChevronRight, ExternalLink } from 'lucide-react'
import { projectsAPI } from '../services/api'

export default function Landing() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    projectsAPI.stats().then(r => setStats(r.data)).catch(() => {})
  }, [])

  const contracts = [
    { label: 'Registry', addr: '0x45a3A0BA0f2B5aCC69966F796E1d59fEad89B2e6' },
    { label: 'BCT Token', addr: '0x51A52D8aF1337a6bCb6f1fD1C09cFA9d3D5EB5d1' },
    { label: 'Manager',  addr: '0xeD90dE3f198EA6C83e60B79a1382401704E75f64' },
  ]

  const features = [
    { icon: Shield, title: 'Tamper-proof records', desc: 'Every project and MRV report permanently stored on Ethereum Sepolia — immutable and auditable.' },
    { icon: Zap,    title: 'Automatic credit issuance', desc: 'Smart contracts mint BCT tokens instantly after verifier approval. No manual processing.' },
    { icon: Globe,  title: 'IPFS data storage', desc: 'Photos, GPS data, and measurement files pinned to IPFS for decentralised, permanent storage.' },
    { icon: Leaf,   title: 'Blue carbon focus', desc: 'Built specifically for mangroves, seagrass, saltmarshes, and tidal wetlands.' },
  ]

  return (
    <div className="min-h-screen bg-dark-500">
      {/* Navbar */}
      <nav className="glass border-b border-ocean-500/10 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-ocean-500/20 border border-ocean-500/40 flex items-center justify-center">
            <Waves size={16} className="text-ocean-400" />
          </div>
          <span className="font-bold text-slate-100">Blue Carbon Registry</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/projects')} className="btn-ghost hidden sm:flex">
            Explore Projects
          </button>
          <button onClick={() => navigate('/auth')} className="btn-primary">
            Launch App <ArrowRight size={14} />
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative px-6 pt-24 pb-20 max-w-6xl mx-auto text-center overflow-hidden">
        {/* Glow orbs */}
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-ocean-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 right-1/4 w-72 h-72 bg-ocean-700/8 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-ocean-900/40 border border-ocean-500/30 text-ocean-300 text-xs font-medium mb-8">
            <div className="w-1.5 h-1.5 rounded-full bg-ocean-400 animate-pulse" />
            Live on Ethereum Sepolia Testnet
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-slate-100 leading-tight mb-6">
            Track Blue Carbon<br />
            <span className="text-gradient">On-Chain</span>
          </h1>

          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            A blockchain-based registry for coastal ecosystems — mangroves, seagrass, and saltmarshes.
            Transparent MRV, automatic credit issuance, and tamper-proof records.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => navigate('/auth')} className="btn-primary text-base px-8 py-3">
              Register a Project <ArrowRight size={16} />
            </button>
            <button onClick={() => navigate('/projects')} className="btn-secondary text-base px-8 py-3">
              View Registry
            </button>
          </div>
        </div>
      </section>

      {/* Live stats */}
      <section className="px-6 pb-20 max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Projects',    value: stats?.chain?.totalProjects    ?? '—' },
            { label: 'Verified Projects', value: stats?.chain?.verifiedProjects ?? '—' },
            { label: 'MRV Reports',       value: stats?.chain?.totalReports     ?? '—' },
            { label: 'Carbon Registered', value: stats?.chain?.totalCarbonTonnes ? `${stats.chain.totalCarbonTonnes}t` : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="glass-card text-center">
              <p className="text-3xl font-bold text-gradient mb-1">{value}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-6 pb-20 max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold text-slate-100 text-center mb-12">
          Built for Transparency
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="glass-card flex gap-4 group hover:border-ocean-500/30 transition-all">
              <div className="w-10 h-10 rounded-xl bg-ocean-900/50 border border-ocean-500/30 flex items-center justify-center shrink-0 group-hover:bg-ocean-900/80 transition-all">
                <Icon size={18} className="text-ocean-400" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-200 mb-1">{title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Contract addresses */}
      <section className="px-6 pb-20 max-w-6xl mx-auto">
        <div className="glass-card">
          <h2 className="section-title flex items-center gap-2">
            <Shield size={16} className="text-ocean-400" />
            Deployed Contracts — Sepolia
          </h2>
          <div className="space-y-3">
            {contracts.map(({ label, addr }) => (
              <div key={label} className="flex items-center justify-between py-3 border-t border-dark-300/30">
                <span className="text-sm text-slate-400">{label}</span>
                <div className="flex items-center gap-2">
                  <span className="hash hidden sm:block">{addr.slice(0,10)}...{addr.slice(-8)}</span>
                  <a
                    href={`https://sepolia.etherscan.io/address/${addr}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ocean-400 hover:text-ocean-300"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-24 max-w-6xl mx-auto text-center">
        <div className="glass-card relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-ocean-900/20 to-transparent pointer-events-none" />
          <div className="relative z-10">
            <h2 className="text-2xl font-bold text-slate-100 mb-3">Ready to register your project?</h2>
            <p className="text-slate-400 text-sm mb-6">Join coastal communities protecting blue carbon ecosystems.</p>
            <button onClick={() => navigate('/auth')} className="btn-primary mx-auto">
              Get Started <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-dark-300/30 px-6 py-6 text-center">
        <p className="text-xs text-slate-600">
          Blue Carbon Registry · Ethereum Sepolia Testnet · Built with Hardhat, ethers.js & React
        </p>
      </footer>
    </div>
  )
}
