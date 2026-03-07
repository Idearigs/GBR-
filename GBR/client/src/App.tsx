import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NewReceipt from './pages/NewReceipt';
import ManageReceipts from './pages/ManageReceipts';
import PublicReceipt from './pages/PublicReceipt';

const isLoggedIn = () => !!localStorage.getItem('gbr_token');

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  return isLoggedIn() ? <>{children}</> : <Navigate to="/login" replace />;
};

export default function App() {
  const [auth, setAuth] = useState(isLoggedIn());

  useEffect(() => {
    const handler = () => setAuth(isLoggedIn());
    window.addEventListener('gbr-auth', handler);
    return () => window.removeEventListener('gbr-auth', handler);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public — no auth */}
        <Route path="/r/:token" element={<PublicReceipt />} />
        <Route path="/login" element={<Login onLogin={() => { setAuth(true); }} />} />

        {/* Protected */}
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/new" element={<ProtectedRoute><NewReceipt /></ProtectedRoute>} />
        <Route path="/manage" element={<ProtectedRoute><ManageReceipts /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
