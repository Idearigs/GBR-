import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createReceipt, updateReceipt, sendSMS, uploadIdImage, getIdImageUrl, searchCustomers, updateCustomer } from '../api';
import type { ReceiptItem } from '../types';

type Step = 'find-customer' | 'new-customer' | 'receipt' | 'id' | 'items' | 'sign' | 'done';

// ──────────────────────────────────────────────────────
// Toast hook
// ──────────────────────────────────────────────────────
function useToast() {
  const [msg, setMsg] = useState('');
  const [type, setType] = useState('');
  const show = (m: string, t = '') => {
    setMsg(m); setType(t);
    setTimeout(() => setMsg(''), 3500);
  };
  return { msg, type, show };
}

// ──────────────────────────────────────────────────────
// Step 0 — Owner: Find existing customer
// ──────────────────────────────────────────────────────
function StepFindCustomer({ onSelect, onNewCustomer }: {
  onSelect: (c: { id: string; name: string; phone: string; address: string }) => void;
  onNewCustomer: () => void;
}) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Array<{ id: string; name: string; phone: string; address: string }>>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<{ id: string; name: string; phone: string; address: string } | null>(null);
  const [addressDraft, setAddressDraft] = useState('');
  const [savingAddress, setSavingAddress] = useState(false);

  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try { const res = await searchCustomers(q); setResults(res.data); }
      catch { setResults([]); } finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const handleSelect = (c: { id: string; name: string; phone: string; address: string }) => {
    setSelected(c);
    setAddressDraft('');
    setResults([]);
  };

  const handleSaveAndContinue = async () => {
    if (!selected) return;
    setSavingAddress(true);
    try {
      await updateCustomer(selected.id, { name: selected.name, phone: selected.phone, address: addressDraft });
    } catch { /* proceed anyway */ } finally {
      setSavingAddress(false);
    }
    onSelect({ ...selected, address: addressDraft });
  };

  const needsAddress = selected && !selected.address;

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', minHeight: '70vh' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>👤</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Find Customer</h2>
        <p style={{ color: 'var(--grey)', fontSize: 15 }}>Search by name or phone number</p>
      </div>

      {selected ? (
        <div style={{ background: 'var(--success-pale)', border: '2px solid var(--success)', borderRadius: 14, padding: '16px 18px', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--dark)' }}>{selected.name}</div>
              {selected.phone && <div style={{ fontSize: 14, color: 'var(--grey)', marginTop: 3 }}>{selected.phone}</div>}
              {selected.address && <div style={{ fontSize: 13, color: 'var(--grey)', marginTop: 2 }}>{selected.address.split('\n')[0]}</div>}
            </div>
            <button onClick={() => { setSelected(null); setQ(''); }} style={{ background: 'none', border: 'none', color: 'var(--grey)', fontSize: 20, cursor: 'pointer', padding: 4 }}>✕</button>
          </div>

          {needsAddress && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--dark)', marginBottom: 6 }}>
                📍 No address on file — please add one:
              </div>
              <textarea
                placeholder="Street, City, Postcode"
                value={addressDraft}
                onChange={e => setAddressDraft(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', fontSize: 15, minHeight: 80, borderRadius: 10, border: '1.5px solid var(--border)', padding: '10px 12px', resize: 'vertical' }}
              />
              <button
                className="btn btn-primary btn-full mt-12"
                onClick={handleSaveAndContinue}
                disabled={savingAddress || !addressDraft.trim()}
              >
                {savingAddress ? 'Saving...' : `Save & Continue with ${selected.name.split(' ')[0]} →`}
              </button>
              <button
                className="btn btn-ghost btn-full"
                style={{ marginTop: 8, color: 'var(--grey)', fontSize: 14 }}
                onClick={() => onSelect(selected)}
              >
                Skip address
              </button>
            </div>
          )}

          {!needsAddress && (
            <button className="btn btn-primary btn-full mt-16" onClick={() => onSelect(selected)}>
              Continue with {selected.name.split(' ')[0]} →
            </button>
          )}
        </div>
      ) : (
        <div className="form-group">
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={q}
            onChange={e => { setQ(e.target.value); setSelected(null); }}
            autoComplete="off"
            style={{ fontSize: 17, width: '100%', boxSizing: 'border-box' }}
          />
          {searching && <div style={{ fontSize: 13, color: 'var(--grey)', padding: '6px 4px' }}>Searching...</div>}
          {results.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 12, marginTop: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.12)', overflow: 'hidden', maxHeight: 320, overflowY: 'auto' }}>
              {results.map(c => (
                <div key={c.id} onClick={() => handleSelect(c)}
                  style={{ padding: '14px 16px', borderBottom: '1px solid #F2F2F7', cursor: 'pointer' }}>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{c.name}</div>
                  {c.phone && <div style={{ fontSize: 13, color: '#8E8E93', marginTop: 2 }}>{c.phone}</div>}
                </div>
              ))}
            </div>
          )}
          {q.trim() && !searching && results.length === 0 && (
            <div style={{ fontSize: 14, color: 'var(--grey)', padding: '8px 4px' }}>No customers found for "{q}"</div>
          )}
        </div>
      )}

      <div style={{ marginTop: 'auto', paddingTop: 24, borderTop: '1px solid var(--border)' }}>
        <button
          className="btn btn-full"
          onClick={onNewCustomer}
          style={{
            background: '#F2F2F7', border: 'none', borderRadius: 14,
            padding: '18px 20px', cursor: 'pointer', textAlign: 'left',
            display: 'flex', alignItems: 'center', gap: 14,
          }}
        >
          <span style={{ fontSize: 32 }}>🚶</span>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--dark)' }}>New or walk-in customer</div>
            <div style={{ fontSize: 13, color: 'var(--grey)', marginTop: 2 }}>Not in the system yet? Add them now</div>
          </div>
          <span style={{ marginLeft: 'auto', fontSize: 20, color: 'var(--grey)' }}>→</span>
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────
// Step 1 — Owner: fill in new customer details
// ──────────────────────────────────────────────────────
function StepNewCustomer({ name, phone, address, onChange, onNext, onBack, onSelectExisting }: {
  name: string; phone: string; address: string;
  onChange: (f: string, v: string) => void;
  onNext: () => void; onBack: () => void;
  onSelectExisting: (c: { id: string; name: string; phone: string; address: string }) => void;
}) {
  const [dupCustomer, setDupCustomer] = useState<{ id: string; name: string; phone: string; address: string } | null>(null);

  useEffect(() => {
    const trimmed = phone.trim();
    if (!trimmed || trimmed.length < 7) { setDupCustomer(null); return; }
    const t = setTimeout(async () => {
      try {
        const res = await searchCustomers(trimmed);
        const exact = res.data.find((c: { phone: string }) =>
          c.phone && c.phone.replace(/\s/g, '') === trimmed.replace(/\s/g, '')
        );
        setDupCustomer(exact || null);
      } catch { setDupCustomer(null); }
    }, 500);
    return () => clearTimeout(t);
  }, [phone]);

  return (
    <div className="page">
      <button className="btn btn-ghost" style={{ padding: '8px 0', marginBottom: 20 }} onClick={onBack}>← Back</button>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>New Customer</h2>
      <p style={{ color: 'var(--grey)', fontSize: 14, marginBottom: 24 }}>Enter the customer's details</p>

      <div className="form-group">
        <label>Full Name *</label>
        <input type="text" placeholder="e.g. John Smith" value={name}
          onChange={e => onChange('name', e.target.value)} autoCapitalize="words" style={{ fontSize: 18 }} />
      </div>
      <div className="form-group">
        <label>Phone Number</label>
        <input type="tel" placeholder="07xxx xxxxxx" value={phone}
          onChange={e => onChange('phone', e.target.value)} style={{ fontSize: 18 }} />
      </div>
      <div className="form-group">
        <label>Address</label>
        <textarea placeholder="Street, City, Postcode" value={address}
          onChange={e => onChange('address', e.target.value)} style={{ fontSize: 16, minHeight: 90 }} />
      </div>

      <button className="btn btn-primary btn-full btn-lg mt-16" onClick={onNext} disabled={!name.trim()}>
        Continue →
      </button>

      {/* Duplicate phone popup */}
      {dupCustomer && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          animation: 'fadeIn 0.2s ease both',
        }}>
          <div style={{
            background: '#fff', borderRadius: '20px 20px 0 0', padding: '28px 24px 36px',
            width: '100%', maxWidth: 480,
            animation: 'slideUp 0.3s cubic-bezier(0.22,1,0.36,1) both',
          }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 44, marginBottom: 10 }}>⚠️</div>
              <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Customer already exists</h3>
              <p style={{ color: 'var(--grey)', fontSize: 15 }}>
                This phone number is registered to:
              </p>
              <div style={{ marginTop: 12, background: '#F2F2F7', borderRadius: 12, padding: '12px 16px' }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{dupCustomer.name}</div>
                <div style={{ fontSize: 14, color: 'var(--grey)', marginTop: 3 }}>{dupCustomer.phone}</div>
                {dupCustomer.address && <div style={{ fontSize: 13, color: 'var(--grey)', marginTop: 2 }}>{dupCustomer.address.split('\n')[0]}</div>}
              </div>
            </div>
            <button
              className="btn btn-primary btn-full btn-lg"
              onClick={() => onSelectExisting(dupCustomer)}
            >
              Continue with {dupCustomer.name.split(' ')[0]} →
            </button>
            <button
              className="btn btn-ghost btn-full"
              style={{ marginTop: 10, color: 'var(--grey)' }}
              onClick={() => setDupCustomer(null)}
            >
              Add as new customer anyway
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────
// Step 2 — Owner: receipt date + payment
// ──────────────────────────────────────────────────────
function StepStart({ date, onDateChange, paymentMethod, onPaymentChange, customerName, onNext, onBack }: {
  date: string; onDateChange: (d: string) => void;
  paymentMethod: string; onPaymentChange: (m: string) => void;
  customerName: string;
  onNext: () => void; onBack: () => void;
}) {
  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '70vh' }}>
      <button className="btn btn-ghost" style={{ padding: '8px 0', marginBottom: 20 }} onClick={onBack}>← Back</button>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>🥇</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>New Gold Buying Receipt</h2>
        {customerName && <p style={{ color: 'var(--grey)', fontSize: 15 }}>Customer: <strong>{customerName}</strong></p>}
      </div>

      <div className="form-group">
        <label>Date</label>
        <input type="date" value={date} onChange={e => onDateChange(e.target.value)} />
      </div>

      <div className="form-group">
        <label>Payment Method</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 4 }}>
          <button type="button" onClick={() => onPaymentChange('cash')} style={{
            padding: '20px 16px', borderRadius: 16, border: `2.5px solid ${paymentMethod === 'cash' ? 'var(--success)' : 'var(--border)'}`,
            background: paymentMethod === 'cash' ? 'var(--success-pale)' : 'var(--surface)', cursor: 'pointer', textAlign: 'center',
          }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>💵</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: paymentMethod === 'cash' ? 'var(--success)' : 'var(--dark)' }}>Cash</div>
          </button>
          <button type="button" onClick={() => onPaymentChange('card')} style={{
            padding: '20px 16px', borderRadius: 16, border: `2.5px solid ${paymentMethod === 'card' ? 'var(--info)' : 'var(--border)'}`,
            background: paymentMethod === 'card' ? 'var(--info-pale)' : 'var(--surface)', cursor: 'pointer', textAlign: 'center',
          }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>💳</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: paymentMethod === 'card' ? 'var(--info)' : 'var(--dark)' }}>Card</div>
          </button>
        </div>
      </div>

      <button className="btn btn-primary btn-full btn-lg mt-24" onClick={onNext}>
        Hand Tablet to Customer →
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────────────
// Step 3 — Owner captures customer ID photo
// ──────────────────────────────────────────────────────
function StepIDCapture({ idImageUrl, onCapture, onNext, onBack }: {
  idImageUrl: string;
  onCapture: (url: string) => void;
  onNext: () => void; onBack: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setErr('');
    setUploading(true);
    try {
      const data = await uploadIdImage(file);
      onCapture(data.url);
    } catch (e: any) {
      setErr(e.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="page">
      <button className="btn btn-ghost" style={{ padding: '8px 0', marginBottom: 16 }} onClick={onBack}>← Back</button>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Customer ID Photo</h2>
      <p style={{ color: 'var(--grey)', marginBottom: 28, fontSize: 15 }}>
        Take a clear photo of the customer's ID (passport, driving licence, etc.)
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      {idImageUrl ? (
        <div style={{ marginBottom: 24 }}>
          <img
            src={getIdImageUrl(idImageUrl)}
            alt="Customer ID"
            style={{ width: '100%', maxHeight: 300, objectFit: 'contain', borderRadius: 12, border: '2px solid var(--border)' }}
          />
          <button className="btn btn-outline btn-full mt-16" onClick={() => inputRef.current?.click()}>
            Retake Photo
          </button>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          style={{
            border: '2px dashed var(--border)', borderRadius: 16,
            padding: '60px 20px', textAlign: 'center', cursor: 'pointer',
            marginBottom: 24, background: 'var(--light)'
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 12 }}>📷</div>
          <p style={{ fontSize: 18, fontWeight: 600 }}>Tap to take photo</p>
          <p style={{ fontSize: 14, color: 'var(--grey)', marginTop: 4 }}>or select from gallery</p>
        </div>
      )}

      {uploading && <div className="spinner" />}
      {err && <p style={{ color: 'var(--danger)', marginBottom: 16 }}>{err}</p>}

      <button
        className="btn btn-primary btn-full btn-lg"
        onClick={onNext}
        disabled={uploading}
      >
        {idImageUrl ? 'Continue →' : 'Skip (no ID)'}
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────────────
// Step 3 — Owner fills in items
// ──────────────────────────────────────────────────────
function StepItems({ items, onChange, onNext, onBack }: {
  items: ReceiptItem[];
  onChange: (items: ReceiptItem[]) => void;
  onNext: () => void; onBack: () => void;
}) {
  const addRow = () => onChange([...items, { qty: 1, description: '', pounds: 0, pence: 0 }]);
  const removeRow = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const update = (i: number, field: keyof ReceiptItem, value: string | number) => {
    onChange(items.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  };

  const total = items.reduce((sum, item) => sum + (item.pounds * 100 + item.pence), 0);
  const totalPounds = Math.floor(total / 100);
  const totalPence = total % 100;

  return (
    <div className="page">
      <button className="btn btn-ghost" style={{ padding: '8px 0', marginBottom: 16 }} onClick={onBack}>← Back</button>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 20 }}>Items Being Purchased</h2>

      <div style={{ overflowX: 'auto' }}>
        <table className="items-table">
          <thead>
            <tr>
              <th style={{ width: 60 }}>QTY</th>
              <th>DESCRIPTION</th>
              <th style={{ width: 80 }}>£</th>
              <th style={{ width: 70 }}>p</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i}>
                <td>
                  <input
                    type="number"
                    min="1"
                    value={item.qty}
                    onChange={e => update(i, 'qty', parseInt(e.target.value) || 1)}
                    style={{ width: 55 }}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    placeholder="e.g. Gold ring 18ct"
                    value={item.description}
                    onChange={e => update(i, 'description', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min="0"
                    value={item.pounds}
                    onChange={e => update(i, 'pounds', parseInt(e.target.value) || 0)}
                    style={{ width: 75, textAlign: 'right' }}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={item.pence}
                    onChange={e => update(i, 'pence', Math.min(99, parseInt(e.target.value) || 0))}
                    style={{ width: 60, textAlign: 'right' }}
                  />
                </td>
                <td>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: '6px', color: 'var(--danger)', minHeight: 0, fontSize: 18 }}
                    onClick={() => removeRow(i)}
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button className="btn btn-outline mt-16" onClick={addRow}>+ Add Item</button>

      <div className="total-row">
        <span className="total-label">Total £</span>
        <span className="total-amount">{totalPounds}.{String(totalPence).padStart(2, '0')}</span>
      </div>

      <button
        className="btn btn-primary btn-full btn-lg mt-16"
        onClick={onNext}
        disabled={items.length === 0 || items.some(i => !i.description.trim())}
      >
        Continue to Signature →
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────────────
// Step 4 — Customer signature (full screen)
// ──────────────────────────────────────────────────────
function StepSignature({ onSave, onBack }: {
  onSave: (dataUrl: string) => void;
  onBack: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasSig, setHasSig] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement!;
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  useEffect(() => {
    setupCanvas();
    window.addEventListener('resize', setupCanvas);

    // Register touch listeners as non-passive so preventDefault() works on mobile
    const canvas = canvasRef.current;
    if (canvas) {
      const prevent = (e: TouchEvent) => e.preventDefault();
      canvas.addEventListener('touchstart', prevent, { passive: false });
      canvas.addEventListener('touchmove', prevent, { passive: false });
      return () => {
        window.removeEventListener('resize', setupCanvas);
        canvas.removeEventListener('touchstart', prevent);
        canvas.removeEventListener('touchmove', prevent);
      };
    }
    return () => window.removeEventListener('resize', setupCanvas);
  }, [setupCanvas]);

  const getPos = (e: React.TouchEvent | React.MouseEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const startDraw = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current!;
    const pos = getPos(e, canvas);
    lastPos.current = pos;
    setDrawing(true);
    setHasSig(true);
  };

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!drawing || !lastPos.current) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  };

  const endDraw = () => { setDrawing(false); lastPos.current = null; };

  const clear = () => {
    const canvas = canvasRef.current!;
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
    setHasSig(false);
  };

  const save = () => {
    if (!hasSig) return;
    const canvas = canvasRef.current!;
    onSave(canvas.toDataURL('image/png'));
  };

  return (
    <div className="signature-screen">
      <div className="signature-legal">
        <p style={{ fontSize: 13, marginBottom: 8, fontWeight: 700 }}>Please read and sign below:</p>
        <p>
          I hereby certify this is my own property and I have the right to sell being the lawful owner
          of the goods, declare them to be free of all hire purchase and custom duty liabilities and
          accept the agreed sale price.
        </p>
      </div>

      <div className="signature-canvas-wrap">
        {!hasSig && (
          <div className="signature-label">
            <div style={{ fontSize: 36, marginBottom: 8 }}>✍️</div>
            <div>Sign here</div>
          </div>
        )}
        <canvas
          ref={canvasRef}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
      </div>

      <div className="signature-footer">
        <button className="btn btn-outline" onClick={onBack}>← Back</button>
        <button className="btn btn-ghost" style={{ color: 'var(--danger)' }} onClick={clear}>Clear</button>
        <button
          className="btn btn-primary"
          style={{ flex: 1 }}
          onClick={save}
          disabled={!hasSig}
        >
          I Agree & Sign ✓
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────
// Step 5 — Finalize (owner view: preview + print/SMS)
// ──────────────────────────────────────────────────────
function StepFinalize({ receipt, receiptId, publicToken, onBack, onDone }: {
  receipt: {
    receipt_no: string;
    customer_name: string;
    customer_address: string;
    customer_phone: string;
    date: string;
    items: ReceiptItem[];
    total_amount: number;
    signature_data: string;
    id_image_url: string;
  };
  receiptId: string;
  publicToken: string;
  onBack: () => void;
  onDone: () => void;
}) {
  const [smsPhone, setSmsPhone] = useState(receipt.customer_phone || '');
  const [showSmsInput, setShowSmsInput] = useState(false);
  const [smsLoading, setSmsLoading] = useState(false);
  const [smsResult, setSmsResult] = useState<{ link: string; sms_sent: boolean } | null>(null);
  const [err, setErr] = useState('');
  const toast = useToast();

  const publicUrl = `${window.location.origin}/r/${publicToken}`;

  const handleSendSMS = async () => {
    setSmsLoading(true);
    setErr('');
    try {
      const data = await sendSMS(receiptId, smsPhone);
      setSmsResult(data);
      toast.show(data.sms_sent ? 'SMS sent!' : 'Link ready to share', 'success');
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSmsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const total = receipt.items.reduce((s, i) => s + (i.pounds * 100 + i.pence), 0);
  const tPounds = Math.floor(total / 100);
  const tPence = total % 100;

  return (
    <div className="page">
      <div className="flex-between mb-16">
        <button className="btn btn-ghost" style={{ padding: '8px 0' }} onClick={onBack}>← Back</button>
        <span style={{ fontWeight: 700, color: 'var(--success)' }}>✓ Receipt Ready</span>
      </div>

      {/* Receipt Preview */}
      <div className="receipt-preview" id="receipt-print">
        <div className="receipt-header">
          <h2>Andrew McCulloch Jewellers</h2>
          <p>7 The Square, Beeston NG9 2JG</p>
          <p>TEL: 0115 925 7552</p>
        </div>

        <div className="receipt-no">No:{receipt.receipt_no}</div>
        <div className="receipt-title">RECEIPT</div>

        <div className="receipt-field">
          <span className="receipt-field-label">CUSTOMER NAME</span>
          <span className="receipt-field-dots" />
          <span className="receipt-field-value">{receipt.customer_name}</span>
        </div>
        <div className="receipt-field">
          <span className="receipt-field-label">ADDRESS</span>
          <span className="receipt-field-dots" />
          <span className="receipt-field-value">{receipt.customer_address}</span>
        </div>
        <div className="receipt-field">
          <span className="receipt-field-dots" />
          <span style={{ marginLeft: 'auto', fontSize: 12 }}>Date: {receipt.date ? new Date(receipt.date).toLocaleDateString('en-GB') : ''}</span>
        </div>

        <table className="receipt-items-table">
          <thead>
            <tr>
              <th style={{ width: '12%' }}>QTY</th>
              <th>DESCRIPTION</th>
              <th style={{ width: '15%' }}>£</th>
              <th style={{ width: '12%' }}>p</th>
            </tr>
          </thead>
          <tbody>
            {receipt.items.map((item, i) => (
              <tr key={i}>
                <td style={{ textAlign: 'center' }}>{item.qty}</td>
                <td>{item.description}</td>
                <td style={{ textAlign: 'right' }}>{item.pounds}</td>
                <td style={{ textAlign: 'right' }}>{String(item.pence).padStart(2, '0')}</td>
              </tr>
            ))}
            {/* Empty rows to fill space */}
            {Array.from({ length: Math.max(0, 6 - receipt.items.length) }).map((_, i) => (
              <tr key={`empty-${i}`}>
                <td>&nbsp;</td><td></td><td></td><td></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="receipt-clearfix">
          <div className="receipt-total">
            Total £ {tPounds}.{String(tPence).padStart(2, '0')}
          </div>
        </div>

        <div className="receipt-legal">
          I hereby certify this is my own property and I have the right to sell being the lawful owner
          of the goods, declare them to be free of all hire purchase and custom duty liabilities and
          accept the agreed sale price.
        </div>

        <div className="receipt-signature">
          <div style={{ fontSize: 11, marginBottom: 4 }}>Signature</div>
          <div className="receipt-sig-line">
            {receipt.signature_data && (
              <img src={receipt.signature_data} alt="Signature" />
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="finalize-actions no-print mt-24">
        <button className="btn btn-dark btn-lg" onClick={handlePrint}>
          🖨️ Print
        </button>

        <button
          className="btn btn-primary btn-lg"
          onClick={() => setShowSmsInput(s => !s)}
        >
          📱 Send SMS
        </button>

        <button className="btn btn-success btn-lg" onClick={onDone}>
          ✓ Done
        </button>
      </div>

      {/* SMS panel */}
      {showSmsInput && (
        <div className="card no-print mt-16">
          <label>Customer Phone Number</label>
          <input
            type="tel"
            placeholder="07xxx xxxxxx"
            value={smsPhone}
            onChange={e => setSmsPhone(e.target.value)}
            style={{ marginBottom: 12 }}
          />

          {smsResult ? (
            <div>
              <p style={{ color: 'var(--success)', fontWeight: 600, marginBottom: 8 }}>
                {smsResult.sms_sent ? '✓ SMS sent!' : '✓ Link ready'}
              </p>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="text" value={publicUrl} readOnly style={{ fontSize: 13 }} />
                <button
                  className="btn btn-outline"
                  style={{ minHeight: 0, padding: '12px 16px', whiteSpace: 'nowrap' }}
                  onClick={() => { navigator.clipboard?.writeText(publicUrl); toast.show('Copied!'); }}
                >
                  Copy
                </button>
              </div>
            </div>
          ) : (
            <button
              className="btn btn-primary btn-full"
              onClick={handleSendSMS}
              disabled={smsLoading || !smsPhone.trim()}
            >
              {smsLoading ? 'Sending...' : 'Send Receipt Link'}
            </button>
          )}

          {err && <p style={{ color: 'var(--danger)', marginTop: 8 }}>{err}</p>}
        </div>
      )}

      {toast.msg && <div className={`toast ${toast.type} no-print`}>{toast.msg}</div>}
    </div>
  );
}

// ══════════════════════════════════════════════════════
// Main NewReceipt wizard
// ══════════════════════════════════════════════════════
export default function NewReceipt() {
  const navigate = useNavigate();
  const toast = useToast();

  const today = new Date().toISOString().split('T')[0];

  const [step, setStep] = useState<Step>('find-customer');
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState('');
  const [publicToken, setPublicToken] = useState('');
  const [receiptNo, setReceiptNo] = useState('');

  const [date, setDate] = useState(today);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [customer, setCustomer] = useState({ name: '', address: '', phone: '' });
  const [idImageUrl, setIdImageUrl] = useState('');
  const [items, setItems] = useState<ReceiptItem[]>([{ qty: 1, description: '', pounds: 0, pence: 0 }]);
  const [signatureData, setSignatureData] = useState('');

  const totalAmount = items.reduce((s, i) => s + i.pounds + i.pence / 100, 0);

  // Progress bar: find-customer, receipt, id, items, sign, done
  const stepOrder: Step[] = ['find-customer', 'receipt', 'id', 'items', 'sign', 'done'];
  const stepIndex = stepOrder.indexOf(step === 'new-customer' ? 'find-customer' : step);

  const handleCustomerChange = (f: string, v: string) => {
    setCustomer(prev => ({ ...prev, [f]: v }));
  };

  const handleSignatureSave = async (dataUrl: string) => {
    setSignatureData(dataUrl);
    setSaving(true);
    try {
      let data;
      const payload = {
        customer_name: customer.name,
        customer_address: customer.address,
        customer_phone: customer.phone,
        date, items,
        total_amount: totalAmount.toFixed(2),
        signature_data: dataUrl,
        id_image_url: idImageUrl,
        payment_method: paymentMethod,
        status: 'signed',
      };
      if (savedId) {
        data = await updateReceipt(savedId, payload);
      } else {
        data = await createReceipt(payload);
      }
      setSavedId(data.id);
      setPublicToken(data.public_token || '');
      setReceiptNo(data.receipt_no);
      setStep('done');
    } catch (e: any) {
      toast.show(e.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePreSave = async () => {
    if (savedId) { setStep('sign'); return; }
    setSaving(true);
    try {
      const data = await createReceipt({
        customer_name: customer.name,
        customer_address: customer.address,
        customer_phone: customer.phone,
        date, items,
        total_amount: 0,
        payment_method: paymentMethod,
        status: 'draft',
      });
      setSavedId(data.id);
      setPublicToken(data.public_token || '');
      setReceiptNo(data.receipt_no);
      setStep('sign');
    } catch (e: any) {
      toast.show(e.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (saving) {
    return (
      <div className="app-shell" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="spinner" />
        <p style={{ textAlign: 'center', color: 'var(--grey)', marginTop: 16 }}>Saving receipt...</p>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {step !== 'sign' && (
        <div className="topbar no-print">
          <button className="btn btn-ghost" style={{ color: '#aaa', minHeight: 0, padding: '6px 0', fontSize: 14 }} onClick={() => navigate('/')}>
            ✕ Cancel
          </button>
          <h1 style={{ fontSize: 15 }}>Gold Buying Receipt</h1>
          <span style={{ color: 'var(--gold-light)', fontSize: 13, fontWeight: 600 }}>
            {receiptNo ? `No:${receiptNo}` : ''}
          </span>
        </div>
      )}

      {step !== 'sign' && (
        <div className="steps-bar no-print">
          {stepOrder.map((s, i) => (
            <div key={s} className={`step-dot ${i < stepIndex ? 'done' : i === stepIndex ? 'active' : ''}`} />
          ))}
        </div>
      )}

      {step === 'find-customer' && (
        <StepFindCustomer
          onSelect={c => { setCustomer({ name: c.name, phone: c.phone || '', address: c.address || '' }); setStep('receipt'); }}
          onNewCustomer={() => setStep('new-customer')}
        />
      )}
      {step === 'new-customer' && (
        <StepNewCustomer
          name={customer.name} phone={customer.phone} address={customer.address}
          onChange={handleCustomerChange}
          onNext={() => setStep('receipt')}
          onBack={() => setStep('find-customer')}
          onSelectExisting={c => { setCustomer({ name: c.name, phone: c.phone || '', address: c.address || '' }); setStep('receipt'); }}
        />
      )}
      {step === 'receipt' && (
        <StepStart
          date={date} onDateChange={setDate}
          paymentMethod={paymentMethod} onPaymentChange={setPaymentMethod}
          customerName={customer.name}
          onNext={() => setStep('id')}
          onBack={() => setStep('find-customer')}
        />
      )}
      {step === 'id' && (
        <StepIDCapture
          idImageUrl={idImageUrl} onCapture={setIdImageUrl}
          onNext={() => setStep('items')}
          onBack={() => setStep('receipt')}
        />
      )}
      {step === 'items' && (
        <StepItems
          items={items} onChange={setItems}
          onNext={handlePreSave}
          onBack={() => setStep('id')}
        />
      )}
      {step === 'sign' && (
        <StepSignature
          onSave={handleSignatureSave}
          onBack={() => setStep('items')}
        />
      )}
      {step === 'done' && savedId && (
        <StepFinalize
          receipt={{
            receipt_no: receiptNo,
            customer_name: customer.name,
            customer_address: customer.address,
            customer_phone: customer.phone,
            date, items,
            total_amount: totalAmount,
            signature_data: signatureData,
            id_image_url: idImageUrl,
          }}
          receiptId={savedId}
          publicToken={publicToken}
          onBack={() => setStep('sign')}
          onDone={() => navigate('/')}
        />
      )}

      {toast.msg && <div className={`toast ${toast.type} no-print`}>{toast.msg}</div>}
    </div>
  );
}
