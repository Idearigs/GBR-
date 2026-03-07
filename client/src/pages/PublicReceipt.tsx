import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getPublicReceipt } from '../api';

interface PublicReceiptData {
  receipt_no: string;
  customer_name: string;
  customer_address: string;
  date: string;
  items: Array<{ qty: number; description: string; pounds: number; pence: number }>;
  total_amount: number;
  signature_data: string | null;
  status: string;
}

export default function PublicReceipt() {
  const { token } = useParams<{ token: string }>();
  const [receipt, setReceipt] = useState<PublicReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    getPublicReceipt(token)
      .then(setReceipt)
      .catch(e => setError(e.message || 'Receipt not found'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleDownloadPDF = () => window.print();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F2F2F7' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div style={{ textAlign: 'center', padding: 60, background: '#F2F2F7', minHeight: '100vh' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🔍</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Receipt Not Found</h2>
        <p style={{ color: '#8E8E93' }}>{error || 'This link may be invalid or expired.'}</p>
      </div>
    );
  }

  const totalPence = receipt.items.reduce((s, i) => s + (i.pounds * 100 + i.pence), 0);
  const tPounds = Math.floor(totalPence / 100);
  const tPence = totalPence % 100;
  const formattedTotal = `£${tPounds}.${String(tPence).padStart(2, '0')}`;

  return (
    <>
      {/* PDF print styles */}
      <style>{`
        @media print {
          body { background: #fff !important; margin: 0; }
          .no-print { display: none !important; }
          .bill-card { box-shadow: none !important; border-radius: 0 !important; max-width: 100% !important; margin: 0 !important; }
        }
      `}</style>

      <div style={{ background: '#F2F2F7', minHeight: '100vh', padding: '24px 16px 48px', fontFamily: "-apple-system, 'SF Pro Display', BlinkMacSystemFont, sans-serif" }}>

        {/* Download button */}
        <div className="no-print" style={{ maxWidth: 480, margin: '0 auto 16px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleDownloadPDF}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#1C1C1E', color: '#fff', border: 'none', borderRadius: 20, padding: '10px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Save as PDF
          </button>
        </div>

        {/* Bill Card */}
        <div className="bill-card" style={{ maxWidth: 480, margin: '0 auto', background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 40px rgba(0,0,0,0.1)' }}>

          {/* Header */}
          <div style={{ background: '#1C1C1E', padding: '28px 28px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: '#D4AF37', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 6 }}>
              Andrew McCulloch Jewellers
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>7 The Square, Beeston NG9 2JG &nbsp;·&nbsp; 0115 925 7552</div>
            <div style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: '6px 16px' }}>
              <span style={{ fontSize: 12, color: '#9ca3af' }}>Receipt</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>No: {receipt.receipt_no}</span>
            </div>
          </div>

          {/* Customer + Date */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #F2F2F7' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Customer</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#1C1C1E' }}>{receipt.customer_name}</div>
                {receipt.customer_address && (
                  <div style={{ fontSize: 13, color: '#8E8E93', marginTop: 3, lineHeight: 1.4, whiteSpace: 'pre-line' }}>{receipt.customer_address}</div>
                )}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Date</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#1C1C1E' }}>
                  {receipt.date ? new Date(receipt.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Items */}
          <div style={{ padding: '0 24px' }}>
            <div style={{ display: 'flex', padding: '12px 0 8px', borderBottom: '1px solid #F2F2F7' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.5px', width: 40 }}>Qty</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.5px', flex: 1 }}>Description</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right', width: 70 }}>Amount</div>
            </div>
            {receipt.items.filter(i => i.description).map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #F9F9F9' }}>
                <div style={{ width: 40, fontSize: 14, color: '#8E8E93', fontWeight: 600 }}>{item.qty}×</div>
                <div style={{ flex: 1, fontSize: 15, fontWeight: 500, color: '#1C1C1E' }}>{item.description}</div>
                <div style={{ width: 70, textAlign: 'right', fontSize: 15, fontWeight: 700, color: '#1C1C1E' }}>
                  £{item.pounds}.{String(item.pence).padStart(2, '0')}
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div style={{ margin: '0 24px', padding: '16px 0', borderTop: '2px solid #1C1C1E', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1C1C1E' }}>Total Paid</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#1C1C1E', letterSpacing: '-1px' }}>{formattedTotal}</div>
          </div>

          {/* Legal text */}
          <div style={{ margin: '0 24px 20px', padding: '14px 16px', background: '#F9F9F9', borderRadius: 10, fontSize: 11, color: '#8E8E93', lineHeight: 1.6 }}>
            I hereby certify this is my own property and I have the right to sell being the lawful owner of the goods, declare them to be free of all hire purchase and custom duty liabilities and accept the agreed sale price.
          </div>

          {/* Signature */}
          {receipt.signature_data && (
            <div style={{ margin: '0 24px 24px', padding: '16px', background: '#F9F9F9', borderRadius: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Customer Signature</div>
              <img src={receipt.signature_data} alt="Signature" style={{ maxHeight: 70, maxWidth: '100%' }} />
            </div>
          )}

          {/* Footer */}
          <div style={{ background: '#F9F9F9', padding: '16px 24px', textAlign: 'center', borderTop: '1px solid #F2F2F7' }}>
            <div style={{ fontSize: 11, color: '#AEAEB2' }}>This is your official digital receipt</div>
            <div style={{ fontSize: 11, color: '#AEAEB2', marginTop: 2 }}>Andrew McCulloch Jewellers · Beeston, Nottingham</div>
          </div>
        </div>
      </div>
    </>
  );
}
