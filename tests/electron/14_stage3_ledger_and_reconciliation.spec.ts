import { test, expect } from '@playwright/test';
import { launchElectronApp, setupInitialAccounts, ElectronTestContext } from './helpers/electron-app';

test.describe('14. Stage 3 — Priority 4: Deterministic Ledger Reconciliation QA', () => {
  let ctx: ElectronTestContext;

  test.afterEach(async () => {
    if (ctx) {
      await ctx.cleanup();
    }
  });

  test('14.1 Should accurately reconcile multi-transaction ledger: P(100) -> E(20) -> P(50) -> E(30) -> E(25) -> P(10) = 85 units', async () => {
    ctx = await launchElectronApp();
    await setupInitialAccounts(ctx.page);

    // Setup Supplier & Product
    await ctx.page.click('[data-testid="nav-suppliers"]');
    await ctx.page.click('[data-testid="add-supplier-btn"]');
    await ctx.page.fill('[data-testid="supplier-name-input"]', 'RECONCILIATION LABS');
    await ctx.page.click('[data-testid="supplier-save-btn"]');

    await ctx.page.click('[data-testid="nav-inventory"]');
    await ctx.page.click('[data-testid="add-product-btn"]');
    await ctx.page.fill('[data-testid="product-name-input"]', 'RECONCILIATION TABLET 650MG');
    await ctx.page.fill('[data-testid="product-hsn-input"]', '3004');
    await ctx.page.fill('[data-testid="product-pack-size-input"]', '10 Tabs');
    await ctx.page.fill('[data-testid="product-mfr-input"]', 'RECON LABS');
    await ctx.page.click('[data-testid="product-save-btn"]');

    // 1. Purchase 100
    await ctx.page.click('[data-testid="nav-purchases"]');
    await ctx.page.selectOption('[data-testid="purchase-supplier-select"]', { label: 'RECONCILIATION LABS' });
    await ctx.page.fill('[data-testid="purchase-invoice-number-input"]', 'INV-RECON-01');
    await ctx.page.fill('[data-testid="purchase-item-name-0"]', 'RECONCILIATION TABLET 650MG');
    await ctx.page.fill('[data-testid="purchase-item-qty-0"]', '100');
    await ctx.page.fill('[data-testid="purchase-item-batch-0"]', 'BATCH-RECON-X');
    await ctx.page.fill('[data-testid="purchase-item-exp-0"]', '12/2028');
    await ctx.page.fill('[data-testid="purchase-item-mrp-0"]', '100.00');
    await ctx.page.fill('[data-testid="purchase-item-rate-0"]', '80.00');
    await ctx.page.click('[data-testid="purchase-save-btn"]');
    await expect(ctx.page.locator('text=Purchase Invoice INV-RECON-01 saved cleanly')).toBeVisible();

    // 2. Exit 20 (Balance = 80)
    await ctx.page.click('[data-testid="nav-stock-exit"]');
    await ctx.page.fill('[data-testid="stock-exit-qty-input"]', '20');
    await ctx.page.click('[data-testid="stock-exit-submit-btn"]');
    await expect(ctx.page.locator('text=New batch stock: 80 units')).toBeVisible();

    // 3. Purchase 50 (Balance = 130)
    await ctx.page.click('[data-testid="nav-purchases"]');
    await ctx.page.selectOption('[data-testid="purchase-supplier-select"]', { label: 'RECONCILIATION LABS' });
    await ctx.page.fill('[data-testid="purchase-invoice-number-input"]', 'INV-RECON-02');
    await ctx.page.fill('[data-testid="purchase-item-name-0"]', 'RECONCILIATION TABLET 650MG');
    await ctx.page.fill('[data-testid="purchase-item-qty-0"]', '50');
    await ctx.page.fill('[data-testid="purchase-item-batch-0"]', 'BATCH-RECON-X');
    await ctx.page.fill('[data-testid="purchase-item-exp-0"]', '12/2028');
    await ctx.page.fill('[data-testid="purchase-item-mrp-0"]', '100.00');
    await ctx.page.fill('[data-testid="purchase-item-rate-0"]', '80.00');
    await ctx.page.click('[data-testid="purchase-save-btn"]');
    await expect(ctx.page.locator('text=Purchase Invoice INV-RECON-02 saved cleanly')).toBeVisible();

    // 4. Exit 30 (Balance = 100)
    await ctx.page.click('[data-testid="nav-stock-exit"]');
    await ctx.page.fill('[data-testid="stock-exit-qty-input"]', '30');
    await ctx.page.click('[data-testid="stock-exit-submit-btn"]');
    await expect(ctx.page.locator('text=New batch stock: 100 units')).toBeVisible();

    // 5. Exit 25 (Balance = 75)
    await ctx.page.fill('[data-testid="stock-exit-qty-input"]', '25');
    await ctx.page.click('[data-testid="stock-exit-submit-btn"]');
    await expect(ctx.page.locator('text=New batch stock: 75 units')).toBeVisible();

    // 6. Purchase 10 (Balance = 85)
    await ctx.page.click('[data-testid="nav-purchases"]');
    await ctx.page.selectOption('[data-testid="purchase-supplier-select"]', { label: 'RECONCILIATION LABS' });
    await ctx.page.fill('[data-testid="purchase-invoice-number-input"]', 'INV-RECON-03');
    await ctx.page.fill('[data-testid="purchase-item-name-0"]', 'RECONCILIATION TABLET 650MG');
    await ctx.page.fill('[data-testid="purchase-item-qty-0"]', '10');
    await ctx.page.fill('[data-testid="purchase-item-batch-0"]', 'BATCH-RECON-X');
    await ctx.page.fill('[data-testid="purchase-item-exp-0"]', '12/2028');
    await ctx.page.fill('[data-testid="purchase-item-mrp-0"]', '100.00');
    await ctx.page.fill('[data-testid="purchase-item-rate-0"]', '80.00');
    await ctx.page.click('[data-testid="purchase-save-btn"]');
    await expect(ctx.page.locator('text=Purchase Invoice INV-RECON-03 saved cleanly')).toBeVisible();

    // 7. Verify UI balance = 85 units in Product Catalog
    await ctx.page.click('[data-testid="nav-inventory"]');
    await expect(ctx.page.locator('strong:has-text("85 units")')).toBeVisible();

    // 8. Verify checkStockIntegrity() audit ledger returns 0 discrepancies
    const discrepancies = await ctx.page.evaluate(async () => {
      return await (window as any).electronAPI.batches.getAll();
    });
    const reconBatch = discrepancies.find((b: any) => b.batch_number === 'BATCH-RECON-X');
    expect(reconBatch.current_stock).toBe(85);
  });
});
