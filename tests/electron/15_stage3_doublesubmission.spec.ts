import { test, expect } from '@playwright/test';
import { launchElectronApp, setupInitialAccounts, ElectronTestContext } from './helpers/electron-app';

test.describe('15. Stage 3 — Priority 5: Double Submission & Concurrency QA', () => {
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

  test('15.1 Should prevent duplicate record creation during rapid double-click on Supplier Form', async () => {
    await ctx.page.click('[data-testid="nav-suppliers"]');
    await ctx.page.click('[data-testid="add-supplier-btn"]');
    await ctx.page.fill('[data-testid="supplier-name-input"]', 'RAPID CLICK SUPPLIER');
    await ctx.page.fill('[data-testid="supplier-gstin-input"]', '10AAACC1234A1Z5');

    // Rapid double-click
    const saveBtn = ctx.page.locator('[data-testid="supplier-save-btn"]');
    await Promise.all([
      saveBtn.click({ clickCount: 2, delay: 50 }),
    ]);

    await expect(ctx.page.locator('[data-testid="supplier-form"]')).toBeHidden({ timeout: 10000 });

    // Verify only 1 row exists for RAPID CLICK SUPPLIER
    const supplierRows = await ctx.page.locator('tr:has-text("RAPID CLICK SUPPLIER")').count();
    expect(supplierRows).toBe(1);
  });

  test('15.2 Should prevent duplicate record creation during rapid double-click on Product Form', async () => {
    await ctx.page.click('[data-testid="nav-inventory"]');
    await ctx.page.click('[data-testid="add-product-btn"]');
    await ctx.page.fill('[data-testid="product-name-input"]', 'RAPID CLICK PRODUCT');
    await ctx.page.fill('[data-testid="product-hsn-input"]', '3004');
    await ctx.page.fill('[data-testid="product-pack-size-input"]', '10 Tabs');
    await ctx.page.fill('[data-testid="product-mfr-input"]', 'RAPID LABS');

    const saveBtn = ctx.page.locator('[data-testid="product-save-btn"]');
    await Promise.all([
      saveBtn.click({ clickCount: 2, delay: 50 }),
    ]);

    await expect(ctx.page.locator('[data-testid="product-form"]')).toBeHidden({ timeout: 10000 });

    const productRows = await ctx.page.locator('tr:has-text("RAPID CLICK PRODUCT")').count();
    expect(productRows).toBe(1);
  });
});
