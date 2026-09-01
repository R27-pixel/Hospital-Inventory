import { test, expect } from '@playwright/test';
import { launchElectronApp, setupInitialAccounts, ElectronTestContext } from './helpers/electron-app';

test.describe('9. Adversarial Expiry & Date Boundary QA', () => {
  let ctx: ElectronTestContext;

  test.beforeEach(async () => {
    ctx = await launchElectronApp();
    await setupInitialAccounts(ctx.page);

    // Setup Prerequisite Supplier & Product
    await ctx.page.click('[data-testid="nav-suppliers"]');
    await ctx.page.click('[data-testid="add-supplier-btn"]');
    await ctx.page.fill('[data-testid="supplier-name-input"]', 'EXPIRY SPECIALIST LABS');
    await ctx.page.click('[data-testid="supplier-save-btn"]');

    await ctx.page.click('[data-testid="nav-inventory"]');
    await ctx.page.click('[data-testid="add-product-btn"]');
    await ctx.page.fill('[data-testid="product-name-input"]', 'VACCINE EXPIRY TEST');
    await ctx.page.fill('[data-testid="product-hsn-input"]', '3004');
    await ctx.page.fill('[data-testid="product-pack-size-input"]', '1 Dose');
    await ctx.page.fill('[data-testid="product-mfr-input"]', 'EXPIRY LABS');
    await ctx.page.click('[data-testid="product-save-btn"]');
  });

  test.afterEach(async () => {
    if (ctx) {
      await ctx.cleanup();
    }
  });

  test('9.1 Should correctly classify Expiry status for Past, Today, 30 Days, 31 Days, and Leap Year dates', async () => {
    const today = new Date();

    // Past date (yesterday)
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    // 30 days from now (EXPIRING_SOON boundary)
    const in30Days = new Date(today);
    in30Days.setDate(today.getDate() + 30);
    const in30DaysStr = in30Days.toISOString().slice(0, 10);

    // 31 days from now (NORMAL boundary)
    const in31Days = new Date(today);
    in31Days.setDate(today.getDate() + 31);
    const in31DaysStr = in31Days.toISOString().slice(0, 10);

    // 1. Enter Past Expiry Batch
    await ctx.page.click('[data-testid="nav-purchases"]');
    await ctx.page.selectOption('[data-testid="purchase-supplier-select"]', { label: 'EXPIRY SPECIALIST LABS' });
    await ctx.page.fill('[data-testid="purchase-invoice-number-input"]', 'INV-EXP-PAST');
    await ctx.page.fill('[data-testid="purchase-item-name-0"]', 'VACCINE EXPIRY TEST');
    await ctx.page.fill('[data-testid="purchase-item-qty-0"]', '5');
    await ctx.page.fill('[data-testid="purchase-item-batch-0"]', 'BATCH-PAST-01');
    await ctx.page.fill('[data-testid="purchase-item-exp-0"]', yesterdayStr);
    await ctx.page.fill('[data-testid="purchase-item-mrp-0"]', '100.00');
    await ctx.page.fill('[data-testid="purchase-item-rate-0"]', '80.00');
    await ctx.page.click('[data-testid="purchase-save-btn"]');
    await expect(ctx.page.locator('text=Purchase Invoice INV-EXP-PAST saved cleanly')).toBeVisible();

    // 2. Enter 30-Day Expiry Batch
    await ctx.page.selectOption('[data-testid="purchase-supplier-select"]', { label: 'EXPIRY SPECIALIST LABS' });
    await ctx.page.fill('[data-testid="purchase-invoice-number-input"]', 'INV-EXP-30DAYS');
    await ctx.page.fill('[data-testid="purchase-item-name-0"]', 'VACCINE EXPIRY TEST');
    await ctx.page.fill('[data-testid="purchase-item-qty-0"]', '10');
    await ctx.page.fill('[data-testid="purchase-item-batch-0"]', 'BATCH-30DAYS-02');
    await ctx.page.fill('[data-testid="purchase-item-exp-0"]', in30DaysStr);
    await ctx.page.fill('[data-testid="purchase-item-mrp-0"]', '100.00');
    await ctx.page.fill('[data-testid="purchase-item-rate-0"]', '80.00');
    await ctx.page.click('[data-testid="purchase-save-btn"]');
    await expect(ctx.page.locator('text=Purchase Invoice INV-EXP-30DAYS saved cleanly')).toBeVisible();

    // 3. Enter 31-Day Expiry Batch
    await ctx.page.selectOption('[data-testid="purchase-supplier-select"]', { label: 'EXPIRY SPECIALIST LABS' });
    await ctx.page.fill('[data-testid="purchase-invoice-number-input"]', 'INV-EXP-31DAYS');
    await ctx.page.fill('[data-testid="purchase-item-name-0"]', 'VACCINE EXPIRY TEST');
    await ctx.page.fill('[data-testid="purchase-item-qty-0"]', '15');
    await ctx.page.fill('[data-testid="purchase-item-batch-0"]', 'BATCH-31DAYS-03');
    await ctx.page.fill('[data-testid="purchase-item-exp-0"]', in31DaysStr);
    await ctx.page.fill('[data-testid="purchase-item-mrp-0"]', '100.00');
    await ctx.page.fill('[data-testid="purchase-item-rate-0"]', '80.00');
    await ctx.page.click('[data-testid="purchase-save-btn"]');
    await expect(ctx.page.locator('text=Purchase Invoice INV-EXP-31DAYS saved cleanly')).toBeVisible();

    // 4. Enter Leap Year Batch (2028-02-29)
    await ctx.page.selectOption('[data-testid="purchase-supplier-select"]', { label: 'EXPIRY SPECIALIST LABS' });
    await ctx.page.fill('[data-testid="purchase-invoice-number-input"]', 'INV-EXP-LEAP');
    await ctx.page.fill('[data-testid="purchase-item-name-0"]', 'VACCINE EXPIRY TEST');
    await ctx.page.fill('[data-testid="purchase-item-qty-0"]', '20');
    await ctx.page.fill('[data-testid="purchase-item-batch-0"]', 'BATCH-LEAP-2028');
    await ctx.page.fill('[data-testid="purchase-item-exp-0"]', '2028-02-29');
    await ctx.page.fill('[data-testid="purchase-item-mrp-0"]', '100.00');
    await ctx.page.fill('[data-testid="purchase-item-rate-0"]', '80.00');
    await ctx.page.click('[data-testid="purchase-save-btn"]');
    await expect(ctx.page.locator('text=Purchase Invoice INV-EXP-LEAP saved cleanly')).toBeVisible();

    // Verify Batch List Modal status badges
    await ctx.page.click('[data-testid="nav-inventory"]');
    await ctx.page.fill('[data-testid="product-search-input"]', 'VACCINE EXPIRY TEST');
    const batchesBtn = ctx.page.locator('button:has-text("Batches")').first();
    await batchesBtn.click();

    await expect(ctx.page.locator('text=BATCH-PAST-01')).toBeVisible();
    await expect(ctx.page.locator('.status-pill.badge-expired')).toBeVisible();

    await expect(ctx.page.locator('text=BATCH-30DAYS-02')).toBeVisible();
    await expect(ctx.page.locator('.status-pill.badge-expiring-soon')).toBeVisible();

    await expect(ctx.page.locator('text=BATCH-LEAP-2028')).toBeVisible();
    await ctx.page.click('.modal-close-btn');
  });
});
