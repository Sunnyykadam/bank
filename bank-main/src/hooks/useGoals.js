import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import confetti from 'canvas-confetti'

export function useGoals() {
  const { user } = useAuth()
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchGoals = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .order('priority', { ascending: true })
      if (error) throw error
      setGoals(data || [])
    } catch (err) {
      console.error('Error fetching goals:', err)
      toast.error('Failed to load goals')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchGoals()
  }, [fetchGoals])

  const triggerCelebration = (goalName, percentage) => {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#4F46E5', '#22C55E', '#F59E0B', '#EF4444']
    })
    toast.success(`🎉 You've reached ${percentage}% of ${goalName}!`, { duration: 5000 })
  }

  const checkMilestones = (goal, newAmount) => {
    const milestones = [25, 50, 75, 100]
    const oldPercentage = (goal.current_amount / goal.target_amount) * 100
    const newPercentage = (newAmount / goal.target_amount) * 100
    
    for (const milestone of milestones) {
      if (oldPercentage < milestone && newPercentage >= milestone) {
        triggerCelebration(goal.name, milestone)
        break
      }
    }
  }

  const addGoal = async (goal) => {
    if (!user) return { error: 'Not authenticated' }
    try {
      const maxPriority = goals.length > 0 ? Math.max(...goals.map(g => g.priority || 0)) : 0
      const { data, error } = await supabase
        .from('goals')
        .insert([{ ...goal, user_id: user.id, priority: maxPriority + 1 }])
        .select()
        .single()
      if (error) throw error
      toast.success('Goal created!')
      fetchGoals()
      return { data }
    } catch (err) {
      toast.error('Failed to create goal')
      return { error: err }
    }
  }

  const updateGoal = async (id, updates) => {
    if (!user) return { error: 'Not authenticated' }
    try {
      const existingGoal = goals.find(g => g.id === id)
      if (existingGoal && updates.current_amount !== undefined) {
        checkMilestones(existingGoal, updates.current_amount)
      }
      
      if (updates.current_amount >= (existingGoal?.target_amount || Infinity)) {
        updates.status = 'completed'
      }

      const { data, error } = await supabase
        .from('goals')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()
      if (error) throw error
      fetchGoals()
      return { data }
    } catch (err) {
      toast.error('Failed to update goal')
      return { error: err }
    }
  }

  const deleteGoal = async (id) => {
    if (!user) return { error: 'Not authenticated' }
    try {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
      if (error) throw error
      toast.success('Goal deleted!')
      fetchGoals()
      return { success: true }
    } catch (err) {
      toast.error('Failed to delete goal')
      return { error: err }
    }
  }

  const reorderGoals = async (reorderedGoals) => {
    try {
      const updates = reorderedGoals.map((goal, index) => ({
        id: goal.id,
        user_id: user.id,
        priority: index + 1
      }))

      for (const update of updates) {
        await supabase
          .from('goals')
          .update({ priority: update.priority })
          .eq('id', update.id)
          .eq('user_id', user.id)
      }

      setGoals(reorderedGoals.map((g, i) => ({ ...g, priority: i + 1 })))
    } catch (err) {
      toast.error('Failed to reorder goals')
      fetchGoals()
    }
  }

  const topUpGoal = async (goalId, amount) => {
    const goal = goals.find(g => g.id === goalId)
    if (!goal) return

    const newAmount = (goal.current_amount || 0) + amount
    await updateGoal(goalId, { current_amount: newAmount })
    return { newAmount }
  }

  return {
    goals,
    loading,
    fetchGoals,
    addGoal,
    updateGoal,
    deleteGoal,
    reorderGoals,
    topUpGoal
  }
}
