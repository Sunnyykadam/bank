import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../lib/supabase'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import { SkeletonCard } from '../components/ui/Skeleton'
import toast from 'react-hot-toast'
import confetti from 'canvas-confetti'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, useSortable, rectSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  RadialBarChart, RadialBar, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, Tooltip
} from 'recharts'
import {
  Plus, Pause, Play, Archive, CheckCircle2, Edit2, GripVertical,
  ChevronDown, ChevronUp, ArrowUpRight, Calendar, Target, DollarSign, History
} from 'lucide-react'
import { format, differenceInDays, differenceInMonths, addMonths } from 'date-fns'

const GOAL_EMOJIS = ['🏠', '🚗', '✈️', '💻', '📱', '💍', '🎓', '🏥', '📚', '🎸',
  '🏋️', '🎮', '👗', '🍽️', '🎯', '💰', '🏦', '📈', '🎁', '⭐']
const GOAL_COLORS = ['#4F46E5', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#F97316']

function GoalModal({ isOpen, onClose, onSubmit, editData }) {
  const [form, setForm] = useState({
    name: '', target_amount: '', target_date: '', icon: '🎯',
    color: '#4F46E5', current_amount: '0', status: 'active'
  })

  useEffect(() => {
    if (editData) {
      setForm({
        name: editData.name, target_amount: String(editData.target_amount),
        target_date: editData.target_date || '', icon: editData.icon || '🎯',
        color: editData.color || '#4F46E5', current_amount: String(editData.current_amount || 0),
        status: editData.status
      })
    } else {
      setForm({ name: '', target_amount: '', target_date: '', icon: '🎯',
        color: '#4F46E5', current_amount: '0', status: 'active' })
    }
  }, [editData, isOpen])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name || !form.target_amount) {
      toast.error('Name and target amount are required')
      return
    }
    onSubmit({
      name: form.name, target_amount: Number(form.target_amount),
      target_date: form.target_date || null, icon: form.icon,
      color: form.color, current_amount: Number(form.current_amount || 0),
      status: form.status
    }, editData?.id)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editData ? 'Edit Goal' : 'Create Goal'}>
      <form onSubmit={handleSubmit} className="tx-form">
        <div className="form-group">
          <label>Goal Name</label>
          <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g. New Laptop" />
        </div>
        <div className="form-group">
          <label>Target Amount (₹)</label>
          <div className="amount-input-wrapper">
            <span className="amount-prefix">₹</span>
            <input type="number" min="0" value={form.target_amount}
              onChange={e => setForm(f => ({ ...f, target_amount: e.target.value }))} />
          </div>
        </div>
        <div className="form-group">
          <label>Target Date</label>
          <input type="date" value={form.target_date}
            onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))} />
        </div>
        <div className="form-group">
          <label>Icon</label>
          <div className="emoji-grid">
            {GOAL_EMOJIS.map(emoji => (
              <button key={emoji} type="button"
                className={`emoji-btn ${form.icon === emoji ? 'active' : ''}`}
                onClick={() => setForm(f => ({ ...f, icon: emoji }))}>{emoji}</button>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label>Color</label>
          <div className="color-grid">
            {GOAL_COLORS.map(color => (
              <button key={color} type="button"
                className={`color-btn ${form.color === color ? 'active' : ''}`}
                style={{ background: color }}
                onClick={() => setForm(f => ({ ...f, color }))} />
            ))}
          </div>
        </div>
        {!editData && (
          <div className="form-group">
            <label>Starting Amount (₹)</label>
            <input type="number" min="0" value={form.current_amount}
              onChange={e => setForm(f => ({ ...f, current_amount: e.target.value }))} />
          </div>
        )}
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary">{editData ? 'Update' : 'Create Goal'}</button>
        </div>
      </form>
    </Modal>
  )
}

function PayGoalModal({ isOpen, onClose, onSuccess, goal }) {
  const { user, profile, refreshProfile } = useAuth()
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const cashBalance = Number(profile?.cash_balance) || 0
  const bankBalance = Number(profile?.bank_balance) || 0
  const remaining = Number(goal?.target_amount || 0) - Number(goal?.current_amount || 0)
  const selectedBalance = paymentMethod === 'cash' ? cashBalance : bankBalance
  const amtNum = Number(amount) || 0

  useEffect(() => { setAmount(''); setPaymentMethod('cash'); setNote(''); setError('') }, [goal])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (amtNum <= 0) { setError('Amount must be greater than zero'); return }
    if (amtNum > remaining) { setError(`Amount exceeds remaining (₹${remaining.toLocaleString('en-IN')})`); return }
    if (amtNum > selectedBalance) { setError(`Insufficient ${paymentMethod} balance (₹${selectedBalance.toLocaleString('en-IN')})`); return }

    setLoading(true); setError('')
    try {
      // 5a. Update balances
      const balUpdate = { updated_at: new Date().toISOString(), savings_balance: (Number(profile?.savings_balance) || 0) + amtNum }
      if (paymentMethod === 'cash') balUpdate.cash_balance = cashBalance - amtNum
      else balUpdate.bank_balance = bankBalance - amtNum

      const { error: balErr } = await supabase.from('profiles').update(balUpdate).eq('user_id', user.id)
      if (balErr) throw new Error('Failed to update balance: ' + balErr.message)

      // 5b. Update goal
      const newCurrent = Number(goal.current_amount || 0) + amtNum
      const newStatus = newCurrent >= Number(goal.target_amount) ? 'completed' : goal.status
      const { error: goalErr } = await supabase.from('savings_goals').update({ current_amount: newCurrent, status: newStatus }).eq('id', goal.id)
      if (goalErr) throw new Error('Failed to update goal: ' + goalErr.message)

      // 5c. Insert goal_transaction
      const { error: gtErr } = await supabase.from('goal_transactions').insert([{ goal_id: goal.id, user_id: user.id, amount: amtNum, payment_method: paymentMethod, note: note || null }])
      if (gtErr) throw new Error('Failed to log goal transaction: ' + gtErr.message)

      // 5d. Insert into main transactions table
      const { error: txErr } = await supabase.from('transactions').insert([{
        user_id: user.id,
        date_time: new Date().toISOString(),
        type: 'expense',
        amount: amtNum,
        payment_method: paymentMethod,
        category: 'Goal Payment',
        linked_goal_id: goal.id,
        note: `Goal: ${goal.name}${note ? ` - ${note}` : ''}`,
        is_split: false,
        is_recurring: false,
        source: 'manual'
      }])
      if (txErr) throw new Error('Failed to log main transaction: ' + txErr.message)

      // Milestone celebration
      const oldPct = (Number(goal.current_amount) / Number(goal.target_amount)) * 100
      const newPct = (newCurrent / Number(goal.target_amount)) * 100
      for (const m of [25, 50, 75, 100]) {
        if (oldPct < m && newPct >= m) {
          confetti({ particleCount: 200, spread: 90, origin: { y: 0.5 }, colors: ['#4F46E5', '#22C55E', '#F59E0B', '#EF4444'] })
          toast.success(`🎉 ${m === 100 ? `${goal.name} completed!` : `You've reached ${m}% of ${goal.name}!`}`, { duration: 5000 })
          break
        }
      }
      toast.success(`₹${amtNum.toLocaleString('en-IN')} added to ${goal.name}!`)
      refreshProfile()
      if (onSuccess) onSuccess()
      onClose()
    } catch (err) { setError(err.message || 'Something went wrong') }
    finally { setLoading(false) }
  }

  if (!goal) return null
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Add Payment — ${goal?.name || ''}`} size="sm">
      <form onSubmit={handleSubmit} className="tx-form">
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 18, fontWeight: 600 }}>{goal.icon || '🎯'} {goal.name}</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>
            ₹{Number(goal.current_amount || 0).toLocaleString('en-IN')} / ₹{Number(goal.target_amount).toLocaleString('en-IN')} • Remaining: ₹{remaining.toLocaleString('en-IN')}
          </div>
        </div>
        <div className="form-group">
          <label>Amount (₹)</label>
          <div className="amount-input-wrapper">
            <span className="amount-prefix">₹</span>
            <input type="number" min="1" max={remaining} step="0.01" value={amount} onChange={e => setAmount(e.target.value)} autoFocus />
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 4 }}>
            Available {paymentMethod}: ₹{selectedBalance.toLocaleString('en-IN')}
          </div>
        </div>
        <div className="form-group">
          <label>Payment Method</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {['cash', 'bank'].map(m => (
              <button key={m} type="button" onClick={() => setPaymentMethod(m)}
                style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1.5px solid ${paymentMethod === m ? (m === 'cash' ? '#f59e0b' : '#3b82f6') : 'var(--color-border)'}`, background: paymentMethod === m ? (m === 'cash' ? 'rgba(245,158,11,0.1)' : 'rgba(59,130,246,0.1)') : 'var(--color-input-bg)', color: 'var(--color-text)', cursor: 'pointer', textAlign: 'center', fontWeight: 600, fontSize: 13, textTransform: 'capitalize' }}>
                {m} — ₹{(m === 'cash' ? cashBalance : bankBalance).toLocaleString('en-IN')}
              </button>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label>Note (optional)</label>
          <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Monthly saving" />
        </div>
        {error && <div style={{ fontSize: 12, color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '8px 12px', borderRadius: 8 }}>{error}</div>}
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Processing...' : `Add ₹${amtNum > 0 ? amtNum.toLocaleString('en-IN') : '0'}`}</button>
        </div>
      </form>
    </Modal>
  )
}

