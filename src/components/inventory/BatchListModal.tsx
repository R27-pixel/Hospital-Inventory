import React, { useState, useEffect } from 'react';
import { Batch, Product } from '../../vite-env';
import { Layers, X, Calendar, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface BatchListModalProps {
  isOpen: boolean;
  product: Product | null;
  onClose: () => void;
}

export const BatchListModal: React.FC<BatchListModalProps> = ({ isOpen, product, onClose }) => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && product) {
      loadBatches();
    }
  }, [isOpen, product]);

  const loadBatches = async () => {
    if (!product) return;
    setLoading(true);
    try {
      if (window.electronAPI && window.electronAPI.batches) {
        const data = await window.electronAPI.batches.getByProduct(product.id);
        setBatches(data);
      } else {
        // Mock fallback
        setBatches([
          { id: 101, product_id: product.id, product_name: product.name, batch_number: 'STRAN-2026', expiry_date: '2026-10-31', mrp: 63.63, purchase_rate: 60.00, discount_percent: 0, cgst_percent: 2.5, sgst_percent: 2.5, igst_percent: 0, current_stock: 20, created_at: '', updated_at: '' },
          { id: 102, product_id: product.id, product_name: product.name, batch_number: 'STRAN-EXP', expiry_date: '2026-09-10', mrp: 63.63, purchase_rate: 60.00, discount_percent: 0, cgst_percent: 2.5, sgst_percent: 2.5, igst_percent: 0, current_stock: 5, created_at: '', updated_at: '' },
        ]);
      }
    } catch (err) {
      console.error('Failed to load batches:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !product) return null;

  // Compute Expiry Status Pill & Days Remaining
  const getExpiryInfo = (expiryDateStr: string) => {
    if (!expiryDateStr) {
      return { days_remaining: 0, status: 'NORMAL', label: 'NORMAL', css: 'badge-normal', icon: CheckCircle };
    }

    const str = expiryDateStr.trim();
    let expDate: Date;

    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const [y, m, d] = str.split('-').map((v) => parseInt(v, 10));
      expDate = new Date(y, m - 1, d, 0, 0, 0, 0);
    } else if (/^\d{2}\/\d{4}$/.test(str)) {
      const [m, y] = str.split('/').map((v) => parseInt(v, 10));
      expDate = new Date(y, m, 0, 0, 0, 0, 0);
    } else if (/^\d{4}-\d{2}$/.test(str)) {
      const [y, m] = str.split('-').map((v) => parseInt(v, 10));
      expDate = new Date(y, m, 0, 0, 0, 0, 0);
    } else {
      expDate = new Date(str);
      expDate.setHours(0, 0, 0, 0);
    }

    if (isNaN(expDate.getTime())) {
      return { days_remaining: 0, status: 'NORMAL', label: 'NORMAL', css: 'badge-normal', icon: CheckCircle };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = expDate.getTime() - today.getTime();
    const days_remaining = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (days_remaining < 0) {
      return { days_remaining, status: 'EXPIRED', label: 'EXPIRED', css: 'badge-expired', icon: AlertTriangle };
    } else if (days_remaining <= 30) {
      return { days_remaining, status: 'EXPIRING_SOON', label: 'EXPIRING SOON', css: 'badge-expiring-soon', icon: Clock };
    } else {
      return { days_remaining, status: 'NORMAL', label: 'NORMAL', css: 'badge-normal', icon: CheckCircle };
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card wide">
        <div className="modal-header">
          <div className="modal-title-box">
            <Layers size={20} className="primary" />
            <div>
              <h3>Batches — {product.name}</h3>
              <p className="modal-subtitle">Pack: {product.pack_size} | HSN: {product.hsn_code} | Mfg: {product.manufacturer || 'N/A'}</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body">
          {loading ? (
            <p className="loading-text">Loading batch inventory...</p>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Batch No</th>
                    <th>Expiry Date</th>
                    <th>Days Remaining</th>
                    <th>Expiry Status</th>
                    <th>MRP</th>
                    <th>Purchase Rate</th>
                    <th>GST %</th>
                    <th>Current Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((b) => {
                    const expInfo = getExpiryInfo(b.expiry_date);
                    const ExpIcon = expInfo.icon;
                    const totalGstPct = (b.cgst_percent || 0) + (b.sgst_percent || 0) + (b.igst_percent || 0);
                    return (
                      <tr key={b.id}>
                        <td><strong>{b.batch_number}</strong></td>
                        <td>{b.expiry_date}</td>
                        <td>
                          {expInfo.days_remaining < 0 ? (
                            <strong style={{ color: 'var(--danger)' }}>{expInfo.days_remaining} days</strong>
                          ) : (
                            <strong>{expInfo.days_remaining} days</strong>
                          )}
                        </td>
                        <td>
                          <span className={`status-pill ${expInfo.css}`}>
                            <ExpIcon size={12} />
                            <span>{expInfo.label}</span>
                          </span>
                        </td>
                        <td>₹{b.mrp.toFixed(2)}</td>
                        <td>₹{b.purchase_rate.toFixed(2)}</td>
                        <td>{totalGstPct}%</td>
                        <td>
                          <span className={`stock-count ${b.current_stock === 0 ? 'zero' : b.current_stock <= (product.min_stock_alert || 10) ? 'low' : 'normal'}`}>
                            {b.current_stock} units
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                  {batches.length === 0 && (
                    <tr>
                      <td colSpan={8} className="empty-table-cell">
                        No batch entries registered for this product yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
