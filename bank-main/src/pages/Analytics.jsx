import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../lib/supabase'
import { SkeletonCard } from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, ScatterChart, Scatter, ZAxis,
  Treemap, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  BarChart, Bar, ComposedChart, Rectangle
} from 'recharts'
import {
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  DollarSign, BarChart3, Flame, Calendar
} from 'lucide-react'
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, eachMonthOfInterval, eachDayOfInterval, differenceInDays } from 'date-fns'

const CATEGORY_COLORS = {
  Food: '#F97316', Rent: '#8B5CF6', Salary: '#22C55E', EMI: '#EF4444',
  Medical: '#EC4899', Entertainment: '#F59E0B', Shopping: '#06B6D4',
  Investment: '#4F46E5', 'Goal Payment': '#10B981', Other: '#6B7280'
}

const TIME_RANGES = [
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: '3months', label: 'Last 3 Months' },
  { key: 'year', label: 'This Year' },
  { key: 'custom', label: 'Custom' }
]

function AnimatedNumber({ value, prefix = '₹' }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    const start = 0; const startTime = performance.now()
    const animate = (t) => {
      const p = Math.min((t - startTime) / 800, 1)
      setDisplay(Math.round(start + (value - start) * (1 - Math.pow(1 - p, 3))))
      if (p < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [value])
  return <span>{prefix}{display.toLocaleString('en-IN')}</span>
}

export default function Analytics() {
  const { user } = useAuth()
  const { theme } = useTheme()
  const [transactions, setTransactions] = useState([])
  const [budgets, setBudgets] = useState([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [comparisonMode, setComparisonMode] = useState(false)
  const [compFrom, setCompFrom] = useState('')
  const [compTo, setCompTo] = useState('')

  const fetchData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const [txRes, budgetRes] = await Promise.all([
      supabase.from('transactions').select('*').eq('user_id', user.id).order('date_time', { ascending: true }),
      supabase.from('budget_limits').select('*').eq('user_id', user.id)
    ])
    setTransactions(txRes.data || [])
    setBudgets(budgetRes.data || [])
    setLoading(false)
  }, [user])

  useEffect(() => { fetchData() }, [fetchData])

  const getDateRange = (key) => {
    const now = new Date()
    switch (key) {
      case 'week': return [startOfWeek(now, { weekStartsOn: 1 }), endOfWeek(now, { weekStartsOn: 1 })]
      case 'month': return [startOfMonth(now), endOfMonth(now)]
      case '3months': return [subMonths(startOfMonth(now), 2), endOfMonth(now)]
      case 'year': return [startOfYear(now), endOfMonth(now)]
      case 'custom': return [customFrom ? new Date(customFrom) : subMonths(now, 1), customTo ? new Date(customTo + 'T23:59:59') : now]
      default: return [startOfMonth(now), endOfMonth(now)]
    }
  }

  const [rangeStart, rangeEnd] = getDateRange(timeRange)
  const filteredTx = useMemo(() => transactions.filter(t => {
    const d = new Date(t.date_time)
    return d >= rangeStart && d <= rangeEnd
  }), [transactions, rangeStart, rangeEnd])

  const compTx = useMemo(() => {
    if (!comparisonMode || !compFrom || !compTo) return []
    return transactions.filter(t => {
      const d = new Date(t.date_time)
      return d >= new Date(compFrom) && d <= new Date(compTo + 'T23:59:59')
    })
  }, [transactions, comparisonMode, compFrom, compTo])

  // Previous period for delta
  const daysDiff = differenceInDays(rangeEnd, rangeStart) + 1
  const prevStart = subDays(rangeStart, daysDiff)
  const prevEnd = subDays(rangeStart, 1)
  const prevTx = useMemo(() => transactions.filter(t => {
    const d = new Date(t.date_time)
    return d >= prevStart && d <= prevEnd
  }), [transactions, prevStart, prevEnd])

  const income = filteredTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const expenses = filteredTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const net = income - expenses
  const savingsRate = income > 0 ? (net / income) * 100 : 0
  const avgDaily = daysDiff > 0 ? expenses / daysDiff : 0
  const biggest = filteredTx.reduce((max, t) => Number(t.amount) > max.amount ? { ...t, amount: Number(t.amount) } : max, { amount: 0 })

  const prevIncome = prevTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const prevExpenses = prevTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)

  const getDelta = (cur, prev) => prev === 0 ? (cur > 0 ? 100 : 0) : ((cur - prev) / Math.abs(prev)) * 100

  // Chart 1 — Stacked Area
  const areaData = useMemo(() => {
    const months = eachMonthOfInterval({ start: subMonths(new Date(), 11), end: new Date() })
    return months.map(m => {
      const mStart = startOfMonth(m)
      const mEnd = endOfMonth(m)
      const mTx = transactions.filter(t => { const d = new Date(t.date_time); return d >= mStart && d <= mEnd })
      return {
        month: format(m, 'MMM'),
        Income: mTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0),
        Expenses: mTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
      }
    })
  }, [transactions])

  // Chart 2 — Donut
  const donutData = useMemo(() => {
    const cats = {}
    filteredTx.filter(t => t.type === 'expense').forEach(t => {
      cats[t.category] = (cats[t.category] || 0) + Number(t.amount)
    })
    return Object.entries(cats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [filteredTx])

  // Chart 3 — Scatter
  const scatterData = useMemo(() => filteredTx.map(t => ({
    hour: new Date(t.date_time).getHours(),
    amount: Number(t.amount),
    type: t.type,
    category: t.category,
    note: t.note || '',
    fill: t.type === 'income' ? '#22C55E' : '#EF4444'
  })), [filteredTx])

  // Chart 4 — Treemap
  const treemapData = useMemo(() => {
    const cats = {}
    filteredTx.filter(t => t.type === 'expense').forEach(t => {
      cats[t.category] = (cats[t.category] || 0) + Number(t.amount)
    })
    return Object.entries(cats).map(([name, size]) => ({
      name, size, fill: CATEGORY_COLORS[name] || '#6B7280'
    }))
  }, [filteredTx])

  // Chart 5 — Waterfall
  const waterfallData = useMemo(() => {
    const catExpenses = {}
    filteredTx.filter(t => t.type === 'expense').forEach(t => {
      catExpenses[t.category] = (catExpenses[t.category] || 0) + Number(t.amount)
    })
    const items = [{ name: 'Income', value: income, fill: '#22C55E', isTotal: false }]
    Object.entries(catExpenses).forEach(([cat, amt]) => {
      items.push({ name: cat, value: -amt, fill: '#EF4444', isTotal: false })
    })
    items.push({ name: 'Balance', value: net, fill: '#4F46E5', isTotal: true })
    let cumulative = 0
    return items.map(item => {
      if (item.isTotal) {
        return { ...item, start: 0, end: item.value, barValue: item.value }
      }
      const start = cumulative
      cumulative += item.value
      return { ...item, start, end: cumulative, barValue: Math.abs(item.value) }
    })
  }, [filteredTx, income, net])

  // Chart 6 — Radar
  const radarData = useMemo(() => {
    const cats = {}
    filteredTx.filter(t => t.type === 'expense').forEach(t => {
      cats[t.category] = (cats[t.category] || 0) + Number(t.amount)
    })
    return Object.entries(cats).map(([subject, A]) => ({ subject, A }))
  }, [filteredTx])

  // Chart 7 — Budget vs Actual
  const budgetVsActual = useMemo(() => {
    return budgets.map(b => {
      const spent = filteredTx.filter(t => t.type === 'expense' && t.category === b.category)
        .reduce((s, t) => s + Number(t.amount), 0)
      return {
        category: b.category,
        Budget: b.monthly_limit,
        Actual: spent,
        overBudget: spent > b.monthly_limit
      }
    })
  }, [budgets, filteredTx])

  // Spending streak
  const spendingStreak = useMemo(() => {
    const frivolous = ['Entertainment', 'Shopping', 'Other']
    const days = eachDayOfInterval({ start: subDays(new Date(), 365), end: new Date() })
    let current = 0, best = 0, tempStreak = 0
    for (const day of days) {
      const dayStr = format(day, 'yyyy-MM-dd')
      const hasFrivolous = transactions.some(t =>
        format(new Date(t.date_time), 'yyyy-MM-dd') === dayStr && frivolous.includes(t.category) && t.type === 'expense'
      )
      if (!hasFrivolous) { tempStreak++; best = Math.max(best, tempStreak) }
      else { tempStreak = 0 }
    }
    current = tempStreak
    return { current, best }
  }, [transactions])

  const tooltipStyle = {
    background: theme === 'dark' ? '#1A1A24' : '#fff',
    border: 'none', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
  }

  if (loading) {
    return (
      <div className="page-container">
        <h1 className="page-title">Analytics</h1>
        <div className="dashboard-grid four-col">{[1,2,3,4].map(i => <SkeletonCard key={i} />)}</div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <h1 className="page-title">Analytics</h1>

      {/* Time Range Tabs */}
      <div className="card filters-bar" style={{ marginBottom: 20 }}>
        <div className="time-tabs">
          {TIME_RANGES.map(tr => (
            <button key={tr.key}
              className={`time-tab ${timeRange === tr.key ? 'active' : ''}`}
              onClick={() => setTimeRange(tr.key)}>{tr.label}</button>
          ))}
        </div>
        {timeRange === 'custom' && (
          <div className="custom-range">
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
            <span>to</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} />
          </div>
        )}
        <label className="switch-label" style={{ marginTop: 8 }}>
          <span>Comparison Mode</span>
          <label className="switch">
            <input type="checkbox" checked={comparisonMode} onChange={e => setComparisonMode(e.target.checked)} />
            <span className="slider"></span>
          </label>
        </label>
        {comparisonMode && (
          <div className="custom-range">
            <input type="date" value={compFrom} onChange={e => setCompFrom(e.target.value)} placeholder="Period B start" />
            <span>to</span>
            <input type="date" value={compTo} onChange={e => setCompTo(e.target.value)} placeholder="Period B end" />
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="dashboard-grid three-col" style={{ marginBottom: 20 }}>
        {[
          { label: 'Total Income', value: income, prev: prevIncome, color: '#22C55E', icon: ArrowUpRight },
          { label: 'Total Expenses', value: expenses, prev: prevExpenses, color: '#EF4444', icon: ArrowDownRight },
          { label: 'Net Savings', value: net, prev: prevIncome - prevExpenses, color: '#4F46E5', icon: TrendingUp },
          { label: 'Savings Rate', value: savingsRate, prev: 0, color: '#F59E0B', icon: TrendingUp, suffix: '%', noPrefix: true },
          { label: 'Avg Daily Spend', value: avgDaily, prev: 0, color: '#8B5CF6', icon: DollarSign },
          { label: 'Biggest Transaction', value: biggest.amount, prev: 0, color: '#EC4899', icon: BarChart3 }
        ].map(kpi => {
          const delta = getDelta(kpi.value, kpi.prev)
          return (
            <div key={kpi.label} className="card kpi-card">
              <div className="kpi-header">
                <span className="kpi-label">{kpi.label}</span>
                <kpi.icon size={18} style={{ color: kpi.color }} />
              </div>
              <h3 className="kpi-value" style={{ color: kpi.color }}>
                <AnimatedNumber value={Math.round(kpi.value)} prefix={kpi.noPrefix ? '' : '₹'} />
                {kpi.suffix || ''}
              </h3>
            </div>
          )
        })}
      </div>

      {/* Spending Streak */}
      <div className="card streak-card" style={{ marginBottom: 20 }}>
        <div className="streak-content">
          <Flame size={24} style={{ color: '#F97316' }} />
          <div>
            <span className="streak-current">Current streak: <strong>{spendingStreak.current} days</strong></span>
            <span className="streak-best">Best streak: <strong>{spendingStreak.best} days</strong></span>
          </div>
        </div>
        <p style={{ opacity: 0.6, fontSize: 13, marginTop: 4 }}>Days without Entertainment/Shopping/Other expenses</p>
      </div>

      {/* Chart 1 — Stacked Area */}
      <div className="card chart-card" style={{ marginBottom: 20 }}>
        <h3 className="card-title">Income vs Expense Over Time</h3>
        {areaData.length === 0 ? <EmptyState title="No data" /> : (
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <AreaChart data={areaData}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4F46E5" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#4F46E5" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#EF4444" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#2A2A3A' : '#E5E5EA'} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={tooltipStyle} formatter={v => [`₹${Number(v).toLocaleString('en-IN')}`, '']} />
                <Area type="monotone" dataKey="Income" stackId="1" stroke="#4F46E5" fill="url(#incomeGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="Expenses" stackId="2" stroke="#EF4444" fill="url(#expenseGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="dashboard-split" style={{ marginBottom: 20 }}>
        {/* Chart 2 — Donut */}
        <div className="card chart-card">
          <h3 className="card-title">Spending by Category</h3>
          {donutData.length === 0 ? <EmptyState title="No expenses" /> : (
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={donutData} cx="50%" cy="50%" innerRadius={60} outerRadius={90}
                    paddingAngle={3} dataKey="value">
                    {donutData.map((e, i) => <Cell key={i} fill={CATEGORY_COLORS[e.name] || '#6B7280'} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={v => [`₹${Number(v).toLocaleString('en-IN')}`, '']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Chart 6 — Radar */}
        <div className="card chart-card">
          <h3 className="card-title">Spending Balance Across Categories</h3>
          {radarData.length === 0 ? <EmptyState title="No data" /> : (
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <RadarChart data={radarData}>
                  <PolarGrid stroke={theme === 'dark' ? '#2A2A3A' : '#E5E5EA'} />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis tick={{ fontSize: 10 }} />
                  <Radar name="Spending" dataKey="A" stroke="#4F46E5" fill="#4F46E5" fillOpacity={0.4} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Chart 3 — Scatter */}
      <div className="card chart-card" style={{ marginBottom: 20 }}>
        <h3 className="card-title">Spending Pattern — Amount vs Time of Day</h3>
        {scatterData.length === 0 ? <EmptyState title="No data" /> : (
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#2A2A3A' : '#E5E5EA'} />
                <XAxis dataKey="hour" name="Hour" type="number" domain={[0, 23]}
                  tick={{ fontSize: 12 }} label={{ value: 'Hour of Day', position: 'bottom', fontSize: 12 }} />
                <YAxis dataKey="amount" name="Amount" tick={{ fontSize: 12 }}
                  tickFormatter={v => `₹${v}`} />
                <ZAxis range={[40, 200]} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v, name) => [
                  name === 'amount' ? `₹${Number(v).toLocaleString('en-IN')}` : v, name
                ]} />
                <Scatter data={scatterData.filter(d => d.type === 'income')} fill="#22C55E" name="Income" />
                <Scatter data={scatterData.filter(d => d.type === 'expense')} fill="#EF4444" name="Expense" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Chart 4 — Treemap */}
      <div className="card chart-card" style={{ marginBottom: 20 }}>
        <h3 className="card-title">Category Spending Treemap</h3>
        {treemapData.length === 0 ? <EmptyState title="No expenses" /> : (
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <Treemap data={treemapData} dataKey="size" nameKey="name" aspectRatio={4/3}
                content={({ x, y, width, height, name, size, fill }) => {
                  if (width < 40 || height < 30) return null
                  return (
                    <g>
                      <rect x={x} y={y} width={width} height={height} fill={fill}
                        rx={4} stroke={theme === 'dark' ? '#0F0F13' : '#F5F5FA'} strokeWidth={2} />
                      <text x={x + width / 2} y={y + height / 2 - 8} textAnchor="middle"
                        fill="#fff" fontSize={12} fontWeight={600}>{name}</text>
                      <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle"
                        fill="#fff" fontSize={11} opacity={0.8}>₹{(size || 0).toLocaleString('en-IN')}</text>
                    </g>
                  )
                }}
              />
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Chart 5 — Waterfall */}
      <div className="card chart-card" style={{ marginBottom: 20 }}>
        <h3 className="card-title">How Your Income Flows</h3>
        {waterfallData.length <= 1 ? <EmptyState title="No data" /> : (
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <ComposedChart data={waterfallData}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#2A2A3A' : '#E5E5EA'} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={tooltipStyle} formatter={v => [`₹${Math.abs(Number(v)).toLocaleString('en-IN')}`, '']} />
                <Bar dataKey="start" stackId="a" fill="transparent" />
                <Bar dataKey="barValue" stackId="a" radius={[4, 4, 0, 0]}>
                  {waterfallData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Chart 7 — Budget vs Actual */}
      {budgetVsActual.length > 0 && (
        <div className="card chart-card" style={{ marginBottom: 20 }}>
          <h3 className="card-title">Budget vs Actual — This Month</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={budgetVsActual}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#2A2A3A' : '#E5E5EA'} />
                <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `₹${v}`} />
                <Tooltip contentStyle={tooltipStyle} formatter={v => [`₹${Number(v).toLocaleString('en-IN')}`, '']} />
                <Bar dataKey="Budget" fill={theme === 'dark' ? '#3A3A4A' : '#D1D5DB'} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Actual" radius={[4, 4, 0, 0]}>
                  {budgetVsActual.map((entry, i) => (
                    <Cell key={i} fill={entry.overBudget ? '#EF4444' : '#4F46E5'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Spotlight */}
      <div className="dashboard-split" style={{ marginBottom: 20 }}>
        <div className="card spotlight-card">
          <h3 className="card-title">Biggest Transaction This Month</h3>
          {biggest.amount > 0 ? (
            <div className="spotlight-content">
              <span className="spotlight-amount">₹{biggest.amount.toLocaleString('en-IN')}</span>
              <span>{biggest.category} — {biggest.note || 'No note'}</span>
              <span style={{ opacity: 0.6 }}>{biggest.date_time ? format(new Date(biggest.date_time), 'MMM d, yyyy') : ''}</span>
            </div>
          ) : <p style={{ opacity: 0.6 }}>No transactions found</p>}
        </div>
        <div className="card spotlight-card">
          <h3 className="card-title">Top Spending Category</h3>
          {donutData[0] ? (
            <div className="spotlight-content">
              <span className="spotlight-badge" style={{ background: CATEGORY_COLORS[donutData[0].name] }}>
                {donutData[0].name}
              </span>
              <span className="spotlight-amount">₹{donutData[0].value.toLocaleString('en-IN')}</span>
            </div>
          ) : <p style={{ opacity: 0.6 }}>No data</p>}
        </div>
      </div>
    </div>
  )
}
