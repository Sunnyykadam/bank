import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid 
} from 'recharts';
import { 
  User, Phone, Banknote, Landmark, 
  Lock, LogOut, Shield, Save, Download, 
  Wallet, TrendingUp, History, FileText
} from 'lucide-react';
import { exportTransactionsCSV, exportGoalsCSV } from '../lib/exportCSV';
import { exportTransactionsPDF } from '../lib/exportPDF';

export default function Profile() {
  const { user, profile, refreshProfile, updateProfile, signOut } = useAuth();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [netWorthHistory, setNetWorthHistory] = useState([]);
  
  const [infoForm, setInfoForm] = useState({
    name: '', phone: '', age: ''
  });

  const [balanceForm, setBalanceForm] = useState({
    cash_balance: 0, bank_balance: 0, liabilities: 0
  });

  const [exportRange, setExportRange] = useState({ from: '', to: '' });

  useEffect(() => {
    if (profile) {
      setInfoForm({
        name: profile.name || '',
        phone: profile.phone || '',
        age: String(profile.age || '')
      });
      setBalanceForm({
        cash_balance: profile.cash_balance ?? 0,
        bank_balance: profile.bank_balance ?? 0,
        liabilities: profile.liabilities ?? 0
      });
    }
  }, [profile]);

  const fetchNetWorthHistory = useCallback(async () => {
    if (!user) return;
    setHistoryLoading(true);
    const { data } = await supabase
      .from('net_worth_history')
      .select('*')
      .eq('user_id', user.id)
      .order('recorded_at', { ascending: true });
    setNetWorthHistory(data || []);
    setHistoryLoading(false);
  }, [user]);

  useEffect(() => { fetchNetWorthHistory(); }, [fetchNetWorthHistory]);

  const handleUpdateInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await updateProfile({
        name: infoForm.name,
        phone: infoForm.phone,
        age: parseInt(infoForm.age) || null
      });
      if (error) throw error;
      toast.success('Profile updated!');
      refreshProfile();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBalances = async (e: React.FormEvent) => {
    e.preventDefault();
    const cash = Number(balanceForm.cash_balance);
    const bank = Number(balanceForm.bank_balance);
    const liab = Number(balanceForm.liabilities);

    if (cash < 0 || bank < 0) {
      return toast.error('Balance cannot be negative');
    }

    setLoading(true);
    try {
      const nw = cash + bank - liab;
      const { error } = await updateProfile({
        cash_balance: cash,
        bank_balance: bank,
        liabilities: liab
      });
      if (error) throw error;

      // Log net worth history
      await supabase.from('net_worth_history').insert([{
        user_id: user?.id, net_worth: nw
      }]);

      toast.success('Balances updated!');
      refreshProfile();
      fetchNetWorthHistory();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user?.email) return;
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email);
      if (error) throw error;
      toast.success('Password reset email sent!');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const netWorth = balanceForm.cash_balance + balanceForm.bank_balance - balanceForm.liabilities;

  const chartData = netWorthHistory.map((h: any) => ({
    date: format(new Date(h.recorded_at), 'MMM d'),
    value: h.net_worth
  }));

  const handleExport = async (type: 'csv' | 'pdf' | 'goals') => {
    if (!user) return;
    setLoading(true);
    try {
      if (type === 'goals') {
        const { data } = await supabase.from('goals').select('*').eq('user_id', user.id);
        if (data?.length) exportGoalsCSV(data);
        else toast.error('No data found');
      } else {
        let query = supabase.from('transactions').select('*').eq('user_id', user.id);
        if (exportRange.from) query = query.gte('date_time', new Date(exportRange.from).toISOString());
        if (exportRange.to) query = query.lte('date_time', new Date(exportRange.to + 'T23:59:59').toISOString());
        const { data } = await query;
        if (data?.length) {
          if (type === 'csv') exportTransactionsCSV(data);
          else exportTransactionsPDF(data, exportRange.from && exportRange.to ? `${exportRange.from} to ${exportRange.to}` : 'All Time');
        } else toast.error('No records in range');
      }
    } catch (err) {
      toast.error('Export failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: '1000px' }}>
      <style>{`
        .profile-hero { 
          display: flex; align-items: center; gap: 24px; padding: clamp(20px, 5vw, 40px); background: linear-gradient(135deg, var(--color-primary-dark), var(--color-primary)); 
          border-radius: 24px; color: white; margin-bottom: 24px; box-shadow: var(--shadow-lg); flex-wrap: wrap; 
        }
        .avatar-lg { width: 100px; height: 100px; border-radius: 50%; border: 4px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: 800; }
        .nw-badge { background: rgba(255,255,255,0.15); padding: 12px 20px; border-radius: 16px; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); }
        .config-card { background: var(--color-card); border-radius: 20px; border: 1px solid var(--color-border); padding: 24px; margin-bottom: 20px; }
        .section-title { font-size: 14px; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 1px; font-weight: 800; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
      `}</style>

      <div className="profile-hero">
        <div className="avatar-lg">
          {infoForm.name.charAt(0) || 'U'}
        </div>
        <div style={{ flex: 1, minWidth: '240px' }}>
          <h1 style={{ margin: 0, fontSize: 'clamp(24px, 5vw, 32px)' }}>{infoForm.name || 'User'}</h1>
          <p style={{ opacity: 0.8, marginBottom: 16 }}>{user?.email}</p>
          <div className="nw-badge" style={{ display: 'inline-block' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, opacity: 0.8 }}>TOTAL NET WORTH</div>
            <div style={{ fontSize: '24px', fontWeight: 800 }}>₹{netWorth.toLocaleString('en-IN')}</div>
          </div>
        </div>
      </div>

      <div className="grid-responsive" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(clamp(300px, 100%, 450px), 1fr))' }}>
        {/* Personal Info */}
        <div className="config-card">
          <div className="section-title"><User size={16} /> Personal Info</div>
          <form onSubmit={handleUpdateInfo} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" value={infoForm.name} onChange={e => setInfoForm({...infoForm, name: e.target.value})} placeholder="Your Name" />
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input type="text" value={infoForm.phone} onChange={e => setInfoForm({...infoForm, phone: e.target.value})} placeholder="+91..." />
            </div>
            <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
              <Save size={18} /> Update Profile
            </button>
          </form>
        </div>

        {/* Balance Management */}
        <div className="config-card">
          <div className="section-title"><Wallet size={16} /> Balance Management</div>
          <form onSubmit={handleUpdateBalances} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="grid-responsive" style={{ gap: 12 }}>
              <div className="form-group">
                <label>Bank (₹)</label>
                <input type="number" min="0" value={balanceForm.bank_balance} onChange={e => setBalanceForm({...balanceForm, bank_balance: Number(e.target.value)})} />
              </div>
              <div className="form-group">
                <label>Cash (₹)</label>
                <input type="number" min="0" value={balanceForm.cash_balance} onChange={e => setBalanceForm({...balanceForm, cash_balance: Number(e.target.value)})} />
              </div>
            </div>
            <div className="form-group">
              <label>Liabilities / Loans Taken (₹)</label>
              <input type="number" min="0" value={balanceForm.liabilities} onChange={e => setBalanceForm({...balanceForm, liabilities: Number(e.target.value)})} />
            </div>
            <button className="btn btn-primary btn-full" type="submit" disabled={loading} style={{ background: '#22c55e' }}>
              <TrendingUp size={18} /> Sync Balances
            </button>
          </form>
        </div>
      </div>

      {/* Net Worth Chart */}
      <div className="config-card">
        <div className="section-title"><History size={16} /> Net Worth Trend</div>
        {historyLoading ? (
            <div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading history...</div>
        ) : chartData.length > 0 ? (
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} tickFormatter={v => `₹${(v/1000).toFixed(1)}k`} />
                <Tooltip 
                  contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 12, color: 'var(--color-text)' }}
                  itemStyle={{ color: 'var(--color-primary)' }}
                />
                <Line type="monotone" dataKey="value" stroke="var(--color-primary)" strokeWidth={3} dot={{ r: 4, fill: 'var(--color-primary)' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: 40 }}>Sync balances to track your wealth history</p>
        )}
      </div>

      {/* Data Operations */}
      <div className="grid-responsive" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(clamp(200px, 100%, 300px), 1fr))' }}>
        <div className="config-card">
          <div className="section-title"><Shield size={16} /> Security</div>
          <button className="btn btn-ghost btn-full" onClick={handleResetPassword}>
            <Lock size={18} /> Send Reset Password Email
          </button>
          <button className="btn btn-outline btn-full" onClick={signOut} style={{ marginTop: 12, borderColor: '#ef4444', color: '#ef4444' }}>
            <LogOut size={18} /> Logout
          </button>
        </div>

        <div className="config-card">
          <div className="section-title"><Download size={16} /> Exports</div>
          <div className="grid-responsive" style={{ gap: 8 }}>
             <button className="btn btn-ghost btn-sm btn-full" onClick={() => handleExport('csv')}>Backup CSV</button>
             <button className="btn btn-ghost btn-sm btn-full" onClick={() => handleExport('pdf')}>Reports PDF</button>
             <button className="btn btn-ghost btn-sm btn-full" onClick={() => handleExport('goals')}>Goals CSV</button>
          </div>
        </div>
      </div>
    </div>
  );
}
