import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Upload, Landmark, Banknote, Smartphone, CreditCard, MoreHorizontal, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import Modal from '../ui/Modal';

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'bank', label: 'Bank', icon: Landmark },
  { value: 'upi', label: 'UPI', icon: Smartphone },
  { value: 'card', label: 'Card', icon: CreditCard },
  { value: 'other', label: 'Other', icon: MoreHorizontal }
];

const CATEGORIES = [
  { value: 'Food', emoji: '🍔' }, { value: 'Rent', emoji: '🏠' },
  { value: 'Salary', emoji: '💰' }, { value: 'EMI', emoji: '🏦' },
  { value: 'Medical', emoji: '🏥' }, { value: 'Entertainment', emoji: '🎬' },
  { value: 'Shopping', emoji: '🛍️' }, { value: 'Investment', emoji: '📈' },
  { value: 'Goal Payment', emoji: '🎯' }, { value: 'Other', emoji: '📋' }
];

const getBalanceKey = (method) => {
  if (method === 'cash') return 'cash_balance';
  return 'bank_balance';
};

export default function TransactionModal({ 
  isOpen, onClose, onSuccess, editData, 
  goals = [], cashBalance = 0, bankBalance = 0 
}) {
  const { user, profile, updateProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    date_time: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    type: 'expense',
    amount: '',
    payment_method: 'cash',
    category: 'Food',
    customCategoryName: '',
    linked_goal_id: '',
    note: '',
    is_split: false,
    split_cash_amount: '',
    split_bank_amount: '',
    receipt_url: ''
  });

  useEffect(() => {
    if (editData) {
      setForm({
        ...editData,
        date_time: format(new Date(editData.date_time), "yyyy-MM-dd'T'HH:mm"),
        amount: String(editData.amount),
        split_cash_amount: editData.split_cash_amount ? String(editData.split_cash_amount) : '',
        split_bank_amount: editData.split_bank_amount ? String(editData.split_bank_amount) : '',
        linked_goal_id: editData.linked_goal_id || ''
      });
    }
  }, [editData, isOpen]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('receipts').upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(path);
      setForm(f => ({ ...f, receipt_url: publicUrl }));
      toast.success('Receipt uploaded!');
    } catch (err) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) return toast.error('Enter a valid amount');
    
    setLoading(true);
    try {
      const amount = Number(form.amount);
      const payload = {
        user_id: user.id,
        date_time: new Date(form.date_time).toISOString(),
        type: form.type,
        amount,
        payment_method: form.is_split ? 'cash' : form.payment_method,
        category: form.category === 'Custom...' ? (form.customCategoryName || 'Custom') : form.category,
        linked_goal_id: form.linked_goal_id || null,
        note: form.note,
        is_split: form.is_split,
        split_cash_amount: form.is_split ? Number(form.split_cash_amount || 0) : null,
        split_bank_amount: form.is_split ? Number(form.split_bank_amount || 0) : null,
        receipt_url: form.receipt_url || null,
      };

      let error;
      if (editData) {
        ({ error } = await supabase.from('transactions').update(payload).eq('id', editData.id));
      } else {
        ({ error } = await supabase.from('transactions').insert([payload]));
      }
      if (error) throw error;

      // Update balances (simplified logic for dashboard reuse)
      if (profile && !editData) {
        let balUpdate = {};
        if (payload.is_split) {
          const cashAmt = payload.split_cash_amount;
          const bankAmt = payload.split_bank_amount;
          const factor = payload.type === 'expense' ? -1 : 1;
          balUpdate.cash_balance = (profile.cash_balance || 0) + (cashAmt * factor);
          balUpdate.bank_balance = (profile.bank_balance || 0) + (bankAmt * factor);
        } else {
          const key = getBalanceKey(payload.payment_method);
          const factor = payload.type === 'expense' ? -1 : 1;
          balUpdate[key] = (profile[key] || 0) + (amount * factor);
        }
        await updateProfile(balUpdate);
      }

      toast.success(editData ? 'Updated!' : 'Added!');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editData ? 'Edit Transaction' : 'Add Transaction'} size="lg">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Date & Time</label>
            <input type="datetime-local" style={inputStyle} value={form.date_time}
              onChange={e => setForm(f => ({ ...f, date_time: e.target.value }))} />
          </div>
          <div>
            <label style={labelStyle}>Type</label>
            <select style={inputStyle} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              <option value="income">Credit (+)</option>
              <option value="expense">Debit (-)</option>
            </select>
          </div>
        </div>

        <div>
          <label style={labelStyle}>Amount (₹)</label>
          <input type="number" step="0.01" style={{ ...inputStyle, fontSize: '18px', fontWeight: '600' }} 
            placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
        </div>

        <div>
          <label style={labelStyle}>Category</label>
          <select style={inputStyle} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.emoji} {c.value}</option>)}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Payment Method</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {PAYMENT_METHODS.map(pm => (
              <button key={pm.value} type="button"
                onClick={() => setForm(f => ({ ...f, payment_method: pm.value, is_split: false }))}
                style={{
                  padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)',
                  background: form.payment_method === pm.value ? '#5b4cf5' : 'transparent',
                  color: form.payment_method === pm.value ? 'white' : 'inherit',
                  display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer'
                }}>
                <pm.icon size={14} /> {pm.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={labelStyle}>Note</label>
          <input type="text" style={inputStyle} placeholder="Add a note..." value={form.note}
            onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
        </div>

        <button type="submit" disabled={loading} style={{
          padding: '12px', background: '#5b4cf5', color: 'white', border: 'none',
          borderRadius: '8px', fontWeight: '600', cursor: 'pointer', marginTop: '10px'
        }}>
          {loading ? 'Processing...' : editData ? 'Update Transaction' : 'Confirm Transaction'}
        </button>
      </form>
    </Modal>
  );
}

const labelStyle = { fontSize: '12px', fontWeight: '500', marginBottom: '4px', display: 'block', color: 'var(--color-text-secondary)' };
const inputStyle = { width: '100%', padding: '10px', background: 'var(--color-input-bg)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'inherit' };
