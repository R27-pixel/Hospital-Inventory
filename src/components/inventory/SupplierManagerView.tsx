import React, { useState, useEffect } from 'react';
import { Supplier } from '../../vite-env';
import { SupplierFormModal } from './SupplierFormModal';
import { Plus, Search, Truck, Edit } from 'lucide-react';

export const SupplierManagerView: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

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
    setIsFormOpen(true);
  };

  const handleOpenEdit = (sup: Supplier) => {
    setEditingSupplier(sup);
    setIsFormOpen(true);
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
        <button className="btn btn-primary" onClick={handleOpenAdd} data-testid="add-supplier-btn">
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
            data-testid="supplier-search-input"
          />
        </div>
      </div>

      {/* Supplier Grid Table */}
      <div className="card-surface" style={{ padding: '0.75rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading suppliers...</div>
        ) : (
          <div className="table-responsive">
            <table className="data-table" data-testid="suppliers-table">
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
                  <tr key={sup.id} data-testid={`supplier-row-${sup.id}`}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Truck size={15} color="var(--primary)" />
                        <strong data-testid={`supplier-name-${sup.id}`}>{sup.name}</strong>
                      </div>
                    </td>
                    <td>
                      {sup.gstin ? <code data-testid={`supplier-gstin-${sup.id}`}>{sup.gstin}</code> : <span style={{ color: 'var(--text-muted)' }}>N/A</span>}
                    </td>
                    <td>{sup.phone || 'N/A'}</td>
                    <td>{sup.address || 'N/A'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn-icon"
                        onClick={() => handleOpenEdit(sup)}
                        title="Edit Supplier"
                        data-testid={`edit-supplier-btn-${sup.id}`}
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
        )}
      </div>

      {/* Supplier Form Modal */}
      <SupplierFormModal
        isOpen={isFormOpen}
        editingSupplier={editingSupplier}
        onClose={() => setIsFormOpen(false)}
        onSuccess={loadSuppliers}
      />
    </div>
  );
};
