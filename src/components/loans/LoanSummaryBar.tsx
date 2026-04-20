import React from 'react';
import { TrendingDown, TrendingUp, Wallet, Bell, Calendar } from 'lucide-react';
import { formatCurrency } from '../../lib/loanHelpers';

export default function LoanSummaryBar({ totalOwed, totalToReceive, netBalance, nextDue, pendingActionCount }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(clamp(200px, 100%, 300px), 1fr))',
      gap: '12px',
      marginBottom: '24px'
    }}>
      {/* 1. Primary Net Position Card */}
      <div style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #161625 100%)',
        border: '1px solid #2d2d44',
        borderRadius: '16px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 8px 24px -4px rgba(0,0,0,0.3)'
      }}>
        <div style={{ 
          position: 'absolute', right: '-10px', top: '-10px', opacity: 0.05 
        }}>
          <Wallet size={80} strokeWidth={1} />
        </div>
        
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Net Position
        </span>
        <div style={{ fontSize: 'clamp(20px, 5vw, 26px)', fontWeight: '800', color: netBalance >= 0 ? '#4ade80' : '#f87171', margin: '4px 0' }}>
          {formatCurrency(netBalance)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>
          {netBalance >= 0 ? <TrendingUp size={12} color="#4ade80" /> : <TrendingDown size={12} color="#f87171" />}
          {netBalance >= 0 ? 'Surplus Credit' : 'Net Debt'}
        </div>
      </div>

      {/* 2. Breakdown and Alerts */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{
          flex: 1, background: '#161625', border: '1px solid #2d2d44', borderRadius: '12px',
          padding: '12px', display: 'flex', alignItems: 'center', gap: '12px'
        }}>
          <div style={{ 
            width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(91, 76, 245, 0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5b4cf5'
          }}>
            <Bell size={16} />
          </div>
          <div>
            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 700 }}>Attention</div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: pendingActionCount > 0 ? '#fbbf24' : 'white' }}>
              {pendingActionCount} {pendingActionCount === 1 ? 'Request' : 'Requests'}
            </div>
          </div>
        </div>

        <div style={{
          flex: 1, background: '#161625', border: '1px solid #2d2d44', borderRadius: '12px',
          padding: '12px', display: 'flex', alignItems: 'center', gap: '12px'
        }}>
          <div style={{ 
            width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(45, 212, 191, 0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2dd4bf'
          }}>
            <Calendar size={16} />
          </div>
          <div>
            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 700 }}>Next Due</div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: 'white' }}>
              {nextDue ? `${formatCurrency(nextDue.amount)} (${nextDue.date})` : 'No upcoming'}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Quick Cashflow Card */}
      <div style={{
        background: '#161625', border: '1px solid #2d2d44', borderRadius: '16px',
        padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #2d2d44' }}>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Receivable</span>
          <span style={{ fontSize: '13px', fontWeight: '700', color: '#4ade80' }}>{formatCurrency(totalToReceive)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Payable</span>
          <span style={{ fontSize: '13px', fontWeight: '700', color: '#f87171' }}>{formatCurrency(totalOwed)}</span>
        </div>
        <div style={{ marginTop: 'auto', paddingTop: '4px' }}>
          <div style={{ height: '4px', background: '#2d2d44', borderRadius: '10px', overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: `${(totalToReceive / (totalToReceive + totalOwed || 1)) * 100}%`, background: '#4ade80' }} />
            <div style={{ width: `${(totalOwed / (totalToReceive + totalOwed || 1)) * 100}%`, background: '#f87171' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
