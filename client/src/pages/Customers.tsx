import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchCustomers, getCustomer } from '../api';

interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  created_at: string;
}

interface CustomerDetail extends Customer {
  receipts: Array<{
    id: string;
    receipt_no: string;
    date: string;
    total_amount: number;
    status: string;
    payment_method: string;
  }>;
}

export default function Customers() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<CustomerDetail | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  const doSearch = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const results = await searchCustomers(q);
      setCustomers(results);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  // Load all customers on mount, debounce search
  useEffect(() => {
    const t = setTimeout(() => doSearch(search), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [search, doSearch]);

  const openCustomer = async (id: string) => {
    setModalLoading(true);
    setSelected({ id, name: '', phone: '', address: '', created_at: '', receipts: [] });
    try {
      const data = await getCustomer(id);
      setSelected(data);
    } catch { setSelected(null); } finally {
      setModalLoading(false);
    }
  };

  const totalValue = selected?.receipts.reduce((s, r) => s + parseFloat(String(r.total_amount || 0)), 0) ?? 0;

  return (
    <div className="app-shell">
      {/* Nav */}
      <div className="topbar">
        <h1>Customers</h1>
        <div className="topbar-actions">
          <button className="btn btn-ghost" style={{ minHeight: 0, padding: '6px 14px', fontSize: 15, fontWeight: 600 }} onClick={() => navigate('/')}>
            Dashboard
          </button>
        </div>
      </div>

      <div className="page" style={{ paddingTop: 80 }}>
        {/* Search */}
        <div className="form-group" style={{ marginBottom: 20 }}>
          <input
            type="search"
            placeholder="Search by name or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ fontSize: 17, padding: '14px 18px' }}
            autoFocus
          />
        </div>

        {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--grey)' }}>Searching...</div>}

        {!loading && customers.length === 0 && (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--grey)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>👥</div>
            <div style={{ fontSize: 16 }}>{search ? 'No customers found' : 'No customers yet'}</div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {customers.map(c => (
            <div
              key={c.id}
              onClick={() => openCustomer(c.id)}
              style={{
                background: '#fff', borderRadius: 14, padding: '16px 18px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 14,
                transition: 'transform 0.1s',
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 22, background: 'var(--navy)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#D4AF37', fontSize: 18, fontWeight: 800, flexShrink: 0,
              }}>
                {c.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1C1C1E' }}>{c.name}</div>
                {c.phone && <div style={{ fontSize: 13, color: '#8E8E93', marginTop: 2 }}>{c.phone}</div>}
                {c.address && <div style={{ fontSize: 12, color: '#AEAEB2', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.address.split('\n')[0]}</div>}
              </div>
              <div style={{ color: '#C7C7CC', fontSize: 18 }}>›</div>
            </div>
          ))}
        </div>
      </div>

      {/* Customer detail modal */}
      {selected && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }} onClick={() => setSelected(null)}>
          <div
            style={{
              background: '#F2F2F7', borderRadius: '20px 20px 0 0', width: '100%',
              maxHeight: '85vh', overflow: 'auto', padding: '0 0 40px',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: '#C7C7CC' }} />
            </div>

            {modalLoading ? (
              <div style={{ textAlign: 'center', padding: 60, color: 'var(--grey)' }}>Loading...</div>
            ) : (
              <>
                {/* Customer header */}
                <div style={{ padding: '16px 20px 20px', background: '#fff', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: 28, background: '#1C1C1E',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#D4AF37', fontSize: 24, fontWeight: 800,
                    }}>
                      {selected.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#1C1C1E' }}>{selected.name}</div>
                      {selected.phone && <div style={{ fontSize: 14, color: '#8E8E93', marginTop: 2 }}>{selected.phone}</div>}
                    </div>
                  </div>
                  {selected.address && (
                    <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5, padding: '10px 12px', background: '#F9F9F9', borderRadius: 8 }}>
                      {selected.address}
                    </div>
                  )}

                  {/* Summary stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
                    <div style={{ background: '#F2F2F7', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: '#1C1C1E' }}>{selected.receipts.length}</div>
                      <div style={{ fontSize: 11, color: '#8E8E93', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Receipts</div>
                    </div>
                    <div style={{ background: '#F2F2F7', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: '#1C1C1E' }}>£{totalValue.toFixed(2)}</div>
                      <div style={{ fontSize: 11, color: '#8E8E93', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Value</div>
                    </div>
                  </div>
                </div>

                {/* Receipts list */}
                <div style={{ padding: '0 16px' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10, paddingLeft: 4 }}>
                    Transaction History
                  </div>
                  {selected.receipts.length === 0 && (
                    <div style={{ textAlign: 'center', padding: 32, color: 'var(--grey)' }}>No receipts yet</div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selected.receipts.map(r => (
                      <div key={r.id} style={{
                        background: '#fff', borderRadius: 12, padding: '14px 16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: '#1C1C1E' }}>No. {r.receipt_no}</div>
                          <div style={{ fontSize: 12, color: '#8E8E93', marginTop: 3 }}>
                            {r.date ? new Date(r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                            {' · '}
                            <span style={{ textTransform: 'capitalize' }}>{r.payment_method || 'cash'}</span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 17, fontWeight: 800, color: '#1C1C1E' }}>£{parseFloat(String(r.total_amount || 0)).toFixed(2)}</div>
                          <div style={{
                            fontSize: 11, fontWeight: 700, marginTop: 3, textTransform: 'uppercase',
                            color: r.status === 'sent' ? '#34C759' : r.status === 'draft' ? '#FF9500' : '#8E8E93',
                          }}>{r.status}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
