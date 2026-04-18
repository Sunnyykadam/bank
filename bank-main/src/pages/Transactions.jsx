import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../lib/supabase'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import Skeleton, { SkeletonRow } from '../components/ui/Skeleton'
import { exportTransactionsCSV } from '../lib/exportCSV'
import toast from 'react-hot-toast'
import {
  Plus, Search, Filter, Download, Edit2, Trash2, X,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Upload, Landmark, Banknote, Smartphone, CreditCard,
  MoreHorizontal, ArrowUpDown, Calendar, SlidersHorizontal
} from 'lucide-react'
import { format } from 'date-fns'

// Helper: determine which balance a payment method affects
const getBalanceKey = (method) => {
  if (method === 'cash') return 'cash_balance'
  // bank, upi, card all deduct from bank balance
  return 'bank_balance'
}

const CATEGORIES = [
  { value: 'Food', emoji: '🍔' }, { value: 'Rent', emoji: '🏠' },
  { value: 'Salary', emoji: '💰' }, { value: 'EMI', emoji: '🏦' },
  { value: 'Medical', emoji: '🏥' }, { value: 'Entertainment', emoji: '🎬' },
  { value: 'Shopping', emoji: '🛍️' }, { value: 'Investment', emoji: '📈' },
  { value: 'Goal Payment', emoji: '🎯' }, { value: 'Other', emoji: '📋' }
]

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'bank', label: 'Bank', icon: Landmark },
  { value: 'upi', label: 'UPI', icon: Smartphone },
  { value: 'card', label: 'Card', icon: CreditCard },
  { value: 'other', label: 'Other', icon: MoreHorizontal }
]

const TYPE_COLORS = { income: '#22C55E', expense: '#EF4444', transfer: '#4F46E5' }

