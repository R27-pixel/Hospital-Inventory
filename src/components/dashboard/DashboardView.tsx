import React, { useState, useEffect } from 'react';
import { Product, Batch, PurchaseInvoice } from '../../vite-env';
import {
  Package,
  Layers,
  AlertTriangle,
  Clock,
  TrendingUp,
  ArrowRight,
  Plus,
  LogOut,
  FileText,
} from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (tab: 'inventory' | 'suppliers' | 'purchases' | 'stock-exit' | 'reports' | 'settings') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        if (window.electronAPI) {
          const [prodsData, batchesData, invsData] = await Promise.all([
            window.electronAPI.products.getAll(),
            window.electronAPI.batches.getAll(),
            window.electronAPI.purchases.getAll(),
          ]);
          setProducts(prodsData.filter((p) => p.is_archived === 0));
          setBatches(batchesData);
          setInvoices(invsData.slice(0, 5));
        } else {
          // Web Preview Mock
          setProducts([
            { id: 1, name: 'TRAN 5ML', hsn_code: '3004', pack_size: '5ml Ampoule', min_stock_alert: 10, is_archived: 0, total_stock: 25, created_at: '', updated_at: '' },
            { id: 2, name: 'AUGMENTIN 625MG', hsn_code: '3004', pack_size: '10 Tablets', min_stock_alert: 15, is_archived: 0, total_stock: 5, created_at: '', updated_at: '' },
          ]);
          setBatches([
            { id: 101, product_id: 1, batch_number: 'STRAN-2026', expiry_date: '2026-10-31', mrp: 63.63, purchase_rate: 60.00, discount_percent: 0, cgst_percent: 2.5, sgst_percent: 2.5, igst_percent: 0, current_stock: 20, created_at: '', updated_at: '' },
          ]);
          setInvoices([
            { id: 1, invoice_number: 'L-00275', supplier_id: 1, supplier_name: 'M/S GUPTA SURGICALS', invoice_date: '2026-08-22', total_taxable_amount: 1200.0, total_cgst: 30.0, total_sgst: 30.0, total_gst: 60.0, grand_total: 1260.0, created_at: '' },
          ]);
        }
      } catch (err) {
        console.error('Failed to load dashboard metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // Compute metrics
  const totalProducts = products.length;
  const totalStockUnits = products.reduce((acc, p) => acc + (p.total_stock || 0), 0);

  const lowStockItems = products.filter((p) => {
    const stock = p.total_stock || 0;
    const alertThreshold = p.min_stock_alert ?? 10;
    return stock > 0 && stock <= alertThreshold;
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiringSoonBatches = batches.filter((b) => {
    if (b.current_stock <= 0) return false;
    const expDate = new Date(b.expiry_date);
    const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  });

  return (
    <div className="view-container">
      <div className="view-header">
        <div className="view-header-title">
          <h2>Operational Dashboard</h2>
          <p>Real-time hospital inventory status, alert summaries & recent stock movements</p>
        </div>
      </div>

      {/* Summary Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        <div className="card-surface">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>TOTAL CATALOG ITEMS</span>
            <div style={{ width: 32, height: 32, borderRadius: '6px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>{totalProducts}</div>
          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Registered product master definitions</span>
        </div>

        <div className="card-surface">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>TOTAL STOCK UNITS</span>
            <div style={{ width: 32, height: 32, borderRadius: '6px', background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>{totalStockUnits}</div>
          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Physical units across active batches</span>
        </div>

        <div className="card-surface">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>LOW STOCK ALERTS</span>
            <div style={{ width: 32, height: 32, borderRadius: '6px', background: 'var(--warning-bg)', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: lowStockItems.length > 0 ? 'var(--warning)' : 'var(--text-main)' }}>
            {lowStockItems.length}
          </div>
          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Products at or below min threshold</span>
        </div>

        <div className="card-surface">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>EXPIRING SOON (&le;30 DAYS)</span>
            <div style={{ width: 32, height: 32, borderRadius: '6px', background: 'var(--danger-bg)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: expiringSoonBatches.length > 0 ? 'var(--danger)' : 'var(--text-main)' }}>
            {expiringSoonBatches.length}
          </div>
          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Active batches expiring within 30 days</span>
        </div>
      </div>

      {/* Operational Shortcuts & Recent Invoices */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
        {/* Recent Purchases Table */}
        <div className="card-surface">
          <div className="card-title-bar">
            <h3>
              <FileText size={18} className="primary" />
              <span>Recent Inward Purchases</span>
            </h3>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('purchases')}>
              <span>View All Purchases</span>
              <ArrowRight size={13} />
            </button>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice No</th>
                  <th>Supplier</th>
                  <th>Date</th>
                  <th>Taxable Base</th>
                  <th>GST Amount</th>
                  <th>Grand Total</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td><code>{inv.invoice_number}</code></td>
                    <td><strong>{inv.supplier_name}</strong></td>
                    <td>{inv.invoice_date}</td>
                    <td>₹{inv.total_taxable_amount.toFixed(2)}</td>
                    <td>₹{inv.total_gst.toFixed(2)}</td>
                    <td><strong>₹{inv.grand_total.toFixed(2)}</strong></td>
                  </tr>
                ))}

                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>
                      No purchase invoice records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Operations Panel */}
        <div className="card-surface">
          <div className="card-title-bar">
            <h3>
              <TrendingUp size={18} className="primary" />
              <span>Quick Actions</span>
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <button className="btn btn-secondary" style={{ justifyContent: 'flex-start' }} onClick={() => onNavigate('purchases')}>
              <Plus size={16} color="var(--primary)" />
              <span>Enter New Purchase Invoice</span>
            </button>

            <button className="btn btn-secondary" style={{ justifyContent: 'flex-start' }} onClick={() => onNavigate('stock-exit')}>
              <LogOut size={16} color="var(--danger)" />
              <span>Record Stock Exit (Master Only)</span>
            </button>

            <button className="btn btn-secondary" style={{ justifyContent: 'flex-start' }} onClick={() => onNavigate('inventory')}>
              <Package size={16} color="var(--primary)" />
              <span>Browse Master Catalog</span>
            </button>

            <button className="btn btn-secondary" style={{ justifyContent: 'flex-start' }} onClick={() => onNavigate('reports')}>
              <FileText size={16} color="var(--success)" />
              <span>View GST & Expiry Reports</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
