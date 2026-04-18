import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import Header from '../components/layout/Header'
import Skeleton, { SkeletonCard, SkeletonRow } from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'
import { supabase } from '../lib/supabase'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis
} from 'recharts'
import {
  Landmark, Banknote, TrendingUp, TrendingDown,
  ArrowUpRight, ArrowDownRight, Target, Clock,
  CreditCard, Wallet, Smartphone, CircleDollarSign, MoreHorizontal
} from 'lucide-react'
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subWeeks, differenceInDays, isWithinInterval } from 'date-fns'

const CATEGORY_COLORS = {
  Food: '#F97316', Rent: '#8B5CF6', Salary: '#22C55E', EMI: '#EF4444',
  Medical: '#EC4899', Entertainment: '#F59E0B', Shopping: '#06B6D4',
  Investment: '#4F46E5', 'Goal Payment': '#10B981', Other: '#6B7280'
}

const CATEGORY_EMOJIS = {
  Food: '🍔', Rent: '🏠', Salary: '💰', EMI: '🏦',
  Medical: '🏥', Entertainment: '🎬', Shopping: '🛍️',
  Investment: '📈', 'Goal Payment': '🎯', Other: '📋'
}

const PAYMENT_ICONS = {
  cash: Banknote, bank: Landmark, upi: Smartphone,
  card: CreditCard, other: MoreHorizontal
}

function AnimatedNumber({ value, prefix = '₹', duration = 1000 }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (value === 0) { setDisplay(0); return }
    const start = 0
    const startTime = performance.now()
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(start + (value - start) * eased))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [value, duration])

  return <span>{prefix}{display.toLocaleString('en-IN')}</span>
}