function TransactionModal({ isOpen, onClose, onSubmit, editData, goals = [], cashBalance = 0, bankBalance = 0 }) {
  const [form, setForm] = useState({
    date_time: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    type: 'expense',
    amount: '',
    payment_method: 'cash',
    category: 'Food',
    linked_goal_id: '',
    note: '',
    is_split: false,
    split_cash_amount: '',
    split_bank_amount: '',
    receipt_url: ''
  })
  const [uploading, setUploading] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    if (editData) {
      setForm({
        ...editData,
        date_time: format(new Date(editData.date_time), "yyyy-MM-dd'T'HH:mm"),
        amount: String(editData.amount),
        split_cash_amount: editData.split_cash_amount ? String(editData.split_cash_amount) : '',
        split_bank_amount: editData.split_bank_amount ? String(editData.split_bank_amount) : '',
        linked_goal_id: editData.linked_goal_id || ''
      })
    } else {
      setForm({
        date_time: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        type: 'expense', amount: '', payment_method: 'cash',
        category: 'Food', customCategoryName: '', linked_goal_id: '', note: '',
        is_split: false, split_cash_amount: '', split_bank_amount: '', receipt_url: ''
      })
    }
  }, [editData, isOpen])

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('receipts').upload(path, file)
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(path)
      setForm(f => ({ ...f, receipt_url: publicUrl }))
      toast.success('Receipt uploaded!')
    } catch (err) {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.amount || Number(form.amount) <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    if (form.is_split) {
      const cashAmt = Number(form.split_cash_amount || 0)
      const bankAmt = Number(form.split_bank_amount || 0)
      if (Math.abs(cashAmt + bankAmt - Number(form.amount)) > 0.01) {
        toast.error('Split amounts must equal total amount!')
        return
      }
    }

    // --- Insufficient balance check for expenses ---
    if (form.type === 'expense' && !editData) {
      const amount = Number(form.amount)
      if (form.is_split) {
        const cashAmt = Number(form.split_cash_amount || 0)
        const bankAmt = Number(form.split_bank_amount || 0)
        if (cashAmt > cashBalance) {
          toast.error(`Insufficient Cash Balance! Available: ₹${cashBalance.toLocaleString('en-IN')}`)
          return
        }
        if (bankAmt > bankBalance) {
          toast.error(`Insufficient Bank Balance! Available: ₹${bankBalance.toLocaleString('en-IN')}`)
          return
        }
      } else {
        const balanceKey = getBalanceKey(form.payment_method)
        const availableBalance = balanceKey === 'cash_balance' ? cashBalance : bankBalance
        const balanceLabel = balanceKey === 'cash_balance' ? 'Cash' : 'Bank'
        if (amount > availableBalance) {
          toast.error(`Insufficient ${balanceLabel} Balance! Available: ₹${availableBalance.toLocaleString('en-IN')}`)
          return
        }
      }
    }

    const payload = {
      date_time: new Date(form.date_time).toISOString(),
      type: form.type,
      amount: Number(form.amount),
      payment_method: form.is_split ? 'cash' : form.payment_method,
      category: form.category === 'Custom...' ? (form.customCategoryName || 'Custom') : form.category,
      linked_goal_id: form.linked_goal_id || null,
      note: form.note,
      is_split: form.is_split,
      split_cash_amount: form.is_split ? Number(form.split_cash_amount || 0) : null,
      split_bank_amount: form.is_split ? Number(form.split_bank_amount || 0) : null,
      receipt_url: form.receipt_url || null,
      is_recurring: false
    }
    onSubmit(payload, editData?.id)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editData ? 'Edit Transaction' : 'Add Transaction'} size="lg">
      <style>{`
        .tx-form input[type="number"]::-webkit-inner-spin-button,
        .tx-form input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .tx-form input[type="number"] { -moz-appearance: textfield; }
      `}</style>
      <form onSubmit={handleSubmit} className="tx-form">
        <div className="form-group">
          <label>Date & Time</label>
          <input type="datetime-local" value={form.date_time}
            onChange={e => setForm(f => ({ ...f, date_time: e.target.value }))} />
        </div>

        <div className="form-group">
          <label>Type</label>
          <div className="type-toggle">
            {['income', 'expense'].map(t => (
              <button key={t} type="button"
                className={`type-btn ${form.type === t ? 'active' : ''}`}
                style={form.type === t ? { background: t === 'income' ? '#3B82F6' : '#EF4444', color: '#fff' } : {}}
                onClick={() => setForm(f => ({ ...f, type: t }))}>
                {t === 'income' ? 'Credit' : 'Debit'}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>Amount (₹)</label>
          <div className="amount-input-wrapper">
            <span className="amount-prefix">₹</span>
            <input type="number" min="0" step="0.01" placeholder="0.00" value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
          </div>
        </div>

        <div className="form-group">
          <label>Payment Method</label>
          <div className="payment-selector">
            {PAYMENT_METHODS.map(pm => (
              <button key={pm.value} type="button"
                className={`payment-btn ${form.payment_method === pm.value && !form.is_split ? 'active' : ''}`}
                onClick={() => setForm(f => ({ ...f, payment_method: pm.value, is_split: false }))}>
                <pm.icon size={16} />
                <span>{pm.label}</span>
              </button>
            ))}
          </div>
          {form.type === 'expense' && !form.is_split && (
            <div className="balance-hint" style={{
              marginTop: 8, padding: '6px 12px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 500,
              background: (Number(form.amount || 0) > (getBalanceKey(form.payment_method) === 'cash_balance' ? cashBalance : bankBalance))
                ? 'rgba(239, 68, 68, 0.12)' : 'rgba(34, 197, 94, 0.10)',
              color: (Number(form.amount || 0) > (getBalanceKey(form.payment_method) === 'cash_balance' ? cashBalance : bankBalance))
                ? '#EF4444' : '#22C55E',
              display: 'flex', alignItems: 'center', gap: 6
            }}>
              {(Number(form.amount || 0) > (getBalanceKey(form.payment_method) === 'cash_balance' ? cashBalance : bankBalance))
                ? '⚠️' : '💰'}
              Available {getBalanceKey(form.payment_method) === 'cash_balance' ? 'Cash' : 'Bank'} Balance: ₹{(getBalanceKey(form.payment_method) === 'cash_balance' ? cashBalance : bankBalance).toLocaleString('en-IN')}
            </div>
          )}
          {form.type === 'expense' && form.is_split && (
            <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <div className="balance-hint" style={{
                padding: '6px 12px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 500, flex: 1,
                background: (Number(form.split_cash_amount || 0) > cashBalance)
                  ? 'rgba(239, 68, 68, 0.12)' : 'rgba(34, 197, 94, 0.10)',
                color: (Number(form.split_cash_amount || 0) > cashBalance) ? '#EF4444' : '#22C55E'
              }}>
                💵 Cash: ₹{cashBalance.toLocaleString('en-IN')}
              </div>
              <div className="balance-hint" style={{
                padding: '6px 12px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 500, flex: 1,
                background: (Number(form.split_bank_amount || 0) > bankBalance)
                  ? 'rgba(239, 68, 68, 0.12)' : 'rgba(34, 197, 94, 0.10)',
                color: (Number(form.split_bank_amount || 0) > bankBalance) ? '#EF4444' : '#22C55E'
              }}>
                🏦 Bank: ₹{bankBalance.toLocaleString('en-IN')}
              </div>
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="switch-label">
            <span>Split Transaction</span>
            <label className="switch">
              <input type="checkbox" checked={form.is_split}
                onChange={e => setForm(f => ({ ...f, is_split: e.target.checked }))} />
              <span className="slider"></span>
            </label>
          </label>
          {form.is_split && (
            <div className="split-fields">
              <div className="form-group">
                <label>Cash Portion (₹)</label>
                <input type="number" min="0" step="0.01" value={form.split_cash_amount}
                  onChange={e => setForm(f => ({ ...f, split_cash_amount: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Bank Portion (₹)</label>
                <input type="number" min="0" step="0.01" value={form.split_bank_amount}
                  onChange={e => setForm(f => ({ ...f, split_bank_amount: e.target.value }))} />
              </div>
            </div>
          )}
        </div>

        <div className="form-group">
          <label>Category</label>
          <select value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
            {CATEGORIES.filter(c => c.value !== 'Other').map(c => (
              <option key={c.value} value={c.value}>{c.emoji} {c.value}</option>
            ))}
            <option value="Custom...">➕ Custom...</option>
          </select>
          {form.category === 'Custom...' && (
            <input type="text" placeholder="Enter custom category name" style={{marginTop: 8}}
              value={form.customCategoryName || ''}
              onChange={e => setForm(f => ({...f, customCategoryName: e.target.value}))}
            />
          )}
        </div>

        {goals.length > 0 && (
          <div className="form-group">
            <label>Link to Goal (optional)</label>
            <select value={form.linked_goal_id}
              onChange={e => setForm(f => ({ ...f, linked_goal_id: e.target.value }))}>
              <option value="">None</option>
              {goals.map(g => (
                <option key={g.id} value={g.id}>{g.icon} {g.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="form-group">
          <label>Note</label>
          <input type="text" placeholder="Add a note..." value={form.note}
            onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
        </div>

        <div className="form-group">
          <label>Receipt (optional)</label>
          <div className="upload-area">
            <input type="file" accept="image/*" onChange={handleFileUpload} id="receipt-upload" hidden />
            <label htmlFor="receipt-upload" className="upload-btn">
              <Upload size={16} />
              {uploading ? 'Uploading...' : form.receipt_url ? 'Change Receipt' : 'Upload Receipt'}
            </label>
            {form.receipt_url && <span className="upload-success">✓ Uploaded</span>}
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary">
            {editData ? 'Update' : 'Add Transaction'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function BudgetOverview({ budgets, categorySpending, onSetBudget }) {
  const [expanded, setExpanded] = useState(false)
  const [editCat, setEditCat] = useState(null)
  const [editVal, setEditVal] = useState('')

  return (
    <div className="card budget-section">
      <button className="card-title-row clickable" onClick={() => setExpanded(!expanded)}>
        <h3 className="card-title"><SlidersHorizontal size={18} /> Budget Overview</h3>
        {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {expanded && (
        <div className="budget-list">
          {CATEGORIES.filter(c => c.value !== 'Salary').map(cat => {
            const budget = budgets.find(b => b.category === cat.value)
            const spent = categorySpending[cat.value] || 0
            const limit = budget?.monthly_limit || 0
            const pct = limit > 0 ? (spent / limit) * 100 : 0
            return (
              <div key={cat.value} className="budget-item">
                <div className="budget-item-header">
                  <span>{cat.emoji} {cat.value}</span>
                  {editCat === cat.value ? (
                    <div className="budget-edit-inline">
                      <input type="number" value={editVal} onChange={e => setEditVal(e.target.value)}
                        placeholder="Set limit" min="0" className="budget-input" />
                      <button className="btn btn-sm btn-primary" onClick={() => {
                        if (editVal) onSetBudget(cat.value, Number(editVal))
                        setEditCat(null)
                      }}>Save</button>
                      <button className="btn btn-sm btn-ghost" onClick={() => setEditCat(null)}>✕</button>
                    </div>
                  ) : (
                    <button className="link-btn" onClick={() => {
                      setEditCat(cat.value)
                      setEditVal(limit || '')
                    }}>
                      {limit > 0 ? `₹${limit.toLocaleString('en-IN')}` : 'Set limit'}
                    </button>
                  )}
                </div>
                {limit > 0 && (
                  <div className="budget-progress-row">
                    <div className="budget-progress-track">
                      <div className="budget-progress-fill" style={{
                        width: `${Math.min(pct, 100)}%`,
                        background: pct >= 100 ? '#EF4444' : pct >= 80 ? '#F59E0B' : '#4F46E5'
                      }} />
                    </div>
                    <span className="budget-amounts">
                      ₹{spent.toLocaleString('en-IN')} / ₹{limit.toLocaleString('en-IN')}
                    </span>
                    {pct >= 100 && <span className="badge badge-red">Over Budget!</span>}
                    {pct >= 80 && pct < 100 && <span className="badge badge-amber">Warning</span>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function Transactions() {
  const { user, profile, updateProfile, refreshProfile } = useAuth()
  const { theme } = useTheme()
  const [searchParams, setSearchParams] = useSearchParams()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [goals, setGoals] = useState([])
  const [budgets, setBudgets] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editData, setEditData] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [showFilters, setShowFilters] = useState(false)
  const PAGE_SIZE = 20

  // Auto-open modal when navigated from FAB
  useEffect(() => {
    if (searchParams.get('addNew') === 'true') {
      setEditData(null)
      setModalOpen(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const [filters, setFilters] = useState({
    dateFrom: '', dateTo: '', types: [],
    categories: [], methods: [], search: '',
    sortBy: 'date_time', sortDir: 'desc'
  })
  const [draftFilters, setDraftFilters] = useState({
    dateFrom: '', dateTo: '', types: [],
    categories: [], methods: [], search: '',
    sortBy: 'date_time', sortDir: 'desc'
  })
  const [timePeriod, setTimePeriod] = useState('All')

  const fetchTransactions = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      let query = supabase.from('transactions').select('*', { count: 'exact' }).eq('user_id', user.id)
      
      let finalDateFrom = filters.dateFrom
      let finalDateTo = filters.dateTo
      
      if (!finalDateFrom && !finalDateTo && timePeriod !== 'All') {
         if (timePeriod === 'This Week') {
            const d = new Date()
            const day = d.getDay()
            const diff = d.getDate() - day + (day === 0 ? -6 : 1)
            const start = new Date(d.setDate(diff))
            start.setHours(0,0,0,0)
            const end = new Date(start)
            end.setDate(end.getDate() + 6)
            end.setHours(23,59,59,999)
            finalDateFrom = start.toISOString()
            finalDateTo = end.toISOString()
         } else if (timePeriod === 'This Month') {
            const d = new Date()
            const start = new Date(d.getFullYear(), d.getMonth(), 1)
            const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
            finalDateFrom = start.toISOString()
            finalDateTo = end.toISOString()
         }
      } else {
         if (finalDateFrom) finalDateFrom = new Date(finalDateFrom).toISOString()
         if (finalDateTo) finalDateTo = new Date(finalDateTo + 'T23:59:59').toISOString()
      }

      if (finalDateFrom) query = query.gte('date_time', finalDateFrom)
      if (finalDateTo) query = query.lte('date_time', finalDateTo)
      
      if (filters.types?.length > 0) query = query.in('type', filters.types)
      if (filters.categories?.length > 0) query = query.in('category', filters.categories)
      if (filters.methods?.length > 0) query = query.in('payment_method', filters.methods)
      if (filters.search) query = query.ilike('note', `%${filters.search}%`)
      query = query.order(filters.sortBy, { ascending: filters.sortDir === 'asc' })
      query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
      const { data, count, error } = await query
      if (error) throw error
      setTransactions(data || [])
      setTotalCount(count || 0)
    } catch (err) {
      toast.error('Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }, [user, filters, timePeriod, page])

  const fetchGoals = useCallback(async () => {
    if (!user) return
    const { data } = await supabase.from('goals').select('*').eq('user_id', user.id).eq('status', 'active')
    setGoals(data || [])
  }, [user])

  const fetchBudgets = useCallback(async () => {
    if (!user) return
    const { data } = await supabase.from('budget_limits').select('*').eq('user_id', user.id)
    setBudgets(data || [])
  }, [user])

  useEffect(() => { fetchTransactions() }, [fetchTransactions])
  useEffect(() => { fetchGoals(); fetchBudgets() }, [fetchGoals, fetchBudgets])

  const categorySpending = useMemo(() => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const spending = {}
    transactions.forEach(t => {
      if (t.type === 'expense' && new Date(t.date_time) >= monthStart) {
        spending[t.category] = (spending[t.category] || 0) + Number(t.amount)
      }
    })
    return spending
  }, [transactions])

  const handleSubmit = async (payload, editId) => {
    if (editId) {
      // --- Reverse old transaction's balance impact, then apply new ---
      const oldTx = transactions.find(t => t.id === editId)
      const { error } = await supabase.from('transactions').update(payload).eq('id', editId).eq('user_id', user.id)
      if (error) { toast.error('Update failed'); return }

      // Reverse old balance impact
      if (oldTx && profile) {
        let balUpdate = {}
        if (oldTx.is_split) {
          const oldCash = Number(oldTx.split_cash_amount || 0)
          const oldBank = Number(oldTx.split_bank_amount || 0)
          if (oldTx.type === 'expense') {
            balUpdate.cash_balance = (profile.cash_balance || 0) + oldCash
            balUpdate.bank_balance = (profile.bank_balance || 0) + oldBank
          } else if (oldTx.type === 'income') {
            balUpdate.cash_balance = (profile.cash_balance || 0) - oldCash
            balUpdate.bank_balance = (profile.bank_balance || 0) - oldBank
          }
        } else {
          const key = getBalanceKey(oldTx.payment_method)
          if (oldTx.type === 'expense') {
            balUpdate[key] = (profile[key] || 0) + Number(oldTx.amount)
          } else if (oldTx.type === 'income') {
            balUpdate[key] = (profile[key] || 0) - Number(oldTx.amount)
          }
        }

        // Apply new transaction's impact on top of reversed balance
        if (payload.is_split) {
          const newCash = Number(payload.split_cash_amount || 0)
          const newBank = Number(payload.split_bank_amount || 0)
          if (payload.type === 'expense') {
            balUpdate.cash_balance = (balUpdate.cash_balance ?? profile.cash_balance ?? 0) - newCash
            balUpdate.bank_balance = (balUpdate.bank_balance ?? profile.bank_balance ?? 0) - newBank
          } else if (payload.type === 'income') {
            balUpdate.cash_balance = (balUpdate.cash_balance ?? profile.cash_balance ?? 0) + newCash
            balUpdate.bank_balance = (balUpdate.bank_balance ?? profile.bank_balance ?? 0) + newBank
          }
        } else {
          const key = getBalanceKey(payload.payment_method)
          const base = balUpdate[key] ?? profile[key] ?? 0
          if (payload.type === 'expense') {
            balUpdate[key] = base - Number(payload.amount)
          } else if (payload.type === 'income') {
            balUpdate[key] = base + Number(payload.amount)
          }
        }

        if (Object.keys(balUpdate).length > 0) {
          await updateProfile(balUpdate)
        }
      }

      toast.success('Transaction updated!')
    } else {
      const { error } = await supabase.from('transactions').insert([{ ...payload, user_id: user.id }])
      if (error) { toast.error('Add failed'); return }

      // --- Auto-update balance on new transaction ---
      if (profile) {
        let balUpdate = {}
        if (payload.is_split) {
          const cashAmt = Number(payload.split_cash_amount || 0)
          const bankAmt = Number(payload.split_bank_amount || 0)
          if (payload.type === 'expense') {
            balUpdate.cash_balance = (profile.cash_balance || 0) - cashAmt
            balUpdate.bank_balance = (profile.bank_balance || 0) - bankAmt
          } else if (payload.type === 'income') {
            balUpdate.cash_balance = (profile.cash_balance || 0) + cashAmt
            balUpdate.bank_balance = (profile.bank_balance || 0) + bankAmt
          }
        } else {
          const key = getBalanceKey(payload.payment_method)
          if (payload.type === 'expense') {
            balUpdate[key] = (profile[key] || 0) - Number(payload.amount)
          } else if (payload.type === 'income') {
            balUpdate[key] = (profile[key] || 0) + Number(payload.amount)
          }
        }

        if (Object.keys(balUpdate).length > 0) {
          await updateProfile(balUpdate)
        }
      }

      toast.success('Transaction added!')
    }
    setModalOpen(false)
    setEditData(null)
    fetchTransactions()
  }

  const handleDelete = async (id) => {
    // Find the transaction to reverse its balance impact
    const tx = transactions.find(t => t.id === id)
    const { error } = await supabase.from('transactions').delete().eq('id', id).eq('user_id', user.id)
    if (error) { toast.error('Delete failed'); return }

    // Reverse balance impact on delete
    if (tx && profile) {
      let balUpdate = {}
      if (tx.is_split) {
        const cashAmt = Number(tx.split_cash_amount || 0)
        const bankAmt = Number(tx.split_bank_amount || 0)
        if (tx.type === 'expense') {
          balUpdate.cash_balance = (profile.cash_balance || 0) + cashAmt
          balUpdate.bank_balance = (profile.bank_balance || 0) + bankAmt
        } else if (tx.type === 'income') {
          balUpdate.cash_balance = (profile.cash_balance || 0) - cashAmt
          balUpdate.bank_balance = (profile.bank_balance || 0) - bankAmt
        }
      } else {
        const key = getBalanceKey(tx.payment_method)
        if (tx.type === 'expense') {
          balUpdate[key] = (profile[key] || 0) + Number(tx.amount)
        } else if (tx.type === 'income') {
          balUpdate[key] = (profile[key] || 0) - Number(tx.amount)
        }
      }

      if (Object.keys(balUpdate).length > 0) {
        await updateProfile(balUpdate)
      }
    }

    toast.success('Transaction deleted!')
    setDeleteConfirm(null)
    fetchTransactions()
  }

  const handleSetBudget = async (category, limit) => {
    const existing = budgets.find(b => b.category === category)
    if (existing) {
      await supabase.from('budget_limits').update({ monthly_limit: limit }).eq('id', existing.id)
    } else {
      await supabase.from('budget_limits').insert([{ user_id: user.id, category, monthly_limit: limit }])
    }
    toast.success(`Budget set for ${category}`)
    fetchBudgets()
  }

  const handleExportCSV = async () => {
    let query = supabase.from('transactions').select('*').eq('user_id', user.id)
    let finalDateFrom = filters.dateFrom
    let finalDateTo = filters.dateTo
    if (!finalDateFrom && !finalDateTo && timePeriod !== 'All') {
       if (timePeriod === 'This Week') {
          const d = new Date()
          const day = d.getDay()
          const diff = d.getDate() - day + (day === 0 ? -6 : 1)
          const start = new Date(d.setDate(diff))
          start.setHours(0,0,0,0)
          const end = new Date(start)
          end.setDate(end.getDate() + 6)
          end.setHours(23,59,59,999)
          finalDateFrom = start.toISOString()
          finalDateTo = end.toISOString()
       } else if (timePeriod === 'This Month') {
          const d = new Date()
          const start = new Date(d.getFullYear(), d.getMonth(), 1)
          const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
          finalDateFrom = start.toISOString()
          finalDateTo = end.toISOString()
       }
    } else {
       if (finalDateFrom) finalDateFrom = new Date(finalDateFrom).toISOString()
       if (finalDateTo) finalDateTo = new Date(finalDateTo + 'T23:59:59').toISOString()
    }
    if (finalDateFrom) query = query.gte('date_time', finalDateFrom)
    if (finalDateTo) query = query.lte('date_time', finalDateTo)
    if (filters.types?.length > 0) query = query.in('type', filters.types)
    if (filters.categories?.length > 0) query = query.in('category', filters.categories)
    if (filters.methods?.length > 0) query = query.in('payment_method', filters.methods)
    query = query.order('date_time', { ascending: false })
    const { data } = await query
    if (data && data.length > 0) {
      exportTransactionsCSV(data)
      toast.success('CSV exported!')
    } else {
      toast.error('No data to export')
    }
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const getCatEmoji = (cat) => CATEGORIES.find(c => c.value === cat)?.emoji || '📋'
  const getPayIcon = (method) => {
    const m = PAYMENT_METHODS.find(p => p.value === method)
    return m ? m.icon : MoreHorizontal
  }

  let activeFilterCount = 0
  if (filters.dateFrom || filters.dateTo) activeFilterCount++
  if (filters.types?.length > 0) activeFilterCount++
  if (filters.categories?.length > 0) activeFilterCount++
  if (filters.methods?.length > 0) activeFilterCount++
  if (filters.search) activeFilterCount++

  return (
    <div className="page-container">
      <style>{`
        .filters-drawer {
          background: var(--color-card);
          position: absolute;
          top: 100%;
          right: 0;
          width: 380px;
          z-index: 100;
          box-shadow: var(--shadow-lg);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-card);
          padding: 20px;
          margin-top: 8px;
          max-height: 80vh;
          overflow-y: auto;
        }
        .header-actions-wrapper {
          position: relative;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .time-filter-tabs {
          display: inline-flex;
          background: var(--color-input-bg);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-input);
          padding: 4px;
          margin-bottom: 16px;
        }
        .time-filter-tabs button {
          padding: 6px 16px;
          background: transparent;
          border: none;
          border-radius: calc(var(--radius-input) - 4px);
          color: var(--color-text-secondary);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition);
        }
        .time-filter-tabs button.active {
          background: var(--color-primary);
          color: #fff;
          box-shadow: var(--shadow-sm);
        }
      `}</style>
      <div className="page-title-row">
        <h1 className="page-title">Transactions</h1>
        <div className="header-actions-wrapper">
          <button className="btn btn-ghost" onClick={() => {
            setShowFilters(!showFilters)
            if (!showFilters) setDraftFilters(filters)
          }}>
            <Filter size={16} /> Filters {activeFilterCount > 0 && <span className="badge badge-primary">{activeFilterCount}</span>}
          </button>

          <button className="btn btn-ghost" onClick={handleExportCSV}>
            <Download size={16} /> Export CSV
          </button>
          <button className="btn btn-primary" onClick={() => { setEditData(null); setModalOpen(true) }}>
            <Plus size={16} /> Add
          </button>
          
          {showFilters && (
            <div className="filters-drawer">
              <div className="filters-grid">
                <div className="form-group">
                  <label>From</label>
                  <input type="date" value={draftFilters.dateFrom}
                    onChange={e => setDraftFilters(f => ({ ...f, dateFrom: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>To</label>
                  <input type="date" value={draftFilters.dateTo}
                    onChange={e => setDraftFilters(f => ({ ...f, dateTo: e.target.value }))} />
                </div>
              </div>
              
              <div className="filters-grid" style={{ marginTop: 12 }}>
                <div className="form-group">
                  <label>Type</label>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {['income', 'expense'].map(t => (
                      <label key={t} className="checkbox-label" style={{textTransform: 'capitalize'}}>
                        <input type="checkbox" checked={draftFilters.types?.includes(t) || false} onChange={e => {
                          if (e.target.checked) setDraftFilters(f => ({ ...f, types: [...(f.types||[]), t] }))
                          else setDraftFilters(f => ({ ...f, types: (f.types||[]).filter(x => x !== t) }))
                        }} /> {t === 'income' ? 'Credit' : 'Debit'}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>Payment Method</label>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {PAYMENT_METHODS.filter(pm => pm.value !== 'other').map(pm => (
                      <label key={pm.value} className="checkbox-label">
                        <input type="checkbox" checked={draftFilters.methods?.includes(pm.value) || false} onChange={e => {
                          if (e.target.checked) setDraftFilters(f => ({ ...f, methods: [...(f.methods||[]), pm.value] }))
                          else setDraftFilters(f => ({ ...f, methods: (f.methods||[]).filter(x => x !== pm.value) }))
                        }} /> {pm.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: 12 }}>
                <label>Categories</label>
                <div className="categories-filter-box" style={{ 
                  display: 'flex', gap: 8, flexWrap: 'wrap', maxHeight: 120, overflowY: 'auto', padding: '12px 8px',
                  border: '1px solid var(--color-border)', borderRadius: 8, background: 'var(--color-input-bg)'
                 }}>
                  {CATEGORIES.map(c => {
                    const isSelected = draftFilters.categories?.includes(c.value);
                    return (
                      <label key={c.value} className="badge" style={{
                        cursor: 'pointer', background: isSelected ? 'var(--color-primary)' : 'transparent',
                        color: isSelected ? '#fff' : 'var(--color-text)', border: '1px solid var(--color-border)'
                      }}>
                        <input type="checkbox" hidden checked={isSelected || false} onChange={e => {
                          if (e.target.checked) setDraftFilters(f => ({ ...f, categories: [...(f.categories||[]), c.value] }))
                          else setDraftFilters(f => ({ ...f, categories: (f.categories||[]).filter(x => x !== c.value) }))
                        }} />
                        {c.emoji} {c.value}
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="form-group" style={{ marginTop: 12 }}>
                <label>Search Notes</label>
                <div className="search-input-wrapper">
                  <Search size={16} />
                  <input type="text" placeholder="Search..." value={draftFilters.search}
                    onChange={e => setDraftFilters(f => ({ ...f, search: e.target.value }))} />
                </div>
              </div>

              <div className="form-actions" style={{ marginTop: 16 }}>
                <button className="btn btn-ghost" onClick={() => {
                  const resetFilters = { dateFrom: '', dateTo: '', types: [], categories: [], methods: [], search: '', sortBy: 'date_time', sortDir: 'desc' }
                  setDraftFilters(resetFilters)
                  setFilters(resetFilters)
                  setPage(0)
                  setShowFilters(false)
                }}>Clear All Filters</button>
                <button className="btn btn-primary" onClick={() => {
                   setFilters(draftFilters)
                   setPage(0)
                   setShowFilters(false)
                }}>Apply Filters</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="time-filter-tabs">
        {['All', 'This Week', 'This Month'].map(t => (
          <button key={t} className={timePeriod === t ? 'active' : ''} onClick={() => {
            setTimePeriod(t)
            setPage(0)
          }}>{t}</button>
        ))}
      </div>

      {/* Transaction List */}
      <div className="card">
        {loading ? (
          <div>{[1,2,3,4,5,6,7,8].map(i => <SkeletonRow key={i} />)}</div>
        ) : transactions.length === 0 ? (
          <EmptyState title="No transactions found" description="Try adjusting filters or add your first transaction."
            action={() => { setEditData(null); setModalOpen(true) }} actionLabel="Add Transaction" />
        ) : (
          <>
            {/* Desktop Table */}
            <div className="tx-table tx-table-desktop">
              <div className="tx-table-header">
                <span>Date</span>
                <span>Type</span>
                <span>Category</span>
                <span>Note</span>
                <span>Method</span>
                <span>Amount</span>
                <span>Actions</span>
              </div>
              {transactions.map(t => {
                const PayIcon = getPayIcon(t.payment_method)
                return (
                  <div key={t.id} className="tx-table-row">
                    <span className="tx-date">{format(new Date(t.date_time), 'MMM d, HH:mm')}</span>
                    <span><span className="badge" style={{
                      background: TYPE_COLORS[t.type] + '20', color: TYPE_COLORS[t.type]
                    }}>{t.type === 'income' ? 'Credit' : t.type === 'expense' ? 'Debit' : 'Transfer'}</span></span>
                    <span className="tx-category">{getCatEmoji(t.category)} {t.category}</span>
                    <span className="tx-note">{t.note || '—'}</span>
                    <span><span className="badge badge-sm"><PayIcon size={12} /> {t.payment_method}</span></span>
                    <span className={`tx-amount ${t.type === 'income' ? 'income' : 'expense'}`}>
                      {t.type === 'income' ? '+' : '-'}₹{Number(t.amount).toLocaleString('en-IN')}
                    </span>
                    <span className="tx-actions">
                      <button className="icon-btn" onClick={() => { setEditData(t); setModalOpen(true) }} title="Edit"><Edit2 size={15} /></button>
                      <button className="icon-btn danger" onClick={() => setDeleteConfirm(t.id)} title="Delete"><Trash2 size={15} /></button>
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Mobile Cards */}
            <div className="tx-cards-mobile">
              {transactions.map(t => {
                const PayIcon = getPayIcon(t.payment_method)
                const isCredit = t.type === 'income'
                return (
                  <div key={`m-${t.id}`} className="tx-card">
                    <div className="tx-card-top">
                      <div className="tx-card-category">
                        <span className="tx-card-emoji">{getCatEmoji(t.category)}</span>
                        <span className="tx-card-cat-name">{t.category}</span>
                      </div>
                      <span className={`tx-card-amount ${isCredit ? 'income' : 'expense'}`}>
                        {isCredit ? '+' : '-'}₹{Number(t.amount).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="tx-card-details">
                      <span className="tx-card-detail"><strong>Date:</strong> {format(new Date(t.date_time), 'MMM d, yyyy · HH:mm')}</span>
                      <span className="tx-card-detail"><strong>Method:</strong> <span className="badge badge-sm"><PayIcon size={11} /> {t.payment_method}</span></span>
                      {t.note && <span className="tx-card-detail"><strong>Note:</strong> {t.note}</span>}
                    </div>
                    <div className="tx-card-actions">
                      <button className="btn btn-sm btn-ghost" onClick={() => { setEditData(t); setModalOpen(true) }}>
                        <Edit2 size={14} /> Edit
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => setDeleteConfirm(t.id)}>
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Pagination */}
            <div className="pagination">
              <button className="btn btn-sm btn-ghost" disabled={page === 0}
                onClick={() => setPage(p => p - 1)}>
                <ChevronLeft size={16} /> Previous
              </button>
              <span className="pagination-info">
                Page {page + 1} of {totalPages || 1} ({totalCount} total)
              </span>
              <button className="btn btn-sm btn-ghost" disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}>
                Next <ChevronRight size={16} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditData(null) }}
        onSubmit={handleSubmit}
        editData={editData}
        goals={goals}
        cashBalance={profile?.cash_balance || 0}
        bankBalance={profile?.bank_balance || 0}
      />

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-content modal-sm" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 12 }}>Delete Transaction?</h3>
            <p style={{ marginBottom: 20, opacity: 0.7 }}>This action cannot be undone.</p>
            <div className="form-actions">
              <button className="btn btn-ghost" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
