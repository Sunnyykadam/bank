import React, { useState } from 'react';
import { useDashboard } from '../hooks/useDashboard';
import { useAuth } from '../context/AuthContext';

import QuickActions from '../components/dashboard/QuickActions';
import BalanceCards from '../components/dashboard/BalanceCards';
import MonthlySummary from '../components/dashboard/MonthlySummary';
import ExpensePieChart from '../components/dashboard/ExpensePieChart';
import SpendingTrendChart from '../components/dashboard/SpendingTrendChart';
import RecentTransactions from '../components/dashboard/RecentTransactions';
import ActiveLoansSummary from '../components/dashboard/ActiveLoansSummary';
import SavingsGoalsOverview from '../components/dashboard/SavingsGoalsOverview';
import NotificationBell from '../components/loans/NotificationBell';

// We'll need the transaction modal here
import TransactionModal from '../components/transactions/TransactionModal';

export default function Dashboard() {
  const { profile } = useAuth();
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const {
    loading, totalBalance, cashBalance, bankBalance,
    monthlyIncome, monthlyExpenses, monthlySavings,
    recentTransactions, loansGiven, loansTaken,
    savingsGoals, expenseCategories, spendingTrend, refetch
  } = useDashboard();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    if (hour < 22) return 'Good evening';
    return 'Good night';
  };

  if (loading) return <DashboardSkeleton />;

  return (
    <div style={{ padding: '20px', maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>Dashboard</h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            {getGreeting()}, {profile?.name || 'User'}
          </p>
        </div>
        <NotificationBell />
      </div>

      {/* Grid Layout */}
      <QuickActions onAddTransaction={() => setIsTxModalOpen(true)} />
      
      <BalanceCards 
        totalBalance={totalBalance} 
        cashBalance={cashBalance} 
        bankBalance={bankBalance} 
      />

      <MonthlySummary 
        income={monthlyIncome} 
        expenses={monthlyExpenses} 
        savings={monthlySavings} 
      />

      {/* Charts Row */}
      <div className="dashboard-grid-2">
        <div style={{ flex: '5' }}>
          <ExpensePieChart categories={expenseCategories} totalExpenses={monthlyExpenses} />
        </div>
        <div style={{ flex: '7' }}>
          <SpendingTrendChart trend={spendingTrend} />
        </div>
      </div>

      {/* Data Row */}
      <div className="dashboard-grid-7-5">
        <div style={{ flex: '7' }}>
          <RecentTransactions transactions={recentTransactions} />
        </div>
        <div style={{ flex: '5', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <ActiveLoansSummary loansGiven={loansGiven} loansTaken={loansTaken} />
          <SavingsGoalsOverview goals={savingsGoals} />
        </div>
      </div>

      {/* Modals */}
      {isTxModalOpen && (
        <TransactionModal 
          isOpen={isTxModalOpen} 
          onClose={() => setIsTxModalOpen(false)} 
          onSuccess={refetch} 
        />
      )}

      <style>{`
        .dashboard-grid-2, .dashboard-grid-7-5 {
          display: flex;
          gap: 16px;
        }
        @media (max-width: 768px) {
          .dashboard-grid-2, .dashboard-grid-7-5 {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '1280px', margin: '0 auto' }}>
      <div style={{ height: '40px', width: '200px', background: 'var(--color-background-secondary)', borderRadius: '8px' }} className="pulse" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {[1, 2, 3].map(i => <div key={i} style={{ height: '48px', background: 'var(--color-background-secondary)', borderRadius: '10px' }} className="pulse" />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {[1, 2, 3].map(i => <div key={i} style={{ height: '100px', background: 'var(--color-background-secondary)', borderRadius: '10px' }} className="pulse" />)}
      </div>
      <div style={{ height: '140px', background: 'var(--color-background-secondary)', borderRadius: '10px' }} className="pulse" />
      <div style={{ display: 'flex', gap: '16px' }}>
        <div style={{ flex: 5, height: '300px', background: 'var(--color-background-secondary)', borderRadius: '10px' }} className="pulse" />
        <div style={{ flex: 7, height: '300px', background: 'var(--color-background-secondary)', borderRadius: '10px' }} className="pulse" />
      </div>
      <style>{`
        .pulse {
          animation: pulse 1.5s ease-in-out infinite;
        }
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.4; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
