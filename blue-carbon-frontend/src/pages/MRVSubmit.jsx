// MRVSubmit.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { mrvAPI } from '../services/api'
import { Upload, FileText, CheckCircle, ExternalLink, X } from 'lucide-react'

export default function MRVSubmit() {
  const navigate = useNavigate()
  const [files, setFiles]     = useState([])
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState(null)
  const { register, handleSubmit, formState: { errors } } = useForm()

  const onFileDrop = (e) => {
    e.preventDefault()
    const fs = Array.from(e.dataTransfer?.files || e.target.files || [])
    setFiles(prev => [...prev, ...fs].slice(0, 20))
  }

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const fd = new FormData()
      Object.entries(data).forEach(([k, v]) => fd.append(k, v))
      files.forEach(f => fd.append('files', f))
      const res = await mrvAPI.submit(fd)
      setResult(res.data)
      toast.success('MRV report submitted on-chain!')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (result) return (
    <div className="max-w-lg mx-auto">
      <div className="glass-card text-center">
        <div className="w-16 h-16 rounded-full bg-ocean-900/50 border border-ocean-500/40 flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={28} className="text-ocean-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-100 mb-2">MRV Report Submitted!</h2>
        <p className="text-slate-400 text-sm mb-6">Your data has been recorded on Ethereum Sepolia</p>

        <div className="space-y-3 text-left mb-6">
          {[
            { label: 'Report ID', value: <span className="hash">#{result.reportId}</span> },
            { label: 'Transaction', value: <a href={`https://sepolia.etherscan.io/tx/${result.txHash}`} target="_blank" rel="noopener noreferrer" className="tx-link flex items-center gap-1 justify-end">{result.txHash?.slice(0,12)}... <ExternalLink size={10} /></a> },
            { label: 'IPFS Data', value: <span className="hash">{result.dataURI?.slice(0,22)}...</span> },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center py-2 border-t border-dark-300/30">
              <span className="text-xs text-slate-500">{label}</span>
              {value}
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-500 mb-6">A verifier will review your report. You will receive BCT credits once approved.</p>

        <div className="flex gap-3">
          <button onClick={() => navigate('/dashboard')} className="btn-secondary flex-1 justify-center">Dashboard</button>
          <button onClick={() => navigate('/projects')} className="btn-primary flex-1 justify-center">View Projects</button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="page-title">Submit MRV Report</h1>
      <p className="page-subtitle">Upload measurement, reporting and verification data for your project</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="glass-card space-y-4">
          <h2 className="section-title flex items-center gap-2"><FileText size={16} className="text-ocean-400" />Report Details</h2>

          <div>
            <label className="label">Project ID *</label>
            <input {...register('projectId', { required: 'Required' })} className="input-field font-mono" placeholder="e.g. 1" />
            {errors.projectId && <p className="text-red-400 text-xs mt-1">{errors.projectId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Carbon Tonnes *</label>
              <input {...register('carbonTonnes', { required: 'Required', min: { value: 0.0001, message: 'Min 0.0001' } })}
                className="input-field" placeholder="e.g. 850.5" type="number" step="0.0001" />
              {errors.carbonTonnes && <p className="text-red-400 text-xs mt-1">{errors.carbonTonnes.message}</p>}
            </div>
            <div>
              <label className="label">Measurement Date *</label>
              <input {...register('measurementDate', { required: 'Required' })} className="input-field" type="date"
                max={new Date().toISOString().split('T')[0]} />
              {errors.measurementDate && <p className="text-red-400 text-xs mt-1">{errors.measurementDate.message}</p>}
            </div>
          </div>

          <div>
            <label className="label">Methodology</label>
            <select {...register('methodology')} className="input-field">
              <option value="VERRA-VM0033">VERRA VM0033 (default)</option>
              <option value="VERRA-VM0007">VERRA VM0007</option>
              <option value="GOLD-STANDARD">Gold Standard</option>
              <option value="CUSTOM">Custom</option>
            </select>
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea {...register('notes')} rows={3} className="input-field resize-none"
              placeholder="Additional observations, field conditions, measurement methodology details..." />
          </div>
        </div>

        {/* File upload */}
        <div className="glass-card">
          <h2 className="section-title flex items-center gap-2"><Upload size={16} className="text-ocean-400" />Supporting Files</h2>
          <p className="text-xs text-slate-500 mb-4">GPS exports, sensor data, field photos, satellite imagery</p>

          <div onDrop={onFileDrop} onDragOver={e => e.preventDefault()}
            onClick={() => document.getElementById('mrv-files').click()}
            className="border-2 border-dashed border-dark-200/50 hover:border-ocean-500/40 rounded-xl p-8 text-center cursor-pointer transition-all">
            <Upload size={24} className="text-slate-500 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Drop files or click to upload</p>
            <p className="text-xs text-slate-600 mt-1">CSV, PDF, images, GPX files — up to 20 files</p>
            <input id="mrv-files" type="file" multiple className="hidden" onChange={onFileDrop} />
          </div>

          {files.length > 0 && (
            <div className="mt-3 space-y-2">
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 bg-dark-400/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText size={12} className="text-ocean-400" />
                    <span className="text-xs text-slate-300">{f.name}</span>
                    <span className="text-xs text-slate-600">({(f.size/1024).toFixed(0)}KB)</span>
                  </div>
                  <button type="button" onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                    className="text-slate-600 hover:text-red-400 transition-colors">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-card bg-ocean-900/10 border-ocean-500/20">
          <p className="text-xs text-ocean-300 font-medium mb-1">What happens next?</p>
          <p className="text-xs text-slate-500">Your report will be stored on IPFS and registered on Ethereum. A verifier will review it and approve/reject. Once approved, BCT tokens will be automatically issued to your wallet.</p>
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base">
          {loading ? (
            <><div className="w-4 h-4 border-2 border-dark-500/30 border-t-dark-500 rounded-full animate-spin" /> Submitting to Sepolia...</>
          ) : (
            <><FileText size={16} /> Submit MRV Report</>
          )}
        </button>
      </form>
    </div>
  )
}
