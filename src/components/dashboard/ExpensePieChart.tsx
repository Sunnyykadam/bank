import React, { useEffect, useRef } from 'react';
import { formatCurrency } from '../../lib/loanHelpers';

export default function ExpensePieChart({ categories, totalExpenses }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!chartRef.current || categories.length === 0) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    const colors = ['#5b4cf5', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6'];

    // @ts-ignore
    chartInstance.current = new window.Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: categories.map(c => c.category),
        datasets: [{
          data: categories.map(c => c.amount),
          backgroundColor: colors.slice(0, categories.length),
          borderWidth: 0,
          hoverOffset: 10
        }]
      },
      options: {
        cutout: '75%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (item) => ` ₹${item.raw.toLocaleString('en-IN')}`
            }
          }
        },
        maintainAspectRatio: false
      }
    });

    return () => {
      if (chartInstance.current) chartInstance.current.destroy();
    };
  }, [categories]);

  const monthName = new Date().toLocaleString('default', { month: 'long' });

  return (
    <div style={{
      background: 'var(--color-background-primary)',
      border: '0.5px solid var(--color-border-tertiary)',
      borderRadius: '10px',
      padding: '16px 18px',
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <h3 style={{ fontSize: '13.5px', fontWeight: '500', margin: '0 0 4px 0' }}>Expenses by Category</h3>
      <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>{monthName} Breakdown</span>

      {categories.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)', fontSize: '13px' }}>
          No expenses this month
        </div>
      ) : (
        <>
          <div style={{ position: 'relative', height: '220px', marginBottom: '20px' }}>
            <canvas ref={chartRef} />
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              textAlign: 'center', pointerEvents: 'none'
            }}>
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Total</div>
              <div style={{ fontSize: '18px', fontWeight: '700' }}>{formatCurrency(totalExpenses)}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {categories.map((cat, idx) => (
              <div key={cat.category} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ 
                  width: '8px', height: '8px', borderRadius: '50%', 
                  background: ['#5b4cf5', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6'][idx % 8] 
                }} />
                <span style={{ fontSize: '11px', color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {cat.category}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginLeft: 'auto' }}>
                  {cat.percentage}%
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
