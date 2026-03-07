import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api';

interface Props { onLogin: () => void; }

export default function Login({ onLogin }: Props) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleKey = async (key: string) => {
    if (key === 'del') {
      setPin(p => p.slice(0, -1));
      setError('');
      return;
    }
    if (key === 'ok') {
      if (pin.length < 4) { setError('Enter PIN'); return; }
      setLoading(true);
      setError('');
      try {
        const data = await login(pin);
        localStorage.setItem('gbr_token', data.token);
        onLogin();
        navigate('/', { replace: true });
      } catch {
        setError('Incorrect PIN. Try again.');
        setPin('');
      } finally {
        setLoading(false);
      }
      return;
    }
    if (pin.length >= 6) return;
    const next = pin + key;
    setPin(next);
    // Auto submit at 4 digits if short PIN
    if (next.length === 4) {
      setLoading(true);
      setError('');
      try {
        const data = await login(next);
        localStorage.setItem('gbr_token', data.token);
        onLogin();
        navigate('/', { replace: true });
      } catch {
        setError('Incorrect PIN. Try again.');
        setPin('');
      } finally {
        setLoading(false);
      }
    }
  };

  const keys = ['1','2','3','4','5','6','7','8','9','del','0','ok'];

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-logo">GBR</div>
        <div className="login-sub">Andrew McCulloch Jewellers<br/>Gold Buying Receipts</div>

        <div className="pin-dots">
          {[0,1,2,3,4,5].map(i => (
            <div key={i} className={`pin-dot ${i < pin.length ? 'filled' : ''}`} />
          ))}
        </div>

        <div className="pin-pad">
          {keys.map(k => (
            <button
              key={k}
              className={`pin-key ${k === 'del' || k === 'ok' ? 'action' : ''}`}
              onClick={() => !loading && handleKey(k)}
              style={k === 'ok' ? { background: '#1a1a1a', color: '#D4AF37' } : {}}
            >
              {k === 'del' ? '⌫' : k === 'ok' ? 'OK' : k}
            </button>
          ))}
        </div>

        <div className="pin-error">{error}</div>
      </div>
    </div>
  );
}
