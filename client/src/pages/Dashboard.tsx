import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getReceipts, sendRangeReport, deleteReceipt } from '../api';
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
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
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
    const from = dateFrom || 'all';
    const to = dateTo || 'all';
    a.href = url; a.download = `McCulloch-GBR-${from}-to-${to}.csv`; a.click();
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

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteReceipt(deleteTarget.id);
      toast.show('Receipt deleted', 'success');
      setDeleteTarget(null);
      load();
    } catch {
      toast.show('Delete failed', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const clearFilter = () => { setDateFrom(''); setDateTo(''); };
  const isFiltered = dateFrom || dateTo;

  return (
    <div className="app-shell">
      {/* Nav Bar */}
      <div className="topbar">
        <h1>McCulloch — GBR</h1>
        <div className="topbar-actions">
          <button className="btn btn-ghost" style={{ minHeight: 0, padding: '6px 14px', fontSize: 15, fontWeight: 600 }} onClick={() => navigate('/manage')}>
            All Receipts
          </button>
          <button className="btn btn-ghost" style={{ minHeight: 0, padding: '6px 14px', fontSize: 15, fontWeight: 600 }} onClick={() => navigate('/customers')}>
            Customers
          </button>
          <button className="btn btn-ghost" style={{ minHeight: 0, padding: '6px 10px', fontSize: 15, color: 'var(--danger)' }} onClick={logout}>
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

        {/* New Receipt CTA */}
        <button className="btn btn-primary btn-full btn-lg mb-20" onClick={() => navigate('/new')}>
          + New Gold Buying Receipt
        </button>

        {/* Filter & Export Card */}
        <div className="dashboard-filter">
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 12 }}>Filter & Export</p>
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
              <button className="btn btn-ghost" style={{ minHeight: 0, padding: '10px 8px', fontSize: 14, alignSelf: 'flex-end', color: 'var(--danger)', fontWeight: 600 }} onClick={clearFilter}>
                Clear
              </button>
            )}
          </div>
          {isFiltered && (
            <div style={{ margin: '12px 0 0', padding: '10px 14px', background: 'var(--gold-pale)', borderRadius: 10, fontSize: 14, color: '#92400E', fontWeight: 600 }}>
              {receipts.length} receipts · £{filteredTotal.toFixed(2)} in period
            </div>
          )}
          <div className="filter-actions">
            <button className="btn btn-outline" style={{ flex: 1, minHeight: 0, padding: '13px', fontSize: 15 }} onClick={handleExportCSV}>
              ↓ Export CSV
            </button>
            <button className="btn btn-navy" style={{ flex: 1, minHeight: 0, padding: '13px', fontSize: 15 }} onClick={() => { setReportFrom(dateFrom); setReportTo(dateTo); setShowReportModal(true); }}>
              ✉ Email Report
            </button>
          </div>
        </div>

        {/* Receipt List Header */}
        <div className="flex-between mb-12">
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            {isFiltered ? 'Filtered Receipts' : 'Recent Receipts'}
          </span>
          <button className="btn btn-ghost" style={{ padding: '4px 0', fontSize: 15, minHeight: 0, fontWeight: 600 }} onClick={() => navigate('/manage')}>
            See All
          </button>
        </div>

        {loading ? (
          <div className="spinner" />
        ) : receipts.length === 0 ? (
          <div className="text-center" style={{ padding: 56, color: 'var(--grey)' }}>
            <div style={{ fontSize: 48, marginBottom: 14 }}>📋</div>
            <p style={{ fontSize: 17, fontWeight: 500 }}>{isFiltered ? 'No receipts in this range.' : 'No receipts yet.'}</p>
            <p style={{ fontSize: 14, marginTop: 6, color: 'var(--grey2)' }}>Tap + New to create one</p>
          </div>
        ) : (
          <div className="receipt-list">
            {receipts.map(r => {
              const pm = (r as any).payment_method || 'cash';
              const isCard = pm === 'card';
              return (
                <div key={r.id} className="dash-receipt-card">
                  {/* Top row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--dark)', letterSpacing: '-0.3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {r.customer_name || '(No name)'}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--grey)', marginTop: 4 }}>
                        No:{r.receipt_no} &nbsp;·&nbsp; {r.date ? new Date(r.date).toLocaleDateString('en-GB') : '—'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--dark)', letterSpacing: '-1px', lineHeight: 1 }}>
                        £{parseFloat(String(r.total_amount || 0)).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Bottom row — badges + actions */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600, background: isCard ? '#E8F0FE' : '#E6F9EE', color: isCard ? '#1a56db' : '#166534' }}>
                        {isCard ? '💳' : '💵'} {isCard ? 'Card' : 'Cash'}
                      </span>
                      <span className={`status-pill status-${r.status}`} style={{ fontSize: 13, padding: '5px 12px' }}>{r.status}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        style={{ background: 'var(--light)', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 14, fontWeight: 600, color: 'var(--info)', cursor: 'pointer' }}
                        onClick={() => navigate('/manage')}
                      >
                        View
                      </button>
                      <button
                        style={{ background: '#FFF0EE', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 18, cursor: 'pointer' }}
                        onClick={() => setDeleteTarget({ id: r.id, name: r.customer_name })}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ borderRadius: 20, padding: '28px 24px 24px' }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🗑️</div>
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Delete Receipt?</h3>
              <p style={{ fontSize: 15, color: 'var(--grey)', lineHeight: 1.5 }}>
                This will permanently delete the receipt for<br />
                <strong style={{ color: 'var(--dark)' }}>{deleteTarget.name || '(No name)'}</strong>.<br />
                This action cannot be undone.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                className="btn btn-danger btn-full"
                style={{ fontSize: 17, minHeight: 56 }}
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete Receipt'}
              </button>
              <button
                className="btn btn-outline btn-full"
                style={{ fontSize: 17, minHeight: 52, color: 'var(--info)', borderColor: 'transparent', background: 'var(--light)' }}
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Report Modal */}
      {showReportModal && (
        <div className="modal-overlay" onClick={() => setShowReportModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h3>Email Report</h3>
                <p>Select a date range and send to your email.</p>
              </div>
              <button className="btn btn-ghost" style={{ minHeight: 0, padding: '4px 8px', fontSize: 18 }} onClick={() => setShowReportModal(false)}>✕</button>
            </div>
            <div className="form-group">
              <label>From Date</label>
              <input type="date" value={reportFrom} onChange={e => setReportFrom(e.target.value)} style={{ fontSize: 16 }} />
            </div>
            <div className="form-group">
              <label>To Date</label>
              <input type="date" value={reportTo} onChange={e => setReportTo(e.target.value)} style={{ fontSize: 16 }} />
            </div>
            <button className="btn btn-primary btn-full" style={{ marginTop: 8, minHeight: 56, fontSize: 17 }} onClick={handleSendReport} disabled={reportSending || !reportFrom || !reportTo}>
              {reportSending ? 'Sending...' : '✉ Send Report'}
            </button>
          </div>
        </div>
      )}

      {toast.msg && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
