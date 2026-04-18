import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { Eye, EyeOff, Wallet, Sun, Moon } from 'lucide-react'
import toast from 'react-hot-toast'

const PARTICLES = ['₹', '%', '↑', '📊', '💰', '📈', '→', '+']

function FloatingParticle({ symbol, delay, duration, left, size }) {
  return (
    <div
      className="floating-particle"
      style={{
        left: `${left}%`,
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
        fontSize: `${size}px`,
        opacity: 0.15
      }}
    >
      {symbol}
    </div>
  )
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [shake, setShake] = useState(false)
  const { signIn, user, isRemembered } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  // Pre-fill remember-me state from previous session
  useEffect(() => {
    setRememberMe(isRemembered())
  }, [])

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true })
  }, [user, navigate])

  const particles = useRef(
    Array.from({ length: 20 }, (_, i) => ({
      symbol: PARTICLES[i % PARTICLES.length],
      delay: Math.random() * 10,
      duration: 8 + Math.random() * 12,
      left: Math.random() * 100,
      size: 16 + Math.random() * 24
    }))
  ).current

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Please fill in all fields')
      setShake(true)
      setTimeout(() => setShake(false), 600)
      return
    }
    setError('')
    setIsLoading(true)
    try {
      const { data, error: authError } = await signIn(email, password, rememberMe)
      if (authError) {
        setError(authError.message || 'Invalid credentials')
        setShake(true)
        setTimeout(() => setShake(false), 600)
        toast.error('Login failed')
      } else {
        toast.success('Welcome back!')
        navigate('/dashboard', { replace: true })
      }
    } catch (err) {
      setError('Something went wrong. Please try again.')
      setShake(true)
      setTimeout(() => setShake(false), 600)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="login-page" data-theme={theme}>
      <div className="login-particles">
        {particles.map((p, i) => (
          <FloatingParticle key={i} {...p} />
        ))}
      </div>

      <button className="login-theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <div className={`login-card ${shake ? 'shake' : ''}`}>
        <div className="login-logo">
          <div className="login-logo-icon">
            <Wallet size={32} />
          </div>
          <h1 className="login-app-name">FinPulse</h1>
          <p className="login-tagline">Smart finance, simplified.</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className={`form-group ${error ? 'has-error' : ''}`}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter your email"
              autoComplete="email"
              className={error ? 'input-error' : ''}
            />
          </div>

          <div className={`form-group ${error ? 'has-error' : ''}`}>
            <label htmlFor="password">Password</label>
            <div className="password-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete={rememberMe ? 'current-password' : 'off'}
                className={error ? 'input-error' : ''}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && <p className="error-message">{error}</p>}

          {/* Remember Me */}
          <div className="remember-me-row">
            <label className="remember-me-label" htmlFor="rememberMe">
              <div
                className={`remember-me-checkbox ${rememberMe ? 'checked' : ''}`}
                onClick={() => setRememberMe(!rememberMe)}
                id="rememberMe"
                role="checkbox"
                aria-checked={rememberMe}
                tabIndex={0}
                onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setRememberMe(!rememberMe)}
              >
                {rememberMe && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span>Remember me</span>
            </label>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="btn-loader"></span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
