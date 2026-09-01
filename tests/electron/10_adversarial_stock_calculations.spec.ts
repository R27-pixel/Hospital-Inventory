import { test, expect } from '@playwright/test';
import { launchElectronApp, setupInitialAccounts, ElectronTestContext } from './helpers/electron-app';

test.describe('10. Multi-Step Stock Calculation & Balance Ledger QA', () => {
  let ctx: ElectronTestContext;

  test.beforeEach(async () => {
    ctx = await launchElectronApp();
    await setupInitialAccounts(ctx.page);

    // Setup Supplier & Product
    await ctx.page.click('[data-testid="nav-suppliers"]');
    await ctx.page.click('[data-testid="add-supplier-btn"]');
    await ctx.page.fill('[data-testid="supplier-name-input"]', 'STOCK LEDGER AGENCY');
    await ctx.page.click('[data-testid="supplier-save-btn"]');

    await ctx.page.click('[data-testid="nav-inventory"]');
    await ctx.page.click('[data-testid="add-product-btn"]');
    await ctx.page.fill('[data-testid="product-name-input"]', 'LEDGER MEDICINE 500MG');
    await ctx.page.fill('[data-testid="product-hsn-input"]', '3004');
    await ctx.page.fill('[data-testid="product-pack-size-input"]', '10 Strips');
    await ctx.page.fill('[data-testid="product-mfr-input"]', 'LEDGER LABS');
    await ctx.page.click('[data-testid="product-save-btn"]');
  });

  test.afterEach(async () => {
    if (ctx) {
      await ctx.cleanup();
    }
  });

  test('10.1 Should track multi-step stock flow: Purchase 100 -> Exit 20 (80) -> Exit 30 (50) -> Over-Exit Check -> Purchase 25 (75) -> Exit 75 (0)', async () => {
    // 1. Purchase 100
    await ctx.page.click('[data-testid="nav-purchases"]');
    await ctx.page.selectOption('[data-testid="purchase-supplier-select"]', { label: 'STOCK LEDGER AGENCY' });
    await ctx.page.fill('[data-testid="purchase-invoice-number-input"]', 'INV-LEDGER-01');
    await ctx.page.fill('[data-testid="purchase-item-name-0"]', 'LEDGER MEDICINE 500MG');
    await ctx.page.fill('[data-testid="purchase-item-qty-0"]', '100');
    await ctx.page.fill('[data-testid="purchase-item-batch-0"]', 'BATCH-LEDGER-A');
    await ctx.page.fill('[data-testid="purchase-item-exp-0"]', '12/2028');
    await ctx.page.fill('[data-testid="purchase-item-mrp-0"]', '100.00');
    await ctx.page.fill('[data-testid="purchase-item-rate-0"]', '80.00');
    await ctx.page.click('[data-testid="purchase-save-btn"]');
    await expect(ctx.page.locator('text=Purchase Invoice INV-LEDGER-01 saved cleanly')).toBeVisible();

    // Verify Catalog stock = 100
    await ctx.page.click('[data-testid="nav-inventory"]');
    await expect(ctx.page.locator('text=100 units')).toBeVisible();

    // 2. Exit 20 (Stock = 80)
    await ctx.page.click('[data-testid="nav-stock-exit"]');
    await ctx.page.fill('[data-testid="stock-exit-qty-input"]', '20');
    await ctx.page.click('[data-testid="stock-exit-submit-btn"]');
    await expect(ctx.page.locator('[data-testid="stock-exit-success-alert"]')).toBeVisible();
    await expect(ctx.page.locator('text=New batch stock: 80 units')).toBeVisible();

    // 3. Exit 30 (Stock = 50)
    await ctx.page.fill('[data-testid="stock-exit-qty-input"]', '30');
    await ctx.page.click('[data-testid="stock-exit-submit-btn"]');
    await expect(ctx.page.locator('text=New batch stock: 50 units')).toBeVisible();

    // 4. Over-Exit Validation Check: Filling 60 units when stock is 50 triggers HTML5 max attribute constraint validation (60 > max 50)
    await ctx.page.fill('[data-testid="stock-exit-qty-input"]', '60');
    const isQtyValid = await ctx.page.locator('[data-testid="stock-exit-qty-input"]').evaluate((el: HTMLInputElement) => el.checkValidity());
    expect(isQtyValid).toBe(false);

    // 5. Purchase 25 into same batch (Stock = 75)
    await ctx.page.click('[data-testid="nav-purchases"]');
    await ctx.page.selectOption('[data-testid="purchase-supplier-select"]', { label: 'STOCK LEDGER AGENCY' });
    await ctx.page.fill('[data-testid="purchase-invoice-number-input"]', 'INV-LEDGER-02');
    await ctx.page.fill('[data-testid="purchase-item-name-0"]', 'LEDGER MEDICINE 500MG');
    await ctx.page.fill('[data-testid="purchase-item-qty-0"]', '25');
    await ctx.page.fill('[data-testid="purchase-item-batch-0"]', 'BATCH-LEDGER-A');
    await ctx.page.fill('[data-testid="purchase-item-exp-0"]', '12/2028');
    await ctx.page.fill('[data-testid="purchase-item-mrp-0"]', '100.00');
    await ctx.page.fill('[data-testid="purchase-item-rate-0"]', '80.00');
    await ctx.page.click('[data-testid="purchase-save-btn"]');
    await expect(ctx.page.locator('text=Purchase Invoice INV-LEDGER-02 saved cleanly')).toBeVisible();

    // Verify Catalog stock = 75
    await ctx.page.click('[data-testid="nav-inventory"]');
    await expect(ctx.page.locator('text=75 units')).toBeVisible();

    // 6. Exit 75 (Stock = 0)
    await ctx.page.click('[data-testid="nav-stock-exit"]');
    await ctx.page.fill('[data-testid="stock-exit-qty-input"]', '75');
    await ctx.page.click('[data-testid="stock-exit-submit-btn"]');
    await expect(ctx.page.locator('text=New batch stock: 0 units')).toBeVisible();

    // Verify Catalog stock = 0 units
    await ctx.page.click('[data-testid="nav-inventory"]');
    await expect(ctx.page.locator('strong:has-text("0 units")')).toBeVisible();
  });
});
