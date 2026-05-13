import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import {
  LayoutDashboard, Leaf, FileText, ShieldCheck,
  Coins, LogOut, User, Waves, ChevronRight, Menu, X
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { to: '/dashboard',        icon: LayoutDashboard, label: 'Dashboard',        auth: true },
  { to: '/projects',         icon: Leaf,            label: 'Projects',         auth: false },
  { to: '/register-project', icon: FileText,        label: 'Register Project', auth: true, roles: ['community','admin'] },
  { to: '/mrv/submit',       icon: FileText,        label: 'Submit MRV Data',  auth: true, roles: ['community','admin'] },
  { to: '/verifier',         icon: ShieldCheck,     label: 'Verifier Panel',   auth: true, roles: ['verifier','auditor','admin'] },
  { to: '/credits',          icon: Coins,           label: 'Carbon Credits',   auth: false },
]

export default function Layout() {
  const { user, logout, isAuthenticated } = useAuthStore()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => { logout(); navigate('/') }

  const visibleItems = navItems.filter(item => {
    if (item.auth && !isAuthenticated()) return false
    if (item.roles && user && !item.roles.includes(user.role)) return false
    return true
  })

  const Sidebar = () => (
    <aside className="flex flex-col h-full w-64 glass border-r border-ocean-500/10 px-4 py-6">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-10 px-2">
        <div className="w-9 h-9 rounded-xl bg-ocean-500/20 border border-ocean-500/40 flex items-center justify-center">
          <Waves size={18} className="text-ocean-400" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-100 leading-none">Blue Carbon</p>
          <p className="text-xs text-ocean-400 leading-none mt-0.5">Registry</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1">
        {visibleItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className={({ isActive }) =>
            `nav-link w-full ${isActive ? 'active' : ''}`
          }>
            <Icon size={16} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User */}
      {user ? (
        <div className="mt-6 pt-6 border-t border-dark-300/50">
          <div className="flex items-center gap-3 px-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-ocean-900/50 border border-ocean-500/30 flex items-center justify-center">
              <User size={14} className="text-ocean-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-200 truncate">{user.email}</p>
              <p className="text-xs text-ocean-400 capitalize">{user.role}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="nav-link w-full text-red-400 hover:text-red-300 hover:bg-red-900/10">
            <LogOut size={14} />
            <span>Sign out</span>
          </button>
        </div>
      ) : (
        <button onClick={() => navigate('/auth')} className="btn-primary w-full justify-center mt-6">
          Connect
        </button>
      )}

      {/* Chain badge */}
      <div className="mt-4 px-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-dark-400/50 border border-dark-200/30">
          <div className="w-1.5 h-1.5 rounded-full bg-ocean-400 animate-pulse" />
          <span className="text-xs text-slate-500 font-mono">Sepolia Testnet</span>
        </div>
      </div>
    </aside>
  )

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <div className="w-64 h-full">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <div className="md:hidden glass border-b border-ocean-500/10 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Waves size={16} className="text-ocean-400" />
            <span className="text-sm font-bold">Blue Carbon Registry</span>
          </div>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-400">
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
