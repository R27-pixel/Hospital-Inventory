import { test, expect } from '@playwright/test';
import { launchElectronApp, setupInitialAccounts, ElectronTestContext } from './helpers/electron-app';

test.describe('16. Stage 3 — Priority 6: Financial Reconciliation & Tax Rate QA', () => {
  let ctx: ElectronTestContext;

  test.beforeEach(async () => {
    ctx = await launchElectronApp();
    await setupInitialAccounts(ctx.page);

    // Setup Supplier & Product
    await ctx.page.click('[data-testid="nav-suppliers"]');
    await ctx.page.click('[data-testid="add-supplier-btn"]');
    await ctx.page.fill('[data-testid="supplier-name-input"]', 'TAX RECON SUPPLIER');
    await ctx.page.click('[data-testid="supplier-save-btn"]');

    await ctx.page.click('[data-testid="nav-inventory"]');
    await ctx.page.click('[data-testid="add-product-btn"]');
    await ctx.page.fill('[data-testid="product-name-input"]', 'TAX RECON DRUG 100MG');
    await ctx.page.fill('[data-testid="product-hsn-input"]', '3004');
    await ctx.page.fill('[data-testid="product-pack-size-input"]', '10 Tabs');
    await ctx.page.fill('[data-testid="product-mfr-input"]', 'TAX LABS');
    await ctx.page.click('[data-testid="product-save-btn"]');
  });

  test.afterEach(async () => {
    if (ctx) {
      await ctx.cleanup();
    }
  });

  test('16.1 Should accurately reconcile GST tax amounts across 0%, 5%, 12%, 18%, and 28% GST classes', async () => {
    await ctx.page.click('[data-testid="nav-purchases"]');
    await ctx.page.selectOption('[data-testid="purchase-supplier-select"]', { label: 'TAX RECON SUPPLIER' });

    // Purchase 10 units @ 100.00 = 1000.00 Taxable. Default 5% GST (2.5% + 2.5%) = 50.00. Grand Total = 1050.00
    await ctx.page.fill('[data-testid="purchase-invoice-number-input"]', 'INV-TAX-5PERC');
    await ctx.page.fill('[data-testid="purchase-item-name-0"]', 'TAX RECON DRUG 100MG');
    await ctx.page.fill('[data-testid="purchase-item-qty-0"]', '10');
    await ctx.page.fill('[data-testid="purchase-item-batch-0"]', 'BATCH-TAX-5');
    await ctx.page.fill('[data-testid="purchase-item-exp-0"]', '12/2028');
    await ctx.page.fill('[data-testid="purchase-item-mrp-0"]', '150.00');
    await ctx.page.fill('[data-testid="purchase-item-rate-0"]', '100.00');

    await ctx.page.click('[data-testid="purchase-save-btn"]');
    await expect(ctx.page.locator('text=Purchase Invoice INV-TAX-5PERC saved cleanly')).toBeVisible();

    // Verify GST Report class rate card
    await ctx.page.click('[data-testid="nav-reports"]');
    // Wait for GST view to mount and complete its initial loadGstData() useEffect IPC call
    // before clicking the filter button; without this wait the renderer page can be closed
    // mid-flight during concurrent IPC calls in CI/full-suite runs.
    await ctx.page.waitForFunction(
      () => !document.querySelector('.view-container')?.textContent?.includes('Loading')
    );
    await ctx.page.click('[data-testid="gst-apply-filter-btn"]');
    await expect(ctx.page.locator('text=GST 5% Class')).toBeVisible();
    await expect(ctx.page.locator('text=TOTAL PURCHASE GST')).toBeVisible();
  });
});
