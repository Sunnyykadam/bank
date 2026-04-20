import React from 'react';
import { formatCurrency } from '../../lib/loanHelpers';

export default function MonthlySummary({ income, expenses, savings }) {
  const monthName = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
  const expensePercent = income > 0 ? (expenses / income) * 100 : expenses > 0 ? 100 : 0;
  
  const getBarColor = () => {
    if (expensePercent < 80) return '#10b981';
    if (expensePercent <= 100) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div style={{
      background: 'var(--color-background-primary)',
      border: '0.5px solid var(--color-border-tertiary)',
      borderRadius: '10px',
      padding: '20px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '500', margin: 0 }}>This Month</h3>
        <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{monthName}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={labelStyle}>Total Income</div>
          <div style={{ fontSize: '18px', fontWeight: '600', color: '#10b981' }}>{formatCurrency(income)}</div>
        </div>
        <div>
          <div style={labelStyle}>Total Expenses</div>
          <div style={{ fontSize: '18px', fontWeight: '600', color: '#ef4444' }}>{formatCurrency(expenses)}</div>
        </div>
        <div>
          <div style={labelStyle}>Net Savings</div>
          <div style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            color: savings >= 0 ? '#10b981' : '#ef4444' 
          }}>{formatCurrency(savings)}</div>
        </div>
      </div>

      <div style={{ height: '8px', background: 'var(--color-background-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ 
          height: '100%', 
          width: `${Math.min(100, expensePercent)}%`, 
          background: getBarColor(),
          transition: 'width 0.4s ease'
        }} />
      </div>
      <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--color-text-secondary)', textAlign: 'right' }}>
        Expenses are {expensePercent.toFixed(1)}% of your income
      </div>
    </div>
  );
}

const labelStyle = {
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--color-text-secondary)',
  marginBottom: '6px'
};
