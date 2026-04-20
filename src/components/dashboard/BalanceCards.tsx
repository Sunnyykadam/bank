import React from 'react';
import { formatCurrency } from '../../lib/loanHelpers';

export default function BalanceCards({ totalBalance, cashBalance, bankBalance }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '14px',
      width: '100%'
    }}>
      {/* 1. Total Balance */}
      <div style={cardStyle('#5b4cf5')}>
        <span style={labelStyle}>Total Balance</span>
        <div style={{ fontSize: '24px', fontWeight: '600', margin: '4px 0' }}>{formatCurrency(totalBalance)}</div>
        <span style={subtextStyle}>Cash + Bank combined</span>
      </div>

      {/* 2. Cash Balance */}
      <div style={cardStyle('#10b981')}>
        <div style={headerStyle}>
          <span style={labelStyle}>Cash Balance</span>
          <span style={{ fontSize: '18px' }}>💵</span>
        </div>
        <div style={{ fontSize: '20px', fontWeight: '500', margin: '2px 0' }}>{formatCurrency(cashBalance)}</div>
      </div>

      {/* 3. Bank Balance */}
      <div style={cardStyle('#3b82f6')}>
        <div style={headerStyle}>
          <span style={labelStyle}>Bank Balance</span>
          <span style={{ fontSize: '18px' }}>🏦</span>
        </div>
        <div style={{ fontSize: '20px', fontWeight: '500', margin: '2px 0' }}>{formatCurrency(bankBalance)}</div>
      </div>
    </div>
  );
}

const cardStyle = (color) => ({
  background: 'var(--color-background-primary)',
  border: '0.5px solid var(--color-border-tertiary)',
  borderLeft: `3px solid ${color}`,
  borderRadius: '10px',
  padding: '16px 18px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center'
});

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
};

const labelStyle = {
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--color-text-secondary)',
  fontWeight: '600'
};

const subtextStyle = {
  fontSize: '11px',
  color: 'var(--color-text-secondary)'
};