function SortableGoalCard({ goal, onEdit, onTopUp, onTogglePause, onArchive, onComplete, theme }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: goal.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyTx, setHistoryTx] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const progress = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0
  const daysLeft = goal.target_date ? differenceInDays(new Date(goal.target_date), new Date()) : null
  const monthsLeft = goal.target_date ? Math.max(differenceInMonths(new Date(goal.target_date), new Date()), 1) : null
  const monthlyNeeded = monthsLeft ? Math.max(0, (goal.target_amount - goal.current_amount) / monthsLeft) : 0
  const radialData = [{ value: Math.min(progress, 100), fill: goal.color || '#4F46E5' }]

  const toggleHistory = async () => {
    if (!historyOpen) {
      setHistoryLoading(true)
      const { data } = await supabase
        .from('goal_transactions')
        .select('id, amount, payment_method, note, created_at')
        .eq('goal_id', goal.id)
        .order('created_at', { ascending: false })
      setHistoryTx(data || [])
      setHistoryLoading(false)
    }
    setHistoryOpen(!historyOpen)
  }

  return (
    <div ref={setNodeRef} style={style} className="card goal-card">
      <div className="goal-card-header">
        <div className="goal-drag-handle" {...attributes} {...listeners}>
          <GripVertical size={16} />
        </div>
        <div className="goal-icon-circle" style={{ background: (goal.color || '#4F46E5') + '20' }}>
          <span style={{ fontSize: 24 }}>{goal.icon || '🎯'}</span>
        </div>
        <div className="goal-header-info">
          <h3 className="goal-name">{goal.name}</h3>
          <span className={`badge ${goal.status === 'active' ? 'badge-indigo' : goal.status === 'paused' ? 'badge-amber' : 'badge-green'}`}>
            {goal.status}
          </span>
        </div>
      </div>

      <div className="goal-ring-container">
        <ResponsiveContainer width="100%" height={140}>
          <RadialBarChart innerRadius="70%" outerRadius="100%" data={radialData} startAngle={90} endAngle={-270}>
            <RadialBar background={{ fill: theme === 'dark' ? '#2A2A3A' : '#E5E5EA' }}
              dataKey="value" cornerRadius={10} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="goal-ring-center">
          <span className="goal-ring-pct">{Math.round(progress)}%</span>
        </div>
      </div>

      <div className="goal-details">
        <div className="goal-amounts">
          <span>₹{(goal.current_amount || 0).toLocaleString('en-IN')}</span>
          <span className="goal-target">/ ₹{goal.target_amount.toLocaleString('en-IN')}</span>
        </div>
        {daysLeft !== null && (
          <div className="goal-meta">
            <Calendar size={14} /> {daysLeft >= 0 ? `${daysLeft} days left` : 'Past due'}
          </div>
        )}
        {monthlyNeeded > 0 && (
          <div className="goal-meta">
            <DollarSign size={14} /> ₹{Math.round(monthlyNeeded).toLocaleString('en-IN')}/month needed
          </div>
        )}
      </div>

      <div className="goal-actions">
        <button className="btn btn-sm btn-primary" onClick={() => onTopUp(goal)}>
          <ArrowUpRight size={14} /> Top Up
        </button>
        <button className="btn btn-sm btn-ghost" onClick={() => onTogglePause(goal)}>
          {goal.status === 'paused' ? <Play size={14} /> : <Pause size={14} />}
        </button>
        <button className="btn btn-sm btn-ghost" onClick={() => onEdit(goal)}>
          <Edit2 size={14} />
        </button>
        {progress >= 100 ? (
          <button className="btn btn-sm btn-ghost" onClick={() => onComplete(goal)}>
            <CheckCircle2 size={14} />
          </button>
        ) : (
          <button className="btn btn-sm btn-ghost" onClick={() => onArchive(goal)}>
            <Archive size={14} />
          </button>
        )}
      </div>

      {/* Collapsible Payment History (Part 5) */}
      <button onClick={toggleHistory} className="btn btn-ghost btn-sm btn-full"
        style={{ marginTop: 8, fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
        <History size={12} /> History {historyOpen ? '▴' : '▾'}
      </button>
      {historyOpen && (
        <div style={{ marginTop: 8, borderTop: '0.5px solid var(--color-border)', paddingTop: 8 }}>
          {historyLoading ? (
            <div style={{ textAlign: 'center', fontSize: 11, opacity: 0.5, padding: 8 }}>Loading...</div>
          ) : historyTx.length === 0 ? (
            <div style={{ textAlign: 'center', fontSize: 11, opacity: 0.5, padding: 8 }}>No payments yet</div>
          ) : (
            historyTx.map(tx => (
              <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '0.5px solid var(--color-border)', fontSize: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: 11 }}>{format(new Date(tx.created_at), 'MMM d')}</span>
                  <span style={{ fontWeight: 600 }}>₹{Number(tx.amount).toLocaleString('en-IN')}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, textTransform: 'uppercase',
                    background: tx.payment_method === 'cash' ? 'rgba(245,158,11,0.15)' : 'rgba(59,130,246,0.15)',
                    color: tx.payment_method === 'cash' ? '#f59e0b' : '#3b82f6' }}>{tx.payment_method}</span>
                </div>
                {tx.note && <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.note}</span>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function GoalDetailModal({ isOpen, onClose, goal, transactions, theme }) {
  if (!goal) return null

  const linkedTx = transactions.filter(t => t.linked_goal_id === goal.id)
    .sort((a, b) => new Date(a.date_time) - new Date(b.date_time))

  const chartData = []
  let cumulative = 0
  linkedTx.forEach(t => {
    cumulative += Number(t.amount)
    chartData.push({ date: format(new Date(t.date_time), 'MMM d'), amount: cumulative })
  })

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${goal.icon} ${goal.name}`} size="lg">
      <div className="goal-detail-content">
        {chartData.length > 0 ? (
          <div style={{ width: '100%', height: 200, marginBottom: 20 }}>
            <ResponsiveContainer>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="goalArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={goal.color || '#4F46E5'} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={goal.color || '#4F46E5'} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${v}`} />
                <Tooltip formatter={v => [`₹${Number(v).toLocaleString('en-IN')}`, 'Saved']}
                  contentStyle={{ background: theme === 'dark' ? '#1A1A24' : '#fff', border: 'none', borderRadius: 8 }} />
                <Area type="monotone" dataKey="amount" stroke={goal.color || '#4F46E5'}
                  fill="url(#goalArea)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p style={{ opacity: 0.6, textAlign: 'center', padding: 20 }}>No linked transactions yet</p>
        )}
        <h4 style={{ marginBottom: 12 }}>Linked Transactions</h4>
        {linkedTx.length === 0 ? (
          <p style={{ opacity: 0.6 }}>No transactions linked to this goal.</p>
        ) : (
          <div className="goal-tx-list">
            {linkedTx.map(t => (
              <div key={t.id} className="goal-tx-item">
                <span>{format(new Date(t.date_time), 'MMM d, yyyy')}</span>
                <span>₹{Number(t.amount).toLocaleString('en-IN')}</span>
                <span className="tx-note">{t.note || '—'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}

function CollapsibleSection({ title, icon, children, count, color, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="collapsible-section">
      <button className="collapsible-header" onClick={() => setOpen(!open)}
        style={{ borderLeftColor: color }}>
        {icon && <span style={{ marginRight: 8 }}>{icon}</span>}
        <span>{title} ({count})</span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && <div className="collapsible-body">{children}</div>}
    </div>
  )
}

export default function Goals() {
  const { user } = useAuth()
  const { theme } = useTheme()
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editData, setEditData] = useState(null)
  const [topUpGoal, setTopUpGoal] = useState(null)
  const [detailGoal, setDetailGoal] = useState(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const fetchGoals = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const goalsRes = await supabase.from('savings_goals').select('*').eq('user_id', user.id).order('priority', { ascending: true })
    setGoals(goalsRes.data || [])
    setLoading(false)
  }, [user])

  useEffect(() => { fetchGoals() }, [fetchGoals])

  const handleSubmit = async (payload, editId) => {
    if (editId) {
      const { error } = await supabase.from('savings_goals').update(payload).eq('id', editId).eq('user_id', user.id)
      if (error) { toast.error(error.message); return; }
      toast.success('Goal updated!')
    } else {
      const maxP = goals.length > 0 ? Math.max(...goals.map(g => g.priority || 0)) : 0
      const { error } = await supabase.from('savings_goals').insert([{ ...payload, user_id: user.id, priority: maxP + 1 }])
      if (error) { toast.error(error.message); return; }
      toast.success('Goal created!')
    }
    setModalOpen(false); setEditData(null); fetchGoals()
  }

  const togglePause = async (goal) => {
    const newStatus = goal.status === 'paused' ? 'active' : 'paused'
    await supabase.from('savings_goals').update({ status: newStatus }).eq('id', goal.id)
    toast.success(newStatus === 'paused' ? 'Goal paused' : 'Goal resumed')
    fetchGoals()
  }

  const archiveGoal = async (goal) => {
    await supabase.from('savings_goals').update({ status: 'archived' }).eq('id', goal.id)
    toast.success('Goal archived')
    fetchGoals()
  }

  const completeGoal = async (goal) => {
    await supabase.from('savings_goals').update({ status: 'completed' }).eq('id', goal.id)
    confetti({ particleCount: 200, spread: 90, origin: { y: 0.5 } })
    toast.success(`🎉 ${goal.name} completed!`, { duration: 5000 })
    fetchGoals()
  }

  const handleDragEnd = async (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const activeGoals = goals.filter(g => g.status === 'active')
    const oldIndex = activeGoals.findIndex(g => g.id === active.id)
    const newIndex = activeGoals.findIndex(g => g.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const reordered = [...activeGoals]
    const [moved] = reordered.splice(oldIndex, 1)
    reordered.splice(newIndex, 0, moved)
    for (let i = 0; i < reordered.length; i++) {
      await supabase.from('savings_goals').update({ priority: i + 1 }).eq('id', reordered[i].id)
    }
    fetchGoals()
  }

  const activeGoals = goals.filter(g => g.status === 'active')
  const pausedGoals = goals.filter(g => g.status === 'paused')
  const completedGoals = goals.filter(g => g.status === 'completed')
  const archivedGoals = goals.filter(g => g.status === 'archived')

  if (loading) {
    return (
      <div className="page-container">
        <h1 className="page-title">Savings & Goals</h1>
        <div className="goals-grid">{[1,2,3,4].map(i => <SkeletonCard key={i} />)}</div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="page-title-row">
        <h1 className="page-title">Savings & Goals</h1>
        <button className="btn btn-primary" onClick={() => { setEditData(null); setModalOpen(true) }}>
          <Plus size={16} /> New Goal
        </button>
      </div>

      {/* Active Goals */}
      {activeGoals.length === 0 && pausedGoals.length === 0 && completedGoals.length === 0 ? (
        <EmptyState icon={Target} title="No goals yet" description="Create your first savings goal!"
          action={() => setModalOpen(true)} actionLabel="Create Goal" />
      ) : (
        <>
          <h2 className="section-title">Active Goals ({activeGoals.length})</h2>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={activeGoals.map(g => g.id)} strategy={rectSortingStrategy}>
              <div className="goals-grid">
                {activeGoals.map(g => (
                  <SortableGoalCard key={g.id} goal={g} theme={theme}
                    onEdit={g => { setEditData(g); setModalOpen(true) }}
                    onTopUp={setTopUpGoal} onTogglePause={togglePause}
                    onArchive={archiveGoal} onComplete={completeGoal} />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {pausedGoals.length > 0 && (
            <CollapsibleSection title="Paused Goals" count={pausedGoals.length} color="#F59E0B" icon="⏸️">
              <div className="goals-grid">
                {pausedGoals.map(g => (
                  <SortableGoalCard key={g.id} goal={g} theme={theme}
                    onEdit={g => { setEditData(g); setModalOpen(true) }}
                    onTopUp={setTopUpGoal} onTogglePause={togglePause}
                    onArchive={archiveGoal} onComplete={completeGoal} />
                ))}
              </div>
            </CollapsibleSection>
          )}

          {completedGoals.length > 0 && (
            <CollapsibleSection title="Completed Goals" count={completedGoals.length} color="#22C55E" icon="🎉">
              <div className="goals-grid">
                {completedGoals.map(g => (
                  <SortableGoalCard key={g.id} goal={g} theme={theme}
                    onEdit={g => { setEditData(g); setModalOpen(true) }}
                    onTopUp={setTopUpGoal} onTogglePause={togglePause}
                    onArchive={archiveGoal} onComplete={completeGoal} />
                ))}
              </div>
            </CollapsibleSection>
          )}

          {archivedGoals.length > 0 && (
            <CollapsibleSection title="Archived Goals" count={archivedGoals.length} color="#6B7280" icon="📦">
              <div className="goals-grid">
                {archivedGoals.map(g => (
                  <SortableGoalCard key={g.id} goal={g} theme={theme}
                    onEdit={g => { setEditData(g); setModalOpen(true) }}
                    onTopUp={setTopUpGoal} onTogglePause={togglePause}
                    onArchive={archiveGoal} onComplete={completeGoal} />
                ))}
              </div>
            </CollapsibleSection>
          )}
        </>
      )}

      <GoalModal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditData(null) }}
        onSubmit={handleSubmit} editData={editData} />
      <PayGoalModal isOpen={!!topUpGoal} onClose={() => setTopUpGoal(null)}
        onSuccess={fetchGoals} goal={topUpGoal} />
      <GoalDetailModal isOpen={!!detailGoal} onClose={() => setDetailGoal(null)}
        goal={detailGoal} transactions={[]} theme={theme} />
    </div>
  )
}
