import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getReceipts, sendRangeReport } from '../api';
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
  const [allTotal, setAllTotal] = useState(0);
  const [allCount, setAllCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportFrom, setReportFrom] = useState('');
  const [reportTo, setReportTo] = useState('');
  const [reportSending, setReportSending] = useState(false);
  const toast = useToast();

  const thisMonthStart = new Date();
  thisMonthStart.setDate(1);
  const thisMonthStr = thisMonthStart.toISOString().split('T')[0];

  useEffect(() => { load(); }, [dateFrom, dateTo]);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: '1', limit: '100' });
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      const token = localStorage.getItem('gbr_token');
      const r = await fetch(`/api/receipts?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await r.json();
      setReceipts(data.receipts.slice(0, 20));
      setFilteredTotal(data.receipts.reduce((s: number, rc: Receipt) => s + parseFloat(String(rc.total_amount || 0)), 0));
      if (!dateFrom && !dateTo) {
        setAllCount(data.total);
        setAllTotal(data.receipts.reduce((s: number, rc: Receipt) => s + parseFloat(String(rc.total_amount || 0)), 0));
      }
    } catch (e: any) {
      toast.show(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadMonthStats = async () => {
    try {
      const token = localStorage.getItem('gbr_token');
      const r = await fetch(`/api/receipts?page=1&limit=200&date_from=${thisMonthStr}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await r.json();
      return data.receipts.reduce((s: number, rc: Receipt) => s + parseFloat(String(rc.total_amount || 0)), 0);
    } catch { return 0; }
  };

  const [monthTotal, setMonthTotal] = useState(0);
  useEffect(() => { loadMonthStats().then(setMonthTotal); }, []);

  const logout = () => {
    localStorage.removeItem('gbr_token');
    navigate('/login', { replace: true });
  };

  const handleExportCSV = async () => {
    const token = localStorage.getItem('gbr_token');
    const params = new URLSearchParams();
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    const r = await fetch(`/api/receipts/export?${params}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) { toast.show('Export failed', 'error'); return; }
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `receipts-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleSendReport = async () => {
    if (!reportFrom || !reportTo) { toast.show('Please select both dates', 'error'); return; }
    setReportSending(true);
    try {
      await sendRangeReport(reportFrom, reportTo);
      toast.show('Report sent to email!', 'success');
      setShowReportModal(false);
    } catch (e: any) {
      toast.show(e.message || 'Failed to send report', 'error');
    } finally {
      setReportSending(false);
    }
  };

  const clearFilter = () => { setDateFrom(''); setDateTo(''); };
  const isFiltered = dateFrom || dateTo;
  const statusBorderClass = (s: string) => `status-border-${s}`;

  return (
    <div className="app-shell">
      <div className="topbar">
        <h1>McCulloch — GBR</h1>
        <div className="topbar-actions">
          <button className="btn btn-ghost" style={{ minHeight: 0, padding: '7px 14px', fontSize: 15, fontWeight: 600 }} onClick={() => navigate('/manage')}>
            All Receipts
          </button>
          <button className="btn btn-ghost" style={{ minHeight: 0, padding: '7px 10px', fontSize: 15, color: 'var(--danger)' }} onClick={logout}>
            Logout
          </button>
        </div>
      </div>

      <div className="page">
        {/* Stat Cards */}
        <div className="dashboard-stats">
          <div className="stat-card stat-card-navy">
            <div className="stat-icon-wrap">🧾</div>
            <div className="stat-value">{allCount}</div>
            <div className="stat-label">Receipts</div>
          </div>
          <div className="stat-card stat-card-gold">
            <div className="stat-icon-wrap">💷</div>
            <div className="stat-value">£{allTotal.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
            <div className="stat-label">Total Value</div>
          </div>
          <div className="stat-card stat-card-green">
            <div className="stat-icon-wrap">📅</div>
            <div className="stat-value">£{monthTotal.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
            <div className="stat-label">This Month</div>
          </div>
        </div>

        {/* New Receipt */}
        <button className="btn btn-primary btn-full btn-lg mb-20" onClick={() => navigate('/new')}>
          + New Gold Buying Receipt
        </button>

        {/* Date Filter + Actions */}
        <div className="dashboard-filter">
          <div className="dashboard-filter-row">
            <div className="filter-date-group">
              <label>From</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div className="filter-date-group">
              <label>To</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            {isFiltered && (
              <button className="btn btn-ghost" style={{ minHeight: 0, padding: '10px 12px', fontSize: 14, alignSelf: 'flex-end', color: 'var(--danger)' }} onClick={clearFilter}>
                Clear
              </button>
            )}
          </div>
          <div className="filter-actions">
            <button className="btn btn-outline" style={{ flex: 1, minHeight: 0, padding: '12px', fontSize: 15 }} onClick={handleExportCSV}>
              ⬇ Export CSV
            </button>
            <button
              className="btn btn-navy"
              style={{ flex: 1, minHeight: 0, padding: '12px', fontSize: 15 }}
              onClick={() => { setReportFrom(dateFrom); setReportTo(dateTo); setShowReportModal(true); }}
            >
              📧 Email Report
            </button>
          </div>
          {isFiltered && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--gold-pale)', borderRadius: 10, fontSize: 14, color: '#92400E', fontWeight: 600 }}>
              {receipts.length} receipts · £{filteredTotal.toFixed(2)} in selected period
            </div>
          )}
        </div>

        {/* Receipt List */}
        <div className="flex-between mb-12">
          <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            {isFiltered ? 'Filtered Receipts' : 'Recent Receipts'}
          </h2>
          <button className="btn btn-ghost" style={{ padding: '4px 0', fontSize: 15, minHeight: 0 }} onClick={() => navigate('/manage')}>
            See All
          </button>
        </div>

        {loading ? (
          <div className="spinner" />
        ) : receipts.length === 0 ? (
          <div className="text-center" style={{ padding: 48, color: 'var(--grey)' }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>📋</div>
            <p style={{ fontSize: 16 }}>{isFiltered ? 'No receipts in this date range.' : 'No receipts yet. Create your first one!'}</p>
          </div>
        ) : (
          <div className="receipt-list">
            {receipts.map(r => (
              <div key={r.id} className={`receipt-card ${statusBorderClass(r.status)}`} onClick={() => navigate('/manage')}>
                <div className="receipt-card-left">
                  <h3>{r.customer_name || '(No name)'}</h3>
                  <p>No:{r.receipt_no} · {r.date ? new Date(r.date).toLocaleDateString('en-GB') : '—'}{(r as any).customer_phone ? ` · ${(r as any).customer_phone}` : ''}</p>
                </div>
                <div className="receipt-card-right">
                  <div className="amount">£{parseFloat(String(r.total_amount || 0)).toFixed(2)}</div>
                  <span className={`status-pill status-${r.status}`}>{r.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="modal-overlay" onClick={() => setShowReportModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h3>Email Report</h3>
                <p>Select a date range and send a report to your email.</p>
              </div>
              <button className="btn btn-ghost" style={{ minHeight: 0, padding: '4px 8px' }} onClick={() => setShowReportModal(false)}>✕</button>
            </div>
            <div className="form-group">
              <label>From Date</label>
              <input type="date" value={reportFrom} onChange={e => setReportFrom(e.target.value)} style={{ fontSize: 16 }} />
            </div>
            <div className="form-group">
              <label>To Date</label>
              <input type="date" value={reportTo} onChange={e => setReportTo(e.target.value)} style={{ fontSize: 16 }} />
            </div>
            <button
              className="btn btn-primary btn-full"
              style={{ marginTop: 8 }}
              onClick={handleSendReport}
              disabled={reportSending || !reportFrom || !reportTo}
            >
              {reportSending ? 'Sending...' : '📧 Send Report'}
            </button>
          </div>
        </div>
      )}

      {toast.msg && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
