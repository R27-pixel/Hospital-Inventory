/// <reference types="vite/client" />

export interface Product {
  id: number;
  name: string;
  hsn_code: string;
  pack_size: string;
  manufacturer?: string;
  min_stock_alert?: number;
  is_archived: number;
  total_stock?: number;
  batch_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: number;
  name: string;
  gstin?: string;
  pan_no?: string;
  drug_license_no?: string;
  phone?: string;
  email?: string;
  address?: string;
  state_name?: string;
  state_code?: string;
  is_archived: number;
  created_at: string;
  updated_at: string;
}

export interface Batch {
  id: number;
  product_id: number;
  product_name?: string;
  batch_number: string;
  mfg_date?: string;
  expiry_date: string;
  mrp: number;
  purchase_rate: number;
  discount_percent: number;
  cgst_percent: number;
  sgst_percent: number;
  igst_percent: number;
  current_stock: number;
  created_at: string;
  updated_at: string;
}

export interface PurchaseItemInput {
  product_id?: number;
  product_name: string;
  hsn_code: string;
  pack_size: string;
  manufacturer?: string;
  batch_number: string;
  mfg_date?: string;
  expiry_date: string;
  mrp: number;
  quantity: number;
  free_quantity: number;
  purchase_rate: number;
  discount_percent: number;
  cgst_percent: number;
  sgst_percent: number;
  igst_percent: number;
  supplier_net_rate?: number;
  supplier_line_amount?: number;
  invoice_taxable_amount?: number;
}

export interface PurchaseInvoiceInput {
  supplier_id: number;
  document_type?: 'TAX_INVOICE' | 'CHALLAN';
  invoice_number: string;
  invoice_date: string;
  order_no?: string;
  order_date?: string;
  lr_no?: string;
  lr_date?: string;
  cases_count?: number;

  supplier_taxable_total?: number;
  supplier_scheme_total?: number;
  supplier_discount_total?: number;
  supplier_cgst_total?: number;
  supplier_sgst_total?: number;
  supplier_igst_total?: number;
  supplier_total_gst?: number;
  supplier_other_charges?: number;
  supplier_round_off?: number;
  supplier_grand_total?: number;

  master_elevation_credentials?: {
    loginId: string;
    password: string;
  };

  remarks?: string;
  items: PurchaseItemInput[];
}

export interface PurchaseInvoice {
  id: number;
  invoice_number: string;
  supplier_id: number;
  supplier_name: string;
  invoice_date: string;
  total_taxable_amount: number;
  total_cgst: number;
  total_sgst: number;
  total_gst: number;
  grand_total: number;
  has_arithmetic_override?: number;
  is_cancelled?: number;
  cancelled_at?: string;
  cancellation_reason?: string;
  remarks?: string;
  item_count?: number;
  created_at: string;
}

export interface GstClassSummary {
  gst_class: number;
  total_taxable: number;
  total_cgst: number;
  total_sgst: number;
  total_igst?: number;
  total_gst: number;
  grand_total: number;
  item_count: number;
}

export interface ExpiryReportItem {
  batch_id: number;
  product_name: string;
  hsn_code: string;
  pack_size: string;
  manufacturer?: string;
  batch_number: string;
  expiry_date: string;
  days_remaining: number;
  status: 'EXPIRED' | 'EXPIRING_SOON' | 'NORMAL';
  current_stock: number;
  mrp: number;
}

export interface BackupLogRecord {
  id: number;
  file_path: string;
  file_size_bytes: number;
  backup_type: 'AUTOMATIC_SCHEDULED' | 'MANUAL' | 'ON_SHUTDOWN';
  status: 'SUCCESS' | 'FAILED';
  error_message?: string;
  created_at: string;
}

export interface ActiveUserSession {
  userId: number;
  loginId: string;
  role: 'STAFF' | 'MASTER';
  displayName: string;
}

export interface AuthStatus {
  initialized: boolean;
  authenticated: boolean;
  user: ActiveUserSession | null;
}

export interface AuthResponse {
  success: boolean;
  user?: ActiveUserSession;
  error?: string;
}

export interface StockExitRecord {
  id: number;
  batch_id: number;
  product_name: string;
  batch_number: string;
  quantity_changed: number;
  balance_after: number;
  reason: string;
  created_at: string;
}

declare global {
  interface Window {
    electronAPI?: {
      system: {
        ping: () => Promise<string>;
        getAppVersion: () => Promise<string>;
        checkIntegrity: () => Promise<any[]>;
      };
      auth: {
        getStatus: () => Promise<AuthStatus>;
        setupAccounts: (payload: { master: { login_id: string; password: string; display_name?: string }; staff: { login_id: string; password: string; display_name?: string } }) => Promise<AuthResponse>;
        login: (credentials: { loginId: string; password: string }) => Promise<AuthResponse>;
        logout: () => Promise<AuthResponse>;
        changePassword: (params: { targetRole: 'STAFF' | 'MASTER'; currentPassword?: string; newPassword: string }) => Promise<AuthResponse>;
      };
      suppliers: {
        getAll: (includeArchived?: boolean) => Promise<Supplier[]>;
        create: (data: { name: string; gstin?: string; pan_no?: string; drug_license_no?: string; phone?: string; email?: string; address?: string; state_name?: string; state_code?: string }) => Promise<{ success: boolean; id?: number; error?: string }>;
        update: (data: { id: number; name: string; gstin?: string; pan_no?: string; drug_license_no?: string; phone?: string; email?: string; address?: string; state_name?: string; state_code?: string }) => Promise<{ success: boolean; error?: string }>;
        archive: (id: number) => Promise<{ success: boolean; error?: string }>;
      };
      products: {
        getAll: (includeArchived?: boolean) => Promise<Product[]>;
        create: (data: { name: string; hsn_code: string; pack_size: string; manufacturer?: string; min_stock_alert?: number }) => Promise<{ success: boolean; id?: number; error?: string }>;
        update: (data: { id: number; name: string; hsn_code: string; pack_size: string; manufacturer?: string; min_stock_alert?: number }) => Promise<{ success: boolean; error?: string }>;
        archive: (id: number) => Promise<{ success: boolean; error?: string }>;
      };
      batches: {
        getByProduct: (productId: number) => Promise<Batch[]>;
        getAll: () => Promise<Batch[]>;
      };
      purchases: {
        getAll: () => Promise<PurchaseInvoice[]>;
        create: (input: PurchaseInvoiceInput) => Promise<{ success: boolean; id?: number; error?: string; requiresMasterAuth?: boolean }>;
        delete: (payload: { id: number; reason?: string } | number) => Promise<{ success: boolean; error?: string }>;
      };
      reports: {
        getGstSummary: (startDate: string, endDate: string) => Promise<GstClassSummary[]>;
        getExpiryReport: () => Promise<ExpiryReportItem[]>;
        exportPdf: (params?: { defaultPath?: string; targetPath?: string }) => Promise<{ success: boolean; path?: string; canceled?: boolean; error?: string }>;
        print: () => Promise<{ success: boolean; error?: string }>;
      };
      backup: {
        trigger: () => Promise<{ success: boolean; path?: string; error?: string }>;
        getLogs: () => Promise<BackupLogRecord[]>;
      };
      stock: {
        exit: (data: { product_id: number; batch_id: number; quantity: number; reason: string }) => Promise<{ success: boolean; balance_after?: number; error?: string }>;
        getExitHistory: () => Promise<StockExitRecord[]>;
      };
    };
  }
}
