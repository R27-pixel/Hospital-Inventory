import { test, expect } from '@playwright/test';
import { launchElectronApp, setupInitialAccounts, ElectronTestContext } from './helpers/electron-app';
import path from 'path';
import fs from 'fs';
import os from 'os';

test.describe('25. Stage 5 — Section 8 & 12: Unicode, Spaces & Special Character Path QA', () => {
  let ctx: ElectronTestContext;

  test.afterEach(async () => {
    if (ctx) {
      await ctx.cleanup();
    }
  });

  test('25.1 Special Path Test: App functions flawlessly when user-data path contains spaces, brackets & Unicode', async () => {
    // 1. Construct special complex path with spaces, parentheses, unicode & hyphens
    const specialDirPath = fs.mkdtempSync(path.join(os.tmpdir(), 'QA Test (Special-Path) - 测试 - '));

    // 2. Launch application pointing to special user data directory
    ctx = await launchElectronApp(specialDirPath);
    await setupInitialAccounts(ctx.page);

    // 3. Execute Supplier & Product Creation
    await ctx.page.click('[data-testid="nav-suppliers"]');
    await ctx.page.click('[data-testid="add-supplier-btn"]');
    await ctx.page.fill('[data-testid="supplier-name-input"]', 'UNICODE PATH PHARMA');
    await ctx.page.click('[data-testid="supplier-save-btn"]');

    await ctx.page.click('[data-testid="nav-inventory"]');
    await ctx.page.click('[data-testid="add-product-btn"]');
    await ctx.page.fill('[data-testid="product-name-input"]', 'UNICODE PATH SYRUP 100ML');
    await ctx.page.fill('[data-testid="product-hsn-input"]', '3004');
    await ctx.page.fill('[data-testid="product-pack-size-input"]', '100ml');
    await ctx.page.fill('[data-testid="product-mfr-input"]', 'PATH LABS');
    await ctx.page.click('[data-testid="product-save-btn"]');

    // 4. Record Purchase Invoice
    await ctx.page.click('[data-testid="nav-purchases"]');
    await ctx.page.selectOption('[data-testid="purchase-supplier-select"]', { label: 'UNICODE PATH PHARMA' });
    await ctx.page.fill('[data-testid="purchase-invoice-number-input"]', 'INV-PATH-001');
    await ctx.page.fill('[data-testid="purchase-item-name-0"]', 'UNICODE PATH SYRUP 100ML');
    await ctx.page.fill('[data-testid="purchase-item-qty-0"]', '50');
    await ctx.page.fill('[data-testid="purchase-item-batch-0"]', 'BATCH-PATH-1');
    await ctx.page.fill('[data-testid="purchase-item-exp-0"]', '12/2028');
    await ctx.page.fill('[data-testid="purchase-item-mrp-0"]', '100.00');
    await ctx.page.fill('[data-testid="purchase-item-rate-0"]', '80.00');
    await ctx.page.click('[data-testid="purchase-save-btn"]');
    await expect(ctx.page.locator('text=Purchase Invoice INV-PATH-001 saved cleanly')).toBeVisible();

    // 5. Trigger Manual Backup Snapshot
    await ctx.page.click('[data-testid="nav-settings"]');
    await ctx.page.click('[data-testid="trigger-manual-backup-btn"]');
    await expect(ctx.page.locator('text=Manual database backup created successfully')).toBeVisible();

    // 6. Verify Backup File was written into the special path's backups/ directory
    const backupDir = path.join(specialDirPath, 'backups');
    expect(fs.existsSync(backupDir)).toBe(true);
    const backupFiles = fs.readdirSync(backupDir);
    expect(backupFiles.length).toBeGreaterThan(0);
  });
});
