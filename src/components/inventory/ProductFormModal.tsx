import React, { useState, useEffect } from 'react';
import { Product } from '../../vite-env';
import { Package, X, AlertCircle, Layers } from 'lucide-react';

interface ProductFormModalProps {
  isOpen: boolean;
  editingProduct: Product | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  editingProduct,
  onClose,
  onSuccess,
}) => {
  // Master Product Catalog Fields
  const [name, setName] = useState('');
  const [hsnCode, setHsnCode] = useState('');
  const [packSize, setPackSize] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [minStockAlert, setMinStockAlert] = useState<number | ''>('');

  // Optional Initial Batch Stock Fields (from bill)
  const [includeInitialBatch, setIncludeInitialBatch] = useState(false);
  const [batchNumber, setBatchNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [mrp, setMrp] = useState<number | ''>('');
  const [purchaseRate, setPurchaseRate] = useState<number | ''>('');
  const [discountPercent, setDiscountPercent] = useState<number | ''>(0);
  const [gstPercent, setGstPercent] = useState<number>(5);
  const [initialQty, setInitialQty] = useState<number | ''>(20);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingProduct) {
      setName(editingProduct.name);
      setHsnCode(editingProduct.hsn_code);
      setPackSize(editingProduct.pack_size);
      setManufacturer(editingProduct.manufacturer || '');
      setMinStockAlert(editingProduct.min_stock_alert ?? '');
      setIncludeInitialBatch(false);
    } else {
      setName('');
      setHsnCode('');
      setPackSize('');
      setManufacturer('');
      setMinStockAlert('');
      setIncludeInitialBatch(false);
      setBatchNumber('');
      setExpiryDate('');
      setMrp('');
      setPurchaseRate('');
      setDiscountPercent(0);
      setGstPercent(5);
      setInitialQty(20);
    }
    setError(null);
  }, [editingProduct, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !hsnCode.trim() || !packSize.trim() || !manufacturer.trim()) {
      setError('Please fill in all required product catalog fields (Name, HSN, Pack, Mfg).');
      return;
    }

    if (!editingProduct && includeInitialBatch) {
      if (!batchNumber.trim() || !expiryDate || typeof mrp !== 'number' || typeof purchaseRate !== 'number' || typeof initialQty !== 'number') {
        setError('Please fill in all Initial Batch fields (Batch No, Expiry, MRP, Rate, Quantity).');
        return;
      }
    }

    const payload: any = {
      name: name.trim(),
      hsn_code: hsnCode.trim(),
      pack_size: packSize.trim(),
      manufacturer: manufacturer.trim(),
      min_stock_alert: typeof minStockAlert === 'number' ? minStockAlert : undefined,
    };

    if (!editingProduct && includeInitialBatch && batchNumber.trim()) {
      payload.initial_batch = {
        batch_number: batchNumber.trim(),
        expiry_date: expiryDate,
        mrp: Number(mrp),
        purchase_rate: Number(purchaseRate),
        discount_percent: typeof discountPercent === 'number' ? discountPercent : 0,
        gst_percent: Number(gstPercent),
        quantity: Number(initialQty),
      };
    }

    if (editingProduct) {
      try {
        if (window.electronAPI && window.electronAPI.products) {
          const res = await window.electronAPI.products.update({ id: editingProduct.id, ...payload });
          if (!res.success) {
            setError(res.error || 'Failed to update product.');
            return;
          }
        }
        onSuccess();
        onClose();
      } catch (err: any) {
        setError(err.message);
      }
    } else {
      // New product creation
      try {
        if (window.electronAPI && window.electronAPI.products) {
          const res = await window.electronAPI.products.create(payload);
          if (!res.success) {
            setError(res.error || 'Failed to create product.');
            return;
          }
        }
        onSuccess();
        onClose();
      } catch (err: any) {
        setError(err.message);
      }
    }
  };

  return (
    <>
      <div className="modal-overlay">
        <div className="modal-card wide">
          <div className="modal-header">
            <div className="modal-title-box">
              <Package size={20} className="primary" />
              <h3>{editingProduct ? 'Edit Product Catalog Item' : 'Add New Master Product'}</h3>
            </div>
            <button className="modal-close-btn" onClick={onClose}><X size={18} /></button>
          </div>

          <form onSubmit={handleSubmit} className="modal-body" data-testid="product-form">
            {error && (
              <div className="auth-alert error" style={{ marginBottom: '1rem' }} data-testid="product-error-alert">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Product Catalog Master Info */}
            <div className="card-box" style={{ marginBottom: '1.25rem' }}>
              <h4 className="card-box-title" style={{ fontSize: '0.95rem' }}>1. Master Catalog Information</h4>
              
              <div className="form-group" style={{ marginBottom: '0.85rem' }}>
                <label className="form-label">Product Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. TRAN 5ML / AUGMENTIN 625MG"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  data-testid="product-name-input"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '0.85rem' }}>
                <div className="form-group">
                  <label className="form-label">HSN Code *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 3004"
                    value={hsnCode}
                    onChange={(e) => setHsnCode(e.target.value)}
                    data-testid="product-hsn-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Pack Size *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 5ml Ampoule"
                    value={packSize}
                    onChange={(e) => setPackSize(e.target.value)}
                    data-testid="product-pack-size-input"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.85rem' }}>
                <div className="form-group">
                  <label className="form-label">Manufacturer (Mfg) *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. STRAN / Cipla"
                    value={manufacturer}
                    onChange={(e) => setManufacturer(e.target.value)}
                    data-testid="product-mfr-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Min Alert Threshold</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="10"
                    min={0}
                    value={minStockAlert}
                    onChange={(e) => setMinStockAlert(e.target.value ? Number(e.target.value) : '')}
                    data-testid="product-min-stock-input"
                  />
                </div>
              </div>
            </div>

            {/* Optional Initial Batch Setup (From Bill) */}
            {!editingProduct && (
              <div className="card-box">
                <div className="card-box-header" style={{ cursor: 'pointer' }} onClick={() => setIncludeInitialBatch(!includeInitialBatch)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Layers size={18} color="var(--primary)" />
                    <h4 className="card-box-title" style={{ fontSize: '0.95rem' }}>
                      2. Add Initial Batch & Stock Details (Optional - From Bill)
                    </h4>
                  </div>
                  <input
                    type="checkbox"
                    checked={includeInitialBatch}
                    onChange={(e) => setIncludeInitialBatch(e.target.checked)}
                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    data-testid="include-initial-batch-checkbox"
                  />
                </div>

                {includeInitialBatch && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.85rem', marginTop: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label">Batch No. *</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. STRAN-2026"
                        value={batchNumber}
                        onChange={(e) => setBatchNumber(e.target.value)}
                        data-testid="batch-number-input"
                        required={includeInitialBatch}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Expiry Date *</label>
                      <input
                        type="date"
                        className="form-input"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                        data-testid="batch-expiry-input"
                        required={includeInitialBatch}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">M.R.P (₹) *</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        placeholder="63.63"
                        value={mrp}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setMrp(e.target.value ? Number(e.target.value) : '')}
                        data-testid="batch-mrp-input"
                        required={includeInitialBatch}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Rate (₹) *</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        placeholder="60.00"
                        value={purchaseRate}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setPurchaseRate(e.target.value ? Number(e.target.value) : '')}
                        data-testid="batch-rate-input"
                        required={includeInitialBatch}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Disc %</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        placeholder="0.00"
                        value={discountPercent}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setDiscountPercent(e.target.value ? Number(e.target.value) : '')}
                        data-testid="batch-discount-input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">GST % *</label>
                      <select
                        className="form-input"
                        value={gstPercent}
                        onChange={(e) => setGstPercent(Number(e.target.value))}
                        data-testid="batch-gst-select"
                      >
                        <option value={5}>5.00%</option>
                        <option value={12}>12.00%</option>
                        <option value={18}>18.00%</option>
                        <option value={28}>28.00%</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Initial Qty *</label>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="20"
                        min={1}
                        value={initialQty}
                        onChange={(e) => setInitialQty(e.target.value ? Number(e.target.value) : '')}
                        data-testid="batch-qty-input"
                        required={includeInitialBatch}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="modal-actions" style={{ marginTop: '1.25rem' }}>
              <button type="button" className="btn-secondary" onClick={onClose} data-testid="product-cancel-btn">
                Cancel
              </button>
              <button type="submit" className="btn-primary" data-testid="product-save-btn">
                {editingProduct ? 'Save Product Changes' : 'Create Product Catalog Item'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};