function MiniSparkline({ data, color = '#4F46E5' }) {
  if (!data || data.length === 0) return null
  return (
    <div style={{ width: '100%', height: 40, marginTop: 8 }}>
      <ResponsiveContainer>
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`spark-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="value" stroke={color} fill={`url(#spark-${color.replace('#','')})`} strokeWidth={2} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function Dashboard() {
  const { user, profile } = useAuth()
  const { theme } = useTheme()
  const [transactions, setTransactions] = useState([])
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const fetchData = async () => {
      setLoading(true)
      try {
        const [txRes, goalRes] = await Promise.all([
          supabase.from('transactions').select('*').eq('user_id', user.id).order('date_time', { ascending: false }),
          supabase.from('goals').select('*').eq('user_id', user.id).eq('status', 'active')
        ])
        setTransactions(txRes.data || [])
        setGoals(goalRes.data || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [user])

  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)
  const lastMonthStart = startOfMonth(subDays(monthStart, 1))
  const lastMonthEnd = endOfMonth(subDays(monthStart, 1))
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 })
  const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 })
  const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
  const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })

  const currentMonthTx = useMemo(() => transactions.filter(t => {
    const d = new Date(t.date_time)
    return d >= monthStart && d <= monthEnd
  }), [transactions, monthStart, monthEnd])

  const lastMonthTx = useMemo(() => transactions.filter(t => {
    const d = new Date(t.date_time)
    return d >= lastMonthStart && d <= lastMonthEnd
  }), [transactions, lastMonthStart, lastMonthEnd])

  const thisWeekTx = useMemo(() => transactions.filter(t => {
    const d = new Date(t.date_time)
    return d >= thisWeekStart && d <= thisWeekEnd
  }), [transactions, thisWeekStart, thisWeekEnd])

  const lastWeekTx = useMemo(() => transactions.filter(t => {
    const d = new Date(t.date_time)
    return d >= lastWeekStart && d <= lastWeekEnd
  }), [transactions, lastWeekStart, lastWeekEnd])

  const totalIncome = currentMonthTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const totalExpenses = currentMonthTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const netSavings = totalIncome - totalExpenses
  const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100) : 0

  const lastIncome = lastMonthTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const lastExpenses = lastMonthTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const lastNet = lastIncome - lastExpenses
  const lastSavingsRate = lastIncome > 0 ? ((lastNet / lastIncome) * 100) : 0

  const thisWeekSpend = thisWeekTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const lastWeekSpend = lastWeekTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const weekChange = lastWeekSpend > 0 ? (((thisWeekSpend - lastWeekSpend) / lastWeekSpend) * 100) : 0

  const bankBalance = profile?.bank_balance || 0
  const cashBalance = profile?.cash_balance || 0
  const liabilities = profile?.liabilities || 0
  const netWorth = bankBalance + cashBalance - liabilities

  // 7-day sparkline data
  const sparklineData = useMemo(() => {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const day = subDays(now, i)
      const dayStr = format(day, 'yyyy-MM-dd')
      const dayTx = transactions.filter(t => format(new Date(t.date_time), 'yyyy-MM-dd') === dayStr)
      const income = dayTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
      const expense = dayTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
      days.push({ day: format(day, 'EEE'), value: income - expense })
    }
    return days
  }, [transactions, now])

  // Category donut
  const categoryData = useMemo(() => {
    const cats = {}
    currentMonthTx.filter(t => t.type === 'expense').forEach(t => {
      cats[t.category] = (cats[t.category] || 0) + Number(t.amount)
    })
    return Object.entries(cats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [currentMonthTx])

  const upcomingGoals = useMemo(() => {
    return goals.filter(g => {
      if (!g.target_date) return false
      const daysLeft = differenceInDays(new Date(g.target_date), now)
      return daysLeft >= 0 && daysLeft <= 30
    }).map(g => ({
      ...g,
      daysLeft: differenceInDays(new Date(g.target_date), now),
      progress: g.target_amount > 0 ? ((g.current_amount / g.target_amount) * 100) : 0
    })).sort((a, b) => a.daysLeft - b.daysLeft)
  }, [goals, now])

  const recentTx = transactions.slice(0, 8)

  const getDelta = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / Math.abs(previous)) * 100
  }

  if (loading) {
    return (
      <div className="page-container">
        <Header />
        <div className="dashboard-grid">
          {[1,2,3].map(i => <SkeletonCard key={i} />)}
        </div>
        <div className="dashboard-grid four-col">
          {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
        </div>
        <div style={{ marginTop: 24 }}>
          {[1,2,3,4,5].map(i => <SkeletonRow key={i} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <Header />

      {/* Balance Cards */}
      <div className="dashboard-grid three-col">
        <div className="card balance-card">
          <div className="balance-card-accent" />
          <div className="balance-card-content">
            <span className="balance-label"><Landmark size={16} /> Bank Balance</span>
            <h2 className="balance-amount"><AnimatedNumber value={bankBalance} /></h2>
            <MiniSparkline data={sparklineData} color="#4F46E5" />
          </div>
        </div>
        <div className="card balance-card">
          <div className="balance-card-accent" />
          <div className="balance-card-content">
            <span className="balance-label"><Banknote size={16} /> Cash Balance</span>
            <h2 className="balance-amount"><AnimatedNumber value={cashBalance} /></h2>
            <MiniSparkline data={sparklineData} color="#22C55E" />
          </div>
        </div>
        <div className="card balance-card">
          <div className="balance-card-accent" />
          <div className="balance-card-content">
            <span className="balance-label"><TrendingUp size={16} /> Net Worth</span>
            <h2 className="balance-amount"><AnimatedNumber value={netWorth} /></h2>
            <MiniSparkline data={sparklineData} color="#8B5CF6" />
          </div>
        </div>
      </div>

      {/* Monthly Summary KPIs */}
      <div className="dashboard-grid four-col">
        {[
          { label: 'Total Income', value: totalIncome, prev: lastIncome, color: '#22C55E', icon: ArrowUpRight },
          { label: 'Total Expenses', value: totalExpenses, prev: lastExpenses, color: '#EF4444', icon: ArrowDownRight },
          { label: 'Net Savings', value: netSavings, prev: lastNet, color: '#4F46E5', icon: TrendingUp },
          { label: 'Savings Rate', value: savingsRate, prev: lastSavingsRate, color: '#F59E0B', icon: Target, suffix: '%', noPrefix: true }
        ].map(kpi => {
          const delta = getDelta(kpi.value, kpi.prev)
          return (
            <div key={kpi.label} className="card kpi-card">
              <div className="kpi-header">
                <span className="kpi-label">{kpi.label}</span>
                <kpi.icon size={18} style={{ color: kpi.color }} />
              </div>
              <h3 className="kpi-value" style={{ color: kpi.color }}>
                {kpi.noPrefix ? '' : '₹'}<AnimatedNumber value={Math.round(kpi.value)} prefix={kpi.noPrefix ? '' : '₹'} />
                {kpi.suffix || ''}
              </h3>
              <span className={`kpi-delta ${delta >= 0 ? 'positive' : 'negative'}`}>
                {delta >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {Math.abs(delta).toFixed(1)}% vs last month
              </span>
            </div>
          )
        })}
      </div>

      {/* Week Comparison */}
      <div className="card" style={{ marginTop: 20 }}>
        <h3 className="card-title">This Week vs Last Week</h3>
        <div className="week-comparison">
          <div className="week-bar-group">
            <div className="week-bar-label">Last Week</div>
            <div className="week-bar-track">
              <div className="week-bar-fill" style={{
                width: `${Math.min((lastWeekSpend / Math.max(thisWeekSpend, lastWeekSpend, 1)) * 100, 100)}%`,
                background: 'var(--color-muted)'
              }} />
            </div>
            <span className="week-bar-amount">₹{lastWeekSpend.toLocaleString('en-IN')}</span>
          </div>
          <div className="week-bar-group">
            <div className="week-bar-label">This Week</div>
            <div className="week-bar-track">
              <div className="week-bar-fill" style={{
                width: `${Math.min((thisWeekSpend / Math.max(thisWeekSpend, lastWeekSpend, 1)) * 100, 100)}%`,
                background: thisWeekSpend > lastWeekSpend ? '#EF4444' : '#22C55E'
              }} />
            </div>
            <span className="week-bar-amount">₹{thisWeekSpend.toLocaleString('en-IN')}</span>
          </div>
          <span className={`badge ${weekChange > 0 ? 'badge-red' : 'badge-green'}`}>
            {weekChange > 0 ? '+' : ''}{weekChange.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Upcoming Goals */}
      {upcomingGoals.length > 0 && (
        <div className="card upcoming-goals-card" style={{ marginTop: 20 }}>
          <h3 className="card-title"><Clock size={18} /> Upcoming Goal Deadlines</h3>
          <div className="upcoming-goals-list">
            {upcomingGoals.map(g => (
              <div key={g.id} className={`upcoming-goal-item ${g.daysLeft < 7 ? 'urgent' : g.daysLeft <= 15 ? 'warning' : ''}`}>
                <span className="goal-icon-sm">{g.icon || '🎯'}</span>
                <div className="upcoming-goal-info">
                  <span className="upcoming-goal-name">{g.name}</span>
                  <span className="upcoming-goal-days">
                    {g.daysLeft === 0 ? 'Due today!' : `${g.daysLeft} days left`}
                  </span>
                </div>
                <div className="upcoming-goal-progress">
                  <div className="mini-progress-bar">
                    <div className="mini-progress-fill" style={{
                      width: `${Math.min(g.progress, 100)}%`,
                      background: g.daysLeft < 7 ? '#EF4444' : g.daysLeft <= 15 ? '#F59E0B' : '#4F46E5'
                    }} />
                  </div>
                  <span className="mini-progress-text">{g.progress.toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="dashboard-split" style={{ marginTop: 20 }}>
        {/* Recent Transactions */}
        <div className="card" style={{ flex: 1.2 }}>
          <div className="card-title-row">
            <h3 className="card-title">Recent Transactions</h3>
            <Link to="/transactions" className="link-btn">View All</Link>
          </div>
          {recentTx.length === 0 ? (
            <EmptyState title="No transactions yet" description="Start tracking your finances!" />
          ) : (
            <div className="transaction-list-mini">
              {recentTx.map(t => {
                const PayIcon = PAYMENT_ICONS[t.payment_method] || CircleDollarSign
                return (
                  <div key={t.id} className="tx-row-mini">
                    <span className="tx-cat-emoji">{CATEGORY_EMOJIS[t.category] || '📋'}</span>
                    <div className="tx-row-info">
                      <span className="tx-row-note">{t.note || t.category}</span>
                      <span className="tx-row-meta">
                        <span className="badge badge-sm"><PayIcon size={12} /> {t.payment_method}</span>
                        {format(new Date(t.date_time), 'MMM d')}
                      </span>
                    </div>
                    <span className={`tx-row-amount ${t.type === 'income' ? 'income' : 'expense'}`}>
                      {t.type === 'income' ? '+' : '-'}₹{Number(t.amount).toLocaleString('en-IN')}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Category Donut */}
        <div className="card" style={{ flex: 0.8 }}>
          <h3 className="card-title">Spending by Category</h3>
          {categoryData.length === 0 ? (
            <EmptyState title="No expenses" description="No spending data for this month." />
          ) : (
            <>
              <div style={{ width: '100%', height: 220 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%" cy="50%"
                      innerRadius={55} outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryData.map((entry, i) => (
                        <Cell key={i} fill={CATEGORY_COLORS[entry.name] || '#6B7280'} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, '']}
                      contentStyle={{
                        background: theme === 'dark' ? '#1A1A24' : '#fff',
                        border: 'none',
                        borderRadius: 8,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="donut-legend">
                {categoryData.map(c => {
                  const total = categoryData.reduce((s, x) => s + x.value, 0)
                  return (
                    <div key={c.name} className="legend-item">
                      <span className="legend-dot" style={{ background: CATEGORY_COLORS[c.name] || '#6B7280' }} />
                      <span className="legend-label">{c.name}</span>
                      <span className="legend-value">₹{c.value.toLocaleString('en-IN')}</span>
                      <span className="legend-pct">{((c.value / total) * 100).toFixed(0)}%</span>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
