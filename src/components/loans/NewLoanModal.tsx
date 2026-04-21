import React, { useState, useEffect } from 'react';
import { X, Info, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function NewLoanModal({ isOpen, onClose, onSuccess }) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [recipient, setRecipient] = useState(null);
  const [formData, setFormData] = useState({
    loan_type: 'borrow',
    amount: '',
    payment_method: 'bank',
    due_date: '',
    notes: ''
  });

  useEffect(() => {
    const fetchRecipient = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, name')
        .neq('user_id', user.id)
        .limit(1)
        .single();

      if (!error && data) {
        setRecipient(data);
      }
    };

    if (isOpen && user) {
      fetchRecipient();
    }
  }, [isOpen, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!recipient) return toast.error('Recipient not found.');
    
    const amountNum = parseFloat(formData.amount);
    if (isNaN(amountNum) || amountNum <= 0) return toast.error('Invalid amount');
    
    if (new Date(formData.due_date) <= new Date()) {
      return toast.error('Due date must be in the future');
    }

    setLoading(true);
    try {
      const { data: loan, error: loanError } = await supabase
        .from('loans')
        .insert({
          requester_id: user.id,
          recipient_id: recipient.user_id,
          loan_type: formData.loan_type,
          amount: amountNum,
          remaining_amount: amountNum,
          interest_rate: 0,
          payment_method: formData.payment_method,
          due_date: formData.due_date,
          notes: formData.notes,
          status: 'pending'
        })
        .select()
        .single();

      if (loanError) throw loanError;

      await supabase.from('loan_notifications').insert({
        user_id: recipient.user_id,
        loan_id: loan.id,
        type: 'new_request',
        message: `${profile?.name || user.email} sent you a loan request for ₹${amountNum.toLocaleString('en-IN')}`
      });

      toast.success('Loan request sent!');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const labelStyle = { fontSize: '12px', fontWeight: '500', marginBottom: '8px', display: 'block', color: 'rgba(255,255,255,0.7)' };
  const inputStyle = {
    width: '100%', padding: '12px',
    background: '#1a1a2e',
    border: '1px solid #2d2d44',
    borderRadius: '12px', color: 'white',
    fontSize: '14px', outline: 'none'
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: '#161625',
        width: '100%', maxWidth: '420px', borderRadius: '20px',
        border: '1px solid #2d2d44',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px', borderBottom: '1px solid #2d2d44',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0, color: 'white' }}>New Loan Request</h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)',
            cursor: 'pointer', padding: '4px'
          }}><X size={20} /></button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Static Recipient Display */}
          <div>
            <label style={labelStyle}>Recipient</label>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px 16px', background: 'rgba(91, 76, 245, 0.1)',
              borderRadius: '12px', border: '1px solid rgba(91, 76, 245, 0.3)'
            }}>
              <div style={{ 
                width: '36px', height: '36px', background: '#5b4cf5', 
                borderRadius: '50%', display: 'flex', alignItems: 'center', 
                justifyContent: 'center', color: 'white'
              }}>
                <User size={20} />
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: 'white' }}>{recipient?.name || 'Loading...'}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Target User</div>
              </div>
            </div>
          </div>

          {/* Amount & Due Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

            <div>
              <label style={labelStyle}>Amount (₹)</label>
              <input
                type="number"
                required min="1"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Payment Method</label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                style={inputStyle}
              >
                <option value="bank">Bank / UPI</option>
                <option value="cash">Cash</option>
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Due Date</label>
            <input
              type="date"
              required
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Reason / Note</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g. Dinner, Fuel, Rent..."
              rows={2}
              style={{ ...inputStyle, resize: 'none' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !recipient}
            style={{
              marginTop: '10px', width: '100%', padding: '16px',
              background: '#5b4cf5', color: 'white', border: 'none',
              borderRadius: '12px', fontSize: '15px', fontWeight: '600',
              cursor: 'pointer', opacity: (loading || !recipient) ? 0.7 : 1,
              boxShadow: '0 8px 16px rgba(91, 76, 245, 0.4)'
            }}
          >
            {loading ? 'Sending Request...' : 'Confirm Loan Request'}
          </button>
        </form>
      </div>
    </div>
  );
}
