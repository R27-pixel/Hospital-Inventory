import { test, expect } from '@playwright/test';
import { launchElectronApp, setupInitialAccounts, ElectronTestContext } from './helpers/electron-app';

test.describe('2. Supplier Management Workflow', () => {
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

  test('2.1 Should navigate to Suppliers directory and handle form validation', async () => {
    await ctx.page.click('[data-testid="nav-suppliers"]');
    await expect(ctx.page.locator('[data-testid="add-supplier-btn"]')).toBeVisible();

    // Open Modal
    await ctx.page.click('[data-testid="add-supplier-btn"]');
    await expect(ctx.page.locator('[data-testid="supplier-form"]')).toBeVisible();

    // Submit empty supplier name (HTML5 required validation or modal error)
    await ctx.page.fill('[data-testid="supplier-name-input"]', '');
    await ctx.page.click('[data-testid="supplier-save-btn"]');

    // Close modal via cancel
    await ctx.page.click('[data-testid="supplier-cancel-btn"]');
    await expect(ctx.page.locator('[data-testid="supplier-form"]')).toBeHidden();
  });

  test('2.2 Should create, search, and edit a new supplier', async () => {
    await ctx.page.click('[data-testid="nav-suppliers"]');

    // 1. Add Supplier
    await ctx.page.click('[data-testid="add-supplier-btn"]');
    await ctx.page.fill('[data-testid="supplier-name-input"]', 'CIPLA PHARMA DISTRIBUTORS');
    await ctx.page.fill('[data-testid="supplier-gstin-input"]', '10AAACC1234A1Z5');
    await ctx.page.fill('[data-testid="supplier-phone-input"]', '9835012345');
    await ctx.page.fill('[data-testid="supplier-address-input"]', 'PATNA, BIHAR');
    await ctx.page.click('[data-testid="supplier-save-btn"]');

    await expect(ctx.page.locator('[data-testid="supplier-form"]')).toBeHidden();

    // 2. Search Supplier
    await ctx.page.fill('[data-testid="supplier-search-input"]', 'CIPLA');
    await expect(ctx.page.locator('text=CIPLA PHARMA DISTRIBUTORS')).toBeVisible();

    // 3. Edit Supplier
    const editBtn = ctx.page.locator('[title="Edit Supplier"]').first();
    await editBtn.click();
    await expect(ctx.page.locator('[data-testid="supplier-form"]')).toBeVisible();

    await ctx.page.fill('[data-testid="supplier-phone-input"]', '9999988888');
    await ctx.page.click('[data-testid="supplier-save-btn"]');
    await expect(ctx.page.locator('[data-testid="supplier-form"]')).toBeHidden();

    await expect(ctx.page.locator('text=9999988888')).toBeVisible();
  });
});
