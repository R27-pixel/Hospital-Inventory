import { test, expect } from '@playwright/test';
import { launchElectronApp, setupInitialAccounts, ElectronTestContext } from './helpers/electron-app';

test.describe('21. Stage 4 — Section 8 & 12: Release Smoke Test & Installer Verification QA', () => {
  let ctx: ElectronTestContext;

  test.afterEach(async () => {
    if (ctx) {
      await ctx.cleanup();
    }
  });

  test('21.1 Full End-to-End Release Smoke Test against compiled executable', async () => {
    // 1. Launch executable
    ctx = await launchElectronApp();

    // 2. Initial Setup Wizard
    await setupInitialAccounts(ctx.page);

    // 3. Create Supplier
    await ctx.page.click('[data-testid="nav-suppliers"]');
    await ctx.page.click('[data-testid="add-supplier-btn"]');
    await ctx.page.fill('[data-testid="supplier-name-input"]', 'SMOKE TEST PHARMA');
    await ctx.page.fill('[data-testid="supplier-gstin-input"]', '10AAACC1234A1Z5');
    await ctx.page.click('[data-testid="supplier-save-btn"]');

    // 4. Create Product
    await ctx.page.click('[data-testid="nav-inventory"]');
    await ctx.page.click('[data-testid="add-product-btn"]');
    await ctx.page.fill('[data-testid="product-name-input"]', 'SMOKE TEST TABLET 500MG');
    await ctx.page.fill('[data-testid="product-hsn-input"]', '3004');
    await ctx.page.fill('[data-testid="product-pack-size-input"]', '10 Strips');
    await ctx.page.fill('[data-testid="product-mfr-input"]', 'SMOKE LABS');
    await ctx.page.click('[data-testid="product-save-btn"]');

    // 5. Inward Purchase Invoice (Stock = 50)
    await ctx.page.click('[data-testid="nav-purchases"]');
    await ctx.page.selectOption('[data-testid="purchase-supplier-select"]', { label: 'SMOKE TEST PHARMA (10AAACC1234A1Z5)' });
    await ctx.page.fill('[data-testid="purchase-invoice-number-input"]', 'INV-SMOKE-100');
    await ctx.page.fill('[data-testid="purchase-item-name-0"]', 'SMOKE TEST TABLET 500MG');
    await ctx.page.fill('[data-testid="purchase-item-qty-0"]', '50');
    await ctx.page.fill('[data-testid="purchase-item-batch-0"]', 'BATCH-SMOKE-1');
    await ctx.page.fill('[data-testid="purchase-item-exp-0"]', '12/2028');
    await ctx.page.fill('[data-testid="purchase-item-mrp-0"]', '100.00');
    await ctx.page.fill('[data-testid="purchase-item-rate-0"]', '80.00');
    await ctx.page.click('[data-testid="purchase-save-btn"]');
    await expect(ctx.page.locator('text=Purchase Invoice INV-SMOKE-100 saved cleanly')).toBeVisible();

    // Verify Stock = 50
    await ctx.page.click('[data-testid="nav-inventory"]');
    await expect(ctx.page.locator('strong:has-text("50 units")')).toBeVisible();

    // 6. Outbound Stock Exit (Deduct 10 -> Stock = 40)
    await ctx.page.click('[data-testid="nav-stock-exit"]');
    await ctx.page.fill('[data-testid="stock-exit-qty-input"]', '10');
    await ctx.page.click('[data-testid="stock-exit-submit-btn"]');
    await expect(ctx.page.locator('text=New batch stock: 40 units')).toBeVisible();

    // 7. Generate GST Report
    await ctx.page.click('[data-testid="nav-reports"]');
    await ctx.page.click('[data-testid="gst-apply-filter-btn"]');
    await expect(ctx.page.locator('text=TOTAL PURCHASE GST')).toBeVisible();

    // 8. Trigger Manual Backup
    await ctx.page.click('[data-testid="nav-settings"]');
    await ctx.page.click('[data-testid="trigger-manual-backup-btn"]');
    await expect(ctx.page.locator('text=Manual database backup created successfully')).toBeVisible();

    // 9. Logout & Login
    await ctx.page.click('[data-testid="nav-logout"]');
    await ctx.page.fill('[data-testid="login-id-input"]', 'master_admin');
    await ctx.page.fill('[data-testid="login-password-input"]', 'MasterPass123!');
    await ctx.page.click('[data-testid="login-submit-btn"]');

    // 10. Close & Restart App -> Verify Persistence
    const userDataDir = ctx.userDataDir;
    await ctx.cleanup(true);
    await new Promise((r) => setTimeout(r, 1000));

    ctx = await launchElectronApp(userDataDir);
    await expect(ctx.page.locator('[data-testid="login-id-input"]')).toBeVisible();
    await ctx.page.fill('[data-testid="login-id-input"]', 'master_admin');
    await ctx.page.fill('[data-testid="login-password-input"]', 'MasterPass123!');
    await ctx.page.click('[data-testid="login-submit-btn"]');

    await ctx.page.click('[data-testid="nav-inventory"]');
    await expect(ctx.page.locator('strong:has-text("40 units")')).toBeVisible();
  });
});
