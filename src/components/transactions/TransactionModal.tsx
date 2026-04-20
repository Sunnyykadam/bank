import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  Landmark, Banknote, Calendar, Type, 
  UtensilsCrossed, BookOpen, TrainFront, GraduationCap,
  Home, Wallet, Briefcase, Stethoscope, Clapperboard,
  ShoppingBag, HelpCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import Modal from '../ui/Modal';

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash', icon: Banknote, color: '#f59e0b' },
  { value: 'bank', label: 'Bank', icon: Landmark, color: '#3b82f6' },
];

const CATEGORIES = [
  { value: 'Food', label: 'Food & Canteen', emoji: '🍜', color: '#f87171' },
  { value: 'Rent', label: 'Hostel/Rent', emoji: '🏠', color: '#a78bfa' },
  { value: 'Salary', label: 'Pocket Money/Job', emoji: '💸', color: '#34d399' },
  { value: 'EMI', label: 'Fees/Loans', emoji: '🎓', color: '#818cf8' },
  { value: 'Medical', label: 'Medical', emoji: '🏥', color: '#f472b6' },
  { value: 'Entertainment', label: 'Entertainment', emoji: '🎬', color: '#fb7185' },
  { value: 'Shopping', label: 'Shopping', emoji: '🛍️', color: '#2dd4bf' },
  { value: 'Other', label: 'Other/Study', emoji: '📋', color: '#94a3b8' },
];

const getBalanceKey = (method) => {
  if (method === 'cash') return 'cash_balance';
  return 'bank_balance';
};

