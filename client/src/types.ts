export interface ReceiptItem {
  qty: number;
  description: string;
  pounds: number;
  pence: number;
}

export interface Receipt {
  id: string;
  receipt_no: string;
  customer_name: string;
  customer_address: string;
  customer_phone: string;
  date: string;
  items: ReceiptItem[];
  total_amount: number;
  signature_data: string | null;
  id_image_url: string | null;
  status: 'draft' | 'signed' | 'printed' | 'sent';
  public_token?: string;
  sms_sent_at?: string | null;
  notes?: string;
  created_at: string;
}

export interface NewReceiptState {
  customer_name: string;
  customer_address: string;
  customer_phone: string;
  date: string;
  items: ReceiptItem[];
  total_amount: number;
  signature_data: string;
  id_image_url: string;
  notes: string;
}
