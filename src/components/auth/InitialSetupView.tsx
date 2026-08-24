import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, Lock, AlertCircle, Building2, User, KeyRound } from 'lucide-react';

export const InitialSetupView: React.FC = () => {
  const { setupAccounts } = useAuth();

  // Master Admin state
  const [masterLoginId, setMasterLoginId] = useState('');
  const [masterPassword, setMasterPassword] = useState('');
  const [masterConfirmPassword, setMasterConfirmPassword] = useState('');

  // Staff User state
  const [staffLoginId, setStaffLoginId] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffConfirmPassword, setStaffConfirmPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (masterLoginId.trim().length < 3) {
      setError('Master Admin Login ID must be at least 3 characters.');
      return;
    }
    if (masterPassword.length < 8) {
      setError('Master Admin Password must be at least 8 characters.');
      return;
    }
    if (masterPassword !== masterConfirmPassword) {
      setError('Master Admin passwords do not match.');
      return;
    }

    if (staffLoginId.trim().length < 3) {
      setError('Staff Login ID must be at least 3 characters.');
      return;
    }
    if (staffPassword.length < 8) {
      setError('Staff Password must be at least 8 characters.');
      return;
    }
    if (staffPassword !== staffConfirmPassword) {
      setError('Staff passwords do not match.');
      return;
    }

    if (masterLoginId.trim().toLowerCase() === staffLoginId.trim().toLowerCase()) {
      setError('Master Admin Login ID and Staff Login ID must be different.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await setupAccounts({
        master: {
          login_id: masterLoginId.trim(),
          password: masterPassword,
          display_name: 'Master Admin',
        },
        staff: {
          login_id: staffLoginId.trim(),
          password: staffPassword,
          display_name: 'Staff User',
        },
      });

      if (!res.success) {
        setError(res.error || 'Failed to complete initial account setup.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during setup.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card" style={{ maxWidth: '580px' }}>
        <div className="auth-brand">
          <div className="auth-brand-icon">
            <Building2 size={26} />
          </div>
          <h1>System Setup Wizard</h1>
          <p>Configure Master Admin & Staff Credentials</p>
        </div>

        {error && (
          <div className="alert-banner error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Section 1: Master Admin Account */}
          <div style={{ background: 'var(--bg-surface-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem', fontWeight: 700, fontSize: '0.9rem', color: 'var(--warning)' }}>
              <ShieldCheck size={18} />
              <span>1. MASTER ADMIN ACCOUNT</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Master Login ID</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. admin_master"
                  value={masterLoginId}
                  onChange={(e) => setMasterLoginId(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Master Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Min 8 characters"
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '0.5rem' }}>
              <label className="form-label">Confirm Master Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Re-enter Master password"
                value={masterConfirmPassword}
                onChange={(e) => setMasterConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Section 2: Staff User Account */}
          <div style={{ background: 'var(--bg-surface-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem', fontWeight: 700, fontSize: '0.9rem', color: 'var(--success)' }}>
              <User size={18} />
              <span>2. STAFF OPERATOR ACCOUNT</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Staff Login ID</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. staff_op"
                  value={staffLoginId}
                  onChange={(e) => setStaffLoginId(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Staff Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Min 8 characters"
                  value={staffPassword}
                  onChange={(e) => setStaffPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '0.5rem' }}>
              <label className="form-label">Confirm Staff Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Re-enter Staff password"
                value={staffConfirmPassword}
                onChange={(e) => setStaffConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ height: '40px', marginTop: '0.5rem' }} disabled={submitting}>
            <KeyRound size={16} />
            <span>{submitting ? 'Creating Accounts...' : 'Initialize Accounts & Proceed'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
