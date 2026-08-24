import React, { useState, useEffect } from 'react';
import { Supplier, Product, PurchaseItemInput, PurchaseInvoice } from '../../vite-env';
import { useAuth } from '../../context/AuthContext';
import { ProductFormModal } from '../inventory/ProductFormModal';
import { MasterDiscrepancyAuthModal } from './MasterDiscrepancyAuthModal';
import {
  FileText,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Calculator,
  History,
  Building2,
  ShieldAlert,
  ArrowRightLeft,
  PieChart,
} from 'lucide-react';

export const PurchaseEntryView: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [loading, setLoading] = useState(false);

  // Form Header State
  const [supplierId, setSupplierId] = useState<number | ''>('');
  const [documentType, setDocumentType] = useState<'TAX_INVOICE' | 'CHALLAN'>('TAX_INVOICE');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [orderNo, setOrderNo] = useState('');
  const [orderDate, setOrderDate] = useState('');
  const [lrNo, setLrNo] = useState('');
  const [lrDate, setLrDate] = useState('');
  const [casesCount, setCasesCount] = useState<number | ''>(1);
  const [remarks, setRemarks] = useState('');

  // Supplier Printed Totals (Entered from Physical Invoice)
  const [supplierTaxableTotal, setSupplierTaxableTotal] = useState<number | ''>('');
  const [supplierOtherCharges, setSupplierOtherCharges] = useState<number | ''>(0);
  const [supplierRoundOff, setSupplierRoundOff] = useState<number | ''>(0);
  const [supplierGrandTotal, setSupplierGrandTotal] = useState<number | ''>('');

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal States
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isDiscrepancyModalOpen, setIsDiscrepancyModalOpen] = useState(false);
  const [pendingDiscrepancies, setPendingDiscrepancies] = useState<any[]>([]);

  // Form Line Items State (Based on MAA VACCINE Invoice Format)
  const [items, setItems] = useState<PurchaseItemInput[]>([
    {
      product_name: 'TUBERVAC(BCG) 1 ML VIAL',
      hsn_code: '30049099',
      pack_size: '1 Vial',
      manufacturer: 'SERUM',
      batch_number: '0375MA009',
      mfg_date: '',
      expiry_date: '04/2027',
      mrp: 85.56,
      quantity: 10,
      free_quantity: 0,
      purchase_rate: 68.49,
      discount_percent: 0,
      cgst_percent: 2.5,
      sgst_percent: 2.5,
      igst_percent: 0,
      supplier_net_rate: 71.91,
      supplier_line_amount: 719.15,
    },
  ]);

  const isStaff = user?.role === 'STAFF';

  const loadInitialData = async () => {
    setLoading(true);
    try {
      if (window.electronAPI && window.electronAPI.suppliers && window.electronAPI.products && window.electronAPI.purchases) {
        const [sups, prods, invs] = await Promise.all([
          window.electronAPI.suppliers.getAll(),
          window.electronAPI.products.getAll(),
          window.electronAPI.purchases.getAll(),
        ]);
        setSuppliers(sups);
        setProducts(prods.filter((p) => p.is_archived === 0));
        setInvoices(invs);
        if (sups.length > 0 && !supplierId) {
          setSupplierId(sups[0].id);
        }
      } else {
        // Fallback for Web Preview
        const sampleSups = [
          { id: 1, name: 'MAA VACCINE', gstin: '10BBHPK9558A1ZX', phone: '9835012345', address: 'PATNA, BIHAR', is_archived: 0, created_at: '', updated_at: '' },
          { id: 2, name: 'M/S GUPTA SURGICALS', gstin: '10BBHPK9558A1ZX', phone: '7717784799', address: 'MOTIHARI, BIHAR', is_archived: 0, created_at: '', updated_at: '' },
        ];
        setSuppliers(sampleSups);
        setSupplierId(1);
        setInvoices([
          { id: 1, invoice_number: 'L-00275', supplier_id: 1, supplier_name: 'MAA VACCINE', invoice_date: '2026-08-22', total_taxable_amount: 684.9, total_cgst: 17.12, total_sgst: 17.12, total_gst: 34.25, grand_total: 719.15, created_at: '' },
        ]);
      }
    } catch (err) {
      console.error('Failed to load purchase initialization data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        product_name: '',
        hsn_code: '3004',
        pack_size: '1 Vial',
        manufacturer: '',
        batch_number: '',
        mfg_date: '',
        expiry_date: '',
        mrp: 0,
        quantity: 1,
        free_quantity: 0,
        purchase_rate: 0,
        discount_percent: 0,
        cgst_percent: 2.5,
        sgst_percent: 2.5,
        igst_percent: 0,
        supplier_net_rate: 0,
        supplier_line_amount: 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: keyof PurchaseItemInput, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSelectProductSuggestion = (index: number, productName: string) => {
    const found = products.find((p) => p.name.toLowerCase() === productName.toLowerCase());
    const newItems = [...items];
    if (found) {
      newItems[index] = {
        ...newItems[index],
        product_id: found.id,
        product_name: found.name,
        hsn_code: found.hsn_code,
        pack_size: found.pack_size,
        manufacturer: found.manufacturer || newItems[index].manufacturer,
      };
    } else {
      newItems[index] = { ...newItems[index], product_id: undefined, product_name: productName };
    }
    setItems(newItems);
  };

  // Calculation Logic across Line Items & GST Classes
  const calculateTotals = () => {
    let totalItemsCount = items.length;
    let totalStockQuantity = 0;
    let calcTaxable = 0;
    let calcDiscount = 0;
    let calcCgst = 0;
    let calcSgst = 0;
    let calcIgst = 0;

    const classMap: { [key: number]: { taxable: number; cgst: number; sgst: number; igst: number; totalGst: number } } = {};

    items.forEach((item) => {
      const billedQty = item.quantity || 0;
      const freeQty = item.free_quantity || 0;
      totalStockQuantity += (billedQty + freeQty);

      const gross = (item.purchase_rate || 0) * billedQty;
      const disc = gross * ((item.discount_percent || 0) / 100);
      const lineTaxable = gross - disc;

      const cgst = lineTaxable * ((item.cgst_percent || 0) / 100);
      const sgst = lineTaxable * ((item.sgst_percent || 0) / 100);
      const igst = lineTaxable * ((item.igst_percent || 0) / 100);

      calcTaxable += lineTaxable;
      calcDiscount += disc;
      calcCgst += cgst;
      calcSgst += sgst;
      calcIgst += igst;

      const totalRatePct = (item.cgst_percent || 0) + (item.sgst_percent || 0) + (item.igst_percent || 0);
      if (!classMap[totalRatePct]) {
        classMap[totalRatePct] = { taxable: 0, cgst: 0, sgst: 0, igst: 0, totalGst: 0 };
      }
      classMap[totalRatePct].taxable += lineTaxable;
      classMap[totalRatePct].cgst += cgst;
      classMap[totalRatePct].sgst += sgst;
      classMap[totalRatePct].igst += igst;
      classMap[totalRatePct].totalGst += (cgst + sgst + igst);
    });

    const calcTotalGst = calcCgst + calcSgst + calcIgst;
    const othCharges = typeof supplierOtherCharges === 'number' ? supplierOtherCharges : 0;
    const rndOff = typeof supplierRoundOff === 'number' ? supplierRoundOff : 0;
    const calcGrandTotal = calcTaxable + calcTotalGst + othCharges + rndOff;

    return {
      totalItemsCount,
      totalStockQuantity,
      calcTaxable,
      calcDiscount,
      calcCgst,
      calcSgst,
      calcIgst,
      calcTotalGst,
      calcGrandTotal,
      classMap,
    };
  };

  const totals = calculateTotals();

  // Discrepancy Detection: Supplier Printed Total vs System Calculated Total
  const checkDiscrepancies = () => {
    const list: any[] = [];
    const printedGrandTotal = typeof supplierGrandTotal === 'number' && supplierGrandTotal > 0 ? supplierGrandTotal : totals.calcGrandTotal;
    const diffGrand = Math.abs(printedGrandTotal - totals.calcGrandTotal);

    if (diffGrand > 0.01) {
      list.push({
        field: 'Grand Total Amount',
        supplierVal: `₹${printedGrandTotal.toFixed(2)}`,
        calculatedVal: `₹${totals.calcGrandTotal.toFixed(2)}`,
        diff: `₹${(printedGrandTotal - totals.calcGrandTotal).toFixed(2)}`,
      });
    }

    const printedTaxable = typeof supplierTaxableTotal === 'number' && supplierTaxableTotal > 0 ? supplierTaxableTotal : totals.calcTaxable;
    const diffTaxable = Math.abs(printedTaxable - totals.calcTaxable);
    if (diffTaxable > 0.01) {
      list.push({
        field: 'Total Taxable Base',
        supplierVal: `₹${printedTaxable.toFixed(2)}`,
        calculatedVal: `₹${totals.calcTaxable.toFixed(2)}`,
        diff: `₹${(printedTaxable - totals.calcTaxable).toFixed(2)}`,
      });
    }

    return list;
  };

  const discrepancies = checkDiscrepancies();
  const hasDiscrepancy = discrepancies.length > 0;

  const handleSaveCall = async (elevationCredentials?: { loginId: string; password: string }) => {
    setError(null);
    setSuccessMsg(null);

    if (!supplierId) {
      setError('Please select a Supplier.');
      return;
    }
    if (!invoiceNumber.trim()) {
      setError('Invoice / Challan Number is required.');
      return;
    }

    const payload: any = {
      supplier_id: Number(supplierId),
      document_type: documentType,
      invoice_number: invoiceNumber.trim(),
      invoice_date: invoiceDate,
      order_no: orderNo.trim() || undefined,
      order_date: orderDate || undefined,
      lr_no: lrNo.trim() || undefined,
      lr_date: lrDate || undefined,
      cases_count: typeof casesCount === 'number' ? casesCount : 0,

      supplier_taxable_total: typeof supplierTaxableTotal === 'number' ? supplierTaxableTotal : totals.calcTaxable,
      supplier_discount_total: totals.calcDiscount,
      supplier_cgst_total: totals.calcCgst,
      supplier_sgst_total: totals.calcSgst,
      supplier_igst_total: totals.calcIgst,
      supplier_total_gst: totals.calcTotalGst,
      supplier_other_charges: typeof supplierOtherCharges === 'number' ? supplierOtherCharges : 0,
      supplier_round_off: typeof supplierRoundOff === 'number' ? supplierRoundOff : 0,
      supplier_grand_total: typeof supplierGrandTotal === 'number' ? supplierGrandTotal : totals.calcGrandTotal,

      master_elevation_credentials: elevationCredentials ? { loginId: 'admin', password: elevationCredentials.password } : undefined,
      remarks: remarks.trim() || undefined,
      items,
    };

    try {
      if (window.electronAPI && window.electronAPI.purchases) {
        const res = await window.electronAPI.purchases.create(payload);
        if (!res.success) {
          setError(res.error || 'Failed to submit purchase invoice.');
          return;
        }
      }

      setSuccessMsg(`Purchase Invoice ${invoiceNumber} saved cleanly & inventory stock updated! (Stock added = Qty + Free)`);
      setIsDiscrepancyModalOpen(false);
      setInvoiceNumber('');
      setOrderNo('');
      setLrNo('');
      setRemarks('');
      setSupplierTaxableTotal('');
      setSupplierGrandTotal('');
      await loadInitialData();
    } catch (err: any) {
      setError(err.message || 'Failed to submit purchase invoice.');
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasDiscrepancy) {
      setPendingDiscrepancies(discrepancies);
      setIsDiscrepancyModalOpen(true);
    } else {
      await handleSaveCall();
    }
  };

  return (
    <div className="view-container">
      {/* Top Header */}
      <div className="view-header">
        <div className="view-header-title">
          <h2>Purchase Invoice Entry</h2>
          <p>Authoritative inward stock entry based on MAA VACCINE & Gupta Surgicals invoice formats</p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            className={`btn ${activeTab === 'create' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('create')}
          >
            <FileText size={15} />
            <span>New Invoice Entry</span>
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('history')}
          >
            <History size={15} />
            <span>Purchase History ({invoices.length})</span>
          </button>
        </div>
      </div>

      {activeTab === 'create' && (
        <form onSubmit={handleFormSubmit}>
          {error && (
            <div className="alert-banner error" style={{ marginBottom: '1rem' }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="alert-banner" style={{ marginBottom: '1rem', background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success)' }}>
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Section 1: Header Meta Details (Supplier & Buyer Info) */}
          <div className="card-surface" style={{ marginBottom: '1rem' }}>
            <div className="card-title-bar">
              <h3>
                <FileText size={18} className="primary" />
                <span>Invoice Header & Buyer Profile</span>
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.25rem' }}>
              {/* Supplier & Invoice Form Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem' }}>
                <div className="form-group">
                  <label className="form-label">Supplier Vendor *</label>
                  <select
                    className="form-select"
                    value={supplierId}
                    onChange={(e) => setSupplierId(Number(e.target.value))}
                    required
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.gstin ? `(${s.gstin})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Document Type *</label>
                  <select
                    className="form-select"
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value as any)}
                    required
                  >
                    <option value="TAX_INVOICE">Tax Invoice</option>
                    <option value="CHALLAN">Delivery Challan</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Invoice / Challan No. *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. L-00275"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Invoice Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Order No. (Optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="P.O. Number"
                    value={orderNo}
                    onChange={(e) => setOrderNo(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Order Date (Optional)</label>
                  <input
                    type="date"
                    className="form-input"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">LR No. (Transport)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="LR Receipt No"
                    value={lrNo}
                    onChange={(e) => setLrNo(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">LR Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={lrDate}
                    onChange={(e) => setLrDate(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Cases Count</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Cartons/Boxes"
                    value={casesCount}
                    onChange={(e) => setCasesCount(e.target.value ? Number(e.target.value) : '')}
                  />
                </div>
              </div>

              {/* Buyer / Hospital Profile Card (Read-only) */}
              <div style={{ background: 'var(--bg-surface-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                  <Building2 size={16} color="var(--primary)" />
                  <span>Hospital Buyer Profile</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.78rem', color: 'var(--text-body)' }}>
                  <div><strong>Party:</strong> CRITICARE HOSPITAL</div>
                  <div><strong>Address:</strong> CHAKIYA, EAST CHAMPARAN</div>
                  <div><strong>State:</strong> BIHAR (Code: 10)</div>
                  <div><strong>Drug License:</strong> REG NO-42501</div>
                  <div><strong>Phone:</strong> 7535057777</div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Line Item Grid (Internal Scroll Container ONLY) */}
          <div className="card-surface" style={{ marginBottom: '1rem' }}>
            <div className="card-title-bar">
              <h3>
                <Calculator size={18} className="primary" />
                <span>Invoice Line Items ({items.length})</span>
              </h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsProductModalOpen(true)}>
                  <Plus size={13} />
                  <span>Create New Product</span>
                </button>
                <button type="button" className="btn btn-primary btn-sm" onClick={handleAddItem}>
                  <Plus size={13} />
                  <span>Add Line Row</span>
                </button>
              </div>
            </div>

            <div className="table-responsive">
              <table className="data-table" style={{ minWidth: '1900px' }}>
                <thead>
                  <tr>
                    <th style={{ width: '45px' }}>S.N.</th>
                    <th style={{ minWidth: '90px' }}>HSN</th>
                    <th style={{ minWidth: '220px' }}>Product Name *</th>
                    <th style={{ minWidth: '110px' }}>Pack</th>
                    <th style={{ minWidth: '70px' }}>Qty</th>
                    <th style={{ minWidth: '70px' }}>Free</th>
                    <th style={{ minWidth: '120px' }}>Batch</th>
                    <th style={{ minWidth: '100px' }}>Mfg</th>
                    <th style={{ minWidth: '110px' }}>Exp (MM/YY)</th>
                    <th style={{ minWidth: '90px' }}>M.R.P (₹)</th>
                    <th style={{ minWidth: '90px' }}>Rate (₹)</th>
                    <th style={{ minWidth: '70px' }}>Dis%</th>
                    <th style={{ minWidth: '70px' }}>SGST%</th>
                    <th style={{ minWidth: '70px' }}>CGST%</th>
                    <th style={{ minWidth: '70px' }}>IGST%</th>
                    <th style={{ minWidth: '100px' }}>N.Rate (₹)</th>
                    <th style={{ minWidth: '110px' }}>Amount (₹)</th>
                    <th style={{ width: '45px', textAlign: 'center' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const billedQty = item.quantity || 0;
                    const freeQty = item.free_quantity || 0;
                    const stockAdded = billedQty + freeQty;

                    const gross = (item.purchase_rate || 0) * billedQty;
                    const disc = gross * ((item.discount_percent || 0) / 100);
                    const calcTaxable = gross - disc;

                    const cgst = calcTaxable * ((item.cgst_percent || 0) / 100);
                    const sgst = calcTaxable * ((item.sgst_percent || 0) / 100);
                    const igst = calcTaxable * ((item.igst_percent || 0) / 100);
                    const netAmt = calcTaxable + cgst + sgst + igst;
                    const calcNetRate = stockAdded > 0 ? (netAmt / stockAdded).toFixed(2) : '0.00';

                    return (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td>
                          <input
                            type="text"
                            className="form-input"
                            style={{ height: '28px', padding: '0 0.4rem', fontSize: '0.8rem' }}
                            value={item.hsn_code}
                            onChange={(e) => handleItemChange(idx, 'hsn_code', e.target.value)}
                            required
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-input"
                            style={{ height: '28px', padding: '0 0.4rem', fontSize: '0.8rem' }}
                            placeholder="Product name"
                            value={item.product_name}
                            onChange={(e) => handleSelectProductSuggestion(idx, e.target.value)}
                            list={`prod-list-${idx}`}
                            required
                          />
                          <datalist id={`prod-list-${idx}`}>
                            {products.map((p) => (
                              <option key={p.id} value={p.name} />
                            ))}
                          </datalist>
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-input"
                            style={{ height: '28px', padding: '0 0.4rem', fontSize: '0.8rem' }}
                            value={item.pack_size}
                            onChange={(e) => handleItemChange(idx, 'pack_size', e.target.value)}
                            required
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-input"
                            style={{ height: '28px', padding: '0 0.4rem', fontSize: '0.8rem' }}
                            min={1}
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                            required
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-input"
                            style={{ height: '28px', padding: '0 0.4rem', fontSize: '0.8rem' }}
                            min={0}
                            value={item.free_quantity}
                            onChange={(e) => handleItemChange(idx, 'free_quantity', Number(e.target.value))}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-input"
                            style={{ height: '28px', padding: '0 0.4rem', fontSize: '0.8rem' }}
                            value={item.batch_number}
                            onChange={(e) => handleItemChange(idx, 'batch_number', e.target.value)}
                            required
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-input"
                            style={{ height: '28px', padding: '0 0.4rem', fontSize: '0.8rem' }}
                            value={item.manufacturer || ''}
                            onChange={(e) => handleItemChange(idx, 'manufacturer', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-input"
                            style={{ height: '28px', padding: '0 0.4rem', fontSize: '0.8rem' }}
                            placeholder="e.g. 04/2027"
                            value={item.expiry_date}
                            onChange={(e) => handleItemChange(idx, 'expiry_date', e.target.value)}
                            required
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            className="form-input"
                            style={{ height: '28px', padding: '0 0.4rem', fontSize: '0.8rem' }}
                            value={item.mrp}
                            onChange={(e) => handleItemChange(idx, 'mrp', Number(e.target.value))}
                            required
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            className="form-input"
                            style={{ height: '28px', padding: '0 0.4rem', fontSize: '0.8rem' }}
                            value={item.purchase_rate}
                            onChange={(e) => handleItemChange(idx, 'purchase_rate', Number(e.target.value))}
                            required
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            className="form-input"
                            style={{ height: '28px', padding: '0 0.4rem', fontSize: '0.8rem' }}
                            value={item.discount_percent}
                            onChange={(e) => handleItemChange(idx, 'discount_percent', Number(e.target.value))}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            className="form-input"
                            style={{ height: '28px', padding: '0 0.4rem', fontSize: '0.8rem' }}
                            value={item.sgst_percent}
                            onChange={(e) => handleItemChange(idx, 'sgst_percent', Number(e.target.value))}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            className="form-input"
                            style={{ height: '28px', padding: '0 0.4rem', fontSize: '0.8rem' }}
                            value={item.cgst_percent}
                            onChange={(e) => handleItemChange(idx, 'cgst_percent', Number(e.target.value))}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            className="form-input"
                            style={{ height: '28px', padding: '0 0.4rem', fontSize: '0.8rem' }}
                            value={item.igst_percent}
                            onChange={(e) => handleItemChange(idx, 'igst_percent', Number(e.target.value))}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            className="form-input"
                            style={{ height: '28px', padding: '0 0.4rem', fontSize: '0.8rem' }}
                            placeholder={calcNetRate}
                            value={item.supplier_net_rate || ''}
                            onChange={(e) => handleItemChange(idx, 'supplier_net_rate', Number(e.target.value))}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            className="form-input"
                            style={{ height: '28px', padding: '0 0.4rem', fontSize: '0.8rem', fontWeight: 600 }}
                            placeholder={netAmt.toFixed(2)}
                            value={item.supplier_line_amount || ''}
                            onChange={(e) => handleItemChange(idx, 'supplier_line_amount', Number(e.target.value))}
                          />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn-icon"
                            onClick={() => handleRemoveItem(idx)}
                            disabled={items.length === 1}
                            title="Remove Row"
                          >
                            <Trash2 size={13} color="var(--danger)" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Invoice Reconciliation (Side-by-Side Supplier Printed vs System Calculated) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            {/* Supplier Printed Totals Card */}
            <div className="card-surface">
              <div className="card-title-bar">
                <h3>
                  <FileText size={18} className="primary" />
                  <span>Supplier Printed Invoice Totals</span>
                </h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div className="form-group">
                  <label className="form-label">Supplier Taxable Total (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    placeholder={`Calc: ₹${totals.calcTaxable.toFixed(2)}`}
                    value={supplierTaxableTotal}
                    onChange={(e) => setSupplierTaxableTotal(e.target.value ? Number(e.target.value) : '')}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Supplier Grand Total (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    style={{ fontWeight: 700, color: 'var(--primary)' }}
                    placeholder={`Calc: ₹${totals.calcGrandTotal.toFixed(2)}`}
                    value={supplierGrandTotal}
                    onChange={(e) => setSupplierGrandTotal(e.target.value ? Number(e.target.value) : '')}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Other Charges (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={supplierOtherCharges}
                    onChange={(e) => setSupplierOtherCharges(e.target.value ? Number(e.target.value) : '')}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Round Off (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={supplierRoundOff}
                    onChange={(e) => setSupplierRoundOff(e.target.value ? Number(e.target.value) : '')}
                  />
                </div>
              </div>
            </div>

            {/* System Calculated Reconciliation Card */}
            <div className="card-surface" style={{ background: 'var(--bg-surface-secondary)' }}>
              <div className="card-title-bar">
                <h3>
                  <Calculator size={18} className="primary" />
                  <span>System Calculated Reconciliation</span>
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.83rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Total Items / Stock Units:</span>
                  <strong>{totals.totalItemsCount} items ({totals.totalStockQuantity} units)</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Calculated Taxable Base:</span>
                  <strong>₹{totals.calcTaxable.toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Calculated CGST:</span>
                  <span>₹{totals.calcCgst.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Calculated SGST:</span>
                  <span>₹{totals.calcSgst.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Calculated IGST:</span>
                  <span>₹{totals.calcIgst.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '0.4rem' }}>
                  <span style={{ fontWeight: 700 }}>System Calculated Grand Total:</span>
                  <strong style={{ fontSize: '1rem', color: 'var(--primary)' }}>₹{totals.calcGrandTotal.toFixed(2)}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: GST Class Summary Reconciliation Table (Derived from Line Items) */}
          <div className="card-surface" style={{ marginBottom: '1.25rem' }}>
            <div className="card-title-bar">
              <h3>
                <PieChart size={18} className="primary" />
                <span>GST Rate Class Reconciliation (Derived)</span>
              </h3>
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>GST Rate Class</th>
                    <th>Taxable Base Amount</th>
                    <th>CGST Amount</th>
                    <th>SGST Amount</th>
                    <th>IGST Amount</th>
                    <th>Total GST Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(totals.classMap).map((rateStr) => {
                    const r = Number(rateStr);
                    const c = totals.classMap[r];
                    return (
                      <tr key={r}>
                        <td><span className="badge badge-info">GST {r.toFixed(1)}%</span></td>
                        <td>₹{c.taxable.toFixed(2)}</td>
                        <td>₹{c.cgst.toFixed(2)}</td>
                        <td>₹{c.sgst.toFixed(2)}</td>
                        <td>₹{c.igst.toFixed(2)}</td>
                        <td><strong>₹{c.totalGst.toFixed(2)}</strong></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Save Action Bar */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setInvoiceNumber('');
                setRemarks('');
              }}
            >
              Cancel Entry
            </button>

            <button type="submit" className={`btn ${hasDiscrepancy ? 'btn-danger' : 'btn-primary'}`}>
              {hasDiscrepancy ? <ShieldAlert size={16} /> : <CheckCircle2 size={16} />}
              <span>
                {hasDiscrepancy
                  ? isStaff
                    ? 'Save (Requires Master Authorization)'
                    : 'Save Purchase (Discrepancy Approved)'
                  : 'Save Purchase Invoice'}
              </span>
            </button>
          </div>
        </form>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="card-surface">
          <div className="card-title-bar">
            <h3>
              <History size={18} className="primary" />
              <span>Purchase Invoices Ledger</span>
            </h3>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice No</th>
                  <th>Supplier Name</th>
                  <th>Date</th>
                  <th>Grand Total</th>
                  <th>Discrepancy Status</th>
                  <th>Saved At</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td><code>{inv.invoice_number}</code></td>
                    <td><strong>{inv.supplier_name}</strong></td>
                    <td>{inv.invoice_date}</td>
                    <td><strong>₹{inv.grand_total.toFixed(2)}</strong></td>
                    <td>
                      {inv.has_arithmetic_override ? (
                        <span className="badge badge-warning">Master Override</span>
                      ) : (
                        <span className="badge badge-success">Reconciled</span>
                      )}
                    </td>
                    <td>{inv.created_at}</td>
                  </tr>
                ))}

                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No purchase invoices recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Product Creation Modal Guard */}
      <ProductFormModal
        isOpen={isProductModalOpen}
        editingProduct={null}
        onClose={() => setIsProductModalOpen(false)}
        onSuccess={loadInitialData}
      />

      {/* Master Authorization Modal for Arithmetic Discrepancies */}
      <MasterDiscrepancyAuthModal
        isOpen={isDiscrepancyModalOpen}
        discrepancies={pendingDiscrepancies}
        onClose={() => setIsDiscrepancyModalOpen(false)}
        onConfirm={async (masterPassword) => {
          await handleSaveCall({ loginId: 'admin', password: masterPassword });
        }}
      />
    </div>
  );
};
