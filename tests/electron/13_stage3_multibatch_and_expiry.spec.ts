import { test, expect } from '@playwright/test';
import { launchElectronApp, setupInitialAccounts, ElectronTestContext } from './helpers/electron-app';

test.describe('13. Stage 3 — Priority 2 & 3: Multi-Batch & Expiry Interaction QA', () => {
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

  test('13.1 Multi-batch integrity: Total product stock must equal sum of active batch stock & exit deducts from correct batch', async () => {
    // Setup Supplier & Product
    await ctx.page.click('[data-testid="nav-suppliers"]');
    await ctx.page.click('[data-testid="add-supplier-btn"]');
    await ctx.page.fill('[data-testid="supplier-name-input"]', 'MULTIBATCH PHARMA');
    await ctx.page.click('[data-testid="supplier-save-btn"]');

    await ctx.page.click('[data-testid="nav-inventory"]');
    await ctx.page.click('[data-testid="add-product-btn"]');
    await ctx.page.fill('[data-testid="product-name-input"]', 'MULTI-BATCH SYRUP 100ML');
    await ctx.page.fill('[data-testid="product-hsn-input"]', '3004');
    await ctx.page.fill('[data-testid="product-pack-size-input"]', '100ml');
    await ctx.page.fill('[data-testid="product-mfr-input"]', 'MULTI LABS');
    await ctx.page.click('[data-testid="product-save-btn"]');

    // 1. Create Batch 1: Expired (Qty: 10, Yesterday)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    await ctx.page.click('[data-testid="nav-purchases"]');
    await ctx.page.selectOption('[data-testid="purchase-supplier-select"]', { label: 'MULTIBATCH PHARMA' });
    await ctx.page.fill('[data-testid="purchase-invoice-number-input"]', 'INV-MULTI-01');
    await ctx.page.fill('[data-testid="purchase-item-name-0"]', 'MULTI-BATCH SYRUP 100ML');
    await ctx.page.fill('[data-testid="purchase-item-qty-0"]', '10');
    await ctx.page.fill('[data-testid="purchase-item-batch-0"]', 'BATCH-EXPIRED-10');
    await ctx.page.fill('[data-testid="purchase-item-exp-0"]', yesterdayStr);
    await ctx.page.fill('[data-testid="purchase-item-mrp-0"]', '100.00');
    await ctx.page.fill('[data-testid="purchase-item-rate-0"]', '80.00');
    await ctx.page.click('[data-testid="purchase-save-btn"]');
    await expect(ctx.page.locator('text=Purchase Invoice INV-MULTI-01 saved cleanly')).toBeVisible();

    // 2. Create Batch 2: Expiring Soon (Qty: 20, 15 days)
    const in15Days = new Date();
    in15Days.setDate(in15Days.getDate() + 15);
    const in15DaysStr = in15Days.toISOString().slice(0, 10);

    await ctx.page.selectOption('[data-testid="purchase-supplier-select"]', { label: 'MULTIBATCH PHARMA' });
    await ctx.page.fill('[data-testid="purchase-invoice-number-input"]', 'INV-MULTI-02');
    await ctx.page.fill('[data-testid="purchase-item-name-0"]', 'MULTI-BATCH SYRUP 100ML');
    await ctx.page.fill('[data-testid="purchase-item-qty-0"]', '20');
    await ctx.page.fill('[data-testid="purchase-item-batch-0"]', 'BATCH-SOON-20');
    await ctx.page.fill('[data-testid="purchase-item-exp-0"]', in15DaysStr);
    await ctx.page.fill('[data-testid="purchase-item-mrp-0"]', '100.00');
    await ctx.page.fill('[data-testid="purchase-item-rate-0"]', '80.00');
    await ctx.page.click('[data-testid="purchase-save-btn"]');
    await expect(ctx.page.locator('text=Purchase Invoice INV-MULTI-02 saved cleanly')).toBeVisible();

    // 3. Create Batch 3: Normal (Qty: 30, 2028-12-31)
    await ctx.page.selectOption('[data-testid="purchase-supplier-select"]', { label: 'MULTIBATCH PHARMA' });
    await ctx.page.fill('[data-testid="purchase-invoice-number-input"]', 'INV-MULTI-03');
    await ctx.page.fill('[data-testid="purchase-item-name-0"]', 'MULTI-BATCH SYRUP 100ML');
    await ctx.page.fill('[data-testid="purchase-item-qty-0"]', '30');
    await ctx.page.fill('[data-testid="purchase-item-batch-0"]', 'BATCH-NORMAL-30');
    await ctx.page.fill('[data-testid="purchase-item-exp-0"]', '12/2028');
    await ctx.page.fill('[data-testid="purchase-item-mrp-0"]', '100.00');
    await ctx.page.fill('[data-testid="purchase-item-rate-0"]', '80.00');
    await ctx.page.click('[data-testid="purchase-save-btn"]');
    await expect(ctx.page.locator('text=Purchase Invoice INV-MULTI-03 saved cleanly')).toBeVisible();

    // 4. Verify Total Stock = 60 units (10 + 20 + 30) in Product Catalog
    await ctx.page.click('[data-testid="nav-inventory"]');
    await expect(ctx.page.locator('strong:has-text("60 units")')).toBeVisible();

    // 5. Inspect Batch Modal: Verify all 3 batches and statuses
    const batchesBtn = ctx.page.locator('button:has-text("Batches")').first();
    await batchesBtn.click();

    await expect(ctx.page.locator('text=BATCH-EXPIRED-10')).toBeVisible();
    await expect(ctx.page.locator('.status-pill.badge-expired')).toBeVisible();

    await expect(ctx.page.locator('text=BATCH-SOON-20')).toBeVisible();
    await expect(ctx.page.locator('.status-pill.badge-expiring-soon')).toBeVisible();

    await expect(ctx.page.locator('text=BATCH-NORMAL-30')).toBeVisible();
    await ctx.page.click('.modal-close-btn');

    // 6. Target Stock Exit against BATCH-NORMAL-30 (Deduct 5 units)
    await ctx.page.click('[data-testid="nav-stock-exit"]');
    const optionVal = await ctx.page.locator('[data-testid="stock-exit-batch-select"] option:has-text("BATCH-NORMAL-30")').getAttribute('value');
    await ctx.page.selectOption('[data-testid="stock-exit-batch-select"]', optionVal!);

    await ctx.page.fill('[data-testid="stock-exit-qty-input"]', '5');
    await ctx.page.click('[data-testid="stock-exit-submit-btn"]');
    await expect(ctx.page.locator('text=New batch stock: 25 units')).toBeVisible();

    // 7. Verify Product Total Stock is now 55 units (10 + 20 + 25)
    await ctx.page.click('[data-testid="nav-inventory"]');
    await expect(ctx.page.locator('strong:has-text("55 units")')).toBeVisible();
  });
});
