import React from 'react';
import { ArrowRight, Calendar, Info, Clock, CheckCircle2, X, Wallet } from 'lucide-react';
import { formatCurrency, getStatusColor, calculateDaysOverdue } from '../../lib/loanHelpers';
import { useAuth } from '../../context/AuthContext';

export default function LoanCard({ loan, currentUserId, onAccept, onReject, onRepay }) {
  const { profile } = useAuth();
  const isBorrower = loan.borrower_id === currentUserId || (loan.status === 'pending' && loan.requester_id === currentUserId);
  const isLender = loan.lender_id === currentUserId || (loan.status === 'pending' && loan.recipient_id === currentUserId);
  
  const statusStyle = getStatusColor(loan.status);
  const overdueDays = calculateDaysOverdue(loan.due_date);

  const borrowerName = loan.borrower?.name || loan.requester?.name || 'Borrower';
  const lenderName = loan.lender?.name || loan.recipient?.name || 'Lender';

  const userBalance = loan.payment_method === 'cash' ? profile?.cash_balance : profile?.bank_balance;
  const isBalanceLow = isLender && loan.status === 'pending' && userBalance < loan.amount;

  return (
    <div style={{
      background: 'var(--color-card)',
      border: isBalanceLow ? '1.5px solid #ef4444' : '1px solid var(--color-border)',
      borderRadius: '12px',
      padding: '12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      transition: 'all 0.2s',
      position: 'relative'
    }}>
      {/* Directional Label */}
      <div style={{ 
        position: 'absolute', top: -8, left: 12, 
        background: isBorrower ? '#5b4cf5' : '#22c55e', 
        color: '#fff', fontSize: '9px', fontWeight: '800', 
        padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase'
      }}>
        {isBorrower ? 'You Borrowed' : 'You Lent'}
      </div>

      {/* Top Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', color: 'var(--color-text)' }}>
          <span style={{ color: isBorrower ? 'var(--color-primary)' : 'inherit' }}>{borrowerName}</span>
          <ArrowRight size={10} style={{ opacity: 0.5 }} />
          <span style={{ color: isLender ? '#22c55e' : 'inherit' }}>{lenderName}</span>
        </div>
        <div style={{
          background: statusStyle.bg,
          color: statusStyle.color,
          padding: '2px 8px',
          borderRadius: '20px',
          fontSize: '9px',
          fontWeight: '800',
          textTransform: 'uppercase',
          letterSpacing: '0.4px'
        }}>
          {loan.status}
        </div>
      </div>

      {/* Row 2: Amount */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 'clamp(16px, 4vw, 18px)', fontWeight: '800', color: '#fff' }}>{formatCurrency(loan.amount)}</div>
          <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: 2 }}>
            <Calendar size={10} />
            Due {new Date(loan.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </div>
        </div>
        {loan.status === 'overdue' && (
          <div style={{ fontSize: '10px', color: '#ef4444', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '3px' }}>
            <Clock size={10} /> {overdueDays}d
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        <div style={{ fontSize: '10px', background: 'var(--color-input-bg)', padding: '3px 8px', borderRadius: '6px', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
          Bal: {formatCurrency(loan.remaining_amount)}
        </div>
        <div style={{ fontSize: '9px', background: 'var(--color-muted)', padding: '3px 8px', borderRadius: '6px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--color-text-secondary)' }}>
          {loan.payment_method}
        </div>
      </div>

      {/* Balance Warning for Lender */}
      {isBalanceLow && (
        <div style={{ 
          fontSize: '9px', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', 
          padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px',
          border: '1px solid rgba(239, 68, 68, 0.2)'
        }}>
          <Wallet size={10} /> 
          Insufficient {loan.payment_method} balance (₹{userBalance?.toLocaleString('en-IN')})
        </div>
      )}

      {/* Notes */}
      {loan.notes && (
        <div style={{ 
          fontSize: '11px', color: 'var(--color-text-secondary)', fontStyle: 'italic',
          paddingTop: '6px', borderTop: '1px solid var(--color-border)',
          overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical'
        }}>
          "{loan.notes}"
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '6px', marginTop: 4 }}>
        {loan.status === 'pending' && isLender && (
          <>
            <button 
              onClick={() => onAccept(loan.id)} 
              className="btn btn-primary btn-sm" 
              style={{ flex: 1, fontSize: '11px', padding: '6px' }}
              disabled={isBalanceLow}
            >
              Accept
            </button>
            <button onClick={() => onReject(loan.id)} className="btn btn-danger btn-sm" style={{ flex: 1, fontSize: '11px', padding: '6px' }}>Reject</button>
          </>
        )}

        {loan.status === 'pending' && isBorrower && (
          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', flex: 1, textAlign: 'center', padding: '6px', background: 'var(--color-muted)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <Clock size={12} /> Pending Approval
          </div>
        )}

        {(loan.status === 'active' || loan.status === 'overdue') && isBorrower && (
          <button onClick={() => onRepay(loan)} className="btn btn-primary btn-sm" style={{ width: '100%', fontSize: '11px', background: '#5b4cf5' }}>Repay Loan</button>
        )}

        {loan.status === 'completed' && (
          <div style={{ width: '100%', padding: '6px', textAlign: 'center', fontSize: '10px', color: '#4ade80', fontWeight: 800, textTransform: 'uppercase', background: 'rgba(74, 222, 128, 0.1)', borderRadius: '6px' }}>
            Completed
          </div>
        )}
      </div>
    </div>
  );
}

