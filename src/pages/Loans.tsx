import React, { useState } from 'react';
import { Plus, LayoutDashboard, History, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useLoans } from '../hooks/useLoans';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

import LoanSummaryBar from '../components/loans/LoanSummaryBar';
import LoanCard from '../components/loans/LoanCard';
import NewLoanModal from '../components/loans/NewLoanModal';
import RepayModal from '../components/loans/RepayModal';
import NotificationBell from '../components/loans/NotificationBell';

export default function Loans() {
  const { user } = useAuth();
  const { 
    pendingLoans, activeLoans, completedLoans, overdueLoans,
    totalOwed, totalToReceive, netBalance, loading, refetch
  } = useLoans();

  const [activeTab, setActiveTab] = useState('pending');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedRepayLoan, setSelectedRepayLoan] = useState(null);

  const pendingActionCount = pendingLoans.filter(l => l.recipient_id === user?.id).length;
  
  const nextDueLoan = activeLoans
    .filter(l => l.borrower_id === user?.id)
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0];

  const nextDue = nextDueLoan ? {
    amount: nextDueLoan.remaining_amount,
    date: new Date(nextDueLoan.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  } : null;

  const handleAccept = async (loanId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/accept-loan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ loan_id: loanId })
      });
      const result = await response.json();
      if (result.error) throw new Error(result.error);
      toast.success('Loan accepted!');
      refetch();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleReject = async (loanId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reject-loan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ loan_id: loanId })
      });
      const result = await response.json();
      if (result.error) throw new Error(result.error);
      toast.success('Loan rejected.');
      refetch();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const getFilteredLoans = () => {
    switch (activeTab) {
      case 'pending': return pendingLoans;
      case 'active': return activeLoans;
      case 'completed': return completedLoans;
      case 'overdue': return overdueLoans;
      default: return [];
    }
  };

  const getEmptyMessage = () => {
    switch (activeTab) {
      case 'pending': return 'No pending requests';
      case 'active': return 'No active loans';
      case 'completed': return 'No completed loans';
      case 'overdue': return 'No overdue loans!';
      default: return '';
    }
  };

  const tabs = [
    { id: 'pending', label: 'Requests', count: pendingLoans.length, icon: History },
    { id: 'active', label: 'Active', count: activeLoans.length, icon: LayoutDashboard },
    { id: 'overdue', label: 'Overdue', count: overdueLoans.length, icon: AlertCircle, color: '#ef4444' },
    { id: 'completed', label: 'History', count: completedLoans.length, icon: CheckCircle2 }
  ];

  return (
    <div className="page-container" style={{ padding: 'clamp(12px, 3vw, 24px)' }}>
      <style>{`
        .loans-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
        .loans-title-section h1 { margin: 0; font-size: clamp(20px, 4.5vw, 28px); font-weight: 800; color: #fff; }
        .loans-title-section p { color: var(--color-text-secondary); font-size: clamp(11px, 2.5vw, 13px); margin-top: 2px; }

        .loans-tabs-wrap { display: flex; align-items: center; gap: 4px; overflow-x: auto; -webkit-overflow-scrolling: touch; margin-bottom: 16px; border-bottom: 1px solid var(--color-border); padding-bottom: 4px; }
        .loan-tab { padding: 10px 14px; border: none; background: none; cursor: pointer; white-space: nowrap; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 6px; transition: all 0.2s; position: relative; }
        .loan-tab.active { color: var(--color-primary); }
        .loan-tab.active::after { content: ''; position: absolute; bottom: -4px; left: 0; right: 0; height: 2px; background: var(--color-primary); }
        .loan-tab:not(.active) { color: var(--color-text-secondary); }
        
        .tab-count { font-size: 9px; padding: 1px 6px; border-radius: 10px; background: var(--color-muted); color: var(--color-text); }
        .tab-count.has-items { background: var(--color-primary); color: #fff; }
      `}</style>

      <div className="loans-header">
        <div className="loans-title-section">
          <h1>Lendings & Loans</h1>
          <p>Manage personal debts and credits</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <NotificationBell />
          <button onClick={() => setIsNewModalOpen(true)} className="btn btn-primary btn-sm">
            <Plus size={15} /> <span>New Request</span>
          </button>
        </div>
      </div>

      <LoanSummaryBar 
        totalOwed={totalOwed} 
        totalToReceive={totalToReceive} 
        netBalance={netBalance} 
        nextDue={nextDue}
        pendingActionCount={pendingActionCount}
      />

      <div className="loans-tabs-wrap scroll-x">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`loan-tab ${activeTab === tab.id ? 'active' : ''}`}>
             <tab.icon size={14} />
             {tab.label}
             {tab.count > 0 && <span className={`tab-count ${tab.count > 0 ? 'has-items' : ''}`} style={tab.id === 'overdue' ? {background: '#ef4444'} : {}}>{tab.count}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>Loading transactions...</div>
      ) : (
        <div className="grid-responsive" style={{ paddingTop: 8 }}>
          {getFilteredLoans().map(loan => (
            <LoanCard 
              key={loan.id} 
              loan={loan} 
              currentUserId={user?.id}
              onAccept={handleAccept}
              onReject={handleReject}
              onRepay={(l) => setSelectedRepayLoan(l)}
            />
          ))}
          {getFilteredLoans().length === 0 && (
            <div className="empty-state" style={{ gridColumn: '1 / -1', padding: '40px 20px', border: '1px dashed var(--color-border)', borderRadius: '16px' }}>
               <AlertCircle style={{ opacity: 0.3 }} size={32} />
               <p style={{ marginTop: 12, fontWeight: 600, opacity: 0.5, fontSize: 13 }}>{getEmptyMessage()}</p>
            </div>
          )}
        </div>
      )}

      <NewLoanModal isOpen={isNewModalOpen} onClose={() => setIsNewModalOpen(false)} onSuccess={refetch} />
      {selectedRepayLoan && (
        <RepayModal 
          loan={selectedRepayLoan} 
          isOpen={!!selectedRepayLoan} 
          onClose={() => setSelectedRepayLoan(null)} 
          onSuccess={refetch} 
        />
      )}
    </div>
  );
}
