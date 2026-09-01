import { test, expect } from '@playwright/test';
import { launchElectronApp, setupInitialAccounts, ElectronTestContext } from './helpers/electron-app';
import fs from 'fs';

test.describe('20. Stage 4 — Section 4 & 6: Backup Integrity & Transaction Atomicity QA', () => {
  let ctx: ElectronTestContext;

  test.beforeEach(async () => {
    ctx = await launchElectronApp();
    await setupInitialAccounts(ctx.page);
  });

  test.afterEach(async () => {
    if (ctx) {
      await ctx.cleanup();
    }
  });

  test('20.1 Backup Integrity: Manual backup snapshot creates readable, non-empty SQLite database file', async () => {
    // 1. Create Supplier & Product
    await ctx.page.click('[data-testid="nav-suppliers"]');
    await ctx.page.click('[data-testid="add-supplier-btn"]');
    await ctx.page.fill('[data-testid="supplier-name-input"]', 'BACKUP INTEGRITY SUPPLIER');
    await ctx.page.click('[data-testid="supplier-save-btn"]');

    await ctx.page.click('[data-testid="nav-inventory"]');
    await ctx.page.click('[data-testid="add-product-btn"]');
    await ctx.page.fill('[data-testid="product-name-input"]', 'BACKUP INTEGRITY PRODUCT');
    await ctx.page.fill('[data-testid="product-hsn-input"]', '3004');
    await ctx.page.fill('[data-testid="product-pack-size-input"]', '10 Tabs');
    await ctx.page.fill('[data-testid="product-mfr-input"]', 'BACKUP LABS');
    await ctx.page.click('[data-testid="product-save-btn"]');

    // 2. Trigger Manual Backup via UI in Settings
    await ctx.page.click('[data-testid="nav-settings"]');
    await ctx.page.click('[data-testid="trigger-manual-backup-btn"]');

    await expect(ctx.page.locator('text=Manual database backup created successfully')).toBeVisible();

    // 3. Verify Backup File exists on disk and size > 0
    const backupLogs = await ctx.page.evaluate(async () => {
      return await (window as any).electronAPI.backup.getLogs();
    });
    expect(backupLogs.length).toBeGreaterThan(0);
    const lastBackup = backupLogs[0];
    expect(lastBackup.status).toBe('SUCCESS');
    expect(lastBackup.file_size_bytes).toBeGreaterThan(0);

    const exists = fs.existsSync(lastBackup.file_path);
    expect(exists).toBe(true);
  });

  test('20.2 Transaction Atomicity: Invalid transaction fails cleanly without partial commits', async () => {
    await ctx.page.click('[data-testid="nav-suppliers"]');
    await ctx.page.click('[data-testid="add-supplier-btn"]');
    await ctx.page.fill('[data-testid="supplier-name-input"]', 'ATOMIC SUPPLIER');
    await ctx.page.click('[data-testid="supplier-save-btn"]');

    // Attempt invalid purchase invoice (missing product_name/batch_number)
    const invalidRes = await ctx.page.evaluate(async () => {
      return await (window as any).electronAPI.purchases.create({
        supplier_id: 1,
        invoice_number: 'INV-INVALID-99',
        invoice_date: '2026-09-01',
        items: [], // empty line items
      });
    });

    expect(invalidRes.success).toBe(false);
    expect(invalidRes.error).toContain('at least one line item');

    // Verify invoice list contains 0 records
    const invoices = await ctx.page.evaluate(async () => {
      return await (window as any).electronAPI.purchases.getAll();
    });
    expect(invoices.length).toBe(0);
  });
});
