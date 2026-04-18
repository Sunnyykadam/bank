import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export function useTransactions() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    dateFrom: null,
    dateTo: null,
    type: 'all',
    categories: [],
    paymentMethod: 'all',
    search: '',
    sortBy: 'date_time',
    sortDir: 'desc'
  })
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const PAGE_SIZE = 20

  const fetchTransactions = useCallback(async (customFilters = null) => {
    if (!user) return
    setLoading(true)
    try {
      const f = customFilters || filters
      let query = supabase
        .from('transactions')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)

      if (f.dateFrom) query = query.gte('date_time', f.dateFrom)
      if (f.dateTo) query = query.lte('date_time', f.dateTo)
      if (f.type && f.type !== 'all') query = query.eq('type', f.type)
      if (f.categories && f.categories.length > 0) query = query.in('category', f.categories)
      if (f.paymentMethod && f.paymentMethod !== 'all') query = query.eq('payment_method', f.paymentMethod)
      if (f.search) query = query.ilike('note', `%${f.search}%`)

      query = query.order(f.sortBy || 'date_time', { ascending: (f.sortDir || 'desc') === 'asc' })
      query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      const { data, error, count } = await query
      if (error) throw error
      setTransactions(data || [])
      setTotalCount(count || 0)
    } catch (err) {
      console.error('Error fetching transactions:', err)
      toast.error('Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }, [user, filters, page])

  const fetchAllTransactions = useCallback(async (customFilters = {}) => {
    if (!user) return []
    try {
      let query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date_time', { ascending: false })

      if (customFilters.dateFrom) query = query.gte('date_time', customFilters.dateFrom)
      if (customFilters.dateTo) query = query.lte('date_time', customFilters.dateTo)
      if (customFilters.type && customFilters.type !== 'all') query = query.eq('type', customFilters.type)
      if (customFilters.linkedGoalId) query = query.eq('linked_goal_id', customFilters.linkedGoalId)

      const { data, error } = await query
      if (error) throw error
      return data || []
    } catch (err) {
      console.error('Error fetching all transactions:', err)
      return []
    }
  }, [user])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  const addTransaction = async (transaction) => {
    if (!user) return { error: 'Not authenticated' }
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert([{ ...transaction, user_id: user.id }])
        .select()
        .single()
      if (error) throw error
      toast.success('Transaction added!')
      fetchTransactions()
      return { data }
    } catch (err) {
      toast.error('Failed to add transaction')
      return { error: err }
    }
  }

  const updateTransaction = async (id, updates) => {
    if (!user) return { error: 'Not authenticated' }
    try {
      const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()
      if (error) throw error
      toast.success('Transaction updated!')
      fetchTransactions()
      return { data }
    } catch (err) {
      toast.error('Failed to update transaction')
      return { error: err }
    }
  }

  const deleteTransaction = async (id) => {
    if (!user) return { error: 'Not authenticated' }
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
      if (error) throw error
      toast.success('Transaction deleted!')
      fetchTransactions()
      return { success: true }
    } catch (err) {
      toast.error('Failed to delete transaction')
      return { error: err }
    }
  }

  return {
    transactions,
    loading,
    filters,
    setFilters,
    page,
    setPage,
    totalCount,
    pageSize: PAGE_SIZE,
    fetchTransactions,
    fetchAllTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction
  }
}
