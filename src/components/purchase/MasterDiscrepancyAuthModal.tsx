import React, { useState } from 'react';
import { AlertCircle, Lock, ShieldCheck, ArrowRightLeft } from 'lucide-react';

interface DiscrepancyItem {
  field: string;
  supplierVal: string;
  calculatedVal: string;
  diff: string;
}

interface MasterDiscrepancyAuthModalProps {
  isOpen: boolean;
  discrepancies: DiscrepancyItem[];
  onClose: () => void;
  onConfirm: (masterPassword: string) => Promise<void>;
}

export const MasterDiscrepancyAuthModal: React.FC<MasterDiscrepancyAuthModalProps> = ({
  isOpen,
  discrepancies,
  onClose,
  onConfirm,
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password) {
      setError('Master Admin password is required.');
      return;
    }

    setSubmitting(true);
    try {
      await onConfirm(password);
    } catch (err: any) {
      setError(err.message || 'Master authorization failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Lock size={18} color="var(--warning)" />
            <h3>Master Authorization Required</h3>
          </div>
          <button className="btn-icon" onClick={onClose}>×</button>
        </div>

        <div className="alert-banner warning" style={{ marginBottom: '1rem' }}>
          <AlertCircle size={16} />
          <span>
            <strong>Arithmetic Discrepancy Detected:</strong> Printed supplier bill values differ from calculated system totals. Master Admin elevation is required to authorize this invoice.
          </span>
        </div>

        {error && (
          <div className="alert-banner error" style={{ marginBottom: '1rem' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Detailed Discrepancies Table */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
            Detected Financial Discrepancy Breakdown:
          </div>
          <div className="table-responsive" style={{ maxHeight: '180px' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Field / Line</th>
                  <th>Supplier Printed</th>
                  <th>System Calculated</th>
                  <th>Difference</th>
                </tr>
              </thead>
              <tbody>
                {discrepancies.map((d, i) => (
                  <tr key={i}>
                    <td><strong>{d.field}</strong></td>
                    <td>{d.supplierVal}</td>
                    <td>{d.calculatedVal}</td>
                    <td><strong style={{ color: 'var(--danger)' }}>{d.diff}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div className="form-group">
            <label className="form-label">
              <Lock size={14} />
              <span>Enter Master Admin Password *</span>
            </label>
            <input
              type="password"
              className="form-input"
              placeholder="Master Admin password for 1-time elevation"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              <ShieldCheck size={16} />
              <span>{submitting ? 'Verifying & Saving...' : 'Authorize & Commit Invoice'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
