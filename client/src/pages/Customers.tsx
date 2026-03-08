import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchCustomers, getCustomer } from '../api';

interface Customer {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  created_at?: string;
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

const avatarColors = ['#1C1C1E', '#2C2C2E', '#3A3A3C'];

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

  useEffect(() => {
    const t = setTimeout(() => doSearch(search), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [search, doSearch]);

  const openCustomer = async (id: string) => {
    setModalLoading(true);
    setSelected({ id, name: '', receipts: [] } as any);
    try {
      const data = await getCustomer(id);
      setSelected(data);
    } catch { setSelected(null); } finally {
      setModalLoading(false);
    }
  };

  const totalValue = selected?.receipts.reduce((s, r) => s + parseFloat(String(r.total_amount || 0)), 0) ?? 0;

  return (
    <div style={{ background: '#F2F2F7', minHeight: '100vh', fontFamily: "-apple-system, 'SF Pro Display', BlinkMacSystemFont, sans-serif" }}>

      {/* Topbar */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(60,60,67,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', height: 56,
      }}>
        <span style={{ fontSize: 17, fontWeight: 700, color: '#1C1C1E' }}>Customers</span>
        <button
          onClick={() => navigate('/')}
          style={{ background: 'none', border: 'none', color: '#007AFF', fontSize: 15, fontWeight: 600, cursor: 'pointer', padding: '8px 0' }}
        >
          ← Dashboard
        </button>
      </div>

      <div style={{ paddingTop: 72, paddingBottom: 40, maxWidth: 680, margin: '0 auto', padding: '72px 16px 40px' }}>

        {/* Header stat */}
        {!search && customers.length > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, #1C1C1E 0%, #3A3A3C 100%)',
            borderRadius: 18, padding: '20px 24px', marginBottom: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: 13, color: '#8E8E93', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Customers</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: '#fff', marginTop: 4 }}>{customers.length}</div>
            </div>
            <div style={{ fontSize: 44, opacity: 0.3 }}>👥</div>
          </div>
        )}

        {/* Search bar */}
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#8E8E93' }}
            width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: '#fff', border: 'none', borderRadius: 14,
              padding: '14px 16px 14px 42px', fontSize: 16, color: '#1C1C1E',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)', outline: 'none',
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{
              position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
              background: '#AEAEB2', border: 'none', borderRadius: '50%',
              width: 18, height: 18, color: '#fff', fontSize: 11, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
            }}>✕</button>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 48, color: '#8E8E93' }}>
            <div style={{ fontSize: 14 }}>Searching...</div>
          </div>
        )}

        {/* Empty state */}
        {!loading && customers.length === 0 && (
          <div style={{ textAlign: 'center', padding: '64px 24px' }}>
            <div style={{
              width: 72, height: 72, borderRadius: 36, background: '#E5E5EA',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px', fontSize: 32,
            }}>👤</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1C1C1E', marginBottom: 6 }}>
              {search ? 'No results found' : 'No customers yet'}
            </div>
            <div style={{ fontSize: 14, color: '#8E8E93' }}>
              {search ? `No customers match "${search}"` : 'Customers appear here after a receipt is created'}
            </div>
          </div>
        )}

        {/* Customer list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {customers.map((c, i) => (
            <div
              key={c.id}
              onClick={() => openCustomer(c.id)}
              style={{
                background: '#fff', borderRadius: 16, padding: '16px 18px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.05)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 14,
                transition: 'opacity 0.15s',
              }}
            >
              <div style={{
                width: 46, height: 46, borderRadius: 23,
                background: avatarColors[i % avatarColors.length],
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#D4AF37', fontSize: 19, fontWeight: 800, flexShrink: 0,
              }}>
                {c.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1C1C1E' }}>{c.name}</div>
                <div style={{ fontSize: 13, color: '#8E8E93', marginTop: 3 }}>
                  {c.phone || 'No phone'}
                  {c.address && <span style={{ color: '#AEAEB2' }}> · {c.address.split('\n')[0]}</span>}
                </div>
              </div>
              <svg width="8" height="14" viewBox="0 0 8 14" fill="none">
                <path d="M1 1l6 6-6 6" stroke="#C7C7CC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          ))}
        </div>
      </div>

      {/* Customer detail bottom sheet */}
      {selected && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setSelected(null)}
        >
          <div
            style={{
              background: '#F2F2F7', borderRadius: '24px 24px 0 0', width: '100%',
              maxHeight: '88vh', overflow: 'auto', paddingBottom: 40,
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 8px' }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: '#D1D1D6' }} />
            </div>

            {modalLoading ? (
              <div style={{ textAlign: 'center', padding: 64, color: '#8E8E93', fontSize: 15 }}>Loading...</div>
            ) : (
              <>
                {/* Customer header card */}
                <div style={{ margin: '0 16px 12px', background: '#fff', borderRadius: 18, padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                    <div style={{
                      width: 60, height: 60, borderRadius: 30, background: '#1C1C1E',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#D4AF37', fontSize: 26, fontWeight: 800, flexShrink: 0,
                    }}>
                      {selected.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: '#1C1C1E' }}>{selected.name}</div>
                      {selected.phone && (
                        <div style={{ fontSize: 14, color: '#8E8E93', marginTop: 3 }}>{selected.phone}</div>
                      )}
                    </div>
                  </div>

                  {selected.address && (
                    <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6, background: '#F9F9F9', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
                      {selected.address}
                    </div>
                  )}

                  {/* Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div style={{ background: '#F2F2F7', borderRadius: 12, padding: '14px', textAlign: 'center' }}>
                      <div style={{ fontSize: 26, fontWeight: 800, color: '#1C1C1E' }}>{selected.receipts.length}</div>
                      <div style={{ fontSize: 11, color: '#8E8E93', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>Receipts</div>
                    </div>
                    <div style={{ background: 'linear-gradient(135deg, #B8860B, #D4AF37)', borderRadius: 12, padding: '14px', textAlign: 'center' }}>
                      <div style={{ fontSize: 26, fontWeight: 800, color: '#fff' }}>£{totalValue.toFixed(0)}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>Total Value</div>
                    </div>
                  </div>
                </div>

                {/* Receipts */}
                <div style={{ padding: '0 16px' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10, paddingLeft: 4 }}>
                    Transaction History
                  </div>

                  {selected.receipts.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '32px 0', color: '#8E8E93', fontSize: 14 }}>No receipts yet</div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selected.receipts.map(r => (
                      <div key={r.id} style={{
                        background: '#fff', borderRadius: 14, padding: '14px 18px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: '#1C1C1E' }}>No. {r.receipt_no}</div>
                          <div style={{ fontSize: 12, color: '#8E8E93', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                            {r.date ? new Date(r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                            <span style={{
                              background: r.payment_method === 'card' ? '#E8F0FE' : '#E9F7EF',
                              color: r.payment_method === 'card' ? '#007AFF' : '#34C759',
                              borderRadius: 6, padding: '2px 7px', fontSize: 11, fontWeight: 700,
                              textTransform: 'capitalize',
                            }}>{r.payment_method || 'cash'}</span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 18, fontWeight: 800, color: '#1C1C1E' }}>
                            £{parseFloat(String(r.total_amount || 0)).toFixed(2)}
                          </div>
                          <div style={{
                            fontSize: 11, fontWeight: 700, marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.3px',
                            color: r.status === 'sent' ? '#34C759' : r.status === 'signed' ? '#007AFF' : '#FF9500',
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
