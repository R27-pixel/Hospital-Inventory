import { test, expect } from '@playwright/test';
import { launchElectronApp, setupInitialAccounts, ElectronTestContext } from './helpers/electron-app';

test.describe('3. Product Management Workflow', () => {
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

  test('3.1 Should navigate to Product Inventory and validate product form fields', async () => {
    await ctx.page.click('[data-testid="nav-inventory"]');
    await expect(ctx.page.locator('[data-testid="add-product-btn"]')).toBeVisible();

    await ctx.page.click('[data-testid="add-product-btn"]');
    await expect(ctx.page.locator('[data-testid="product-form"]')).toBeVisible();

    // Fill partial info & trigger validation
    await ctx.page.fill('[data-testid="product-name-input"]', 'PARACETAMOL 500MG');
    await ctx.page.fill('[data-testid="product-hsn-input"]', '');
    await ctx.page.click('[data-testid="product-save-btn"]');

    await ctx.page.click('[data-testid="product-cancel-btn"]');
    await expect(ctx.page.locator('[data-testid="product-form"]')).toBeHidden();
  });

  test('3.2 Should create, filter, edit, and view batch details for a product', async () => {
    await ctx.page.click('[data-testid="nav-inventory"]');

    // 1. Create Product
    await ctx.page.click('[data-testid="add-product-btn"]');
    await ctx.page.fill('[data-testid="product-name-input"]', 'TRAN 5ML');
    await ctx.page.fill('[data-testid="product-hsn-input"]', '3004');
    await ctx.page.fill('[data-testid="product-pack-size-input"]', '5ml Ampoule');
    await ctx.page.fill('[data-testid="product-mfr-input"]', 'STRAN');
    await ctx.page.fill('[data-testid="product-min-stock-input"]', '10');
    await ctx.page.click('[data-testid="product-save-btn"]');

    await expect(ctx.page.locator('[data-testid="product-form"]')).toBeHidden();

    // 2. Search Product
    await ctx.page.fill('[data-testid="product-search-input"]', 'TRAN');
    await expect(ctx.page.locator('text=TRAN 5ML')).toBeVisible();

    // 3. Edit Product
    const editBtn = ctx.page.locator('[title="Edit Product"]').first();
    await editBtn.click();
    await expect(ctx.page.locator('[data-testid="product-form"]')).toBeVisible();

    await ctx.page.fill('[data-testid="product-mfr-input"]', 'STRAN LABS');
    await ctx.page.click('[data-testid="product-save-btn"]');
    await expect(ctx.page.locator('[data-testid="product-form"]')).toBeHidden();

    await expect(ctx.page.locator('text=STRAN LABS')).toBeVisible();

    // 4. View Batches Modal
    const batchesBtn = ctx.page.locator('button:has-text("Batches")').first();
    await batchesBtn.click();
    await expect(ctx.page.locator('h3:has-text("Batches —")')).toBeVisible();
    await ctx.page.click('.modal-close-btn');
  });
});
