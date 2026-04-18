import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'

export default function Header() {
  const { theme, toggleTheme } = useTheme()
  const { profile } = useAuth()

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <header className="page-header">
      <div className="header-left">
        <h1 className="header-greeting">
          {getGreeting()}, {profile?.name || 'User'} 👋
        </h1>
        <p className="header-date">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
      </div>
      <div className="header-right">
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
    </header>
  )
}
