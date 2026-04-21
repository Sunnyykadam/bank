import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  Plus, Filter, Download, Search, Edit2, Trash2, 
  ChevronLeft, ChevronRight, X, Calendar as CalendarIcon, 
  Landmark, Banknote, CreditCard, TrendingUp, TrendingDown,
  ArrowUpRight, ArrowDownLeft, MoreVertical, ListFilter
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import TransactionModal from '../components/transactions/TransactionModal'

const PAGE_SIZE = 15

const CATEGORIES = [
  { value: 'Food', label: 'Food & Canteen', emoji: '🍜', color: '#f87171' },
  { value: 'Rent', label: 'Hostel/Rent', emoji: '🏠', color: '#a78bfa' },
  { value: 'Salary', label: 'Pocket Money/Job', emoji: '💸', color: '#34d399' },
  { value: 'EMI', label: 'Fees/Loans', emoji: '🎓', color: '#818cf8' },
  { value: 'Medical', label: 'Medical', emoji: '🏥', color: '#f472b6' },
  { value: 'Entertainment', label: 'Entertainment', emoji: '🎬', color: '#fb7185' },
  { value: 'Shopping', label: 'Shopping', emoji: '🛍️', color: '#2dd4bf' },
  { value: 'Other', label: 'Other/Study', emoji: '📋', color: '#94a3b8' },
  { value: 'loan', label: 'Loan', emoji: '🤝', color: '#5b4cf5' },
  { value: 'loan_repayment', label: 'Repayment', emoji: '💸', color: '#22c55e' },
]


const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'bank', label: 'Bank', icon: Landmark }
]

const getCatEmoji = (val) => CATEGORIES.find(c => c.value === val)?.emoji || '💰'
const getPayIcon = (val) => PAYMENT_METHODS.find(pm => pm.value === val)?.icon || CreditCard

