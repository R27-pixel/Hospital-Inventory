import { test, expect } from '@playwright/test';
import { launchElectronApp, setupInitialAccounts, ElectronTestContext } from './helpers/electron-app';

test.describe('17. Stage 4 — Section 1 & 11: Forced Process Termination & Crash Recovery QA', () => {
  let ctx: ElectronTestContext;

  test.afterEach(async () => {
    if (ctx) {
      await ctx.cleanup();
    }
  });

  test('17.1 Forced termination after Purchase Invoice save -> Restart -> Verify stock & ledger integrity', async () => {
    ctx = await launchElectronApp();
    await setupInitialAccounts(ctx.page);

    // Setup Supplier & Product
    await ctx.page.click('[data-testid="nav-suppliers"]');
    await ctx.page.click('[data-testid="add-supplier-btn"]');
    await ctx.page.fill('[data-testid="supplier-name-input"]', 'CRASH PHARMA');
    await ctx.page.click('[data-testid="supplier-save-btn"]');

    await ctx.page.click('[data-testid="nav-inventory"]');
    await ctx.page.click('[data-testid="add-product-btn"]');
    await ctx.page.fill('[data-testid="product-name-input"]', 'CRASH SYRUP 500ML');
    await ctx.page.fill('[data-testid="product-hsn-input"]', '3004');
    await ctx.page.fill('[data-testid="product-pack-size-input"]', '500ml');
    await ctx.page.fill('[data-testid="product-mfr-input"]', 'CRASH LABS');
    await ctx.page.click('[data-testid="product-save-btn"]');

    // Purchase Invoice
    await ctx.page.click('[data-testid="nav-purchases"]');
    await ctx.page.selectOption('[data-testid="purchase-supplier-select"]', { label: 'CRASH PHARMA' });
    await ctx.page.fill('[data-testid="purchase-invoice-number-input"]', 'INV-CRASH-001');
    await ctx.page.fill('[data-testid="purchase-item-name-0"]', 'CRASH SYRUP 500ML');
    await ctx.page.fill('[data-testid="purchase-item-qty-0"]', '100');
    await ctx.page.fill('[data-testid="purchase-item-batch-0"]', 'BATCH-CRASH-100');
    await ctx.page.fill('[data-testid="purchase-item-exp-0"]', '12/2028');
    await ctx.page.fill('[data-testid="purchase-item-mrp-0"]', '100.00');
    await ctx.page.fill('[data-testid="purchase-item-rate-0"]', '80.00');
    await ctx.page.click('[data-testid="purchase-save-btn"]');
    await expect(ctx.page.locator('text=Purchase Invoice INV-CRASH-001 saved cleanly')).toBeVisible();

    // Immediately kill Electron process (simulating sudden OS power loss or crash)
    const userDataDir = ctx.userDataDir;
    ctx.app.process().kill();

    // Restart Electron application reusing the exact same isolated userDataDir
    ctx = await launchElectronApp(userDataDir);

    // Login as MASTER ADMIN
    await expect(ctx.page.locator('[data-testid="login-id-input"]')).toBeVisible();
    await ctx.page.fill('[data-testid="login-id-input"]', 'master_admin');
    await ctx.page.fill('[data-testid="login-password-input"]', 'MasterPass123!');
    await ctx.page.click('[data-testid="login-submit-btn"]');

    // Verify Product Catalog stock is 100 units
    await ctx.page.click('[data-testid="nav-inventory"]');
    await expect(ctx.page.locator('strong:has-text("100 units")')).toBeVisible();

    // Verify Purchase History invoice record exists
    await ctx.page.click('[data-testid="nav-purchases"]');
    await ctx.page.click('button:has-text("Purchase History")');
    await expect(ctx.page.locator('text=INV-CRASH-001')).toBeVisible();
  });

  test('17.2 Forced termination after Stock Exit -> Restart -> Reconcile Expected Stock = Purchases - Exits', async () => {
    ctx = await launchElectronApp();
    await setupInitialAccounts(ctx.page);

    // Setup Supplier & Product
    await ctx.page.click('[data-testid="nav-suppliers"]');
    await ctx.page.click('[data-testid="add-supplier-btn"]');
    await ctx.page.fill('[data-testid="supplier-name-input"]', 'CRASH EXIT SUPPLIER');
    await ctx.page.click('[data-testid="supplier-save-btn"]');

    await ctx.page.click('[data-testid="nav-inventory"]');
    await ctx.page.click('[data-testid="add-product-btn"]');
    await ctx.page.fill('[data-testid="product-name-input"]', 'CRASH EXIT TABLET');
    await ctx.page.fill('[data-testid="product-hsn-input"]', '3004');
    await ctx.page.fill('[data-testid="product-pack-size-input"]', '10 Tabs');
    await ctx.page.fill('[data-testid="product-mfr-input"]', 'CRASH LABS');
    await ctx.page.click('[data-testid="product-save-btn"]');

    // Purchase 100
    await ctx.page.click('[data-testid="nav-purchases"]');
    await ctx.page.selectOption('[data-testid="purchase-supplier-select"]', { label: 'CRASH EXIT SUPPLIER' });
    await ctx.page.fill('[data-testid="purchase-invoice-number-input"]', 'INV-CRASH-002');
    await ctx.page.fill('[data-testid="purchase-item-name-0"]', 'CRASH EXIT TABLET');
    await ctx.page.fill('[data-testid="purchase-item-qty-0"]', '100');
    await ctx.page.fill('[data-testid="purchase-item-batch-0"]', 'BATCH-CRASH-EXIT');
    await ctx.page.fill('[data-testid="purchase-item-exp-0"]', '12/2028');
    await ctx.page.fill('[data-testid="purchase-item-mrp-0"]', '100.00');
    await ctx.page.fill('[data-testid="purchase-item-rate-0"]', '80.00');
    await ctx.page.click('[data-testid="purchase-save-btn"]');
    await expect(ctx.page.locator('text=Purchase Invoice INV-CRASH-002 saved cleanly')).toBeVisible();

    // Exit 35
    await ctx.page.click('[data-testid="nav-stock-exit"]');
    await ctx.page.fill('[data-testid="stock-exit-qty-input"]', '35');
    await ctx.page.click('[data-testid="stock-exit-submit-btn"]');
    await expect(ctx.page.locator('text=New batch stock: 65 units')).toBeVisible();

    // Kill process
    const userDataDir = ctx.userDataDir;
    ctx.app.process().kill();

    // Restart Electron application
    ctx = await launchElectronApp(userDataDir);

    await expect(ctx.page.locator('[data-testid="login-id-input"]')).toBeVisible();
    await ctx.page.fill('[data-testid="login-id-input"]', 'master_admin');
    await ctx.page.fill('[data-testid="login-password-input"]', 'MasterPass123!');
    await ctx.page.click('[data-testid="login-submit-btn"]');

    // Reconcile: Expected Stock = 100 (Purchases) - 35 (Exits) = 65 units
    await ctx.page.click('[data-testid="nav-inventory"]');
    await expect(ctx.page.locator('strong:has-text("65 units")')).toBeVisible();
  });
});
