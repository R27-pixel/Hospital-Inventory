import { test, expect } from '@playwright/test';
import { launchElectronApp, setupInitialAccounts, ElectronTestContext } from './helpers/electron-app';

test.describe('5. Outbound Stock Exit Workflow', () => {
  let ctx: ElectronTestContext;

  test.beforeEach(async () => {
    ctx = await launchElectronApp();
    await setupInitialAccounts(ctx.page);

    // Setup Prerequisite Stock (Product + Batch via Purchase Invoice)
    await ctx.page.click('[data-testid="nav-suppliers"]');
    await ctx.page.click('[data-testid="add-supplier-btn"]');
    await ctx.page.fill('[data-testid="supplier-name-input"]', 'M/S GUPTA SURGICALS');
    await ctx.page.click('[data-testid="supplier-save-btn"]');

    await ctx.page.click('[data-testid="nav-inventory"]');
    await ctx.page.click('[data-testid="add-product-btn"]');
    await ctx.page.fill('[data-testid="product-name-input"]', 'AUGMENTIN 625MG');
    await ctx.page.fill('[data-testid="product-hsn-input"]', '3004');
    await ctx.page.fill('[data-testid="product-pack-size-input"]', '10 Tablets');
    await ctx.page.fill('[data-testid="product-mfr-input"]', 'GSK');
    await ctx.page.click('[data-testid="product-save-btn"]');

    await ctx.page.click('[data-testid="nav-purchases"]');
    await ctx.page.fill('[data-testid="purchase-invoice-number-input"]', 'INV-AUG-100');
    await ctx.page.fill('[data-testid="purchase-item-name-0"]', 'AUGMENTIN 625MG');
    await ctx.page.fill('[data-testid="purchase-item-hsn-0"]', '3004');
    await ctx.page.fill('[data-testid="purchase-item-pack-0"]', '10 Tablets');
    await ctx.page.fill('[data-testid="purchase-item-qty-0"]', '15');
    await ctx.page.fill('[data-testid="purchase-item-batch-0"]', 'AUG-BATCH-99');
    await ctx.page.fill('[data-testid="purchase-item-exp-0"]', '10/2027');
    await ctx.page.fill('[data-testid="purchase-item-mrp-0"]', '200.00');
    await ctx.page.fill('[data-testid="purchase-item-rate-0"]', '150.00');
    await ctx.page.click('[data-testid="purchase-save-btn"]');
    await expect(ctx.page.locator('text=Purchase Invoice INV-AUG-100 saved cleanly')).toBeVisible();
  });

  test.afterEach(async () => {
    if (ctx) {
      await ctx.cleanup();
    }
  });

  test('5.1 Should record outbound stock exit and update balance', async () => {
    await ctx.page.click('[data-testid="nav-stock-exit"]');

    // Fill Stock Exit Form
    await ctx.page.fill('[data-testid="stock-exit-qty-input"]', '5');
    await ctx.page.selectOption('[data-testid="stock-exit-reason-select"]', 'Issued');

    await ctx.page.click('[data-testid="stock-exit-submit-btn"]');

    // Verify Success alert & updated balance
    await expect(ctx.page.locator('[data-testid="stock-exit-success-alert"]')).toBeVisible();
    const successText = await ctx.page.textContent('[data-testid="stock-exit-success-alert"]');
    expect(successText).toContain('New batch stock: 10 units');

    // Verify Stock updated in Product Inventory tab
    await ctx.page.click('[data-testid="nav-inventory"]');
    await expect(ctx.page.locator('text=10 units')).toBeVisible();
  });
});
