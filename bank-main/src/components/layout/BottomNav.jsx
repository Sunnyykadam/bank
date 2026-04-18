import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, ArrowLeftRight, Target, BarChart3, User
} from 'lucide-react'

const navItems = [
  { path: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { path: '/transactions', label: 'Txns', icon: ArrowLeftRight },
  { path: '/goals', label: 'Goals', icon: Target },
  { path: '/analytics', label: 'Stats', icon: BarChart3 },
  { path: '/profile', label: 'Profile', icon: User }
]

export default function BottomNav() {
  return (
    <nav className="bottom-nav" id="bottom-nav">
      {navItems.map(item => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
        >
          <item.icon size={20} strokeWidth={isActive => isActive ? 2.5 : 2} />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
