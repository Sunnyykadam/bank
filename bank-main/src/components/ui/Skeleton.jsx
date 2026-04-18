import { useTheme } from '../../context/ThemeContext'

export default function Skeleton({ width, height, borderRadius = '8px', className = '' }) {
  const { theme } = useTheme()
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width: width || '100%',
        height: height || '20px',
        borderRadius,
        background: theme === 'dark'
          ? 'linear-gradient(90deg, #1A1A24 25%, #2A2A3A 50%, #1A1A24 75%)'
          : 'linear-gradient(90deg, #E5E5EA 25%, #F0F0F5 50%, #E5E5EA 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite'
      }}
    />
  )
}

export function SkeletonCard() {
  return (
    <div className="card" style={{ padding: '20px' }}>
      <Skeleton width="40%" height="14px" />
      <div style={{ height: 8 }} />
      <Skeleton width="60%" height="28px" />
      <div style={{ height: 12 }} />
      <Skeleton width="80%" height="40px" />
    </div>
  )
}

export function SkeletonRow() {
  return (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '12px 0' }}>
      <Skeleton width="40px" height="40px" borderRadius="50%" />
      <div style={{ flex: 1 }}>
        <Skeleton width="50%" height="14px" />
        <div style={{ height: 6 }} />
        <Skeleton width="30%" height="12px" />
      </div>
      <Skeleton width="80px" height="20px" />
    </div>
  )
}
