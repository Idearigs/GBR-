import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createReceipt, updateReceipt, sendSMS, uploadIdImage, getIdImageUrl } from '../api';
import type { ReceiptItem } from '../types';

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
// Step 0 — Owner starts (auto date + receipt no)
// ──────────────────────────────────────────────────────
function StepStart({ date, onDateChange, paymentMethod, onPaymentChange, onNext }: {
  date: string; onDateChange: (d: string) => void;
  paymentMethod: string; onPaymentChange: (m: string) => void;
  onNext: () => void;
}) {
  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '70vh' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🥇</div>
        <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>New Gold Buying Receipt</h2>
        <p style={{ color: 'var(--grey)', fontSize: 16 }}>Andrew McCulloch Jewellers</p>
      </div>

      <div className="form-group">
        <label>Date</label>
        <input type="date" value={date} onChange={e => onDateChange(e.target.value)} />
      </div>

      <div className="form-group">
        <label>Payment Method</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 4 }}>
          <button
            type="button"
            onClick={() => onPaymentChange('cash')}
            style={{
              padding: '20px 16px', borderRadius: 16, border: `2.5px solid ${paymentMethod === 'cash' ? 'var(--success)' : 'var(--border)'}`,
              background: paymentMethod === 'cash' ? 'var(--success-pale)' : 'var(--surface)',
              cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 8 }}>💵</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: paymentMethod === 'cash' ? 'var(--success)' : 'var(--dark)' }}>Cash</div>
          </button>
          <button
            type="button"
            onClick={() => onPaymentChange('card')}
            style={{
              padding: '20px 16px', borderRadius: 16, border: `2.5px solid ${paymentMethod === 'card' ? 'var(--info)' : 'var(--border)'}`,
              background: paymentMethod === 'card' ? 'var(--info-pale)' : 'var(--surface)',
              cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
            }}
          >
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
// Step 1 — Customer fills their details (large UI)
// ──────────────────────────────────────────────────────
function StepCustomer({
  name, address, phone,
  onChange, onNext, onBack
}: {
  name: string; address: string; phone: string;
  onChange: (f: string, v: string) => void;
  onNext: () => void; onBack: () => void;
}) {
  return (
    <div className="customer-step page">
      <button className="btn btn-ghost" style={{ alignSelf: 'flex-start', marginBottom: 24, padding: '8px 0' }} onClick={onBack}>
        ← Back
      </button>
      <h2>Hello! 👋</h2>
      <p>Please fill in your details below</p>

      <div style={{ background: 'var(--light)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', marginBottom: 20, fontSize: 13, color: 'var(--grey)', lineHeight: 1.5 }}>
        <strong style={{ color: 'var(--dark)', display: 'block', marginBottom: 4 }}>Privacy Notice (UK GDPR)</strong>
        Andrew McCulloch Jewellers collects your name, address, phone number, a photo of your ID, and your signature to process this transaction and meet our legal obligations. Your data is stored securely and deleted after 6 years. You have the right to request access or erasure — contact us at 0115 925 7552.
      </div>

      <div className="form-group">
        <label>Your Full Name</label>
        <input
          type="text"
          placeholder="Full name"
          value={name}
          onChange={e => onChange('name', e.target.value)}
          autoCapitalize="words"
          style={{ fontSize: 22, padding: '18px 20px' }}
        />
      </div>

      <div className="form-group">
        <label>Your Address</label>
        <textarea
          placeholder="Street, City, Postcode"
          value={address}
          onChange={e => onChange('address', e.target.value)}
          style={{ fontSize: 20, padding: '16px 20px', minHeight: 120 }}
        />
      </div>

      <div className="form-group">
        <label>Phone Number (optional)</label>
        <input
          type="tel"
          placeholder="07xxx xxxxxx"
          value={phone}
          onChange={e => onChange('phone', e.target.value)}
          style={{ fontSize: 22, padding: '18px 20px' }}
        />
      </div>

      <button
        className="btn btn-primary btn-full btn-lg mt-16"
        onClick={onNext}
        disabled={!name.trim()}
      >
        Next →
      </button>
      {!name.trim() && <p style={{ textAlign: 'center', color: 'var(--grey)', marginTop: 10, fontSize: 14 }}>Please enter your name to continue</p>}
    </div>
  );
}

