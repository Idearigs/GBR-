import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer } from '../api';

interface Customer { id: string; name: string; phone?: string; address?: string; created_at?: string; }
interface CustomerDetail extends Customer {
  receipts: Array<{ id: string; receipt_no: string; date: string; total_amount: number; status: string; payment_method: string; }>;
}

const EMPTY_FORM = { name: '', phone: '', address: '' };
const avatarColors = ['#1C1C1E', '#2C2C2E', '#3A3A3C'];

function CustomerFormModal({ title, initial, onSave, onClose, saving }: {
  title: string; initial: typeof EMPTY_FORM;
  onSave: (f: typeof EMPTY_FORM) => void; onClose: () => void; saving: boolean;
}) {
  const [form, setForm] = useState(initial);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ background: '#F2F2F7', borderRadius: '24px 24px 0 0', width: '100%', padding: '0 0 40px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 8px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: '#D1D1D6' }} />
        </div>
        <div style={{ padding: '4px 20px 20px' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#1C1C1E', marginBottom: 20 }}>{title}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Full Name *</div>
              <input value={form.name} onChange={e => set('name', e.target.value)}
                placeholder="e.g. John Smith"
                style={{ width: '100%', boxSizing: 'border-box', padding: '14px 16px', borderRadius: 12, border: '1.5px solid #E5E5EA', fontSize: 16, outline: 'none', background: '#fff' }} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Phone Number</div>
              <input value={form.phone} onChange={e => set('phone', e.target.value)}
                placeholder="e.g. 07700 900000" type="tel"
                style={{ width: '100%', boxSizing: 'border-box', padding: '14px 16px', borderRadius: 12, border: '1.5px solid #E5E5EA', fontSize: 16, outline: 'none', background: '#fff' }} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Address</div>
              <textarea value={form.address} onChange={e => set('address', e.target.value)}
                placeholder="Street, City, Postcode" rows={3}
                style={{ width: '100%', boxSizing: 'border-box', padding: '14px 16px', borderRadius: 12, border: '1.5px solid #E5E5EA', fontSize: 16, outline: 'none', background: '#fff', resize: 'none' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '15px', borderRadius: 14, border: 'none', background: '#E5E5EA', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            <button onClick={() => onSave(form)} disabled={saving || !form.name.trim()} style={{
              flex: 2, padding: '15px', borderRadius: 14, border: 'none',
              background: !form.name.trim() ? '#C7C7CC' : '#007AFF',
              color: '#fff', fontSize: 16, fontWeight: 700, cursor: form.name.trim() ? 'pointer' : 'not-allowed',
              opacity: saving ? 0.7 : 1,
            }}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Customers() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<CustomerDetail | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const doSearch = useCallback(async (q: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await searchCustomers(q);
      setCustomers(res.data);
      setTotalCount(res.total);
    }
    catch (e: any) { setError(e.message || 'Failed to load customers'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => doSearch(search), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [search, doSearch]);

  const openCustomer = async (id: string) => {
    setModalLoading(true);
    setSelected({ id, name: '', receipts: [] } as any);
    try { setSelected(await getCustomer(id)); }
    catch { setSelected(null); } finally { setModalLoading(false); }
  };

  const handleAdd = async (form: typeof EMPTY_FORM) => {
    setAddSaving(true);
    try { await createCustomer(form); setShowAdd(false); doSearch(search); }
    catch { /* ignore */ } finally { setAddSaving(false); }
  };

  const handleEdit = async (form: typeof EMPTY_FORM) => {
    if (!selected) return;
    setEditSaving(true);
    try {
      const updated = await updateCustomer(selected.id, form);
      setSelected({ ...selected, ...updated });
      setShowEdit(false);
      doSearch(search);
    } catch { /* ignore */ } finally { setEditSaving(false); }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      await deleteCustomer(selected.id);
      setSelected(null); setDeleteConfirm(false); doSearch(search);
    } catch { /* ignore */ } finally { setDeleting(false); }
  };

  const totalValue = selected?.receipts.reduce((s, r) => s + parseFloat(String(r.total_amount || 0)), 0) ?? 0;

  return (
    <div style={{ background: '#F2F2F7', minHeight: '100vh', fontFamily: "-apple-system, 'SF Pro Display', BlinkMacSystemFont, sans-serif" }}>

      {/* Topbar */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(60,60,67,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', height: 56,
      }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: '#007AFF', fontSize: 15, fontWeight: 600, cursor: 'pointer', padding: '8px 0' }}>
          ← Dashboard
        </button>
        <span style={{ fontSize: 17, fontWeight: 700, color: '#1C1C1E' }}>Customers</span>
        <button onClick={() => setShowAdd(true)} style={{
          background: '#007AFF', border: 'none', borderRadius: 20,
          padding: '7px 16px', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
        }}>+ Add</button>
      </div>

      <div style={{ paddingTop: 72, paddingBottom: 40, maxWidth: 680, margin: '0 auto', padding: '72px 16px 40px' }}>

        {/* Stat card */}
        {totalCount > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, #1C1C1E 0%, #3A3A3C 100%)',
            borderRadius: 18, padding: '20px 24px', marginBottom: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: 13, color: '#8E8E93', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Customers</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: '#fff', marginTop: 4 }}>{totalCount.toLocaleString()}</div>
              {search && <div style={{ fontSize: 12, color: '#8E8E93', marginTop: 2 }}>Showing {customers.length} of {totalCount.toLocaleString()} matching</div>}
              {!search && customers.length < totalCount && <div style={{ fontSize: 12, color: '#8E8E93', marginTop: 2 }}>Showing first {customers.length} — search to find specific customers</div>}
            </div>
            <div style={{ fontSize: 44, opacity: 0.25 }}>👤</div>
          </div>
        )}

        {/* Search bar */}
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#8E8E93' }}
            width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text" placeholder="Search by name or phone..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: '#fff', border: 'none', borderRadius: 14,
              padding: '14px 40px 14px 42px', fontSize: 16, color: '#1C1C1E',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)', outline: 'none',
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{
              position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
              background: '#AEAEB2', border: 'none', borderRadius: '50%',
              width: 20, height: 20, color: '#fff', fontSize: 12, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
            }}>✕</button>
          )}
        </div>

        {loading && <div style={{ textAlign: 'center', padding: 48, color: '#8E8E93', fontSize: 14 }}>Loading...</div>}

        {error && (
          <div style={{ background: '#FFF0F0', border: '1px solid #FFCDD2', borderRadius: 12, padding: '14px 16px', marginBottom: 16, color: '#FF3B30', fontSize: 14 }}>
            ⚠️ {error}
          </div>
        )}

        {!loading && !error && customers.length === 0 && (
          <div style={{ textAlign: 'center', padding: '64px 24px' }}>
            <div style={{
              width: 72, height: 72, borderRadius: 36, background: '#E5E5EA',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px', fontSize: 32,
            }}>👤</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1C1C1E', marginBottom: 6 }}>
              {search ? 'No results found' : 'No customers yet'}
            </div>
            <div style={{ fontSize: 14, color: '#8E8E93', marginBottom: 24 }}>
              {search ? `No customers match "${search}"` : 'Add your first customer to get started'}
            </div>
            {!search && (
              <button onClick={() => setShowAdd(true)} style={{
                background: '#007AFF', color: '#fff', border: 'none', borderRadius: 14,
                padding: '14px 28px', fontSize: 16, fontWeight: 700, cursor: 'pointer',
              }}>+ Add Customer</button>
            )}
          </div>
        )}

        {/* Customer list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {customers.map((c, i) => (
            <div key={c.id} style={{
              background: '#fff', borderRadius: 16, padding: '14px 16px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              {/* Avatar — tap to open detail */}
              <div onClick={() => openCustomer(c.id)} style={{
                width: 46, height: 46, borderRadius: 23,
                background: avatarColors[i % avatarColors.length],
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#D4AF37', fontSize: 19, fontWeight: 800, flexShrink: 0, cursor: 'pointer',
              }}>{c.name.charAt(0).toUpperCase()}</div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => openCustomer(c.id)}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1C1C1E' }}>{c.name}</div>
                <div style={{ fontSize: 13, color: '#8E8E93', marginTop: 2 }}>
                  {c.phone || 'No phone'}
                  {c.address && <span style={{ color: '#AEAEB2' }}> · {c.address.split('\n')[0]}</span>}
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={() => openCustomer(c.id).then(() => setShowEdit(true))} style={{
                  background: '#F0F6FF', border: 'none', borderRadius: 10,
                  padding: '8px 12px', fontSize: 13, fontWeight: 600, color: '#007AFF', cursor: 'pointer',
                }}>Edit</button>
                <button onClick={async () => { await openCustomer(c.id); setDeleteConfirm(true); }} style={{
                  background: '#FFF0F0', border: 'none', borderRadius: 10,
                  padding: '8px 12px', fontSize: 13, fontWeight: 600, color: '#FF3B30', cursor: 'pointer',
                }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Customer modal */}
      {showAdd && (
        <CustomerFormModal
          title="New Customer"
          initial={EMPTY_FORM}
          onSave={handleAdd}
          onClose={() => setShowAdd(false)}
          saving={addSaving}
        />
      )}

      {/* Edit Customer modal */}
      {showEdit && selected && (
        <CustomerFormModal
          title="Edit Customer"
          initial={{ name: selected.name || '', phone: selected.phone || '', address: selected.address || '' }}
          onSave={handleEdit}
          onClose={() => setShowEdit(false)}
          saving={editSaving}
        />
      )}

      {/* Delete confirm */}
      {deleteConfirm && selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 340, textAlign: 'center' }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🗑️</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#1C1C1E', marginBottom: 8 }}>Delete Customer?</div>
            <div style={{ fontSize: 14, color: '#8E8E93', marginBottom: 24, lineHeight: 1.6 }}>
              This will permanently delete <strong>{selected.name}</strong>. Their receipts will remain but won't be linked. This cannot be undone.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteConfirm(false)} style={{ flex: 1, padding: '14px', borderRadius: 12, border: 'none', background: '#F2F2F7', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleDelete} disabled={deleting} style={{ flex: 1, padding: '14px', borderRadius: 12, border: 'none', background: '#FF3B30', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: deleting ? 0.7 : 1 }}>
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer detail bottom sheet */}
      {selected && !showEdit && !deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setSelected(null)}>
          <div style={{ background: '#F2F2F7', borderRadius: '24px 24px 0 0', width: '100%', maxHeight: '88vh', overflow: 'auto', paddingBottom: 40 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 8px' }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: '#D1D1D6' }} />
            </div>

            {modalLoading ? (
              <div style={{ textAlign: 'center', padding: 64, color: '#8E8E93', fontSize: 15 }}>Loading...</div>
            ) : (
              <>
                <div style={{ margin: '0 16px 12px', background: '#fff', borderRadius: 18, padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                    <div style={{ width: 60, height: 60, borderRadius: 30, background: '#1C1C1E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D4AF37', fontSize: 26, fontWeight: 800 }}>
                      {selected.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: '#1C1C1E' }}>{selected.name}</div>
                      {selected.phone && <div style={{ fontSize: 14, color: '#8E8E93', marginTop: 3 }}>{selected.phone}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => setShowEdit(true)} style={{ background: '#F0F6FF', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 600, color: '#007AFF', cursor: 'pointer' }}>Edit</button>
                      <button onClick={() => setDeleteConfirm(true)} style={{ background: '#FFF0F0', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 600, color: '#FF3B30', cursor: 'pointer' }}>Delete</button>
                    </div>
                  </div>
                  {selected.address && (
                    <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6, background: '#F9F9F9', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>{selected.address}</div>
                  )}
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

                <div style={{ padding: '0 16px' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10, paddingLeft: 4 }}>Transaction History</div>
                  {selected.receipts.length === 0 && <div style={{ textAlign: 'center', padding: '32px 0', color: '#8E8E93', fontSize: 14 }}>No receipts yet</div>}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selected.receipts.map(r => (
                      <div key={r.id} style={{ background: '#fff', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: '#1C1C1E' }}>No. {r.receipt_no}</div>
                          <div style={{ fontSize: 12, color: '#8E8E93', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                            {r.date ? new Date(r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                            <span style={{ background: r.payment_method === 'card' ? '#E8F0FE' : '#E9F7EF', color: r.payment_method === 'card' ? '#007AFF' : '#34C759', borderRadius: 6, padding: '2px 7px', fontSize: 11, fontWeight: 700, textTransform: 'capitalize' }}>{r.payment_method || 'cash'}</span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 18, fontWeight: 800, color: '#1C1C1E' }}>£{parseFloat(String(r.total_amount || 0)).toFixed(2)}</div>
                          <div style={{ fontSize: 11, fontWeight: 700, marginTop: 3, textTransform: 'uppercase', color: r.status === 'sent' ? '#34C759' : r.status === 'signed' ? '#007AFF' : '#FF9500' }}>{r.status}</div>
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
