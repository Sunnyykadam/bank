import { useState } from 'react'
import { Outlet, useNavigate, NavLink } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import {
  Plus, Menu, X, Wallet, Sun, Moon,
  LayoutDashboard, ArrowLeftRight, Target, BarChart3, User, LogOut
} from 'lucide-react'

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { path: '/goals', label: 'Savings & Goals', icon: Target },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/profile', label: 'Profile', icon: User }
]

export default function Layout() {
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { signOut, profile } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="app-layout">
      <Sidebar />

      {/* Mobile Top Header */}
      <header className="mobile-top-header">
        <div className="mobile-header-left">
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <div className="mobile-logo">
            <div className="logo-icon logo-icon-sm">
              <Wallet size={18} />
            </div>
            <span className="logo-text logo-text-sm">FinPulse</span>
          </div>
        </div>
        <div className="mobile-header-right">
          <button
            className="theme-toggle theme-toggle-sm"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* Mobile Slide-out Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-drawer-overlay" onClick={() => setMobileMenuOpen(false)}>
          <aside className="mobile-drawer" onClick={e => e.stopPropagation()}>
            <div className="mobile-drawer-header">
              <div className="sidebar-logo">
                <div className="logo-icon">
                  <Wallet size={24} />
                </div>
                <span className="logo-text">FinPulse</span>
              </div>
              <button
                className="mobile-drawer-close"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                <X size={22} />
              </button>
            </div>
            <nav className="mobile-drawer-nav">
              {navItems.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <item.icon size={20} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
            <div className="mobile-drawer-footer">
              {profile && (
                <div className="sidebar-user">
                  <div className="sidebar-avatar">
                    {(profile.name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <span className="sidebar-username">{profile.name || 'User'}</span>
                </div>
              )}
              <button className="sidebar-link logout-btn" onClick={handleSignOut}>
                <LogOut size={20} />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      <main className="main-content">
        <Outlet />
      </main>
      <BottomNav />
      <button
        className="fab"
        onClick={() => navigate('/transactions?addNew=true')}
        aria-label="Quick add transaction"
        title="Add Transaction"
      >
        <Plus size={24} />
      </button>
    </div>
  )
}
