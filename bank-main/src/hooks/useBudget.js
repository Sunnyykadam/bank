import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export function useBudget() {
  const { user } = useAuth()
  const [budgets, setBudgets] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchBudgets = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('budget_limits')
        .select('*')
        .eq('user_id', user.id)
      if (error) throw error
      setBudgets(data || [])
    } catch (err) {
      console.error('Error fetching budgets:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchBudgets()
  }, [fetchBudgets])

  const setBudgetLimit = async (category, monthlyLimit) => {
    if (!user) return
    try {
      const existing = budgets.find(b => b.category === category)
      if (existing) {
        const { data, error } = await supabase
          .from('budget_limits')
          .update({ monthly_limit: monthlyLimit })
          .eq('id', existing.id)
          .eq('user_id', user.id)
          .select()
          .single()
        if (error) throw error
        toast.success(`Budget updated for ${category}`)
      } else {
        const { data, error } = await supabase
          .from('budget_limits')
          .insert([{ user_id: user.id, category, monthly_limit: monthlyLimit }])
          .select()
          .single()
        if (error) throw error
        toast.success(`Budget set for ${category}`)
      }
      fetchBudgets()
    } catch (err) {
      toast.error('Failed to update budget')
    }
  }

  const checkBudgetWarning = (category, currentSpent, newAmount) => {
    const budget = budgets.find(b => b.category === category)
    if (!budget) return
    const total = currentSpent + newAmount
    const percentage = (total / budget.monthly_limit) * 100
    if (percentage >= 100) {
      toast.error(`🚨 Budget exceeded for ${category}! ₹${total.toLocaleString('en-IN')} / ₹${budget.monthly_limit.toLocaleString('en-IN')}`)
    } else if (percentage >= 80) {
      toast('⚠️ ' + category + ' budget is at ' + Math.round(percentage) + '%', { icon: '⚠️' })
    }
  }

  return {
    budgets,
    loading,
    fetchBudgets,
    setBudgetLimit,
    checkBudgetWarning
  }
}
