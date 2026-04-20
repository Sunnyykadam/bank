import React from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../lib/loanHelpers';

export default function SavingsGoalsOverview({ goals }) {
  const getBarColor = (percent) => {
    if (percent < 80) return '#10b981';
    if (percent < 100) return '#f59e0b';
    return '#5b4cf5';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  };

  return (
    <div style={{
      background: 'var(--color-background-primary)',
      border: '0.5px solid var(--color-border-tertiary)',
      borderRadius: '10px',
      padding: '16px 18px',
      height: '100%'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '13.5px', fontWeight: '500', margin: 0 }}>Savings Goals</h3>
        <Link to="/savings" style={{ fontSize: '12px', color: '#7c6ff7', textDecoration: 'none' }}>View All →</Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {goals.map((goal) => (
          <div key={goal.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: '500' }}>{goal.name}</span>
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{formatDate(goal.target_date)}</span>
            </div>
            <div style={{ height: '6px', background: 'var(--color-background-secondary)', borderRadius: '3px', overflow: 'hidden', marginBottom: '6px' }}>
              <div style={{ 
                height: '100%', 
                width: `${goal.progressPercent}%`, 
                background: getBarColor(goal.progressPercent),
                transition: 'width 0.4s ease'
              }} />
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
              <span>{formatCurrency(goal.current_amount)} of {formatCurrency(goal.target_amount)}</span>
              <span style={{ fontWeight: '600' }}>{goal.progressPercent.toFixed(1)}%</span>
            </div>
          </div>
        ))}
        {goals.length === 0 && (
          <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '13px' }}>
            No savings goals yet
          </div>
        )}
      </div>
    </div>
  );
}
