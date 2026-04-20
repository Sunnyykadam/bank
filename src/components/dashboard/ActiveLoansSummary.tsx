import React from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from '../../lib/loanHelpers';

export default function ActiveLoansSummary({ loansGiven, loansTaken }) {
  const hasLoans = loansGiven.count > 0 || loansTaken.count > 0;

  return (
    <div style={{
      background: 'var(--color-background-primary)',
      border: '0.5px solid var(--color-border-tertiary)',
      borderRadius: '10px',
      padding: '16px 18px',
      height: '100%'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '13.5px', fontWeight: '500', margin: 0 }}>Active Loans</h3>
        <Link to="/loans" style={{ fontSize: '12px', color: '#7c6ff7', textDecoration: 'none' }}>View All →</Link>
      </div>

      {!hasLoans ? (
        <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '13px' }}>
          No active loans
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {/* Loans Given */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                <TrendingUp size={16} />
              </div>
              <span style={labelStyle}>Given</span>
            </div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: '#10b981', marginBottom: '4px' }}>
              {formatCurrency(loansGiven.totalAmount)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
              {loansGiven.count} active loans
            </div>
          </div>

          <div style={{ width: '1px', height: '60px', background: 'var(--color-border-tertiary)', margin: '0 20px' }} />

          {/* Loans Taken */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                <TrendingDown size={16} />
              </div>
              <span style={labelStyle}>Taken</span>
            </div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: '#ef4444', marginBottom: '4px' }}>
              {formatCurrency(loansTaken.totalAmount)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
              {loansTaken.count} active loans
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle = {
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--color-text-secondary)',
  fontWeight: '600'
};
