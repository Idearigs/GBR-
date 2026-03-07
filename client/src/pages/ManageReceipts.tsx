import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getReceipts, deleteReceipt, sendReport } from '../api';
import type { Receipt } from '../types';

function useToast() {
  const [msg, setMsg] = useState('');
  const [type, setType] = useState('');
  const show = (m: string, t = '') => { setMsg(m); setType(t); setTimeout(() => setMsg(''), 3500); };
  return { msg, type, show };
}

export default function ManageReceipts() {
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [reportSending, setReportSending] = useState(false);
  const toast = useToast();

  useEffect(() => { load(); }, [page, search]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getReceipts(page, search);
      setReceipts(data.receipts);
      setTotal(data.total);
    } catch (e: any) {
      toast.show(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete receipt for ${name}? This cannot be undone.`)) return;
    try {
      await deleteReceipt(id);
      toast.show('Receipt deleted', 'success');
      load();
    } catch {
      toast.show('Delete failed', 'error');
    }
  };

  const handleExport = async () => {
    const token = localStorage.getItem('gbr_token');
    const r = await fetch('/api/receipts/export', { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) { toast.show('Export failed', 'error'); return; }
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `receipts-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleSendReport = async () => {
    setReportSending(true);
    try {
      await sendReport();
      toast.show('Quarterly report sent to email!', 'success');
    } catch (e: any) {
      toast.show(e.message || 'Failed to send report', 'error');
    } finally {
      setReportSending(false);
    }
  };

  const totalPages = Math.ceil(total / 50);
  const statusClass = (s: string) => `status-${s}`;

  return (
    <div className="app-shell">
      <div className="topbar">
        <button className="btn btn-ghost" style={{ color: '#aaa', minHeight: 0, padding: '6px 8px', fontSize: 14 }} onClick={() => navigate('/')}>
          ← Home
        </button>
        <h1 style={{ fontSize: 16 }}>All Receipts</h1>
        <div className="topbar-actions">
          <button
            className="btn btn-outline"
            style={{ color: '#fff', borderColor: '#555', minHeight: 0, padding: '8px 12px', fontSize: 13 }}
            onClick={handleExport}
          >
            CSV
          </button>
          <button
            className="btn btn-outline"
            style={{ color: '#D4AF37', borderColor: '#D4AF37', minHeight: 0, padding: '8px 12px', fontSize: 13 }}
            onClick={handleSendReport}
            disabled={reportSending}
          >
            {reportSending ? '...' : 'Report'}
          </button>
        </div>
      </div>

      <div className="page">
        {/* Search */}
        <div className="form-group">
          <input
            type="text"
            placeholder="Search by name or receipt no..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ fontSize: 16 }}
          />
        </div>

        <div className="flex-between mb-16">
          <p style={{ color: 'var(--grey)', fontSize: 13 }}>{total} receipt{total !== 1 ? 's' : ''}</p>
          <button className="btn btn-primary" style={{ padding: '10px 16px', fontSize: 14 }} onClick={() => navigate('/new')}>
            + New
          </button>
        </div>

        {loading ? (
          <div className="spinner" />
        ) : receipts.length === 0 ? (
          <div className="text-center text-grey" style={{ padding: 40 }}>
            <p>{search ? 'No receipts match your search.' : 'No receipts yet.'}</p>
          </div>
        ) : (
          <div className="receipt-list">
            {receipts.map(r => (
              <div key={r.id} className="receipt-card" style={{ flexDirection: 'column', alignItems: 'stretch', cursor: 'default' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <h3 style={{ fontSize: 17 }}>{r.customer_name || '(No name)'}</h3>
                    <p style={{ color: 'var(--grey)', fontSize: 13, marginTop: 3 }}>
                      No:{r.receipt_no} · {r.date ? new Date(r.date).toLocaleDateString('en-GB') : '—'}
                      {r.customer_phone ? ` · ${r.customer_phone}` : ''}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>
                      £{parseFloat(String(r.total_amount || 0)).toFixed(2)}
                    </div>
                    <span className={`status-pill ${statusClass(r.status)}`}>{r.status}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                  <a
                    href={`/r/${(r as any).public_token}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-outline"
                    style={{ flex: 1, padding: '8px 12px', fontSize: 13, minHeight: 0, textAlign: 'center' }}
                  >
                    View
                  </a>
                  <button
                    className="btn btn-outline"
                    style={{ flex: 1, padding: '8px 12px', fontSize: 13, minHeight: 0 }}
                    onClick={() => {
                      const link = `${window.location.origin}/r/${(r as any).public_token}`;
                      navigator.clipboard?.writeText(link);
                      toast.show('Link copied!');
                    }}
                  >
                    Copy Link
                  </button>
                  <button
                    className="btn btn-danger"
                    style={{ padding: '8px 14px', fontSize: 13, minHeight: 0 }}
                    onClick={() => handleDelete(r.id, r.customer_name)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex-row mt-24" style={{ justifyContent: 'center', gap: 8 }}>
            <button className="btn btn-outline" style={{ minHeight: 0, padding: '10px 16px' }} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
              ← Prev
            </button>
            <span style={{ padding: '10px 16px', color: 'var(--grey)', fontSize: 14 }}>{page} / {totalPages}</span>
            <button className="btn btn-outline" style={{ minHeight: 0, padding: '10px 16px' }} onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
              Next →
            </button>
          </div>
        )}
      </div>

      {toast.msg && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
