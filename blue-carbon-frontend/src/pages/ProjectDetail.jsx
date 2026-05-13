import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'
import { projectsAPI, mrvAPI } from '../services/api'
import { Leaf, MapPin, TrendingUp, Clock, Shield, FileText, ExternalLink, ArrowLeft, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

const ECOSYSTEM_ICONS = { MANGROVE: '🌿', SEAGRASS: '🌾', SALTMARSH: '🌱', TIDAL_WETLAND: '🌊' }

function StatusBadge({ status }) {
  const cfg = {
    PENDING:      { cls: 'badge-yellow', icon: Clock },
    UNDER_REVIEW: { cls: 'badge-blue',   icon: Clock },
    VERIFIED:     { cls: 'badge-green',  icon: CheckCircle },
    REJECTED:     { cls: 'badge-red',    icon: XCircle },
    SUSPENDED:    { cls: 'badge-red',    icon: AlertCircle },
    APPROVED:     { cls: 'badge-green',  icon: CheckCircle },
    SUBMITTED:    { cls: 'badge-yellow', icon: Clock },
  }
  const { cls, icon: Icon } = cfg[status] || { cls: 'badge-blue', icon: Clock }
  return (
    <span className={`${cls} flex items-center gap-1`}>
      <Icon size={10} /> {status?.replace('_', ' ')}
    </span>
  )
}

function InfoRow({ label, value, mono }) {
  return (
    <div className="flex items-center justify-between py-3 border-t border-dark-300/30">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-sm text-slate-200 ${mono ? 'font-mono text-xs text-ocean-400' : ''}`}>{value || '—'}</span>
    </div>
  )
}

export default function ProjectDetail() {
  const { id }        = useParams()
  const navigate      = useNavigate()
  const { user }      = useAuthStore()
  const [project, setProject]     = useState(null)
  const [reports, setReports]     = useState([])
  const [history, setHistory]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [tab, setTab]             = useState('overview')
  const [reviewNotes, setReviewNotes] = useState('')
  const [reviewing, setReviewing]     = useState(false)

  const canAudit = ['verifier','auditor','admin'].includes(user?.role) && ['PENDING','UNDER_REVIEW'].includes(project?.status)

  const handleVerify = async (approved) => {
    if (!reviewNotes.trim()) return toast.error('Review notes required')
    setReviewing(true)
    try {
      await projectsAPI.verify(project.onChainId || id, { approved, notes: reviewNotes })
      toast.success(`Project ${approved ? 'verified' : 'rejected'}`)
      const refreshed = await projectsAPI.get(id)
      setProject(refreshed.data)
      setReviewNotes('')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setReviewing(false)
    }
  }

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      projectsAPI.get(id),
      projectsAPI.history(id),
    ]).then(([p, h]) => {
      setProject(p.data)
      setHistory(h.data || [])
    }).catch(() => navigate('/projects'))
    .finally(() => setLoading(false))

    projectsAPI.get(id).then(p => {
      if (p.data?.onChainId) {
        mrvAPI.list({ projectId: p.data.onChainId, limit: 20 })
          .then(r => setReports(r.data || []))
          .catch(() => {})
      }
    }).catch(() => {})
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-ocean-500/30 border-t-ocean-400 rounded-full animate-spin" />
    </div>
  )

  if (!project) return (
    <div className="text-center py-20">
      <p className="text-slate-500">Project not found</p>
      <button onClick={() => navigate('/projects')} className="btn-secondary mt-4 mx-auto">Back to Registry</button>
    </div>
  )

  const statusColors = {
    PENDING:      'border-l-amber-500',
    UNDER_REVIEW: 'border-l-blue-500',
    VERIFIED:     'border-l-ocean-500',
    REJECTED:     'border-l-red-500',
    SUSPENDED:    'border-l-red-500',
  }

  return (
    <div>
      {/* Back */}
      <button onClick={() => navigate('/projects')} className="btn-ghost -ml-2 mb-6">
        <ArrowLeft size={14} /> Back to Registry
      </button>

      {/* Header */}
      <div className={`glass-card mb-6 border-l-4 ${statusColors[project.status] || 'border-l-ocean-500'}`}>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-ocean-900/50 border border-ocean-500/30 flex items-center justify-center text-2xl">
              {ECOSYSTEM_ICONS[project.ecosystemType] || '🌿'}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100 mb-1">{project.name}</h1>
              <div className="flex items-center gap-3 flex-wrap">
                <StatusBadge status={project.status} />
                <span className="text-xs text-slate-500 capitalize">{project.ecosystemType?.toLowerCase()?.replace('_', ' ')}</span>
                {project.onChainId && <span className="hash">ID: #{project.onChainId}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {project.onChainId && (
              <a
                href={`https://sepolia.etherscan.io/address/${process.env.VITE_REGISTRY_ADDRESS || '0x45a3A0BA0f2B5aCC69966F796E1d59fEad89B2e6'}`}
                target="_blank" rel="noopener noreferrer"
                className="btn-secondary text-xs">
                Etherscan <ExternalLink size={11} />
              </a>
            )}
          </div>
        </div>

        {project.description && (
          <p className="text-sm text-slate-400 mt-4 leading-relaxed">{project.description}</p>
        )}
      </div>

      {/* Auditor actions */}
      {canAudit && (
        <div className="glass-card mb-6 border-ocean-500/20">
          <h2 className="section-title flex items-center gap-2 mb-4">
            <Shield size={16} className="text-ocean-400" /> Audit Project
          </h2>
          <div className="mb-4">
            <label className="label">Review Notes *</label>
            <textarea value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} rows={3}
              className="input-field resize-none"
              placeholder="Describe your findings..." />
          </div>
          <div className="flex gap-3">
            <button onClick={() => handleVerify(true)} disabled={reviewing}
              className="flex-1 btn-primary flex items-center justify-center gap-2">
              <CheckCircle size={14} /> {reviewing ? 'Processing...' : 'Approve'}
            </button>
            <button onClick={() => handleVerify(false)} disabled={reviewing}
              className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50">
              <XCircle size={14} /> {reviewing ? 'Processing...' : 'Reject'}
            </button>
          </div>
        </div>
      )}

      {/* Carbon highlight */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Carbon Registered', value: `${project.totalCarbonTonnes || 0}t`, icon: TrendingUp, color: 'text-ocean-400' },
          { label: 'Area',              value: `${project.location?.areaHectares || 0} ha`, icon: MapPin,    color: 'text-blue-400' },
          { label: 'MRV Reports',       value: reports.length,                              icon: FileText,  color: 'text-amber-400' },
        ].map(({ label, value, icon: Icon, color }) => (
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
      <div className="flex gap-1 p-1 bg-dark-400/50 rounded-xl mb-6 w-fit">
        {['overview', 'mrv reports', 'audit trail'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-lg capitalize transition-all
              ${tab === t ? 'bg-ocean-500/20 text-ocean-300 border border-ocean-500/30' : 'text-slate-500 hover:text-slate-300'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="glass-card">
            <h2 className="section-title flex items-center gap-2">
              <Leaf size={16} className="text-ocean-400" /> Project Info
            </h2>
            <InfoRow label="Owner"        value={`${project.owner?.slice(0,10)}...${project.owner?.slice(-8)}`} mono />
            <InfoRow label="Country"      value={project.location?.countryCode} />
            <InfoRow label="Region"       value={project.location?.region} />
            <InfoRow label="Ecosystem"    value={project.ecosystemType?.replace('_',' ')} />
            <InfoRow label="Registered"   value={new Date(project.registeredAt || project.createdAt).toLocaleDateString()} />
            {project.verifiedAt && <InfoRow label="Verified"  value={new Date(project.verifiedAt).toLocaleDateString()} />}
            {project.verifiedBy && <InfoRow label="Verified By" value={`${project.verifiedBy?.slice(0,10)}...`} mono />}
          </div>

          <div className="glass-card">
            <h2 className="section-title flex items-center gap-2">
              <MapPin size={16} className="text-ocean-400" /> Location
            </h2>
            <InfoRow label="Latitude"     value={project.location?.latitude} />
            <InfoRow label="Longitude"    value={project.location?.longitude} />
            <InfoRow label="Area"         value={`${project.location?.areaHectares} hectares`} />
            {project.metadataURI && (
              <>
                <div className="divider" />
                <h3 className="text-xs text-slate-500 uppercase tracking-wider mb-2">IPFS Metadata</h3>
                <div className="flex items-center justify-between">
                  <span className="hash text-xs truncate flex-1 mr-2">{project.metadataURI?.slice(0,35)}...</span>
                  <a href={`https://gateway.pinata.cloud/ipfs/${project.metadataURI?.replace('ipfs://', '')}`}
                    target="_blank" rel="noopener noreferrer" className="text-ocean-400 hover:text-ocean-300 shrink-0">
                    <ExternalLink size={13} />
                  </a>
                </div>
              </>
            )}
          </div>

          {/* Tags / SDGs */}
          {(project.tags?.length > 0 || project.sdgGoals?.length > 0) && (
            <div className="glass-card md:col-span-2">
              {project.tags?.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-xs text-slate-500 uppercase tracking-wider mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {project.tags.map(tag => (
                      <span key={tag} className="px-3 py-1 bg-dark-400/50 border border-dark-200/50 rounded-full text-xs text-slate-400">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
              {project.sdgGoals?.length > 0 && (
                <div>
                  <h3 className="text-xs text-slate-500 uppercase tracking-wider mb-2">UN SDG Goals</h3>
                  <div className="flex flex-wrap gap-2">
                    {project.sdgGoals.map(goal => (
                      <span key={goal} className="px-3 py-1 bg-ocean-900/30 border border-ocean-500/20 rounded-full text-xs text-ocean-400">SDG {goal}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MRV Reports */}
      {tab === 'mrv reports' && (
        <div className="glass-card">
          <h2 className="section-title flex items-center gap-2">
            <FileText size={16} className="text-ocean-400" /> MRV Reports ({reports.length})
          </h2>

          {reports.length === 0 ? (
            <div className="text-center py-12">
              <FileText size={28} className="text-slate-700 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No MRV reports submitted yet</p>
              <button onClick={() => navigate('/mrv/submit')} className="btn-primary mx-auto mt-4">Submit First Report</button>
            </div>
          ) : reports.map(r => (
            <div key={r._id || r.onChainId} className="table-row">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-slate-200">Report #{r.onChainId}</span>
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><TrendingUp size={11} className="text-ocean-400" />{r.carbonTonnes}t CO₂</span>
                    <span>{new Date(r.measurementDate || r.submittedAt).toLocaleDateString()}</span>
                    {r.methodology && <span>{r.methodology}</span>}
                  </div>
                  {r.reviewNotes && (
                    <p className="text-xs text-slate-500 mt-1 italic">"{r.reviewNotes}"</p>
                  )}
                </div>
                {r.dataURI && (
                  <a href={`https://gateway.pinata.cloud/ipfs/${r.dataURI.replace('ipfs://', '')}`}
                    target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-ocean-400">
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
              {r.txHash && (
                <div className="mt-2">
                  <a href={`https://sepolia.etherscan.io/tx/${r.txHash}`} target="_blank" rel="noopener noreferrer"
                    className="tx-link text-xs flex items-center gap-1">
                    Tx: {r.txHash?.slice(0,18)}... <ExternalLink size={10} />
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Audit Trail */}
      {tab === 'audit trail' && (
        <div className="glass-card">
          <h2 className="section-title flex items-center gap-2">
            <Shield size={16} className="text-ocean-400" /> Verification Audit Trail
          </h2>
          <p className="text-xs text-slate-500 mb-6">All status changes are permanently recorded on Ethereum Sepolia</p>

          {history.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No history available</p>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-px bg-dark-200/50" />

              <div className="space-y-6 pl-10">
                {history.map((event, i) => {
                  const dotColors = {
                    PENDING:      'bg-amber-500',
                    UNDER_REVIEW: 'bg-blue-500',
                    VERIFIED:     'bg-ocean-500',
                    REJECTED:     'bg-red-500',
                    SUSPENDED:    'bg-red-500',
                  }
                  return (
                    <div key={i} className="relative">
                      {/* Dot */}
                      <div className={`absolute -left-6 top-1 w-3 h-3 rounded-full border-2 border-dark-500 ${dotColors[event.status] || 'bg-slate-500'}`} />

                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <StatusBadge status={event.status} />
                          <span className="text-xs text-slate-600">{new Date(event.timestamp).toLocaleString()}</span>
                        </div>
                        {event.notes && (
                          <p className="text-xs text-slate-400 italic mb-1">"{event.notes}"</p>
                        )}
                        <p className="text-xs text-slate-600 font-mono">
                          by {event.actor?.slice(0,10)}...{event.actor?.slice(-6)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
