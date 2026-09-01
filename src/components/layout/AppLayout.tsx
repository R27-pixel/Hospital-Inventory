import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { DashboardView } from '../dashboard/DashboardView';
import { ProductCatalogView } from '../inventory/ProductCatalogView';
import { SupplierManagerView } from '../inventory/SupplierManagerView';
import { PurchaseEntryView } from '../purchase/PurchaseEntryView';
import { StockExitView } from '../stock/StockExitView';
import { GstReportView } from '../reports/GstReportView';
import { BackupSettingsView } from '../settings/BackupSettingsView';
import {
  Building2,
  LayoutDashboard,
  Package,
  Truck,
  FileText,
  LogOut,
  PieChart,
  Settings,
  ShieldCheck,
  Clock,
  Lock,
  Calendar,
} from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'suppliers' | 'purchases' | 'stock-exit' | 'reports' | 'settings'>('dashboard');
  const [expiringSoonCount, setExpiringSoonCount] = useState<number>(0);

  useEffect(() => {
    const fetchExpiryAlerts = async () => {
      try {
        if (window.electronAPI && window.electronAPI.batches) {
          const batches = await window.electronAPI.batches.getAll();
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          let count = 0;
          if (Array.isArray(batches)) {
            for (const b of batches) {
              if (b.current_stock <= 0 || !b.expiry_date) continue;
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
              if (diffDays >= 0 && diffDays <= 30) count++;
            }
          }
          setExpiringSoonCount(count);
        } else {
          setExpiringSoonCount(1); // Preview fallback
        }
      } catch (err) {
        console.error('Failed to fetch batch alerts:', err);
      }
    };
    fetchExpiryAlerts();
  }, [activeTab]);

  const isMaster = user?.role === 'MASTER';

  return (
    <div className="app-shell">
      {/* Narrow Desktop Sidebar */}
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <Building2 size={20} />
          <span>CRITICARE INVENTORY</span>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
            data-testid="nav-dashboard"
          >
            <LayoutDashboard size={17} />
            <span>Dashboard</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
            data-testid="nav-inventory"
          >
            <Package size={17} />
            <span>Product Inventory</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'purchases' ? 'active' : ''}`}
            onClick={() => setActiveTab('purchases')}
            data-testid="nav-purchases"
          >
            <FileText size={17} />
            <span>Purchase Entry</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'stock-exit' ? 'active' : ''}`}
            onClick={() => setActiveTab('stock-exit')}
            data-testid="nav-stock-exit"
          >
            <LogOut size={17} color="#38bdf8" />
            <span>Stock Exit</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'suppliers' ? 'active' : ''}`}
            onClick={() => setActiveTab('suppliers')}
            data-testid="nav-suppliers"
          >
            <Truck size={17} />
            <span>Suppliers</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
            data-testid="nav-reports"
          >
            <PieChart size={17} />
            <span>GST Reports</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
            data-testid="nav-settings"
          >
            <Settings size={17} />
            <span>Backup & Security</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-logout-btn" onClick={logout} data-testid="nav-logout">
            <Lock size={15} />
            <span>Lock / Logout</span>
          </button>
        </div>
      </aside>

      {/* Main View Area */}
      <div className="app-main">
        <header className="app-topbar">
          <div className="topbar-title">
            <span>Hospital Pharmacy Inventory Management</span>
          </div>

          <div className="topbar-right">
            {expiringSoonCount > 0 && (
              <div
                className="badge badge-warning"
                style={{ cursor: 'pointer', padding: '0.35rem 0.65rem' }}
                onClick={() => setActiveTab('inventory')}
                data-testid="expiry-warning-badge"
              >
                <Clock size={13} />
                <span>{expiringSoonCount} Batches Expiring Soon</span>
              </div>
            )}

            <div className={`user-badge-pill ${isMaster ? 'master' : 'staff'}`} data-testid="user-role-badge">
              <ShieldCheck size={14} />
              <span>{isMaster ? 'MASTER ADMIN' : 'STAFF MODE'} ({user?.loginId || 'User'})</span>
            </div>
          </div>
        </header>

        <main className="app-viewport">
          {activeTab === 'dashboard' && <DashboardView onNavigate={(tab) => setActiveTab(tab)} />}
          {activeTab === 'inventory' && <ProductCatalogView />}
          {activeTab === 'suppliers' && <SupplierManagerView />}
          {activeTab === 'purchases' && <PurchaseEntryView />}
          {activeTab === 'stock-exit' && <StockExitView />}
          {activeTab === 'reports' && <GstReportView />}
          {activeTab === 'settings' && <BackupSettingsView />}
        </main>
      </div>
    </div>
  );
};
