import React, { useState, useEffect } from 'react';
import { Supplier } from '../../vite-env';
import { Truck, X, AlertCircle } from 'lucide-react';

interface SupplierFormModalProps {
  isOpen: boolean;
  editingSupplier?: Supplier | null;
  onClose: () => void;
  onSuccess: (newSupplierId?: number) => void;
}

export const SupplierFormModal: React.FC<SupplierFormModalProps> = ({
  isOpen,
  editingSupplier,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [gstin, setGstin] = useState('');
  const [panNo, setPanNo] = useState('');
  const [drugLicenseNo, setDrugLicenseNo] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [stateName, setStateName] = useState('BIHAR');
  const [stateCode, setStateCode] = useState('10');

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editingSupplier) {
      setName(editingSupplier.name || '');
      setGstin(editingSupplier.gstin || '');
      setPanNo(editingSupplier.pan_no || '');
      setDrugLicenseNo(editingSupplier.drug_license_no || '');
      setPhone(editingSupplier.phone || '');
      setEmail(editingSupplier.email || '');
      setAddress(editingSupplier.address || '');
      setStateName(editingSupplier.state_name || 'BIHAR');
      setStateCode(editingSupplier.state_code || '10');
    } else {
      setName('');
      setGstin('');
      setPanNo('');
      setDrugLicenseNo('');
      setPhone('');
      setEmail('');
      setAddress('');
      setStateName('BIHAR');
      setStateCode('10');
    }
    setError(null);
  }, [editingSupplier, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Supplier Name is required.');
      return;
    }

    const payload = {
      name: name.trim(),
      gstin: gstin.trim() || undefined,
      pan_no: panNo.trim() || undefined,
      drug_license_no: drugLicenseNo.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      state_name: stateName.trim() || 'BIHAR',
      state_code: stateCode.trim() || '10',
    };

    setSubmitting(true);
    try {
      if (editingSupplier) {
        if (window.electronAPI && window.electronAPI.suppliers) {
          const res = await window.electronAPI.suppliers.update({
            id: editingSupplier.id,
            ...payload,
          });
          if (!res.success) {
            setError(res.error || 'Failed to update supplier.');
            setSubmitting(false);
            return;
          }
        }
        onSuccess(editingSupplier.id);
        onClose();
      } else {
        // Create New Supplier
        if (window.electronAPI && window.electronAPI.suppliers) {
          const res = await window.electronAPI.suppliers.create(payload);
          if (!res.success) {
            setError(res.error || 'Failed to add supplier.');
            setSubmitting(false);
            return;
          }
          onSuccess(res.id);
          onClose();
        } else {
          // Web preview fallback
          onSuccess(Date.now());
          onClose();
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save supplier record.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <div className="modal-title-box">
            <Truck size={20} className="primary" />
            <h3>{editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body" data-testid="supplier-form">
          {error && (
            <div className="alert-banner error" style={{ marginBottom: '1rem' }} data-testid="supplier-error-alert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="form-group" style={{ marginBottom: '0.85rem' }}>
            <label className="form-label">Supplier Vendor Name *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. M/S GUPTA SURGICALS / MAA VACCINE"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="supplier-name-input"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '0.85rem' }}>
            <div className="form-group">
              <label className="form-label">GSTIN</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 10BBHPK9558A1ZX"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                data-testid="supplier-gstin-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="text"
                className="form-input"
                placeholder="Contact number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                data-testid="supplier-phone-input"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '0.85rem' }}>
            <div className="form-group">
              <label className="form-label">PAN No.</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. BBHPK9558A"
                value={panNo}
                onChange={(e) => setPanNo(e.target.value)}
                data-testid="supplier-pan-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Drug License No.</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. REG-42501"
                value={drugLicenseNo}
                onChange={(e) => setDrugLicenseNo(e.target.value)}
                data-testid="supplier-dl-input"
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '0.85rem' }}>
            <label className="form-label">Address</label>
            <textarea
              className="form-input"
              placeholder="Street / City / State address"
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              data-testid="supplier-address-input"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.85rem', marginBottom: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">State Name</label>
              <input
                type="text"
                className="form-input"
                value={stateName}
                onChange={(e) => setStateName(e.target.value)}
                data-testid="supplier-state-name-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">State Code</label>
              <input
                type="text"
                className="form-input"
                value={stateCode}
                onChange={(e) => setStateCode(e.target.value)}
                data-testid="supplier-state-code-input"
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting} data-testid="supplier-cancel-btn">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting} data-testid="supplier-save-btn">
              {submitting ? 'Saving...' : editingSupplier ? 'Save Supplier Changes' : 'Create & Select Supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
