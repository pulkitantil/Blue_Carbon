import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { projectsAPI } from '../services/api'
import { Leaf, Search, Filter, ExternalLink, MapPin, TrendingUp } from 'lucide-react'

const ECOSYSTEM_ICONS = { MANGROVE: '🌿', SEAGRASS: '🌾', SALTMARSH: '🌱', TIDAL_WETLAND: '🌊' }

function StatusBadge({ status }) {
  const map = { PENDING: 'badge-yellow', UNDER_REVIEW: 'badge-blue', VERIFIED: 'badge-green', REJECTED: 'badge-red', SUSPENDED: 'badge-red' }
  return <span className={map[status] || 'badge-blue'}>{status?.replace('_',' ')}</span>
}

export default function Projects() {
  const navigate = useNavigate()
  const [projects, setProjects]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatus] = useState('')
  const [ecoFilter, setEco]       = useState('')
  const [page, setPage]           = useState(1)
  const [total, setTotal]         = useState(0)
  const limit = 12

  useEffect(() => {
    setLoading(true)
    projectsAPI.list({ status: statusFilter, ecosystemType: ecoFilter, page, limit })
      .then(r => { setProjects(r.data || []); setTotal(r.pagination?.total || 0) })
      .finally(() => setLoading(false))
  }, [statusFilter, ecoFilter, page])

  const filtered = search
    ? projects.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()) || p.location?.countryCode?.includes(search.toUpperCase()))
    : projects

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title">Project Registry</h1>
          <p className="page-subtitle">{total} projects registered on Ethereum Sepolia</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="input-field pl-9" placeholder="Search projects..." />
        </div>
        <select value={statusFilter} onChange={e => setStatus(e.target.value)} className="input-field w-auto">
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="VERIFIED">Verified</option>
          <option value="UNDER_REVIEW">Under Review</option>
        </select>
        <select value={ecoFilter} onChange={e => setEco(e.target.value)} className="input-field w-auto">
          <option value="">All Ecosystems</option>
          <option value="MANGROVE">Mangrove</option>
          <option value="SEAGRASS">Seagrass</option>
          <option value="SALTMARSH">Saltmarsh</option>
          <option value="TIDAL_WETLAND">Tidal Wetland</option>
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass-card animate-pulse h-48">
              <div className="h-4 bg-dark-300/50 rounded mb-3 w-3/4" />
              <div className="h-3 bg-dark-300/30 rounded mb-2 w-1/2" />
              <div className="h-3 bg-dark-300/30 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Leaf size={40} className="text-slate-700 mx-auto mb-4" />
          <p className="text-slate-500">No projects found</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => (
            <div key={p._id || p.onChainId}
              className="glass-card hover:border-ocean-500/30 transition-all cursor-pointer group"
              onClick={() => navigate(`/projects/${p.onChainId || p.id}`)}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{ECOSYSTEM_ICONS[p.ecosystemType] || '🌿'}</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-200 group-hover:text-ocean-300 transition-colors line-clamp-1">
                      {p.name}
                    </p>
                    <p className="text-xs text-slate-500 capitalize">{p.ecosystemType?.toLowerCase()}</p>
                  </div>
                </div>
                <StatusBadge status={p.status} />
              </div>

              <p className="text-xs text-slate-500 line-clamp-2 mb-4">{p.description}</p>

              <div className="flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-1">
                  <MapPin size={11} />
                  <span>{p.location?.countryCode} · {p.location?.areaHectares}ha</span>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp size={11} className="text-ocean-400" />
                  <span className="text-ocean-400">{p.totalCarbonTonnes || 0}t CO₂</span>
                </div>
              </div>

              {p.onChainId && (
                <div className="mt-3 pt-3 border-t border-dark-300/30">
                  <span className="hash">ID: {p.onChainId}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
            className="btn-secondary text-xs disabled:opacity-30">Prev</button>
          <span className="text-xs text-slate-500">Page {page} of {Math.ceil(total/limit)}</span>
          <button onClick={() => setPage(p => p+1)} disabled={page >= Math.ceil(total/limit)}
            className="btn-secondary text-xs disabled:opacity-30">Next</button>
        </div>
      )}
    </div>
  )
}
