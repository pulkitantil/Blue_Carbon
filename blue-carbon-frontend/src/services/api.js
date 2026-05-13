import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
})

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('bcr_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  res => res.data,
  err => {
    const msg = err.response?.data?.message || err.message || 'Network error'
    return Promise.reject(new Error(msg))
  }
)

export const authAPI = {
  register: (data)        => api.post('/auth/register', data),
  login:    (data)        => api.post('/auth/login', data),
  me:       ()            => api.get('/auth/me'),
  updateWallet: (address) => api.patch('/auth/wallet', { walletAddress: address }),
}

export const projectsAPI = {
  list:    (params)        => api.get('/projects', { params }),
  stats:   ()              => api.get('/projects/stats'),
  get:     (id)            => api.get(`/projects/${id}`),
  history: (id)            => api.get(`/projects/${id}/history`),
  create:  (formData)      => api.post('/projects', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  verify:  (id, data)      => api.patch(`/projects/${id}/verify`, data),
  suspend: (id, data)      => api.patch(`/projects/${id}/suspend`, data),
}

export const mrvAPI = {
  list:         (params)   => api.get('/mrv', { params }),
  get:          (id)       => api.get(`/mrv/${id}`),
  submit:       (formData) => api.post('/mrv', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  review:       (id, data) => api.patch(`/mrv/${id}/review`, data),
  issueCredits: (id)       => api.post(`/mrv/${id}/issue-credits`),
}

export const creditsAPI = {
  balance:     (address)  => api.get(`/credits/balance/${address}`),
  issuances:   (params)   => api.get('/credits/issuances', { params }),
  retirements: (params)   => api.get('/credits/retirements', { params }),
  retire:      (data)     => api.post('/credits/retire', data),
}

export default api
