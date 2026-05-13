import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from './store/authStore'
import Layout from './components/layout/Layout'
import Landing from './pages/Landing'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'
import RegisterProject from './pages/RegisterProject'
import MRVSubmit from './pages/MRVSubmit'
import VerifierDashboard from './pages/VerifierDashboard'
import Credits from './pages/Credits'

function PrivateRoute({ children, roles }) {
  const { token, user } = useAuthStore()
  if (!token) return <Navigate to="/auth" replace />
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  const fetchMe = useAuthStore(s => s.fetchMe)
  useEffect(() => { fetchMe() }, [])

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={<Auth />} />
      <Route element={<Layout />}>
        <Route path="/dashboard" element={
          <PrivateRoute><Dashboard /></PrivateRoute>
        } />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/register-project" element={
          <PrivateRoute><RegisterProject /></PrivateRoute>
        } />
        <Route path="/mrv/submit" element={
          <PrivateRoute><MRVSubmit /></PrivateRoute>
        } />
        <Route path="/verifier" element={
          <PrivateRoute roles={['verifier','auditor','admin']}><VerifierDashboard /></PrivateRoute>
        } />
        <Route path="/credits" element={<Credits />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
