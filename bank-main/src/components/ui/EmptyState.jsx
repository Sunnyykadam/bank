import { PackageOpen } from 'lucide-react'

export default function EmptyState({ icon: Icon = PackageOpen, title = 'No data yet', description = 'Start by adding some data.', action, actionLabel }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <Icon size={48} strokeWidth={1.5} />
      </div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-desc">{description}</p>
      {action && (
        <button className="btn btn-primary" onClick={action} style={{ marginTop: '16px' }}>
          {actionLabel || 'Get Started'}
        </button>
      )}
    </div>
  )
}