export default function TransactionModal({ 
  isOpen, onClose, onSuccess, onSubmit, editData, 
  cashBalance = 0, bankBalance = 0 
}) {
  const { user, profile, updateProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    date_time: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    type: 'expense',
    amount: '',
    payment_method: 'cash',
    category: 'Food',
    customCategoryName: '',
    note: '',
    is_split: false,
    split_cash_amount: '',
    split_bank_amount: '',
    receipt_url: ''
  });

  useEffect(() => {
    if (editData) {
      const isPredefined = CATEGORIES.some(c => c.value === editData.category);
      setForm({
        ...editData,
        category: isPredefined ? editData.category : 'Other',
        customCategoryName: isPredefined ? '' : editData.category,
        date_time: format(new Date(editData.date_time), "yyyy-MM-dd'T'HH:mm"),
        amount: String(editData.amount),
      });
    } else {
      setForm({
        date_time: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        type: 'expense', amount: '', payment_method: 'cash',
        category: 'Food', customCategoryName: '', note: '',
        is_split: false, split_cash_amount: '', split_bank_amount: '', receipt_url: ''
      });
    }
  }, [editData, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amt = Number(form.amount);
    if (!amt || amt <= 0) return toast.error('Enter a valid amount');

    setLoading(true);
    try {
      // STRICT BALANCE VALIDATION
      if (form.type === 'expense') {
        const available = form.payment_method === 'cash' ? cashBalance : bankBalance;
        if (amt > available) {
          toast.error(`Low Balance! You only have ₹${available.toLocaleString('en-IN')} in ${form.payment_method}.`);
          setLoading(false);
          return;
        }
      }

      const finalCategory = (form.category === 'Other' && form.customCategoryName) 
        ? form.customCategoryName 
        : form.category;

      const payload = {
        user_id: user.id,
        date_time: new Date(form.date_time).toISOString(),
        type: form.type,
        amount: amt,
        payment_method: form.payment_method,
        category: finalCategory,
        note: form.note,
        is_split: false,
      };

      // DELEGATED SUBMISSION (For Transactions Page)
      if (onSubmit) {
        await onSubmit(payload, editData?.id);
        if (onSuccess) onSuccess(); 
        onClose();
        return;
      }

      // INTERNAL SUBMISSION (For Dashboard Quick Add)
      let error;
      if (editData) {
        ({ error } = await supabase.from('transactions').update(payload).eq('id', editData.id));
      } else {
        ({ error } = await supabase.from('transactions').insert([payload]));
        if (profile) {
          const factor = payload.type === 'expense' ? -1 : 1;
          const key = getBalanceKey(payload.payment_method);
          await updateProfile({ [key]: (profile[key] || 0) + (amt * factor) });
        }
      }
      if (error) throw error;

      toast.success(editData ? 'Updated!' : 'Saved!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editData ? 'Edit Record' : 'New Transaction'} size="md">
      <form onSubmit={handleSubmit} style={formStyle}>
        
        <div style={typeToggleStyle}>
          {['expense', 'income'].map(t => (
            <button key={t} type="button" onClick={() => setForm(f => ({ ...f, type: t }))}
              style={{
                ...typeBtnStyle,
                background: form.type === t ? (t === 'expense' ? '#ef4444' : '#22c55e') : 'var(--color-input-bg)',
                color: form.type === t ? 'white' : 'var(--color-text-secondary)',
              }}>
              {t === 'expense' ? 'Debit' : 'Credit'}
            </button>
          ))}
        </div>

        <div style={amountSectionStyle}>
          <span style={rupeeStyle}>₹</span>
          <input type="number" step="0.01" autoFocus placeholder="0" 
            value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
            style={amountInputStyle} />
        </div>

        <div style={sectionStyle}>
          <label style={labelStyle}>Category</label>
          <div style={chipGridStyle}>
            {CATEGORIES.map(cat => (
              <button key={cat.value} type="button" onClick={() => setForm(f => ({ ...f, category: cat.value }))}
                style={{
                  ...chipStyle,
                  borderColor: form.category === cat.value ? cat.color : 'var(--color-border)',
                  background: form.category === cat.value ? `${cat.color}15` : 'var(--color-input-bg)',
                  color: form.category === cat.value ? cat.color : 'inherit',
                }}>
                <span style={{ fontSize: '16px' }}>{cat.emoji}</span>
                <span style={{ fontSize: '11px', fontWeight: form.category === cat.value ? '600' : '400' }}>{cat.label}</span>
              </button>
            ))}
          </div>
          {form.category === 'Other' && (
            <input type="text" placeholder="Specify category..." value={form.customCategoryName}
              onChange={e => setForm(f => ({ ...f, customCategoryName: e.target.value }))}
              style={inputStyle} />
          )}
        </div>

        <div style={sectionStyle}>
          <label style={labelStyle}>Account</label>
          <div style={methodGridStyle}>
            {PAYMENT_METHODS.map(pm => (
              <button key={pm.value} type="button" onClick={() => setForm(f => ({ ...f, payment_method: pm.value }))}
                style={{
                  ...methodCardStyle,
                  flex: 1,
                  borderColor: form.payment_method === pm.value ? pm.color : 'var(--color-border)',
                  background: form.payment_method === pm.value ? `${pm.color}10` : 'var(--color-input-bg)',
                }}>
                <pm.icon size={20} color={form.payment_method === pm.value ? pm.color : 'var(--color-text-secondary)'} />
                <span style={{ fontSize: '14px', fontWeight: form.payment_method === pm.value ? '600' : '400' }}>{pm.label}</span>
                <span style={{ fontSize: '10px', opacity: 0.7 }}>
                  ₹{(pm.value === 'cash' ? cashBalance : bankBalance).toLocaleString('en-IN')}
                </span>
              </button>
            ))}
          </div>
          {form.type === 'expense' && Number(form.amount) > (form.payment_method === 'cash' ? cashBalance : bankBalance) && (
            <p style={{ color: '#ef4444', fontSize: '11px', textAlign: 'center', fontWeight: '600' }}>⚠️ Insufficient funds</p>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Date</label>
            <input type="datetime-local" value={form.date_time} 
              onChange={e => setForm(f => ({ ...f, date_time: e.target.value }))} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Note</label>
            <input type="text" placeholder="What's this for?" value={form.note} 
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))} style={inputStyle} />
          </div>
        </div>

        <button type="submit" disabled={loading} style={{
          ...submitBtnStyle,
          background: form.type === 'expense' ? '#1a1a2e' : '#22c55e'
        }}>
          {loading ? 'Processing...' : `Confirm ${form.type === 'expense' ? 'Debit' : 'Credit'}`}
        </button>
      </form>
    </Modal>
  );
}

const formStyle = { display: 'flex', flexDirection: 'column', gap: '20px' };
const typeToggleStyle = { display: 'flex', padding: '4px', background: 'var(--color-input-bg)', borderRadius: '12px', gap: '4px' };
const typeBtnStyle = { flex: 1, padding: '10px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', transition: 'all 0.2s' };
const amountSectionStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 0', borderBottom: '1px solid var(--color-border)' };
const rupeeStyle = { fontSize: '24px', fontWeight: '700', color: 'var(--color-primary)' };
const amountInputStyle = { border: 'none', background: 'transparent', fontSize: '36px', fontWeight: '800', textAlign: 'center', width: '180px', color: 'inherit', outline: 'none' };
const sectionStyle = { display: 'flex', flexDirection: 'column', gap: '10px' };
const labelStyle = { fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--color-text-secondary)', letterSpacing: '0.5px' };
const chipGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px' };
const chipStyle = { display: 'flex', alignItems: 'center', gap: '6px', padding: '8px', borderRadius: '10px', border: '1px solid', cursor: 'pointer', transition: 'all 0.2s' };
const methodGridStyle = { display: 'flex', gap: '12px' };
const methodCardStyle = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '12px', borderRadius: '12px', border: '1.5px solid', cursor: 'pointer', transition: 'all 0.2s' };
const inputStyle = { width: '100%', padding: '12px', background: 'var(--color-input-bg)', border: '1px solid var(--color-border)', borderRadius: '10px', color: 'inherit', fontSize: '13px' };
const submitBtnStyle = { padding: '14px', borderRadius: '12px', border: 'none', color: 'white', fontWeight: '700', fontSize: '15px', cursor: 'pointer', marginTop: '10px' };
