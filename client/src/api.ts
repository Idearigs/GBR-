const BASE = '/api';

const getToken = () => localStorage.getItem('gbr_token');

const headers = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

export const login = async (pin: string) => {
  const r = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'Login failed');
  return data;
};

export const createReceipt = async (body: object) => {
  const r = await fetch(`${BASE}/receipts`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error);
  return data;
};

export const updateReceipt = async (id: string, body: object) => {
  const r = await fetch(`${BASE}/receipts/${id}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error);
  return data;
};

export const getReceipts = async (page = 1, search = '') => {
  const r = await fetch(`${BASE}/receipts?page=${page}&limit=50&search=${encodeURIComponent(search)}`, {
    headers: headers(),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error);
  return data;
};

export const getReceipt = async (id: string) => {
  const r = await fetch(`${BASE}/receipts/${id}`, { headers: headers() });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error);
  return data;
};

export const deleteReceipt = async (id: string) => {
  const r = await fetch(`${BASE}/receipts/${id}`, { method: 'DELETE', headers: headers() });
  if (!r.ok) throw new Error('Delete failed');
};

export const sendSMS = async (id: string, phone: string) => {
  const r = await fetch(`${BASE}/receipts/${id}/send-sms`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ phone }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error);
  return data;
};

export const uploadIdImage = async (file: File) => {
  const form = new FormData();
  form.append('id_image', file);
  const r = await fetch(`${BASE}/receipts/upload-id`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: form,
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error);
  return data;
};

export const getPublicReceipt = async (token: string) => {
  const r = await fetch(`${BASE}/receipts/public/${token}`);
  const data = await r.json();
  if (!r.ok) throw new Error(data.error);
  return data;
};

export const sendReport = async () => {
  const r = await fetch(`${BASE}/reports/send`, { method: 'POST', headers: headers() });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error);
  return data;
};
