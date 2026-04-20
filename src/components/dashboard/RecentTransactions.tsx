import React from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../lib/loanHelpers';

export default function RecentTransactions({ transactions }) {
  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
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
        <h3 style={{ fontSize: '13.5px', fontWeight: '500', margin: 0 }}>Recent Transactions</h3>
        <Link to="/transactions" style={{ fontSize: '12px', color: '#7c6ff7', textDecoration: 'none' }}>View All →</Link>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--color-border-tertiary)' }}>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Category</th>
              <th style={thStyle}>Note</th>
              <th style={thStyle}>Method</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx, idx) => (
              <tr key={tx.id || idx} style={{ borderBottom: idx === transactions.length - 1 ? 'none' : '1px solid var(--color-border-tertiary)' }}>
                <td style={tdStyle}>{formatDate(tx.date_time)}</td>
                <td style={tdStyle}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {getCategoryEmoji(tx.category)} {tx.category}
                  </span>
                </td>
                <td style={{ ...tdStyle, color: 'var(--color-text-secondary)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {tx.note || '-'}
                </td>
                <td style={{ ...tdStyle, textTransform: 'capitalize' }}>{tx.payment_method}</td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '600', color: tx.type === 'income' ? '#10b981' : '#ef4444' }}>
                  {tx.type === 'income' ? '+' : '−'}{formatCurrency(tx.amount)}
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '60px 0', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                  No transactions yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thStyle = {
  padding: '12px 8px',
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--color-text-secondary)',
  fontWeight: '600'
};

const tdStyle = {
  padding: '12px 8px'
};

const getCategoryEmoji = (cat) => {
  const emojis = {
    'Food': '🍲', 'Rent': '🏠', 'Salary': '💰', 'EMI': '📉', 'Medical': '🏥',
    'Entertainment': '🎬', 'Shopping': '🛍️', 'Investment': '📈', 'Goal Payment': '🎯', 'Other': '📦'
  };
  return emojis[cat] || '📋';
};
