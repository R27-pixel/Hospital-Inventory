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

  // Compute Expiry Status Pill
  const getExpiryStatus = (expiryDateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(expiryDateStr);
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { status: 'EXPIRED', label: 'EXPIRED', css: 'badge-expired', icon: AlertTriangle };
    } else if (diffDays <= 30) {
      return { status: 'EXPIRING_SOON', label: `EXPIRING IN ${diffDays} DAYS`, css: 'badge-expiring-soon', icon: Clock };
    } else {
      return { status: 'NORMAL', label: 'NORMAL', css: 'badge-normal', icon: CheckCircle };
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
                    <th>Expiry Status</th>
                    <th>MRP</th>
                    <th>Purchase Rate</th>
                    <th>GST %</th>
                    <th>Current Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((b) => {
                    const expInfo = getExpiryStatus(b.expiry_date);
                    const ExpIcon = expInfo.icon;
                    const totalGstPct = (b.cgst_percent || 0) + (b.sgst_percent || 0) + (b.igst_percent || 0);
                    return (
                      <tr key={b.id}>
                        <td><strong>{b.batch_number}</strong></td>
                        <td>{b.expiry_date}</td>
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
                      <td colSpan={7} className="empty-table-cell">
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
