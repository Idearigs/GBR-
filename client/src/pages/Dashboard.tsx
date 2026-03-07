import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getReceipts } from '../api';
import type { Receipt } from '../types';

function useToast() {
  const [msg, setMsg] = useState('');
  const [type, setType] = useState('');
  const show = (m: string, t = '') => { setMsg(m); setType(t); setTimeout(() => setMsg(''), 3000); };
  return { msg, type, show };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [stats, setStats] = useState({ count: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getReceipts(1, '');
      setReceipts(data.receipts.slice(0, 10));
      const total = data.receipts.reduce((s: number, r: Receipt) => s + parseFloat(String(r.total_amount || 0)), 0);
      setStats({ count: data.total, total });
    } catch (e: any) {
      toast.show(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('gbr_token');
    navigate('/login', { replace: true });
  };

  const statusClass = (s: string) => `status-${s}`;

  return (
    <div className="app-shell">
      <div className="topbar">
        <h1>GBR</h1>
        <div className="topbar-actions">
          <button className="btn btn-outline" style={{ color: '#fff', borderColor: '#555', minHeight: 0, padding: '8px 14px', fontSize: 14 }} onClick={() => navigate('/manage')}>All Receipts</button>
          <button className="btn btn-ghost" style={{ color: '#aaa', minHeight: 0, padding: '8px 12px', fontSize: 14 }} onClick={logout}>Logout</button>
        </div>
      </div>

      <div className="page">
        {/* Stats */}
        <div className="dashboard-stats">
          <div className="stat-card">
            <div className="stat-value">{stats.count}</div>
            <div className="stat-label">Total Receipts</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">£{stats.total.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="stat-label">Total Value</div>
          </div>
        </div>

        {/* New Receipt CTA */}
        <button className="btn btn-primary btn-full btn-lg mb-24" onClick={() => navigate('/new')}>
          + New Gold Buying Receipt
        </button>

        {/* Recent */}
        <div className="flex-between mb-16">
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Recent Receipts</h2>
          <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => navigate('/manage')}>View all →</button>
        </div>

        {loading ? (
          <div className="spinner" />
        ) : receipts.length === 0 ? (
          <div className="text-center text-grey" style={{ padding: 40 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <p>No receipts yet. Create your first one!</p>
          </div>
        ) : (
          <div className="receipt-list">
            {receipts.map(r => (
              <div key={r.id} className="receipt-card" onClick={() => navigate('/manage', { state: { highlightId: r.id } })}>
                <div className="receipt-card-left">
                  <h3>{r.customer_name || 'No name'}</h3>
                  <p>No:{r.receipt_no} · {r.date ? new Date(r.date).toLocaleDateString('en-GB') : '—'}</p>
                </div>
                <div className="receipt-card-right">
                  <div className="amount">£{parseFloat(String(r.total_amount || 0)).toFixed(2)}</div>
                  <span className={`status-pill ${statusClass(r.status)}`}>{r.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {toast.msg && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
