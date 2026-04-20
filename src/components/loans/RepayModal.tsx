import React, { useState } from 'react';
import { X, ArrowRight, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../lib/loanHelpers';
import toast from 'react-hot-toast';

export default function RepayModal({ loan, isOpen, onClose, onSuccess }) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState(loan?.remaining_amount?.toString() || '');
  const [paymentMethod, setPaymentMethod] = useState('bank');

  if (!isOpen || !loan) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amountNum = parseFloat(amount);
    
    if (isNaN(amountNum) || amountNum <= 0) return toast.error('Invalid amount');
    if (amountNum > loan.remaining_amount) return toast.error(`Max repayment is ₹${loan.remaining_amount}`);

    // BALANCE CHECK
    const available = paymentMethod === 'cash' ? (profile?.cash_balance || 0) : (profile?.bank_balance || 0);
    if (amountNum > available) {
      return toast.error(`Insufficient ${paymentMethod} balance (₹${available.toLocaleString('en-IN')})`);
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('repay-loan', {
        body: {
          loan_id: loan.id,
          amount: amountNum,
          payment_method: paymentMethod
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success('Repayment successful!');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      padding: '20px'
    }}>
      <div className="modal-content" style={{
        background: 'var(--color-background-primary)',
        width: '100%', maxWidth: '400px', borderRadius: '16px',
        border: '1px solid var(--color-border-tertiary)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px', borderBottom: '1px solid var(--color-border-tertiary)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>Repay Loan</h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--color-text-secondary)',
            cursor: 'pointer', padding: '4px'
          }}><X size={20} /></button>
        </div>

        {/* Loan Info Summary */}
        <div style={{ 
          padding: '16px 20px', 
          background: 'var(--color-background-secondary)',
          borderBottom: '1px solid var(--color-border-tertiary)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', marginBottom: '8px', fontWeight: '500' }}>
            <span>{loan.borrower?.name}</span>
            <ArrowRight size={12} />
            <span>{loan.lender?.name}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Remaining Amount</span>
            <span style={{ fontSize: '16px', fontWeight: '600' }}>{formatCurrency(loan.remaining_amount)}</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '500', marginBottom: '6px', display: 'block' }}>Repayment Amount (₹)</label>
            <input
              type="number"
              required
              min="0"
              max={loan.remaining_amount}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              style={{
                width: '100%', padding: '10px 12px',
                background: 'var(--color-background-secondary)',
                border: '1px solid var(--color-border-secondary)',
                borderRadius: '8px', color: 'var(--color-text-primary)',
                fontSize: '16px', fontWeight: '500'
              }}
            />
            <div style={{ 
              marginTop: '4px', textAlign: 'right', fontSize: '11px', 
              color: '#7c6ff7', cursor: 'pointer' 
            }} onClick={() => setAmount(loan.remaining_amount.toString())}>
              Max: {formatCurrency(loan.remaining_amount)}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: '500', marginBottom: '6px', display: 'block' }}>Payment Method</label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <label style={{ 
                flex: 1, display: 'flex', alignItems: 'center', gap: '8px', 
                padding: '10px', borderRadius: '8px', border: '1px solid',
                borderColor: paymentMethod === 'bank' ? '#5b4cf5' : 'var(--color-border-secondary)',
                background: paymentMethod === 'bank' ? 'rgba(91, 76, 245, 0.05)' : 'none',
                cursor: 'pointer'
              }}>
                <input 
                  type="radio" name="method" value="bank" 
                  checked={paymentMethod === 'bank'}
                  onChange={() => setPaymentMethod('bank')} 
                />
                <span style={{ fontSize: '13px' }}>Bank</span>
              </label>
              <label style={{ 
                flex: 1, display: 'flex', alignItems: 'center', gap: '8px', 
                padding: '10px', borderRadius: '8px', border: '1px solid',
                borderColor: paymentMethod === 'cash' ? '#5b4cf5' : 'var(--color-border-secondary)',
                background: paymentMethod === 'cash' ? 'rgba(91, 76, 245, 0.05)' : 'none',
                cursor: 'pointer'
              }}>
                <input 
                  type="radio" name="method" value="cash" 
                  checked={paymentMethod === 'cash'}
                  onChange={() => setPaymentMethod('cash')} 
                />
                <span style={{ fontSize: '13px' }}>Cash</span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '8px', width: '100%', padding: '12px',
              background: '#5b4cf5', color: 'white', border: 'none',
              borderRadius: '8px', fontSize: '14px', fontWeight: '600',
              cursor: 'pointer', opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Processing...' : `Repay ${amount ? formatCurrency(parseFloat(amount)) : ''}`}
          </button>
        </form>
      </div>
    </div>
  );
}
