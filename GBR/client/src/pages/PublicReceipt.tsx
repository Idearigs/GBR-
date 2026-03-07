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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
        <h2 style={{ marginBottom: 8 }}>Receipt Not Found</h2>
        <p style={{ color: 'var(--grey)' }}>{error || 'This link may be invalid or expired.'}</p>
      </div>
    );
  }

  const total = receipt.items.reduce((s, i) => s + (i.pounds * 100 + i.pence), 0);
  const tPounds = Math.floor(total / 100);
  const tPence = total % 100;

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh', padding: '20px 16px' }}>
      {/* Print button */}
      <div style={{ maxWidth: 500, margin: '0 auto 16px', display: 'flex', justifyContent: 'flex-end' }} className="no-print">
        <button className="btn btn-dark" style={{ padding: '10px 20px', fontSize: 14 }} onClick={() => window.print()}>
          🖨️ Print Receipt
        </button>
      </div>

      <div className="receipt-preview" style={{ maxWidth: 500, margin: '0 auto' }}>
        {/* Header */}
        <div className="receipt-header">
          <h2 style={{ fontSize: 16, fontWeight: 800 }}>Andrew McCulloch Jewellers</h2>
          <p style={{ fontSize: 11 }}>7 The Square, Beeston NG9 2JG</p>
          <p style={{ fontSize: 11 }}>TEL: 0115 925 7552</p>
        </div>

        <div className="receipt-no">No:{receipt.receipt_no}</div>
        <div className="receipt-title">RECEIPT</div>

        <div className="receipt-field">
          <span className="receipt-field-label" style={{ fontSize: 11 }}>CUSTOMER NAME</span>
          <span className="receipt-field-dots" />
          <span className="receipt-field-value" style={{ fontSize: 12 }}>{receipt.customer_name}</span>
        </div>
        <div className="receipt-field">
          <span className="receipt-field-label" style={{ fontSize: 11 }}>ADDRESS</span>
          <span className="receipt-field-dots" />
          <span className="receipt-field-value" style={{ fontSize: 12 }}>{receipt.customer_address}</span>
        </div>
        <div className="receipt-field">
          <span className="receipt-field-dots" />
          <span style={{ marginLeft: 'auto', fontSize: 11 }}>
            Date: {receipt.date ? new Date(receipt.date).toLocaleDateString('en-GB') : ''}
          </span>
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
            {Array.from({ length: Math.max(0, 6 - receipt.items.length) }).map((_, i) => (
              <tr key={`empty-${i}`}>
                <td>&nbsp;</td><td></td><td></td><td></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="receipt-clearfix">
          <div className="receipt-total">
            Total £ {tPounds}.{String(tPence).padStart(2, '00')}
          </div>
        </div>

        <div className="receipt-legal">
          I hereby certify this is my own property and I have the right to sell being the lawful owner
          of the goods, declare them to be free of all hire purchase and custom duty liabilities and
          accept the agreed sale price.
        </div>

        {receipt.signature_data && (
          <div className="receipt-signature">
            <div style={{ fontSize: 10, marginBottom: 4 }}>Signature</div>
            <div className="receipt-sig-line">
              <img src={receipt.signature_data} alt="Customer signature" style={{ maxHeight: 55 }} />
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 20, borderTop: '1px solid #ddd', paddingTop: 12, fontSize: 10, color: '#999' }}>
          This is a digital receipt from Andrew McCulloch Jewellers<br />
          7 The Square, Beeston NG9 2JG · TEL: 0115 925 7552
        </div>
      </div>
    </div>
  );
}
