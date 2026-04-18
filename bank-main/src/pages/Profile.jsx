import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../lib/supabase'
import { SkeletonCard } from '../components/ui/Skeleton'
import { exportTransactionsCSV, exportGoalsCSV } from '../lib/exportCSV'
import { exportTransactionsPDF } from '../lib/exportPDF'
import toast from 'react-hot-toast'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts'
import {
  Edit2, Save, Lock, Download, Sun, Moon, Calendar, Shield
} from 'lucide-react'
import { format } from 'date-fns'

export default function Profile() {
  const { user, profile, updateProfile } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    name: '', age: '', phone: '',
    bank_balance: '', cash_balance: '', liabilities: ''
  })
  const [netWorthHistory, setNetWorthHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [exportFrom, setExportFrom] = useState('')
  const [exportTo, setExportTo] = useState('')

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name || '', age: profile.age || '',
        phone: profile.phone || '',
        bank_balance: profile.bank_balance ?? 0,
        cash_balance: profile.cash_balance ?? 0,
        liabilities: profile.liabilities ?? 0
      })
    }
  }, [profile])

  const fetchNetWorthHistory = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('net_worth_history')
      .select('*')
      .eq('user_id', user.id)
      .order('recorded_at', { ascending: true })
    setNetWorthHistory(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => { fetchNetWorthHistory() }, [fetchNetWorthHistory])

  const netWorth = Number(form.bank_balance || 0) + Number(form.cash_balance || 0) - Number(form.liabilities || 0)

  const handleSaveProfile = async () => {
    const updates = {
      name: form.name,
      age: form.age ? Number(form.age) : null,
      phone: form.phone
    }
    const { error } = await updateProfile(updates)
    if (error) { toast.error('Failed to update profile'); return }
    toast.success('Profile updated!')
    setEditing(false)
  }

  const handleSaveBalances = async () => {
    const bankBal = Number(form.bank_balance || 0)
    const cashBal = Number(form.cash_balance || 0)
    const liab = Number(form.liabilities || 0)
    const nw = bankBal + cashBal - liab

    const { error } = await updateProfile({
      bank_balance: bankBal,
      cash_balance: cashBal,
      liabilities: liab
    })
    if (error) { toast.error('Failed to update balances'); return }

    // Record net worth snapshot
    await supabase.from('net_worth_history').insert([{
      user_id: user.id, net_worth: nw
    }])

    toast.success('Balances updated!')
    fetchNetWorthHistory()
  }

  const handleResetPassword = async () => {
    if (!user?.email) return
    const { error } = await supabase.auth.resetPasswordForEmail(user.email)
    if (error) { toast.error('Failed to send reset email'); return }
    toast.success('Password reset email sent!')
  }

  const handleExportTxCSV = async () => {
    let query = supabase.from('transactions').select('*').eq('user_id', user.id)
    if (exportFrom) query = query.gte('date_time', new Date(exportFrom).toISOString())
    if (exportTo) query = query.lte('date_time', new Date(exportTo + 'T23:59:59').toISOString())
    query = query.order('date_time', { ascending: false })
    const { data } = await query
    if (data && data.length > 0) {
      exportTransactionsCSV(data)
      toast.success('Transactions CSV exported!')
    } else toast.error('No transactions to export')
  }

  const handleExportTxPDF = async () => {
    let query = supabase.from('transactions').select('*').eq('user_id', user.id)
    if (exportFrom) query = query.gte('date_time', new Date(exportFrom).toISOString())
    if (exportTo) query = query.lte('date_time', new Date(exportTo + 'T23:59:59').toISOString())
    query = query.order('date_time', { ascending: false })
    const { data } = await query
    if (data && data.length > 0) {
      const range = exportFrom && exportTo ? `${exportFrom} to ${exportTo}` : 'All Time'
      exportTransactionsPDF(data, range)
      toast.success('PDF exported!')
    } else toast.error('No transactions to export')
  }

  const handleExportGoals = async () => {
    const { data } = await supabase.from('goals').select('*').eq('user_id', user.id)
    if (data && data.length > 0) {
      exportGoalsCSV(data)
      toast.success('Goals CSV exported!')
    } else toast.error('No goals to export')
  }

  const initials = (form.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  const chartData = netWorthHistory.map(h => ({
    date: format(new Date(h.recorded_at), 'MMM d'),
    value: h.net_worth
  }))

  const tooltipStyle = {
    background: theme === 'dark' ? '#1A1A24' : '#fff',
    border: 'none', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
  }

  if (loading && !profile) {
    return (
      <div className="page-container">
        <h1 className="page-title">Profile</h1>
        <SkeletonCard />
      </div>
    )
  }

  return (
    <div className="page-container">
      <h1 className="page-title">Profile</h1>

      {/* User Info Card */}
      <div className="card profile-card">
        <div className="profile-header">
          <div className="profile-avatar" style={{ background: 'linear-gradient(135deg, #4F46E5, #8B5CF6)' }}>
            {initials}
          </div>
          <div className="profile-info">
            {editing ? (
              <div className="profile-edit-fields">
                <div className="form-group">
                  <label>Name</label>
                  <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Age</label>
                  <input type="number" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input type="text" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={user?.email || ''} disabled />
                </div>
                <div className="form-actions">
                  <button className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleSaveProfile}>
                    <Save size={16} /> Save
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="profile-name">{form.name || 'User'}</h2>
                <p className="profile-detail">{user?.email}</p>
                {form.age && <p className="profile-detail">Age: {form.age}</p>}
                {form.phone && <p className="profile-detail">Phone: {form.phone}</p>}
                <button className="btn btn-sm btn-ghost" onClick={() => setEditing(true)}>
                  <Edit2 size={14} /> Edit Profile
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Balances Section */}
      <div className="card" style={{ marginTop: 20 }}>
        <h3 className="card-title">Balances</h3>
        <div className="balances-grid">
          <div className="form-group">
            <label>Bank Balance (₹)</label>
            <input type="number" value={form.bank_balance}
              onChange={e => setForm(f => ({ ...f, bank_balance: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Cash Balance (₹)</label>
            <input type="number" value={form.cash_balance}
              onChange={e => setForm(f => ({ ...f, cash_balance: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Liabilities (₹)</label>
            <input type="number" value={form.liabilities}
              onChange={e => setForm(f => ({ ...f, liabilities: e.target.value }))} />
          </div>
          <div className="net-worth-display">
            <span className="net-worth-label">Net Worth</span>
            <span className="net-worth-value">₹{netWorth.toLocaleString('en-IN')}</span>
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleSaveBalances} style={{ marginTop: 12 }}>
          <Save size={16} /> Save Balances
        </button>
      </div>

      {/* Net Worth Trend */}
      <div className="card chart-card" style={{ marginTop: 20 }}>
        <h3 className="card-title">Net Worth Over Time</h3>
        {chartData.length === 0 ? (
          <p style={{ opacity: 0.6, textAlign: 'center', padding: 20 }}>Save balances to start tracking net worth</p>
        ) : (
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#2A2A3A' : '#E5E5EA'} />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={tooltipStyle} formatter={v => [`₹${Number(v).toLocaleString('en-IN')}`, 'Net Worth']} />
                <Line type="monotone" dataKey="value" stroke="#4F46E5" strokeWidth={2.5}
                  dot={{ fill: '#4F46E5', r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Security */}
      <div className="card" style={{ marginTop: 20 }}>
        <h3 className="card-title"><Shield size={18} /> Security</h3>
        <div className="security-section">
          <button className="btn btn-ghost" onClick={handleResetPassword}>
            <Lock size={16} /> Reset Password
          </button>
          <p className="profile-detail" style={{ marginTop: 8 }}>
            Last login: {user?.last_sign_in_at ? format(new Date(user.last_sign_in_at), 'PPpp') : 'Unknown'}
          </p>
        </div>
      </div>

      {/* Preferences */}
      <div className="card" style={{ marginTop: 20 }}>
        <h3 className="card-title">Preferences</h3>
        <label className="switch-label">
          <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
          <label className="switch">
            <input type="checkbox" checked={theme === 'dark'} onChange={toggleTheme} />
            <span className="slider"></span>
          </label>
        </label>
      </div>

      {/* Data Export */}
      <div className="card" style={{ marginTop: 20 }}>
        <h3 className="card-title"><Download size={18} /> Data Export</h3>
        <div className="export-section">
          <div className="export-date-range">
            <div className="form-group">
              <label>From</label>
              <input type="date" value={exportFrom} onChange={e => setExportFrom(e.target.value)} />
            </div>
            <div className="form-group">
              <label>To</label>
              <input type="date" value={exportTo} onChange={e => setExportTo(e.target.value)} />
            </div>
          </div>
          <div className="export-buttons">
            <button className="btn btn-ghost" onClick={handleExportTxCSV}>
              <Download size={16} /> Export Transactions CSV
            </button>
            <button className="btn btn-ghost" onClick={handleExportTxPDF}>
              <Download size={16} /> Export Transactions PDF
            </button>
            <button className="btn btn-ghost" onClick={handleExportGoals}>
              <Download size={16} /> Export Goals Summary CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