// ──────────────────────────────────────────────────────
// Step 2 — Owner captures customer ID photo
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

  const [step, setStep] = useState(0);
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

  // Step labels for progress bar (steps 0-5)
  const stepDots = ['Start', 'Details', 'ID', 'Items', 'Sign', 'Done'];

  const handleCustomerChange = (f: string, v: string) => {
    setCustomer(prev => ({ ...prev, [f === 'name' ? 'name' : f === 'address' ? 'address' : 'phone']: v }));
  };

  // After signature — save everything to server
  const handleSignatureSave = async (dataUrl: string) => {
    setSignatureData(dataUrl);
    setSaving(true);
    try {
      let data;
      const payload = {
        customer_name: customer.name,
        customer_address: customer.address,
        customer_phone: customer.phone,
        date,
        items,
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
      setStep(5);
    } catch (e: any) {
      toast.show(e.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  // When owner advances to items step, pre-save draft
  const handlePreSave = async () => {
    if (savedId) { setStep(4); return; }
    setSaving(true);
    try {
      const data = await createReceipt({
        customer_name: customer.name,
        customer_address: customer.address,
        customer_phone: customer.phone,
        date,
        items,
        total_amount: 0,
        payment_method: paymentMethod,
        status: 'draft',
      });
      setSavedId(data.id);
      setPublicToken(data.public_token || '');
      setReceiptNo(data.receipt_no);
      setStep(4);
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
      {/* Top bar — only show on non-signature steps */}
      {step !== 4 && (
        <div className="topbar no-print">
          <button className="btn btn-ghost" style={{ color: '#aaa', minHeight: 0, padding: '6px 0', fontSize: 14 }} onClick={() => navigate('/')}>
            ✕ Cancel
          </button>
          <h1 style={{ fontSize: 15 }}>Gold Buying Receipt</h1>
          <span style={{ color: 'var(--gold-light)', fontSize: 13, fontWeight: 600 }}>
            {step < 5 && receiptNo ? `No:${receiptNo}` : ''}
          </span>
        </div>
      )}

      {/* Progress bar */}
      {step !== 4 && (
        <div className="steps-bar no-print">
          {stepDots.map((_, i) => (
            <div
              key={i}
              className={`step-dot ${i < step ? 'done' : i === step ? 'active' : ''}`}
            />
          ))}
        </div>
      )}

      {/* Steps */}
      {step === 0 && (
        <StepStart date={date} onDateChange={setDate} paymentMethod={paymentMethod} onPaymentChange={setPaymentMethod} onNext={() => setStep(1)} />
      )}
      {step === 1 && (
        <StepCustomer
          name={customer.name}
          address={customer.address}
          phone={customer.phone}
          onChange={handleCustomerChange}
          onNext={() => setStep(2)}
          onBack={() => setStep(0)}
        />
      )}
      {step === 2 && (
        <StepIDCapture
          idImageUrl={idImageUrl}
          onCapture={setIdImageUrl}
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
        />
      )}
      {step === 3 && (
        <StepItems
          items={items}
          onChange={setItems}
          onNext={handlePreSave}
          onBack={() => setStep(2)}
        />
      )}
      {step === 4 && (
        <StepSignature
          onSave={handleSignatureSave}
          onBack={() => setStep(3)}
        />
      )}
      {step === 5 && savedId && (
        <StepFinalize
          receipt={{
            receipt_no: receiptNo,
            customer_name: customer.name,
            customer_address: customer.address,
            customer_phone: customer.phone,
            date,
            items,
            total_amount: totalAmount,
            signature_data: signatureData,
            id_image_url: idImageUrl,
          }}
          receiptId={savedId}
          publicToken={publicToken}
          onBack={() => setStep(4)}
          onDone={() => navigate('/')}
        />
      )}

      {toast.msg && <div className={`toast ${toast.type} no-print`}>{toast.msg}</div>}
    </div>
  );
}
