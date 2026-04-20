import React, { useEffect, useRef } from 'react';

export default function SpendingTrendChart({ trend }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!chartRef.current || trend.length === 0) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    
    // @ts-ignore
    chartInstance.current = new window.Chart(ctx, {
      type: 'bar',
      data: {
        labels: trend.map(t => t.month),
        datasets: [{
          label: 'Spending',
          data: trend.map(t => t.amount),
          backgroundColor: 'rgba(91, 76, 245, 0.7)',
          hoverBackgroundColor: '#5b4cf5',
          borderRadius: 6,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (item) => ` ₹${item.raw.toLocaleString('en-IN')}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#888', font: { size: 11 } }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            border: { display: false },
            ticks: { 
              color: '#888',
              font: { size: 10 },
              callback: (val) => '₹' + val.toLocaleString('en-IN')
            }
          }
        },
        maintainAspectRatio: false
      }
    });

    return () => {
      if (chartInstance.current) chartInstance.current.destroy();
    };
  }, [trend]);

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
      <h3 style={{ fontSize: '13.5px', fontWeight: '500', margin: '0 0 4px 0' }}>Spending Trend</h3>
      <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>Last 6 months</span>

      {trend.every(t => t.amount === 0) ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)', fontSize: '13px' }}>
          No spending data yet
        </div>
      ) : (
        <div style={{ flex: 1, position: 'relative', minHeight: '200px' }}>
          <canvas ref={chartRef} />
        </div>
      )}
    </div>
  );
}
