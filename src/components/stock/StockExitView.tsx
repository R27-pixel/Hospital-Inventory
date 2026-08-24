import React, { useState, useEffect } from 'react';
import { Product, Batch, StockExitRecord } from '../../vite-env';
import { useAuth } from '../../context/AuthContext';
import {
  LogOut,
  History,
  CheckCircle2,
  AlertCircle,
  Package,
  Layers,
  ArrowRightLeft,
  Lock,
} from 'lucide-react';

export const StockExitView: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'exit' | 'history'>('exit');
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [history, setHistory] = useState<StockExitRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [selectedProductId, setSelectedProductId] = useState<number | ''>('');
  const [selectedBatchId, setSelectedBatchId] = useState<number | ''>('');
  const [exitQuantity, setExitQuantity] = useState<number | ''>(1);
  const [reasonCategory, setReasonCategory] = useState<'Sold' | 'Issued' | 'Internal Use' | 'Other'>('Issued');
  const [customReason, setCustomReason] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isStaff = user?.role === 'STAFF';

  const loadData = async () => {
    setLoading(true);
    try {
      if (window.electronAPI && window.electronAPI.products && window.electronAPI.batches && window.electronAPI.stock) {
        const [prodsData, batchesData, historyData] = await Promise.all([
          window.electronAPI.products.getAll(),
          window.electronAPI.batches.getAll(),
          window.electronAPI.stock.getExitHistory(),
        ]);
        setProducts(prodsData.filter((p) => p.is_archived === 0));
        setBatches(batchesData);
        setHistory(historyData);

        if (prodsData.length > 0 && !selectedProductId) {
          const firstAvailable = prodsData.find((p) => (p.total_stock || 0) > 0) || prodsData[0];
          if (firstAvailable) setSelectedProductId(firstAvailable.id);
        }
      } else {
        // Fallback for Web Preview
        setProducts([
          { id: 1, name: 'TRAN 5ML', hsn_code: '3004', pack_size: '5ml Ampoule', min_stock_alert: 10, is_archived: 0, total_stock: 20, created_at: '', updated_at: '' },
        ]);
        setSelectedProductId(1);
        setBatches([
          { id: 101, product_id: 1, batch_number: 'STRAN-2026', expiry_date: '2026-10-31', mrp: 63.63, purchase_rate: 60.00, discount_percent: 0, cgst_percent: 2.5, sgst_percent: 2.5, igst_percent: 0, current_stock: 20, created_at: '', updated_at: '' },
        ]);
        setHistory([
          { id: 1, batch_id: 101, product_name: 'TRAN 5ML', batch_number: 'STRAN-2026', quantity_changed: -3, balance_after: 17, reason: 'Issued', created_at: new Date().toLocaleString() },
        ]);
      }
    } catch (err) {
      console.error('Failed to load stock exit data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const availableBatches = batches.filter((b) => b.product_id === Number(selectedProductId));
  const selectedBatch = batches.find((b) => b.id === Number(selectedBatchId));

  useEffect(() => {
    if (availableBatches.length > 0) {
      const nonZero = availableBatches.find((b) => b.current_stock > 0) || availableBatches[0];
      setSelectedBatchId(nonZero.id);
    } else {
      setSelectedBatchId('');
    }
  }, [selectedProductId]);

  const handleExecuteExit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (isStaff) {
      setError('Privileged Feature: Stock Exit is restricted to Master Admin accounts.');
      return;
    }

    if (!selectedProductId || !selectedBatchId) {
      setError('Please select both a Product and a Batch.');
      return;
    }

    const qty = typeof exitQuantity === 'number' ? exitQuantity : 0;
    if (qty <= 0) {
      setError('Exit quantity must be greater than 0.');
      return;
    }

    if (selectedBatch && qty > selectedBatch.current_stock) {
      setError(`Exit quantity (${qty}) cannot exceed current available stock (${selectedBatch.current_stock} units).`);
      return;
    }

    const finalReason = reasonCategory === 'Other' ? customReason.trim() || 'Other' : reasonCategory;
    if (!finalReason) {
      setError('Please specify an exit reason.');
      return;
    }

    const payload = {
      product_id: Number(selectedProductId),
      batch_id: Number(selectedBatchId),
      quantity: qty,
      reason: finalReason,
    };

    setSubmitting(true);
    try {
      if (window.electronAPI && window.electronAPI.stock) {
        const res = await window.electronAPI.stock.exit(payload);
        if (!res.success) {
          setError(res.error || 'Stock exit failed.');
          return;
        }
        setSuccessMsg(`Stock exit recorded successfully! New batch stock: ${res.balance_after} units.`);
      } else {
        setSuccessMsg(`Web Preview: Stock exit of ${payload.quantity} units recorded!`);
      }

      setExitQuantity(1);
      setCustomReason('');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to process stock exit.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedProduct = products.find((p) => p.id === Number(selectedProductId));
  const currentStock = selectedBatch ? selectedBatch.current_stock : 0;
  const exitQtyNum = typeof exitQuantity === 'number' ? exitQuantity : 0;
  const calculatedBalanceAfter = currentStock - exitQtyNum;

  return (
    <div className="view-container">
      <div className="view-header">
        <div className="view-header-title">
          <h2>Outbound Stock Exit</h2>
          <p>Record negative stock movements (issued, sold, or internal use) — Master Admin Restricted</p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className={`btn ${activeTab === 'exit' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('exit')}
          >
            <LogOut size={15} />
            <span>Record Stock Exit</span>
          </button>
          <button
            className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('history')}
          >
            <History size={15} />
            <span>Audit History ({history.length})</span>
          </button>
        </div>
      </div>

      {activeTab === 'exit' && (
        <div className="card-surface" style={{ maxWidth: '750px', margin: '0 auto' }}>
          {isStaff ? (
            <div style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--warning-bg)', color: 'var(--warning)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <Lock size={24} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.4rem' }}>Master Admin Only</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '450px', margin: '0 auto 1.5rem' }}>
                Stock Exit operations record outbound inventory deduction and require Master Admin authorization. You are currently logged in under <strong>Staff Mode</strong>.
              </p>
              <span className="badge badge-warning">Restricted Feature</span>
            </div>
          ) : (
            <form onSubmit={handleExecuteExit}>
              <div className="card-title-bar">
                <h3>
                  <LogOut size={18} className="danger" color="var(--danger)" />
                  <span>Outbound Inventory Form</span>
                </h3>
              </div>

              {error && (
                <div className="alert-banner error">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="alert-banner" style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success)' }}>
                  <CheckCircle2 size={16} />
                  <span>{successMsg}</span>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Select Product *</label>
                  <select
                    className="form-select"
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(Number(e.target.value))}
                    required
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.total_stock || 0} units available)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Select Batch *</label>
                  <select
                    className="form-select"
                    value={selectedBatchId}
                    onChange={(e) => setSelectedBatchId(Number(e.target.value))}
                    required
                    disabled={availableBatches.length === 0}
                  >
                    {availableBatches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.batch_number} (Exp: {b.expiry_date} | Stock: {b.current_stock} units)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Available Stock</label>
                  <input
                    type="text"
                    className="form-input"
                    value={`${currentStock} units`}
                    disabled
                    style={{ background: 'var(--bg-surface-secondary)', fontWeight: 600 }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Exit Quantity *</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Units to deduct"
                    min={1}
                    max={currentStock || 1}
                    value={exitQuantity}
                    onChange={(e) => setExitQuantity(e.target.value ? Number(e.target.value) : '')}
                    required
                    disabled={!selectedBatch || currentStock <= 0}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Exit Reason *</label>
                <select
                  className="form-select"
                  value={reasonCategory}
                  onChange={(e) => setReasonCategory(e.target.value as any)}
                >
                  <option value="Issued">Issued (Hospital Ward / OT Department)</option>
                  <option value="Sold">Sold (Direct Patient Sale)</option>
                  <option value="Internal Use">Internal Use</option>
                  <option value="Other">Other Reason</option>
                </select>
              </div>

              {reasonCategory === 'Other' && (
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Specify Custom Reason *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Expired batch disposal / Transfer"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    required
                  />
                </div>
              )}

              {/* Stock Movement Balance Summary */}
              {selectedBatch && (
                <div
                  style={{
                    background: 'var(--bg-surface-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '1.25rem',
                  }}
                >
                  <span style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>
                    Calculated Balance After Exit:
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>{currentStock}</strong>
                    <ArrowRightLeft size={14} color="var(--text-muted)" />
                    <strong style={{ fontSize: '0.9rem', color: 'var(--danger)' }}>-{exitQtyNum}</strong>
                    <ArrowRightLeft size={14} color="var(--text-muted)" />
                    <strong style={{ fontSize: '1rem', color: calculatedBalanceAfter >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                      = {calculatedBalanceAfter} units
                    </strong>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setExitQuantity(1);
                    setCustomReason('');
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-danger"
                  disabled={!selectedBatch || currentStock <= 0 || submitting}
                >
                  <LogOut size={15} />
                  <span>{submitting ? 'Executing...' : 'Authorize & Exit'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="card-surface">
          <div className="card-title-bar">
            <h3>
              <History size={18} className="primary" />
              <span>Outbound Exit Audit History</span>
            </h3>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '180px' }}>Date & Time</th>
                  <th>Product Name</th>
                  <th>Batch Number</th>
                  <th>Quantity Exited</th>
                  <th>Exit Reason</th>
                  <th>Balance After</th>
                </tr>
              </thead>
              <tbody>
                {history.map((rec) => (
                  <tr key={rec.id}>
                    <td>{rec.created_at}</td>
                    <td><strong>{rec.product_name}</strong></td>
                    <td><code>{rec.batch_number}</code></td>
                    <td>
                      <span className="badge badge-danger">{rec.quantity_changed} units</span>
                    </td>
                    <td><span className="badge badge-warning">{rec.reason}</span></td>
                    <td><strong>{rec.balance_after} units</strong></td>
                  </tr>
                ))}

                {history.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No outbound stock exits recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
