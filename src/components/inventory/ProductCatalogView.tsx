import React, { useState, useEffect } from 'react';
import { Product, Batch } from '../../vite-env';
import { BatchListModal } from './BatchListModal';
import { ProductFormModal } from './ProductFormModal';
import { Plus, Search, Filter, Layers, Edit, Package, AlertTriangle, Clock, CheckCircle, Printer, FileText, CheckCircle2 } from 'lucide-react';

export const ProductCatalogView: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [allBatches, setAllBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportMsg, setExportMsg] = useState<string | null>(null);
  const [exportErr, setExportErr] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');
  const [expiryFilter, setExpiryFilter] = useState<'ALL' | 'NORMAL' | 'EXPIRING_SOON' | 'EXPIRED'>('ALL');

  // Modals
  const [selectedProductForBatches, setSelectedProductForBatches] = useState<Product | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const handlePrint = () => {
    if (window.electronAPI && window.electronAPI.reports && window.electronAPI.reports.print) {
      window.electronAPI.reports.print();
    } else {
      window.print();
    }
  };

  const handleExportPdf = async (targetPath?: string) => {
    setExportMsg(null);
    setExportErr(null);
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const sanitizedQuery = searchQuery ? searchQuery.replace(/[^a-zA-Z0-9_-]/g, '_') : 'All';
      const defaultName = `Product-Inventory-${sanitizedQuery}-${todayStr}.pdf`;

      if (window.electronAPI && window.electronAPI.reports && window.electronAPI.reports.exportPdf) {
        const res = await window.electronAPI.reports.exportPdf({
          defaultPath: defaultName,
          targetPath: typeof targetPath === 'string' ? targetPath : undefined,
        });
        if (res.success && res.path) {
          setExportMsg(`PDF Report generated successfully: ${res.path}`);
        } else if (res.error) {
          setExportErr(res.error);
        }
      } else {
        window.print();
      }
    } catch (err: any) {
      setExportErr(err.message || 'Failed to export PDF');
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      if (window.electronAPI && window.electronAPI.products && window.electronAPI.batches) {
        const [prodsData, batchesData] = await Promise.all([
          window.electronAPI.products.getAll(),
          window.electronAPI.batches.getAll(),
        ]);
        if (Array.isArray(prodsData)) setProducts(prodsData);
        if (Array.isArray(batchesData)) setAllBatches(batchesData);
      } else {
        // Fallback for Web Preview
        const sampleProds: Product[] = [
          { id: 1, name: 'TRAN 5ML', hsn_code: '3004', pack_size: '5ml Ampoule', manufacturer: 'STRAN', min_stock_alert: 10, is_archived: 0, total_stock: 25, batch_count: 2, created_at: '', updated_at: '' },
          { id: 2, name: 'AUGMENTIN 625MG', hsn_code: '3004', pack_size: '10 Tablets', manufacturer: 'GSK', min_stock_alert: 15, is_archived: 0, total_stock: 5, batch_count: 1, created_at: '', updated_at: '' },
          { id: 3, name: 'PARACETAMOL 500MG', hsn_code: '3004', pack_size: '10x10 Strips', manufacturer: 'Cipla', min_stock_alert: 20, is_archived: 0, total_stock: 0, batch_count: 0, created_at: '', updated_at: '' },
        ];
        setProducts(sampleProds);
        setAllBatches([
          { id: 101, product_id: 1, batch_number: 'STRAN-2026', expiry_date: '2026-10-31', mrp: 63.63, purchase_rate: 60.00, discount_percent: 0, cgst_percent: 2.5, sgst_percent: 2.5, igst_percent: 0, current_stock: 20, created_at: '', updated_at: '' },
          { id: 102, product_id: 1, batch_number: 'STRAN-EXP', expiry_date: '2026-09-10', mrp: 63.63, purchase_rate: 60.00, discount_percent: 0, cgst_percent: 2.5, sgst_percent: 2.5, igst_percent: 0, current_stock: 5, created_at: '', updated_at: '' },
          { id: 103, product_id: 2, batch_number: 'AUG-09', expiry_date: '2026-08-30', mrp: 200.00, purchase_rate: 150.00, discount_percent: 0, cgst_percent: 6.0, sgst_percent: 6.0, igst_percent: 0, current_stock: 5, created_at: '', updated_at: '' },
        ]);
      }
    } catch (err) {
      console.error('Failed to load inventory catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setIsFormOpen(true);
  };

  // Determine Product Expiry Status across all its active batches
  const getProductExpiryStatus = (productId: number) => {
    if (!Array.isArray(allBatches)) return 'NORMAL';
    const pBatches = allBatches.filter((b) => b.product_id === productId && b.current_stock > 0);
    if (pBatches.length === 0) return 'NORMAL';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let hasExpired = false;
    let hasExpiringSoon = false;

    for (const b of pBatches) {
      if (!b.expiry_date) continue;
      const str = b.expiry_date.trim();
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

      if (isNaN(expDate.getTime())) continue;

      const diffDays = Math.round((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) hasExpired = true;
      else if (diffDays <= 30) hasExpiringSoon = true;
    }

    if (hasExpired) return 'EXPIRED';
    if (hasExpiringSoon) return 'EXPIRING_SOON';
    return 'NORMAL';
  };

  // Combinable Filtering Logic
  const filteredProducts = products.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(q) ||
      p.hsn_code.toLowerCase().includes(q) ||
      (p.manufacturer || '').toLowerCase().includes(q);

    if (!matchesSearch) return false;

    const stock = p.total_stock || 0;
    const minAlert = p.min_stock_alert ?? 10;
    let matchesStock = true;
    if (stockFilter === 'IN_STOCK') matchesStock = stock > minAlert;
    else if (stockFilter === 'LOW_STOCK') matchesStock = stock > 0 && stock <= minAlert;
    else if (stockFilter === 'OUT_OF_STOCK') matchesStock = stock === 0;

    if (!matchesStock) return false;

    const expStatus = getProductExpiryStatus(p.id);
    let matchesExpiry = true;
    if (expiryFilter !== 'ALL') {
      matchesExpiry = expStatus === expiryFilter;
    }

    return matchesExpiry;
  });

  return (
    <div className="view-container">
      {/* Top Header */}
      <div className="view-header">
        <div className="view-header-title">
          <h2>Product Inventory</h2>
          <p>Master catalog definitions, batch tracking & stock alert statuses</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={handlePrint} data-testid="print-inventory-btn">
            <Printer size={15} />
            <span>Print Report</span>
          </button>
          <button className="btn btn-secondary" onClick={() => handleExportPdf()} data-testid="export-inventory-pdf-btn">
            <FileText size={15} />
            <span>Export PDF</span>
          </button>
          <button className="btn btn-primary" onClick={handleOpenAdd} data-testid="add-product-btn">
            <Plus size={15} />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {exportErr && (
        <div className="alert-banner error" data-testid="export-error-alert">
          <AlertTriangle size={16} />
          <span>{exportErr}</span>
        </div>
      )}

      {exportMsg && (
        <div className="alert-banner" style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success)' }} data-testid="export-success-alert">
          <CheckCircle2 size={16} />
          <span>{exportMsg}</span>
        </div>
      )}

      {/* Printable Report Header Metadata */}
      <div className="print-report-header" data-testid="print-report-header">
        <h2>Product Inventory Catalog Report</h2>
        <div className="print-meta">
          <span><strong>Generated:</strong> {new Date().toLocaleString()}</span>
          <span><strong>Search:</strong> {searchQuery || 'None'}</span>
          <span><strong>Stock Filter:</strong> {stockFilter}</span>
          <span><strong>Expiry Filter:</strong> {expiryFilter}</span>
          <span><strong>Total Records:</strong> {filteredProducts.length}</span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="filter-bar">
        <div className="search-box">
          <Search size={15} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search by product name, HSN, or manufacturer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="product-search-input"
          />
        </div>

        <div className="filter-select-group">
          <span>Stock:</span>
          <select
            className="form-select"
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as any)}
            data-testid="product-stock-filter"
          >
            <option value="ALL">All Stock Levels</option>
            <option value="IN_STOCK">In Stock</option>
            <option value="LOW_STOCK">Low Stock (&le; Alert)</option>
            <option value="OUT_OF_STOCK">Out of Stock (0 Units)</option>
          </select>
        </div>

        <div className="filter-select-group">
          <span>Expiry:</span>
          <select
            className="form-select"
            value={expiryFilter}
            onChange={(e) => setExpiryFilter(e.target.value as any)}
            data-testid="product-expiry-filter"
          >
            <option value="ALL">All Expiry Statuses</option>
            <option value="NORMAL">Normal Expiry</option>
            <option value="EXPIRING_SOON">Expiring Soon (&le;30 Days)</option>
            <option value="EXPIRED">Expired Batches</option>
          </select>
        </div>
      </div>

      {/* Main Content Table (Dedicated Horizontal Scroll Container) */}
      <div className="card-surface" style={{ padding: '0.75rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>Loading product inventory...</div>
        ) : (
          <div className="table-responsive">
            <table className="data-table" data-testid="products-table">
              <thead>
                <tr>
                  <th style={{ minWidth: '180px' }}>Product Name</th>
                  <th style={{ minWidth: '110px' }}>Pack Size</th>
                  <th style={{ minWidth: '80px' }}>HSN</th>
                  <th style={{ minWidth: '140px' }}>Manufacturer</th>
                  <th style={{ minWidth: '110px' }}>Batches</th>
                  <th style={{ minWidth: '120px' }}>Total Stock</th>
                  <th style={{ minWidth: '130px' }}>Expiry Warning</th>
                  <th style={{ minWidth: '90px' }}>Status</th>
                  <th style={{ minWidth: '70px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => {
                  const expStatus = getProductExpiryStatus(p.id);
                  const totalStock = p.total_stock || 0;
                  const minAlert = p.min_stock_alert ?? 10;

                  return (
                    <tr key={p.id} data-testid={`product-row-${p.id}`}>
                      <td><strong data-testid={`product-name-${p.id}`}>{p.name}</strong></td>
                      <td>{p.pack_size}</td>
                      <td><code>{p.hsn_code}</code></td>
                      <td>{p.manufacturer || 'N/A'}</td>
                      <td>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedProductForBatches(p)}
                          data-testid={`view-batches-btn-${p.id}`}
                        >
                          <Layers size={13} />
                          <span>{p.batch_count || 0} Batches</span>
                        </button>
                      </td>
                      <td>
                        <strong data-testid={`product-stock-${p.id}`}>{totalStock} units</strong>
                      </td>
                      <td>
                        {expStatus === 'EXPIRED' && (
                          <span className="badge badge-danger">
                            <AlertTriangle size={12} />
                            <span>EXPIRED BATCH</span>
                          </span>
                        )}
                        {expStatus === 'EXPIRING_SOON' && (
                          <span className="badge badge-warning">
                            <Clock size={12} />
                            <span>EXPIRING SOON</span>
                          </span>
                        )}
                        {expStatus === 'NORMAL' && (
                          <span className="badge badge-success">
                            <CheckCircle size={12} />
                            <span>NORMAL</span>
                          </span>
                        )}
                      </td>
                      <td>
                        {totalStock === 0 ? (
                          <span className="badge badge-danger">Out of Stock</span>
                        ) : totalStock <= minAlert ? (
                          <span className="badge badge-warning">Low Stock</span>
                        ) : (
                          <span className="badge badge-success">In Stock</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn-icon"
                          onClick={() => handleOpenEdit(p)}
                          title="Edit Product"
                          data-testid={`edit-product-btn-${p.id}`}
                        >
                          <Edit size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No matching products found in catalog.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Batch List Modal */}
      <BatchListModal
        isOpen={!!selectedProductForBatches}
        product={selectedProductForBatches}
        onClose={() => setSelectedProductForBatches(null)}
      />

      {/* Add / Edit Product Modal */}
      <ProductFormModal
        isOpen={isFormOpen}
        editingProduct={editingProduct}
        onClose={() => setIsFormOpen(false)}
        onSuccess={loadData}
      />
    </div>
  );
};
