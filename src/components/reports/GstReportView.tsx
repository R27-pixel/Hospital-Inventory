import React, { useState, useEffect } from 'react';
import { GstClassSummary, ExpiryReportItem } from '../../vite-env';
import { PieChart, Clock, Calendar, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';

export const GstReportView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'gst' | 'expiry'>('gst');
  const [dateRangeMode, setDateRangeMode] = useState<'today' | 'week' | 'month' | 'custom'>('month');

  // Dates
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Data
  const [gstSummaries, setGstSummaries] = useState<GstClassSummary[]>([]);
  const [expiryItems, setExpiryItems] = useState<ExpiryReportItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Set date helpers based on mode
  useEffect(() => {
    const today = new Date();
    const endStr = today.toISOString().slice(0, 10);
    let startStr = endStr;

    if (dateRangeMode === 'today') {
      startStr = endStr;
    } else if (dateRangeMode === 'week') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      startStr = d.toISOString().slice(0, 10);
    } else if (dateRangeMode === 'month') {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      startStr = d.toISOString().slice(0, 10);
    }

    if (dateRangeMode !== 'custom') {
      setStartDate(startStr);
      setEndDate(endStr);
    }
  }, [dateRangeMode]);

  const loadGstData = async () => {
    if (!startDate || !endDate) return;
    setLoading(true);
    try {
      if (window.electronAPI && window.electronAPI.reports) {
        const data = await window.electronAPI.reports.getGstSummary(startDate, endDate);
        setGstSummaries(data);
      } else {
        // Fallback for Web Preview
        setGstSummaries([
          { gst_class: 5, total_taxable: 1200.0, total_cgst: 30.0, total_sgst: 30.0, total_gst: 60.0, grand_total: 1260.0, item_count: 2 },
          { gst_class: 12, total_taxable: 500.0, total_cgst: 30.0, total_sgst: 30.0, total_gst: 60.0, grand_total: 560.0, item_count: 1 },
        ]);
      }
    } catch (err) {
      console.error('Failed to load GST report:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadExpiryData = async () => {
    setLoading(true);
    try {
      if (window.electronAPI && window.electronAPI.reports) {
        const data = await window.electronAPI.reports.getExpiryReport();
        setExpiryItems(data);
      } else {
        // Fallback for Web Preview
        setExpiryItems([
          {
            batch_id: 101,
            product_name: 'TRAN 5ML',
            hsn_code: '3004',
            pack_size: '5ml Ampoule',
            batch_number: 'STRAN-EXP',
            expiry_date: '2026-09-10',
            days_remaining: 19,
            current_stock: 5,
            mrp: 63.63,
            status: 'EXPIRING_SOON',
          },
        ]);
      }
    } catch (err) {
      console.error('Failed to load expiry report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'gst') loadGstData();
    else if (activeTab === 'expiry') loadExpiryData();
  }, [activeTab, startDate, endDate]);

  // Overall Aggregated Totals across classes
  const overallTotals = gstSummaries.reduce(
    (acc, curr) => ({
      taxable: acc.taxable + curr.total_taxable,
      cgst: acc.cgst + curr.total_cgst,
      sgst: acc.sgst + curr.total_sgst,
      totalGst: acc.totalGst + curr.total_gst,
      grandTotal: acc.grandTotal + curr.grand_total,
      items: acc.items + curr.item_count,
    }),
    { taxable: 0, cgst: 0, sgst: 0, totalGst: 0, grandTotal: 0, items: 0 }
  );

  return (
    <div className="view-container">
      {/* Header */}
      <div className="view-header">
        <div className="view-header-title">
          <h2>Purchase GST & Expiry Reports</h2>
          <p>Purchase Input Tax Credit aggregation & batch expiry schedule</p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className={`btn ${activeTab === 'gst' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('gst')}
          >
            <PieChart size={15} />
            <span>Purchase GST Summary</span>
          </button>
          <button
            className={`btn ${activeTab === 'expiry' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('expiry')}
          >
            <Clock size={15} />
            <span>Expiry Schedule</span>
          </button>
        </div>
      </div>

      {/* GST Scope Disclaimer */}
      {activeTab === 'gst' && (
        <div className="alert-banner warning">
          <AlertCircle size={16} />
          <span>
            <strong>GST Scope Note:</strong> This report aggregates GST values from recorded inward purchase invoices. Confirm tax filing details with your hospital accountant.
          </span>
        </div>
      )}

      {/* GST Tab View */}
      {activeTab === 'gst' && (
        <>
          {/* Filter Bar */}
          <div className="filter-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={15} color="var(--text-muted)" />
              <span style={{ fontSize: '0.83rem', fontWeight: 600 }}>Period:</span>
            </div>

            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button
                className={`btn btn-sm ${dateRangeMode === 'today' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setDateRangeMode('today')}
              >
                Today
              </button>
              <button
                className={`btn btn-sm ${dateRangeMode === 'week' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setDateRangeMode('week')}
              >
                This Week
              </button>
              <button
                className={`btn btn-sm ${dateRangeMode === 'month' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setDateRangeMode('month')}
              >
                This Month
              </button>
              <button
                className={`btn btn-sm ${dateRangeMode === 'custom' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setDateRangeMode('custom')}
              >
                Custom Range
              </button>
            </div>

            {dateRangeMode === 'custom' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: 'auto' }}>
                <input
                  type="date"
                  className="form-input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>to</span>
                <input
                  type="date"
                  className="form-input"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* GST Class Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem' }}>
            {[5, 12, 18, 28].map((cls) => {
              const found = gstSummaries.find((s) => s.gst_class === cls);
              return (
                <div key={cls} className="card-surface">
                  <div className="card-title-bar" style={{ marginBottom: '0.5rem', paddingBottom: '0.4rem' }}>
                    <span className="badge badge-info">GST {cls}% Class</span>
                    <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{found ? `${found.item_count} items` : '0 items'}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.82rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Taxable Base:</span>
                      <strong>₹{found ? found.total_taxable.toFixed(2) : '0.00'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>CGST:</span>
                      <span>₹{found ? found.total_cgst.toFixed(2) : '0.00'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>SGST:</span>
                      <span>₹{found ? found.total_sgst.toFixed(2) : '0.00'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '0.35rem' }}>
                      <span style={{ fontWeight: 600 }}>Total GST:</span>
                      <strong style={{ color: 'var(--primary)' }}>₹{found ? found.total_gst.toFixed(2) : '0.00'}</strong>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Overall Totals Card */}
            <div className="card-surface" style={{ background: 'var(--primary-light)', borderColor: 'var(--primary-border)' }}>
              <div className="card-title-bar" style={{ marginBottom: '0.5rem', paddingBottom: '0.4rem' }}>
                <span className="badge badge-primary" style={{ background: 'var(--primary)', color: '#fff' }}>TOTAL PURCHASE GST</span>
                <span style={{ fontSize: '0.76rem', color: 'var(--primary-hover)', fontWeight: 600 }}>{overallTotals.items} Items</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-body)' }}>Total Taxable:</span>
                  <strong>₹{overallTotals.taxable.toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-body)' }}>Total GST:</span>
                  <strong style={{ color: 'var(--primary-hover)' }}>₹{overallTotals.totalGst.toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--primary-border)', paddingTop: '0.35rem' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>Grand Total:</span>
                  <strong style={{ fontSize: '0.95rem', color: 'var(--primary-hover)' }}>₹{overallTotals.grandTotal.toFixed(2)}</strong>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Expiry Analysis Tab View */}
      {activeTab === 'expiry' && (
        <div className="card-surface">
          <div className="card-title-bar">
            <h3>
              <Clock size={18} className="danger" color="var(--danger)" />
              <span>Batch Expiry Risk Analysis</span>
            </h3>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Pack Size</th>
                  <th>Batch Number</th>
                  <th>Expiry Date</th>
                  <th>Days Remaining</th>
                  <th>Stock On Hand</th>
                  <th>MRP</th>
                  <th>Risk Status</th>
                </tr>
              </thead>
              <tbody>
                {expiryItems.map((item) => (
                  <tr key={item.batch_id}>
                    <td><strong>{item.product_name}</strong></td>
                    <td>{item.pack_size}</td>
                    <td><code>{item.batch_number}</code></td>
                    <td>{item.expiry_date}</td>
                    <td>
                      {item.days_remaining < 0 ? (
                        <strong style={{ color: 'var(--danger)' }}>Expired {Math.abs(item.days_remaining)} days ago</strong>
                      ) : (
                        <strong>{item.days_remaining} days</strong>
                      )}
                    </td>
                    <td><strong>{item.current_stock} units</strong></td>
                    <td>₹{item.mrp.toFixed(2)}</td>
                    <td>
                      {item.status === 'EXPIRED' && (
                        <span className="badge badge-danger">
                          <AlertTriangle size={12} />
                          <span>EXPIRED</span>
                        </span>
                      )}
                      {item.status === 'EXPIRING_SOON' && (
                        <span className="badge badge-warning">
                          <Clock size={12} />
                          <span>EXPIRING SOON (&le;30 Days)</span>
                        </span>
                      )}
                      {item.status === 'NORMAL' && (
                        <span className="badge badge-success">
                          <CheckCircle size={12} />
                          <span>SAFE</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}

                {expiryItems.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No active batches found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
