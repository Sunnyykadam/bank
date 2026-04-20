import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Landmark, Target } from 'lucide-react';

export default function QuickActions({ onAddTransaction }) {
  const navigate = useNavigate();

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: '16px',
      width: '100%'
    }}>
      <button 
        onClick={onAddTransaction}
        style={{ ...btnBase, background: '#5b4cf5' }}
      >
        <PlusCircle size={18} />
        <span>Add Transaction</span>
      </button>

      <button 
        onClick={() => navigate('/loans?action=new')}
        style={{ ...btnBase, background: '#10b981' }}
      >
        <Landmark size={18} />
        <span>Add Loan</span>
      </button>

      <button 
        onClick={() => navigate('/savings?action=new')}
        style={{ ...btnBase, background: '#f59e0b' }}
      >
        <Target size={18} />
        <span>Add Goal</span>
      </button>
    </div>
  );
}

const btnBase = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  padding: '12px',
  border: 'none',
  borderRadius: '10px',
  color: 'white',
  fontSize: '13.5px',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'opacity 0.15s, transform 0.1s',
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
};
