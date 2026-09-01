import { test, expect } from '@playwright/test';
import { launchElectronApp, setupInitialAccounts, ElectronTestContext } from './helpers/electron-app';

test.describe('18. Stage 4 — Section 2 & 7: Rapid Close, Restart & Process Cleanup QA', () => {
  test('18.1 Rapid Launch -> Immediate Close loop (3 cycles) cleans up all Electron processes', async () => {
    for (let i = 0; i < 3; i++) {
      const ctx: ElectronTestContext = await launchElectronApp();
      await setupInitialAccounts(ctx.page);
      await ctx.cleanup();
    }
  });

  test('18.2 Immediate restart after transaction releases SQLite WAL locks without corruption', async () => {
    let ctx: ElectronTestContext = await launchElectronApp();
    await setupInitialAccounts(ctx.page);

    // Create Supplier & Product
    await ctx.page.click('[data-testid="nav-suppliers"]');
    await ctx.page.click('[data-testid="add-supplier-btn"]');
    await ctx.page.fill('[data-testid="supplier-name-input"]', 'RAPID RESTART SUPPLIER');
    await ctx.page.click('[data-testid="supplier-save-btn"]');

    await ctx.page.click('[data-testid="nav-inventory"]');
    await ctx.page.click('[data-testid="add-product-btn"]');
    await ctx.page.fill('[data-testid="product-name-input"]', 'RAPID RESTART PRODUCT');
    await ctx.page.fill('[data-testid="product-hsn-input"]', '3004');
    await ctx.page.fill('[data-testid="product-pack-size-input"]', '10 Tabs');
    await ctx.page.fill('[data-testid="product-mfr-input"]', 'RAPID LABS');
    await ctx.page.click('[data-testid="product-save-btn"]');

    // Immediately close and reopen preserving userDataDir
    const userDataDir = ctx.userDataDir;
    await ctx.cleanup(true);
    await new Promise((r) => setTimeout(r, 1000));

    ctx = await launchElectronApp(userDataDir);

    await expect(ctx.page.locator('[data-testid="login-id-input"]')).toBeVisible({ timeout: 10000 });
    await ctx.page.fill('[data-testid="login-id-input"]', 'master_admin');
    await ctx.page.fill('[data-testid="login-password-input"]', 'MasterPass123!');
    await ctx.page.click('[data-testid="login-submit-btn"]');

    // Verify record exists cleanly
    await ctx.page.click('[data-testid="nav-inventory"]');
    await expect(ctx.page.locator('text=RAPID RESTART PRODUCT')).toBeVisible();

    await ctx.cleanup();
  });
});
