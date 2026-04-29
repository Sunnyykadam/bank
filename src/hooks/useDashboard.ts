import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    cashBalance: 0,
    bankBalance: 0,
    totalBalance: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    monthlySavings: 0,
    recentTransactions: [],
    loansGiven: { count: 0, totalAmount: 0 },
    loansTaken: { count: 0, totalAmount: 0 },
    savingsGoals: [],
    expenseCategories: [],
    spendingTrend: []
  });

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      setLoading(true);

      const now = new Date();
      const firstDayMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();

      const [
        profileRes,
        transactionsMonthRes,
        recentTxRes,
        loansRes,
        goalsRes,
        trendRes
      ] = await Promise.all([
        supabase.from('profiles').select('cash_balance, bank_balance').eq('user_id', user.id).single(),
        supabase.from('transactions').select('type, amount, category').eq('user_id', user.id).gte('date_time', firstDayMonth),
        supabase.from('transactions').select('*').eq('user_id', user.id).order('date_time', { ascending: false }).limit(10),
        supabase.from('loans').select('*').or(`borrower_id.eq.${user.id},lender_id.eq.${user.id}`).in('status', ['active', 'overdue']),
        supabase.from('savings_goals').select('*').eq('user_id', user.id).neq('status', 'completed').order('target_date', { ascending: true }).limit(4),
        supabase.from('transactions').select('date_time, amount').eq('user_id', user.id).eq('type', 'expense').gte('date_time', sixMonthsAgo)
      ]);

      // ── Balance ──
      const profile = profileRes.data || { cash_balance: 0, bank_balance: 0 };
      const cash = Number(profile.cash_balance) || 0;
      const bank = Number(profile.bank_balance) || 0;

      // ── Monthly Summary & Category Breakdown ──
      let mIncome = 0;
      let mExpenses = 0;
      const catMap = {};

      (transactionsMonthRes.data || []).forEach(tx => {
        const amt = Number(tx.amount);
        if (tx.type === 'income') {
          mIncome += amt;
        } else if (tx.type === 'expense') {
          mExpenses += amt;
          catMap[tx.category] = (catMap[tx.category] || 0) + amt;
        }
      });

      const expenseCategories = Object.entries(catMap).map(([category, amount]) => ({
        category,
        amount,
        percentage: mExpenses > 0 ? Number(((amount as number) / mExpenses * 100).toFixed(1)) : 0
      })).sort((a, b) => (b.amount as number) - (a.amount as number));

      // ── Loans ──
      const loansGiven = { count: 0, totalAmount: 0 };
      const loansTaken = { count: 0, totalAmount: 0 };
      (loansRes.data || []).forEach(l => {
        if (l.lender_id === user.id) {
          loansGiven.count++;
          loansGiven.totalAmount += Number(l.remaining_amount);
        } else if (l.borrower_id === user.id) {
          loansTaken.count++;
          loansTaken.totalAmount += Number(l.remaining_amount);
        }
      });

      // ── Goals ──
      const savingsGoals = (goalsRes.data || []).map(g => ({
        ...g,
        progressPercent: Math.min(100, (Number(g.current_amount) / Number(g.target_amount) || 0) * 100)
      }));

      // ── Spending Trend (Last 6 Months) ──
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
          key: d.toISOString().slice(0, 7), // YYYY-MM
          label: d.toLocaleString('default', { month: 'short' }),
          amount: 0
        });
      }

      (trendRes.data || []).forEach(tx => {
        const key = tx.date_time.slice(0, 7);
        const monthObj = months.find(m => m.key === key);
        if (monthObj) monthObj.amount += Number(tx.amount);
      });

      setData({
        cashBalance: cash,
        bankBalance: bank,
        totalBalance: cash + bank,
        monthlyIncome: mIncome,
        monthlyExpenses: mExpenses,
        monthlySavings: mIncome - mExpenses,
        recentTransactions: recentTxRes.data || [],
        loansGiven,
        loansTaken,
        savingsGoals,
        expenseCategories,
        spendingTrend: months.map(m => ({ month: m.label, amount: m.amount }))
      });

    } catch (err) {
      console.error('Dashboard Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('dashboard-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loans' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'goals' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  return { ...data, loading, refetch: fetchData };
}
