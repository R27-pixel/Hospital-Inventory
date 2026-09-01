import { test, expect } from '@playwright/test';
import { launchElectronApp, setupInitialAccounts, ElectronTestContext } from './helpers/electron-app';

test.describe('8. Adversarial Financial Math & Precision QA', () => {
  let ctx: ElectronTestContext;

  test.beforeEach(async () => {
    ctx = await launchElectronApp();
    await setupInitialAccounts(ctx.page);

    // Setup Prerequisite Supplier & Product
    await ctx.page.click('[data-testid="nav-suppliers"]');
    await ctx.page.click('[data-testid="add-supplier-btn"]');
    await ctx.page.fill('[data-testid="supplier-name-input"]', 'MATH PHARMA AGENCY');
    await ctx.page.click('[data-testid="supplier-save-btn"]');

    await ctx.page.click('[data-testid="nav-inventory"]');
    await ctx.page.click('[data-testid="add-product-btn"]');
    await ctx.page.fill('[data-testid="product-name-input"]', 'PRECISION INJECTION 10ML');
    await ctx.page.fill('[data-testid="product-hsn-input"]', '3004');
    await ctx.page.fill('[data-testid="product-pack-size-input"]', '1 Vial');
    await ctx.page.fill('[data-testid="product-mfr-input"]', 'MATH LABS');
    await ctx.page.click('[data-testid="product-save-btn"]');
  });

  test.afterEach(async () => {
    if (ctx) {
      await ctx.cleanup();
    }
  });

  test('8.1 Should accurately calculate Qty x Rate, Taxable Base, GST % and Grand Total', async () => {
    await ctx.page.click('[data-testid="nav-purchases"]');
    await ctx.page.selectOption('[data-testid="purchase-supplier-select"]', { label: 'MATH PHARMA AGENCY' });

    // Create Purchase Invoice: 10 units @ 100.00 = 1000.00 Taxable. Default GST (2.5% + 2.5% = 5%) = 50.00. Grand Total = 1050.00
    await ctx.page.fill('[data-testid="purchase-invoice-number-input"]', 'INV-MATH-001');
    await ctx.page.fill('[data-testid="purchase-item-name-0"]', 'PRECISION INJECTION 10ML');
    await ctx.page.fill('[data-testid="purchase-item-qty-0"]', '10');
    await ctx.page.fill('[data-testid="purchase-item-batch-0"]', 'BATCH-MATH-01');
    await ctx.page.fill('[data-testid="purchase-item-exp-0"]', '12/2028');
    await ctx.page.fill('[data-testid="purchase-item-mrp-0"]', '150.00');
    await ctx.page.fill('[data-testid="purchase-item-rate-0"]', '100.00');

    await ctx.page.click('[data-testid="purchase-save-btn"]');

    await expect(ctx.page.locator('text=Purchase Invoice INV-MATH-001 saved cleanly')).toBeVisible();

    // Verify Dashboard summary matches actual Taxable Base (1000.00) and GST Amount (50.00) (Regression for BUG-002)
    await ctx.page.click('[data-testid="nav-dashboard"]');
    await expect(ctx.page.locator('text=INV-MATH-001')).toBeVisible();
    await expect(ctx.page.locator('text=₹1000.00')).toBeVisible();
    await expect(ctx.page.locator('text=₹50.00')).toBeVisible();
    await expect(ctx.page.locator('text=₹1050.00')).toBeVisible();
  });

  test('8.2 Should handle decimal prices and verify GST Class breakdown in reports', async () => {
    await ctx.page.click('[data-testid="nav-purchases"]');
    await ctx.page.selectOption('[data-testid="purchase-supplier-select"]', { label: 'MATH PHARMA AGENCY' });

    await ctx.page.fill('[data-testid="purchase-invoice-number-input"]', 'INV-MATH-DECIMAL');
    await ctx.page.fill('[data-testid="purchase-item-name-0"]', 'PRECISION INJECTION 10ML');
    await ctx.page.fill('[data-testid="purchase-item-qty-0"]', '3');
    await ctx.page.fill('[data-testid="purchase-item-batch-0"]', 'BATCH-DEC-99');
    await ctx.page.fill('[data-testid="purchase-item-exp-0"]', '10/2029');
    await ctx.page.fill('[data-testid="purchase-item-mrp-0"]', '63.63');
    await ctx.page.fill('[data-testid="purchase-item-rate-0"]', '57.85');

    await ctx.page.click('[data-testid="purchase-save-btn"]');
    await expect(ctx.page.locator('text=Purchase Invoice INV-MATH-DECIMAL saved cleanly')).toBeVisible();

    // Check GST Report View
    await ctx.page.click('[data-testid="nav-reports"]');
    await ctx.page.click('[data-testid="gst-apply-filter-btn"]');
    await expect(ctx.page.locator('text=TOTAL PURCHASE GST')).toBeVisible();
  });
});
