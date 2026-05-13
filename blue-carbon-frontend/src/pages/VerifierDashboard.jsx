import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { mrvAPI, projectsAPI } from '../services/api'
import { ShieldCheck, CheckCircle, XCircle, ExternalLink, FileText, Leaf, Coins, RefreshCw } from 'lucide-react'

function StatusBadge({ status }) {
  const map = { SUBMITTED: 'badge-yellow', IN_REVIEW: 'badge-blue', APPROVED: 'badge-green', REJECTED: 'badge-red', PENDING: 'badge-yellow', UNDER_REVIEW: 'badge-blue', VERIFIED: 'badge-green' }
  return <span className={map[status] || 'badge-blue'}>{status?.replace('_',' ')}</span>
}

function ReviewModal({ item, type, onClose, onReview }) {
  const [approved, setApproved] = useState(true)
  const [notes, setNotes]       = useState('')
  const [loading, setLoading]   = useState(false)

  const submit = async () => {
    if (!notes.trim()) return toast.error('Notes required')
    setLoading(true)
    try {
      await onReview(item, approved, notes)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="glass-card w-full max-w-md">
        <h3 className="font-bold text-slate-100 mb-4">
          Review {type === 'report' ? 'MRV Report' : 'Project'} #{item.onChainId || item.reportId || item._id}
        </h3>

        <div className="flex gap-2 mb-4">
          <button onClick={() => setApproved(true)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all border
              ${approved ? 'bg-ocean-500/20 border-ocean-500/40 text-ocean-300' : 'bg-transparent border-dark-200/50 text-slate-500'}`}>
            <CheckCircle size={14} /> Approve
          </button>
          <button onClick={() => setApproved(false)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all border
              ${!approved ? 'bg-red-900/20 border-red-500/40 text-red-300' : 'bg-transparent border-dark-200/50 text-slate-500'}`}>
            <XCircle size={14} /> Reject
          </button>
        </div>

        <div className="mb-4">
          <label className="label">Review Notes *</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4}
            className="input-field resize-none"
            placeholder={approved ? 'Describe what was verified...' : 'Explain why this is being rejected...'} />
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button onClick={submit} disabled={loading}
            className={`flex-1 justify-center py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all
              ${approved ? 'btn-primary' : 'bg-red-600 hover:bg-red-500 text-white'}`}>
            {loading ? '...' : approved ? 'Approve' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function VerifierDashboard() {
  const [reports, setReports]     = useState([])
  const [projects, setProjects]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(null) // { item, type }
  const [issuingId, setIssuingId] = useState(null)

  const load = () => {
    setLoading(true)
    Promise.all([
      mrvAPI.list({ status: 'SUBMITTED', limit: 20 }),
      projectsAPI.list({ status: 'UNDER_REVIEW', limit: 20 }),
    ]).then(([r, p]) => {
      setReports(r.data || [])
      setProjects(p.data || [])
    }).finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleReviewReport = async (report, approved, notes) => {
    await mrvAPI.review(report.onChainId || report._id, { approved, notes })
    toast.success(`Report ${approved ? 'approved' : 'rejected'}`)
    load()
  }

  const handleVerifyProject = async (project, approved, notes) => {
    await projectsAPI.verify(project.onChainId || project._id, { approved, notes })
    toast.success(`Project ${approved ? 'verified' : 'rejected'}`)
    load()
  }

  const issueCredits = async (reportId) => {
    setIssuingId(reportId)
    try {
      const res = await mrvAPI.issueCredits(reportId)
      toast.success(`${res.data.bctIssued} BCT issued!`)
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setIssuingId(null)
    }
  }

  const [approvedReports, setApprovedReports] = useState([])
  useEffect(() => {
    mrvAPI.list({ status: 'APPROVED', limit: 10 }).then(r => setApprovedReports(r.data || [])).catch(() => {})
  }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title">Verifier Panel</h1>
          <p className="page-subtitle">Review and approve MRV reports and projects</p>
        </div>
        <button onClick={load} className="btn-ghost flex items-center gap-2">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { icon: FileText, label: 'Pending Reports',  value: reports.length,   color: 'text-amber-400' },
          { icon: Leaf,     label: 'Projects to Review', value: projects.length, color: 'text-blue-400' },
          { icon: Coins,    label: 'Ready to Issue',   value: approvedReports.length, color: 'text-ocean-400' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="glass-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500">{label}</span>
              <Icon size={14} className={color} />
            </div>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* MRV Reports */}
        <div className="glass-card">
          <h2 className="section-title flex items-center gap-2">
            <FileText size={16} className="text-ocean-400" /> Pending MRV Reports
          </h2>

          {loading ? <p className="text-slate-500 text-sm">Loading...</p> :
           reports.length === 0 ? (
            <div className="text-center py-8">
              <ShieldCheck size={28} className="text-slate-700 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No pending reports</p>
            </div>
          ) : reports.map(r => (
            <div key={r._id || r.onChainId} className="table-row">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-200">Report #{r.onChainId}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Project #{r.projectOnChainId} · {r.carbonTonnes}t CO₂</p>
                  <p className="text-xs text-slate-600 mt-0.5">{new Date(r.submittedAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={r.status} />
                  <button onClick={() => setModal({ item: r, type: 'report' })} className="btn-secondary text-xs px-3 py-1.5">
                    Review
                  </button>
                </div>
              </div>
              {r.dataURI && (
                <div className="mt-2">
                  <span className="hash text-xs">{r.dataURI.slice(0,30)}...</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Projects */}
        <div className="glass-card">
          <h2 className="section-title flex items-center gap-2">
            <Leaf size={16} className="text-ocean-400" /> Projects Under Review
          </h2>

          {loading ? <p className="text-slate-500 text-sm">Loading...</p> :
           projects.length === 0 ? (
            <div className="text-center py-8">
              <ShieldCheck size={28} className="text-slate-700 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No projects to review</p>
            </div>
          ) : projects.map(p => (
            <div key={p._id || p.onChainId} className="table-row">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-200">{p.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{p.ecosystemType} · {p.location?.countryCode}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={p.status} />
                  <button onClick={() => setModal({ item: p, type: 'project' })} className="btn-secondary text-xs px-3 py-1.5">
                    Verify
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Issue Credits */}
      {approvedReports.length > 0 && (
        <div className="glass-card mt-6">
          <h2 className="section-title flex items-center gap-2">
            <Coins size={16} className="text-ocean-400" /> Issue Carbon Credits
          </h2>
          <p className="text-xs text-slate-500 mb-4">These approved reports are ready for BCT credit issuance</p>

          <div className="space-y-0">
            {approvedReports.map(r => (
              <div key={r._id || r.onChainId} className="table-row flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-200">Report #{r.onChainId}</p>
                  <p className="text-xs text-slate-500">Project #{r.projectOnChainId} · {r.carbonTonnes}t → {r.carbonTonnes} BCT</p>
                </div>
                <button
                  onClick={() => issueCredits(r.onChainId)}
                  disabled={issuingId === r.onChainId}
                  className="btn-primary text-xs px-4 py-2">
                  {issuingId === r.onChainId ? 'Issuing...' : <><Coins size={12} /> Issue BCT</>}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {modal && (
        <ReviewModal
          item={modal.item}
          type={modal.type}
          onClose={() => setModal(null)}
          onReview={modal.type === 'report' ? handleReviewReport : handleVerifyProject}
        />
      )}
    </div>
  )
}
