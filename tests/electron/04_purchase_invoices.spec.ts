import { test, expect } from '@playwright/test';
import { launchElectronApp, setupInitialAccounts, ElectronTestContext } from './helpers/electron-app';

test.describe('4. Purchase Invoices & Stock Processing', () => {
  let ctx: ElectronTestContext;

  test.beforeEach(async () => {
    ctx = await launchElectronApp();
    await setupInitialAccounts(ctx.page);

    // Setup Prerequisite Supplier & Product
    await ctx.page.click('[data-testid="nav-suppliers"]');
    await ctx.page.click('[data-testid="add-supplier-btn"]');
    await ctx.page.fill('[data-testid="supplier-name-input"]', 'MAA VACCINE PHARMA');
    await ctx.page.fill('[data-testid="supplier-gstin-input"]', '10BBHPK9558A1ZX');
    await ctx.page.click('[data-testid="supplier-save-btn"]');

    await ctx.page.click('[data-testid="nav-inventory"]');
    await ctx.page.click('[data-testid="add-product-btn"]');
    await ctx.page.fill('[data-testid="product-name-input"]', 'TRAN 5ML');
    await ctx.page.fill('[data-testid="product-hsn-input"]', '3004');
    await ctx.page.fill('[data-testid="product-pack-size-input"]', '5ml Ampoule');
    await ctx.page.fill('[data-testid="product-mfr-input"]', 'STRAN');
    await ctx.page.click('[data-testid="product-save-btn"]');
  });

  test.afterEach(async () => {
    if (ctx) {
      await ctx.cleanup();
    }
  });

  test('4.1 Should create purchase invoice with batch & update product stock inventory', async () => {
    await ctx.page.click('[data-testid="nav-purchases"]');

    // Fill Invoice Header
    await ctx.page.fill('[data-testid="purchase-invoice-number-input"]', 'INV-2026-001');

    // Fill Line Item Row
    await ctx.page.fill('[data-testid="purchase-item-name-0"]', 'TRAN 5ML');
    await ctx.page.fill('[data-testid="purchase-item-hsn-0"]', '3004');
    await ctx.page.fill('[data-testid="purchase-item-pack-0"]', '5ml Ampoule');
    await ctx.page.fill('[data-testid="purchase-item-qty-0"]', '20');
    await ctx.page.fill('[data-testid="purchase-item-batch-0"]', 'BATCH-TR-01');
    await ctx.page.fill('[data-testid="purchase-item-exp-0"]', '12/2027');
    await ctx.page.fill('[data-testid="purchase-item-mrp-0"]', '63.63');
    await ctx.page.fill('[data-testid="purchase-item-rate-0"]', '60.00');

    // Save Invoice
    await ctx.page.click('[data-testid="purchase-save-btn"]');

    // Verify Success alert
    await expect(ctx.page.locator('text=Purchase Invoice INV-2026-001 saved cleanly')).toBeVisible({ timeout: 10000 });

    // Verify Total Stock updated in Product Inventory tab
    await ctx.page.click('[data-testid="nav-inventory"]');
    await expect(ctx.page.locator('text=20 units')).toBeVisible();
  });
});
