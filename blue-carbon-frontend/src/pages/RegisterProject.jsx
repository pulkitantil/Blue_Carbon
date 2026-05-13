import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { projectsAPI } from '../services/api'
import { Upload, MapPin, Leaf, X, CheckCircle, ExternalLink } from 'lucide-react'

export default function RegisterProject() {
  const navigate = useNavigate()
  const [photos, setPhotos]   = useState([])
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState(null)
  const { register, handleSubmit, formState: { errors } } = useForm()

  const onFileDrop = (e) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer?.files || e.target.files || [])
    const imgs = files.filter(f => f.type.startsWith('image/'))
    setPhotos(prev => [...prev, ...imgs].slice(0, 10))
  }

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const fd = new FormData()
      Object.entries(data).forEach(([k, v]) => fd.append(k, v))
      photos.forEach(f => fd.append('photos', f))
      const res = await projectsAPI.create(fd)
      setResult(res.data)
      toast.success('Project registered on-chain!')
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
        <h2 className="text-xl font-bold text-slate-100 mb-2">Project Registered!</h2>
        <p className="text-slate-400 text-sm mb-6">Your project is now live on Ethereum Sepolia</p>

        <div className="space-y-3 text-left mb-6">
          <div className="flex justify-between py-2 border-t border-dark-300/30">
            <span className="text-xs text-slate-500">Project ID</span>
            <span className="hash">#{result.projectId}</span>
          </div>
          <div className="flex justify-between py-2 border-t border-dark-300/30">
            <span className="text-xs text-slate-500">Transaction</span>
            <a href={`https://sepolia.etherscan.io/tx/${result.txHash}`} target="_blank" rel="noopener noreferrer"
              className="tx-link flex items-center gap-1">
              {result.txHash?.slice(0,10)}... <ExternalLink size={10} />
            </a>
          </div>
          <div className="flex justify-between py-2 border-t border-dark-300/30">
            <span className="text-xs text-slate-500">IPFS Metadata</span>
            <span className="hash text-xs">{result.metadataURI?.slice(0,20)}...</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={() => navigate('/projects')} className="btn-secondary flex-1 justify-center">
            View Registry
          </button>
          <button onClick={() => navigate('/mrv/submit')} className="btn-primary flex-1 justify-center">
            Submit MRV Data
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="page-title">Register Project</h1>
      <p className="page-subtitle">Register your blue carbon ecosystem project on Ethereum Sepolia</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic info */}
        <div className="glass-card space-y-4">
          <h2 className="section-title flex items-center gap-2"><Leaf size={16} className="text-ocean-400" />Project Details</h2>

          <div>
            <label className="label">Project Name *</label>
            <input {...register('name', { required: 'Required' })} className="input-field" placeholder="e.g. Sundarbans Mangrove Restoration" />
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="label">Description *</label>
            <textarea {...register('description', { required: 'Required' })} rows={3}
              className="input-field resize-none" placeholder="Describe the project, its goals, and ecosystem..." />
            {errors.description && <p className="text-red-400 text-xs mt-1">{errors.description.message}</p>}
          </div>

          <div>
            <label className="label">Ecosystem Type *</label>
            <select {...register('ecosystemType', { required: 'Required' })} className="input-field">
              <option value="">Select ecosystem</option>
              <option value="MANGROVE">🌿 Mangrove</option>
              <option value="SEAGRASS">🌾 Seagrass</option>
              <option value="SALTMARSH">🌱 Saltmarsh</option>
              <option value="TIDAL_WETLAND">🌊 Tidal Wetland</option>
            </select>
            {errors.ecosystemType && <p className="text-red-400 text-xs mt-1">{errors.ecosystemType.message}</p>}
          </div>
        </div>

        {/* Location */}
        <div className="glass-card space-y-4">
          <h2 className="section-title flex items-center gap-2"><MapPin size={16} className="text-ocean-400" />Location</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Latitude *</label>
              <input {...register('latitude', { required: 'Required', min: { value: -90, message: 'Invalid' }, max: { value: 90, message: 'Invalid' } })}
                className="input-field" placeholder="e.g. 21.85" type="number" step="0.000001" />
              {errors.latitude && <p className="text-red-400 text-xs mt-1">{errors.latitude.message}</p>}
            </div>
            <div>
              <label className="label">Longitude *</label>
              <input {...register('longitude', { required: 'Required', min: { value: -180, message: 'Invalid' }, max: { value: 180, message: 'Invalid' } })}
                className="input-field" placeholder="e.g. 89.42" type="number" step="0.000001" />
              {errors.longitude && <p className="text-red-400 text-xs mt-1">{errors.longitude.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Area (hectares) *</label>
              <input {...register('areaHectares', { required: 'Required', min: { value: 0.01, message: 'Min 0.01 ha' } })}
                className="input-field" placeholder="e.g. 500" type="number" step="0.01" />
              {errors.areaHectares && <p className="text-red-400 text-xs mt-1">{errors.areaHectares.message}</p>}
            </div>
            <div>
              <label className="label">Country Code *</label>
              <input {...register('countryCode', { required: 'Required', minLength: { value: 2, message: '2 chars' }, maxLength: { value: 2, message: '2 chars' } })}
                className="input-field uppercase" placeholder="e.g. IN" maxLength={2} />
              {errors.countryCode && <p className="text-red-400 text-xs mt-1">{errors.countryCode.message}</p>}
            </div>
          </div>

          <div>
            <label className="label">Region (optional)</label>
            <input {...register('region')} className="input-field" placeholder="e.g. Kerala Coast" />
          </div>
        </div>

        {/* Photos */}
        <div className="glass-card">
          <h2 className="section-title flex items-center gap-2"><Upload size={16} className="text-ocean-400" />Photos & Documents</h2>

          <div
            onDrop={onFileDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => document.getElementById('photo-input').click()}
            className="border-2 border-dashed border-dark-200/50 hover:border-ocean-500/40 rounded-xl p-8 text-center cursor-pointer transition-all"
          >
            <Upload size={24} className="text-slate-500 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Drop photos here or click to upload</p>
            <p className="text-xs text-slate-600 mt-1">Up to 10 images, max 50MB each</p>
            <input id="photo-input" type="file" multiple accept="image/*" className="hidden" onChange={onFileDrop} />
          </div>

          {photos.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {photos.map((f, i) => (
                <div key={i} className="relative group">
                  <img src={URL.createObjectURL(f)} alt="" className="w-16 h-16 object-cover rounded-lg border border-dark-200/50" />
                  <button type="button" onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base">
          {loading ? (
            <><div className="w-4 h-4 border-2 border-dark-500/30 border-t-dark-500 rounded-full animate-spin" /> Registering on Sepolia...</>
          ) : (
            <><Leaf size={16} /> Register Project On-Chain</>
          )}
        </button>
      </form>
    </div>
  )
}
