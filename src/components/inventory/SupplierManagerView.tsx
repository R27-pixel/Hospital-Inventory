import React, { useState, useEffect } from 'react';
import { Supplier } from '../../vite-env';
import { useAuth } from '../../context/AuthContext';
import { Plus, Search, Truck, Edit, AlertCircle, Phone, MapPin, FileText } from 'lucide-react';

export const SupplierManagerView: React.FC = () => {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Form states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [name, setName] = useState('');
  const [gstin, setGstin] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isStaff = user?.role === 'STAFF';

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      if (window.electronAPI && window.electronAPI.suppliers) {
        const data = await window.electronAPI.suppliers.getAll();
        setSuppliers(data);
      } else {
        // Fallback for web preview
        setSuppliers([
          { id: 1, name: 'M/S GUPTA SURGICALS', gstin: '10BBHPK9558A1ZX', phone: '7717784799', address: 'MOTIHARI, BIHAR', is_archived: 0, created_at: '', updated_at: '' },
          { id: 2, name: 'CIPLA PHARMA DISTRIBUTORS', gstin: '10AAACC1234A1Z5', phone: '9835012345', address: 'PATNA, BIHAR', is_archived: 0, created_at: '', updated_at: '' },
        ]);
      }
    } catch (err: any) {
      console.error('Failed to load suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setName('');
    setGstin('');
    setPhone('');
    setAddress('');
    setError(null);
    setIsAddOpen(true);
  };

  const handleOpenEdit = (sup: Supplier) => {
    setEditingSupplier(sup);
    setName(sup.name);
    setGstin(sup.gstin || '');
    setPhone(sup.phone || '');
    setAddress(sup.address || '');
    setError(null);
    setIsAddOpen(true);
  };

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
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
    };

    if (editingSupplier) {
      try {
        if (window.electronAPI && window.electronAPI.suppliers) {
          const res = await window.electronAPI.suppliers.update({
            id: editingSupplier.id,
            ...payload,
          });
          if (!res.success) {
            setError(res.error || 'Failed to update supplier.');
            return;
          }
        }
        setIsAddOpen(false);
        await loadSuppliers();
      } catch (err: any) {
        setError(err.message);
      }
    } else {
      // Create new supplier
      try {
        if (window.electronAPI && window.electronAPI.suppliers) {
          const res = await window.electronAPI.suppliers.create(payload);
          if (!res.success) {
            setError(res.error || 'Failed to add supplier.');
            return;
          }
        }
        setIsAddOpen(false);
        await loadSuppliers();
      } catch (err: any) {
        setError(err.message);
      }
    }
  };

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.gstin && s.gstin.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="view-container">
      <div className="view-header">
        <div className="view-header-title">
          <h2>Supplier Directory</h2>
          <p>Manage registered vendors & purchase invoice suppliers</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={15} />
          <span>Add New Supplier</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="search-box">
          <Search size={15} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search suppliers by name or GSTIN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Supplier Grid Table */}
      <div className="card-surface" style={{ padding: '0.75rem' }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '220px' }}>Supplier Name</th>
                <th style={{ width: '160px' }}>GSTIN</th>
                <th style={{ width: '130px' }}>Phone Number</th>
                <th>Address</th>
                <th style={{ width: '80px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.map((sup) => (
                <tr key={sup.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Truck size={15} color="var(--primary)" />
                      <strong>{sup.name}</strong>
                    </div>
                  </td>
                  <td>
                    {sup.gstin ? <code>{sup.gstin}</code> : <span style={{ color: 'var(--text-muted)' }}>N/A</span>}
                  </td>
                  <td>{sup.phone || 'N/A'}</td>
                  <td>{sup.address || 'N/A'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn-icon"
                      onClick={() => handleOpenEdit(sup)}
                      title="Edit Supplier"
                    >
                      <Edit size={14} />
                    </button>
                  </td>
                </tr>
              ))}

              {filteredSuppliers.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No suppliers found matching your query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isAddOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}</h3>
              <button className="btn-icon" onClick={() => setIsAddOpen(false)}>×</button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {error && (
                <div className="alert-banner error">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Supplier Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. M/S GUPTA SURGICALS"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">GSTIN</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="15-digit GSTIN (e.g. 10BBHPK9558A1ZX)"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Contact phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Address</label>
                <textarea
                  className="form-input"
                  placeholder="Street / City / State address"
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingSupplier ? 'Save Changes' : 'Create Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