export default function Transactions() {
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editData, setEditData] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  
  const [filters, setFilters] = useState({
    dateFrom: '', dateTo: '', types: [], categories: [], methods: [], search: '',
    sortBy: 'date_time', sortDir: 'desc'
  })
  
  const [draftFilters, setDraftFilters] = useState(filters)
  const [timePeriod, setTimePeriod] = useState('All')

  const fetchTransactions = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      let query = supabase.from('transactions').select('*', { count: 'exact' }).eq('user_id', user.id)
      
      let finalDateFrom = filters.dateFrom
      let finalDateTo = filters.dateTo
      
      if (!finalDateFrom && !finalDateTo && timePeriod !== 'All') {
         const now = new Date()
         if (timePeriod === 'This Week') {
            const start = new Date()
            start.setDate(now.getDate() - now.getDay())
            start.setHours(0,0,0,0)
            finalDateFrom = start.toISOString()
         } else if (timePeriod === 'This Month') {
            const start = new Date(now.getFullYear(), now.getMonth(), 1)
            finalDateFrom = start.toISOString()
         }
      }

      if (finalDateFrom) query = query.gte('date_time', finalDateFrom)
      if (finalDateTo) query = query.lte('date_time', finalDateTo + 'T23:59:59')
      
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
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [user, filters, timePeriod, page])

  useEffect(() => { fetchTransactions() }, [fetchTransactions])

  const totals = useMemo(() => {
    return transactions.reduce((acc, t) => {
      if (t.type === 'income') acc.income += Number(t.amount)
      else acc.expense += Number(t.amount)
      return acc
    }, { income: 0, expense: 0 })
  }, [transactions])


  const handleExport = () => {
    if (transactions.length === 0) return toast.error('No data')
    const headers = ['Date', 'Type', 'Category', 'Account', 'Note', 'Amount']
    const content = transactions.map(t => [
      format(new Date(t.date_time), 'yyyy-MM-dd HH:mm'),
      t.type, t.category, t.payment_method, t.note, t.amount
    ])
    const csv = [headers, ...content].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transactions-${format(new Date(), 'yyyyMMdd')}.csv`
    a.click()
  }

  return (
    <div className="page-container" style={{ padding: 'clamp(12px, 3vw, 24px)' }}>
      <style>{`
        .tx-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 12px; }
        .tx-title-section h1 { margin: 0; fontSize: clamp(20px, 4vw, 28px); fontWeight: 800; }
        .tx-title-section p { color: var(--color-text-secondary); fontSize: clamp(11px, 2.5vw, 13px); marginTop: 2px; }

        .summary-row { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 16px; }
        .summary-card { background: var(--color-card); padding: 12px; border-radius: 12px; border: 1px solid var(--color-border); display: flex; align-items: center; gap: 10px; }
        .summary-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .summary-label { font-size: 9px; font-weight: 700; opacity: 0.6; letter-spacing: 0.5px; text-transform: uppercase; color: var(--color-text); }
        .summary-value { font-size: clamp(13px, 3.5vw, 16px); font-weight: 800; color: var(--color-text); }
        
        .filters-strip { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
        .filter-pill { padding: 6px 12px; border-radius: 8px; border: 1px solid var(--color-border); background: var(--color-input-bg); cursor: pointer; font-size: 11px; font-weight: 700; transition: all 0.2s; white-space: nowrap; color: var(--color-text); }
        .filter-pill.active { background: var(--color-primary); color: white; border-color: var(--color-primary); }
        
        .tx-professional-table { width: 100%; border-collapse: separate; border-spacing: 0 4px; min-width: 600px; }
        .tx-professional-table th { padding: 8px 12px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #fff; font-weight: 800; }
        .tx-professional-table td { background: var(--color-card); padding: 10px 12px; border-top: 1px solid var(--color-border); border-bottom: 1px solid var(--color-border); font-size: 12px; color: var(--color-text); }
        .tx-professional-table td:first-child { border-left: 1px solid var(--color-border); border-top-left-radius: 10px; border-bottom-left-radius: 10px; }
        .tx-professional-table td:last-child { border-right: 1px solid var(--color-border); border-top-right-radius: 10px; border-bottom-right-radius: 10px; }
        
        .high-contrast-label { color: #fff !important; font-weight: 800 !important; text-transform: uppercase; font-size: 10px; margin-bottom: 4px; display: block; }
        .high-contrast-input { background: #000 !important; border: 1px solid #333 !important; color: #fff !important; padding: 10px !important; border-radius: 8px !important; width: 100%; font-size: 13px; }

        /* Force table view even on mobile */
        .table-wrap { overflow-x: auto; margin-top: 8px; border-radius: 12px; -webkit-overflow-scrolling: touch; }
      `}</style>

      <div className="tx-header">
        <div className="tx-title-section">
          <h1>Transactions</h1>
          <p>Financial history & analysis</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowFilters(!showFilters)}><ListFilter size={15} /> Filters</button>
          <button className="btn btn-ghost btn-sm" onClick={handleExport}><Download size={15} /></button>
          <button className="btn btn-primary btn-sm" onClick={() => { setEditData(null); setModalOpen(true) }}>
            <Plus size={15} /> <span>New</span>
          </button>
        </div>
      </div>

      <div className="summary-row">
        <div className="summary-card">
          <div className="summary-icon" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}><TrendingUp size={16} /></div>
          <div>
            <div className="summary-label">CREDIT</div>
            <div className="summary-value">₹{totals.income.toLocaleString('en-IN')}</div>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}><TrendingDown size={16} /></div>
          <div>
            <div className="summary-label">DEBIT</div>
            <div className="summary-value">₹{totals.expense.toLocaleString('en-IN')}</div>
          </div>
        </div>
      </div>

      <div className="scroll-x filters-strip">
        {['All', 'This Week', 'This Month'].map(t => (
          <button key={t} className={`filter-pill ${timePeriod === t ? 'active' : ''}`} onClick={() => setTimePeriod(t)}>{t}</button>
        ))}
      </div>

      {showFilters && (
        <div className="card" style={{ marginBottom: 16, background: '#111', border: '1px solid #333', padding: '16px' }}>
          <div className="grid-responsive" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <div className="form-group">
              <label className="high-contrast-label">Search Detail</label>
              <input type="text" className="high-contrast-input" placeholder="Keyword..." value={draftFilters.search} onChange={e => setDraftFilters({...draftFilters, search: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="high-contrast-label">From Date</label>
              <input type="date" className="high-contrast-input" value={draftFilters.dateFrom} onChange={e => setDraftFilters({...draftFilters, dateFrom: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="high-contrast-label">To Date</label>
              <input type="date" className="high-contrast-input" value={draftFilters.dateTo} onChange={e => setDraftFilters({...draftFilters, dateTo: e.target.value})} />
            </div>
          </div>
          
          <div style={{ marginTop: 16 }}>

            <label className="high-contrast-label">Categories</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: 8 }}>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => {
                    const current = draftFilters.categories || []
                    const next = current.includes(cat.value)
                      ? current.filter(c => c !== cat.value)
                      : [...current, cat.value]
                    setDraftFilters({ ...draftFilters, categories: next })
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: '700',
                    border: '1px solid',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: draftFilters.categories?.includes(cat.value) ? cat.color : 'transparent',
                    borderColor: cat.color,
                    color: draftFilters.categories?.includes(cat.value) ? 'white' : cat.color
                  }}
                >
                  {cat.emoji} {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-actions" style={{ marginTop: 12, justifyContent: 'flex-start', gap: '8px' }}>
            <button className="btn btn-primary btn-sm" onClick={() => { setFilters(draftFilters); setShowFilters(false) }}>Apply</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { 
               const reset = { dateFrom: '', dateTo: '', types: [], categories: [], methods: [], search: '', sortBy: 'date_time', sortDir: 'desc' };
               setDraftFilters(reset); setFilters(reset); setShowFilters(false);
            }} style={{ color: '#fff' }}>Clear</button>
          </div>
        </div>
      )}

      <div className="table-wrap">
        <table className="tx-professional-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Category</th>
              <th>Account</th>
              <th>Note</th>
              <th>Amount</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1,2,3,4,5].map(i => <tr key={i}><td colSpan={7} style={{ textAlign: 'center', padding: '16px', opacity: 0.5 }}>Loading...</td></tr>)
            ) : transactions.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, opacity: 0.5 }}>No records found</td></tr>
            ) : (
              transactions.map(t => {
                const isInc = t.type === 'income'
                const PayIcon = getPayIcon(t.payment_method)
                const isSystem = t.source === 'loan' || t.source === 'loan_repayment'
                
                return (
                  <tr key={t.id} title={isSystem ? "This transaction was automatically created by a loan action. Manage it from the Loans page." : ""}>
                    <td><div style={{ fontWeight: 700 }}>{format(new Date(t.date_time), 'MMM dd')}</div><div style={{ fontSize: '10px', opacity: 0.5 }}>{format(new Date(t.date_time), 'HH:mm')}</div></td>
                    <td>
                      <span className="badge" style={{ 
                        background: isInc ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: isInc ? '#22c55e' : '#ef4444',
                        fontWeight: 800,
                        fontSize: '9px',
                        textTransform: 'uppercase',
                        padding: '2px 6px'
                      }}>
                        {isInc ? 'Credit' : 'Debit'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>{getCatEmoji(t.category)}</span>
                        <span style={{ fontWeight: 600 }}>{t.category === 'loan' ? 'Loan' : t.category === 'loan_repayment' ? 'Repayment' : t.category}</span>
                        {isSystem && (
                          <span className="badge badge-sm" style={{ background: 'var(--color-primary)', color: 'white', fontSize: '8px', padding: '1px 4px', marginLeft: '4px' }}>
                             🔗 AUTO
                          </span>
                        )}
                      </div>
                    </td>
                    <td><div className="badge badge-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px' }}><PayIcon size={10} /> {t.payment_method}</div></td>
                    <td style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.7 }}>{t.note || '—'}</td>
                    <td style={{ fontWeight: 800, color: isInc ? '#22c55e' : '#ef4444', fontSize: '13px' }}>{isInc ? '+' : '-'}₹{t.amount.toLocaleString('en-IN')}</td>
                    <td style={{ textAlign: 'right' }}>
                      {!isSystem && (
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                          <button className="icon-btn" onClick={() => { setEditData(t); setModalOpen(true) }} style={{ width: 28, height: 28 }}><Edit2 size={12} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })

            )}
          </tbody>
        </table>
      </div>

      <div className="pagination" style={{ marginTop: 20, padding: '0 8px' }}>
        <button className="btn btn-ghost btn-sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft size={16} /></button>
        <span style={{ fontSize: '12px', fontWeight: 700 }}>Page {page + 1} of {totalPages || 1}</span>
        <button className="btn btn-ghost btn-sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}><ChevronRight size={16} /></button>
      </div>

      <TransactionModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        onSuccess={fetchTransactions} 
        editData={editData}
        cashBalance={profile?.cash_balance || 0}
        bankBalance={profile?.bank_balance || 0}
      />

    </div>
  )
}
