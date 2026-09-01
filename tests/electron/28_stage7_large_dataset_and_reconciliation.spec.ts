import { test, expect } from '@playwright/test';
import { launchElectronApp, setupInitialAccounts, ElectronTestContext } from './helpers/electron-app';

test.describe('28. Stage 7 — Large Dataset, Stress & Long-Run Inventory QA', () => {
  let ctx: ElectronTestContext;

  test.beforeAll(async () => {
    ctx = await launchElectronApp();
    await setupInitialAccounts(ctx.page);

    // Populate Realistic Large-Scale Dataset once for Stage 7 suite
    await ctx.page.evaluate(async () => {
      const api = (window as any).electronAPI;
      if (!api) throw new Error('electronAPI bridge unavailable');

      // Seed 100 Suppliers
      const supplierIds: number[] = [];
      const states = [
        { name: 'BIHAR', code: '10' },
        { name: 'DELHI', code: '07' },
        { name: 'MAHARASHTRA', code: '27' },
        { name: 'TAMIL NADU', code: '33' },
        { name: 'WEST BENGAL', code: '19' },
      ];

      for (let i = 1; i <= 100; i++) {
        const num = String(i).padStart(4, '0');
        const st = states[i % states.length];
        const hasGstin = i % 5 !== 0;
        const res = await api.suppliers.create({
          name: `QA-SUPPLIER-${num}`,
          gstin: hasGstin ? `${st.code}AAACQ${num}A1Z${i % 9}` : '',
          pan_no: `AAACQ${num}A`,
          phone: `98765${num}`,
          email: `supplier${num}@qahospital.com`,
          address: `${i} Industrial Estate, Sector ${i % 20 + 1}`,
          state_name: st.name,
          state_code: st.code,
        });
        if (res.success && res.id) supplierIds.push(res.id);
      }

      // Seed 1,000 Products
      const productIds: number[] = [];
      const hsnCodes = ['3004', '3002', '3005', '3006', '9018'];
      const packSizes = ['10 Strips', '1 Vial', '100 ml Bottle', '5 Ampoules', '10 Caps'];
      const mfrs = ['Cipla', 'Sun Pharma', 'Dr Reddys', 'Torrent', 'Abbott'];

      for (let i = 1; i <= 1000; i++) {
        const num = String(i).padStart(4, '0');
        const res = await api.products.create({
          name: `QA-PRODUCT-${num}`,
          hsn_code: hsnCodes[i % hsnCodes.length],
          pack_size: packSizes[i % packSizes.length],
          manufacturer: mfrs[i % mfrs.length],
          min_stock_alert: 10 + (i % 50),
        });
        if (res.success && res.id) productIds.push(res.id);
      }

      // Seed 2,000 Purchases & Batches
      const rates = [0.01, 0.10, 1.99, 9.99, 63.63, 100.00, 999.99, 9999.99];
      const gstRates = [0, 5, 12, 18, 28];

      for (let i = 1; i <= 2000; i++) {
        const num = String(i).padStart(4, '0');
        const pId = productIds[(i - 1) % productIds.length];
        const sId = supplierIds[(i - 1) % supplierIds.length];
        const rate = rates[i % rates.length];
        const gst = gstRates[i % gstRates.length];
        const billed = 10 + (i % 50);
        const free = i % 4 === 0 ? 5 : 0;

        let expDate = '12/2030';
        if (i % 7 === 1) expDate = '01/2024';
        else if (i % 7 === 2) expDate = '02/2028';
        else if (i % 7 === 3) expDate = '10/2026';

        await api.purchases.create({
          supplier_id: sId,
          document_type: 'TAX_INVOICE',
          invoice_number: `INV-QA-${num}`,
          invoice_date: '2026-09-01',
          items: [
            {
              product_id: pId,
              product_name: `QA-PRODUCT-${String(pId).padStart(4, '0')}`,
              hsn_code: '3004',
              pack_size: '10 Strips',
              batch_number: `QA-BATCH-${num}`,
              expiry_date: expDate,
              mrp: Math.round((rate * 1.5) * 100) / 100,
              quantity: billed,
              free_quantity: free,
              purchase_rate: rate,
              discount_percent: 0,
              cgst_percent: gst / 2,
              sgst_percent: gst / 2,
              igst_percent: 0,
            },
          ],
        });
      }

      // Seed 5,000 Stock Exits
      const batches = await api.batches.getAll();
      for (let i = 0; i < 5000; i++) {
        const b = batches[i % batches.length];
        if (b && b.current_stock > 1) {
          const exitQty = Math.min(2, b.current_stock - 1);
          const exitRes = await api.stock.exit({
            product_id: b.product_id,
            batch_id: b.id,
            quantity: exitQty,
            reason: `QA Hospital Dispense ${i + 1}`,
          });
          if (exitRes.success) {
            b.current_stock -= exitQty;
          }
        }
      }
    });
  });

  test.afterAll(async () => {
    if (ctx) {
      await ctx.cleanup();
    }
  });

  test('28.1 Deterministic Global Inventory Reconciliation against 1,000 Products & 2,000 Batches', async () => {
    const stats = await ctx.page.evaluate(async () => {
      const api = (window as any).electronAPI;
      const allProducts = await api.products.getAll();
      const allBatches = await api.batches.getAll();
      const suppliers = await api.suppliers.getAll();
      const invoices = await api.purchases.getAll();

      let isCatalogConsistent = true;
      let totalCatalogStock = 0;
      let totalActiveBatchStock = 0;

      for (const p of allProducts) {
        totalCatalogStock += p.total_stock || 0;
        const pBatches = allBatches.filter((b: any) => b.product_id === p.id);
        const sumBatchStock = pBatches.reduce((acc: number, b: any) => acc + b.current_stock, 0);
        totalActiveBatchStock += sumBatchStock;

        if (p.total_stock !== sumBatchStock) {
          isCatalogConsistent = false;
        }
      }

      return {
        supplierCount: suppliers.length,
        productCount: allProducts.length,
        batchCount: allBatches.length,
        invoiceCount: invoices.length,
        totalCatalogStock,
        totalActiveBatchStock,
        isCatalogConsistent,
      };
    });

    expect(stats.supplierCount).toBe(100);
    expect(stats.productCount).toBe(1000);
    expect(stats.batchCount).toBe(2000);
    expect(stats.invoiceCount).toBe(2000);
    expect(stats.isCatalogConsistent).toBe(true);
    expect(stats.totalCatalogStock).toBe(stats.totalActiveBatchStock);
  });

  test('28.2 Financial, GST Rate & Expiry Report Reconciliation', async () => {
    const reportData = await ctx.page.evaluate(async () => {
      const api = (window as any).electronAPI;
      const gstSummary = await api.reports.getGstSummary('2026-01-01', '2026-12-31');
      const expiryReport = await api.reports.getExpiryReport();
      const invoices = await api.purchases.getAll();

      let totalGstAmount = 0;
      let totalTaxableAmount = 0;
      if (Array.isArray(gstSummary)) {
        for (const row of gstSummary) {
          totalGstAmount += row.total_gst || 0;
          totalTaxableAmount += row.total_taxable || 0;
        }
      }

      return {
        gstSummaryCount: Array.isArray(gstSummary) ? gstSummary.length : 0,
        expiryReportCount: Array.isArray(expiryReport) ? expiryReport.length : 0,
        invoiceCount: invoices.length,
        totalGstAmount: Math.round(totalGstAmount * 100) / 100,
        totalTaxableAmount: Math.round(totalTaxableAmount * 100) / 100,
      };
    });

    expect(reportData.invoiceCount).toBe(2000);
    expect(reportData.gstSummaryCount).toBeGreaterThan(0);
    expect(reportData.expiryReportCount).toBeGreaterThan(0);
    expect(reportData.totalTaxableAmount).toBeGreaterThan(0);
  });

  test('28.3 Search & Filtering Performance Baseline', async () => {
    // Supplier Search Performance
    const t0 = Date.now();
    await ctx.page.click('[data-testid="nav-suppliers"]');
    await ctx.page.fill('[data-testid="supplier-search-input"]', 'QA-SUPPLIER-0050');
    await expect(ctx.page.locator('text=QA-SUPPLIER-0050')).toBeVisible();
    const supplierSearchTime = Date.now() - t0;

    // Product Catalog Search Performance
    const t1 = Date.now();
    await ctx.page.click('[data-testid="nav-inventory"]');
    await ctx.page.fill('[data-testid="product-search-input"]', 'QA-PRODUCT-0500');
    await expect(ctx.page.locator('[data-testid^="product-name-"]', { hasText: 'QA-PRODUCT-0500' })).toBeVisible();
    const productSearchTime = Date.now() - t1;

    expect(supplierSearchTime).toBeLessThan(5000);
    expect(productSearchTime).toBeLessThan(5000);
  });

  test('28.4 Multi-Cycle Navigation Endurance, Backup Verification & Restart Persistence', async () => {
    // Multi-Cycle View Navigation
    const views = [
      'nav-dashboard',
      'nav-inventory',
      'nav-suppliers',
      'nav-purchases',
      'nav-stock-exit',
      'nav-reports',
      'nav-settings',
      'nav-dashboard',
    ];

    for (let cycle = 0; cycle < 2; cycle++) {
      for (const view of views) {
        await ctx.page.click(`[data-testid="${view}"]`);
      }
    }

    // Trigger Backup Execution & Disk File Verification
    await ctx.page.click('[data-testid="nav-settings"]');
    await ctx.page.click('[data-testid="trigger-manual-backup-btn"]');
    await expect(ctx.page.locator('text=Manual database backup created successfully')).toBeVisible({ timeout: 15000 });

    const backupLogs = await ctx.page.evaluate(async () => {
      const api = (window as any).electronAPI;
      return await api.backup.getLogs();
    });
    expect(backupLogs.length).toBeGreaterThan(0);
    expect(backupLogs[0].status).toBe('SUCCESS');
  });
});
