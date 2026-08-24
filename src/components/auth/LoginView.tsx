import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogIn, Lock, User, AlertCircle, Building2 } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!loginId.trim() || !password) {
      setError('Please enter both Login ID and Password.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await login(loginId.trim(), password);
      if (!res.success) {
        setError(res.error || 'Invalid Login ID or Password.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during login.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-brand-icon">
            <Building2 size={26} />
          </div>
          <h1>Hospital Inventory</h1>
          <p>CRITICARE HOSPITAL MANAGEMENT</p>
        </div>

        {error && (
          <div className="alert-banner error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">
              <User size={14} />
              <span>Login ID</span>
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. admin or staff1"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <Lock size={14} />
              <span>Password</span>
            </label>
            <input
              type="password"
              className="form-input"
              placeholder="Enter account password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '38px', marginTop: '0.5rem' }} disabled={submitting}>
            <LogIn size={16} />
            <span>{submitting ? 'Authenticating...' : 'Sign In to Portal'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
