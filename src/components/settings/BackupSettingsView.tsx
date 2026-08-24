import React, { useState, useEffect } from 'react';
import { BackupLogRecord } from '../../vite-env';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, Download, KeyRound, CheckCircle2, AlertCircle, HardDrive, History, User } from 'lucide-react';

export const BackupSettingsView: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<BackupLogRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [backupMsg, setBackupMsg] = useState<string | null>(null);
  const [backupErr, setBackupErr] = useState<string | null>(null);

  // Change Password state
  const [targetRole, setTargetRole] = useState<'STAFF' | 'MASTER'>(user?.role === 'MASTER' ? 'MASTER' : 'STAFF');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passMsg, setPassMsg] = useState<string | null>(null);
  const [passErr, setPassErr] = useState<string | null>(null);
  const [changingPass, setChangingPass] = useState(false);

  const isStaff = user?.role === 'STAFF';

  const loadBackupLogs = async () => {
    setLoading(true);
    try {
      if (window.electronAPI && window.electronAPI.backup) {
        const data = await window.electronAPI.backup.getLogs();
        setLogs(data);
      } else {
        // Fallback for Web Preview
        setLogs([
          { id: 1, file_path: 'C:\\AppData\\hospital-inventory\\backups\\inventory_backup_20260822.db', file_size_bytes: 145800, backup_type: 'AUTOMATIC_SCHEDULED', status: 'SUCCESS', created_at: new Date().toLocaleString() },
        ]);
      }
    } catch (err) {
      console.error('Failed to load backup logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBackupLogs();
  }, []);

  const handleTriggerBackup = async () => {
    setBackupMsg(null);
    setBackupErr(null);

    if (isStaff) {
      setBackupErr('Privileged Operation: Manual database backups require Master Admin authorization.');
      return;
    }

    try {
      if (window.electronAPI && window.electronAPI.backup) {
        const res = await window.electronAPI.backup.trigger();
        if (!res.success) {
          setBackupErr(res.error || 'Backup creation failed.');
          return;
        }
        setBackupMsg(`Manual database backup created successfully: ${res.path}`);
        await loadBackupLogs();
      } else {
        setBackupMsg('Web Preview: Manual backup triggered successfully.');
      }
    } catch (err: any) {
      setBackupErr(err.message || 'Failed to trigger backup.');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg(null);
    setPassErr(null);

    if (newPassword.length < 6) {
      setPassErr('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPassErr('Passwords do not match.');
      return;
    }

    setChangingPass(true);
    try {
      if (window.electronAPI && window.electronAPI.auth) {
        const res = await window.electronAPI.auth.changePassword({ targetRole, newPassword });
        if (!res.success) {
          setPassErr(res.error || 'Failed to update password.');
          return;
        }
        setPassMsg(`Password for ${targetRole} account updated successfully!`);
      } else {
        setPassMsg(`Web Preview: Password for ${targetRole} updated!`);
      }

      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      setPassErr(err.message || 'Failed to update password.');
    } finally {
      setChangingPass(false);
    }
  };

  return (
    <div className="view-container">
      <div className="view-header">
        <div className="view-header-title">
          <h2>Backup & Master Security</h2>
          <p>Automated database snapshots, manual backup triggers & account security</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {/* Section 1: Backup Controls */}
        <div className="card-surface">
          <div className="card-title-bar">
            <h3>
              <HardDrive size={18} className="primary" />
              <span>Database Backup & Recovery</span>
            </h3>
          </div>

          <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Automated SQLite database backups run every 24 hours and on application startup. Master Admin users can manually trigger an instant database snapshot at any time.
          </p>

          {backupErr && (
            <div className="alert-banner error">
              <AlertCircle size={16} />
              <span>{backupErr}</span>
            </div>
          )}

          {backupMsg && (
            <div className="alert-banner" style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success)' }}>
              <CheckCircle2 size={16} />
              <span>{backupMsg}</span>
            </div>
          )}

          <div style={{ background: 'var(--bg-surface-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.85rem', marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
              Backup Destination Directory:
            </div>
            <code style={{ fontSize: '0.78rem', color: 'var(--primary)', wordBreak: 'break-all' }}>
              %APPDATA%/hospital-inventory/backups/
            </code>
          </div>

          <button
            className="btn btn-primary"
            onClick={handleTriggerBackup}
            disabled={isStaff}
            style={{ width: '100%' }}
          >
            <Download size={16} />
            <span>{isStaff ? 'Manual Backup Restricted (Master Only)' : 'Trigger Instant Manual Backup'}</span>
          </button>
        </div>

        {/* Section 2: Account Password Management */}
        <div className="card-surface">
          <div className="card-title-bar">
            <h3>
              <KeyRound size={18} className="primary" />
              <span>Account Security Management</span>
            </h3>
          </div>

          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {passErr && (
              <div className="alert-banner error">
                <AlertCircle size={16} />
                <span>{passErr}</span>
              </div>
            )}

            {passMsg && (
              <div className="alert-banner" style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success)' }}>
                <CheckCircle2 size={16} />
                <span>{passMsg}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Target Account Role</label>
              <select
                className="form-select"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value as any)}
                disabled={isStaff}
              >
                <option value="STAFF">STAFF Account</option>
                {user?.role === 'MASTER' && <option value="MASTER">MASTER ADMIN Account</option>}
              </select>
              {isStaff && (
                <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  Staff users may only update their own Staff password.
                </span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">New Password *</label>
              <input
                type="password"
                className="form-input"
                placeholder="Min 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password *</label>
              <input
                type="password"
                className="form-input"
                placeholder="Re-enter new password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.25rem' }} disabled={changingPass}>
              <ShieldCheck size={16} />
              <span>{changingPass ? 'Updating...' : `Update ${targetRole} Password`}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Backup Audit History */}
      <div className="card-surface" style={{ marginTop: '0.5rem' }}>
        <div className="card-title-bar">
          <h3>
            <History size={18} className="primary" />
            <span>Backup History Ledger</span>
          </h3>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '180px' }}>Date & Time</th>
                <th>Backup Type</th>
                <th>Destination File Path</th>
                <th>File Size</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{log.created_at}</td>
                  <td>
                    <span className="badge badge-info">{log.backup_type}</span>
                  </td>
                  <td><code>{log.file_path}</code></td>
                  <td>{(log.file_size_bytes / 1024).toFixed(1)} KB</td>
                  <td>
                    {log.status === 'SUCCESS' ? (
                      <span className="badge badge-success">SUCCESS</span>
                    ) : (
                      <span className="badge badge-danger">FAILED</span>
                    )}
                  </td>
                </tr>
              ))}

              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No database backup records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
