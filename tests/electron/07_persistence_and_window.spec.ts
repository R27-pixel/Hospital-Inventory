import { test, expect } from '@playwright/test';
import { launchElectronApp, setupInitialAccounts, ElectronTestContext } from './helpers/electron-app';
import fs from 'fs';
import os from 'os';
import path from 'path';

test.describe('7. Data Persistence Across Restarts & Window Controls', () => {
  let customUserDataDir: string;

  test.beforeEach(() => {
    customUserDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hospital-inv-persist-'));
  });

  test.afterEach(() => {
    try {
      if (fs.existsSync(customUserDataDir)) {
        fs.rmSync(customUserDataDir, { recursive: true, force: true });
      }
    } catch (e) {
      // ignore OS lock
    }
  });

  test('7.1 Should persist added suppliers and products after restarting application', async () => {
    // Session 1: Launch app, perform setup, add supplier & product
    let ctx1 = await launchElectronApp(customUserDataDir);
    await setupInitialAccounts(ctx1.page);

    // Add Supplier
    await ctx1.page.click('[data-testid="nav-suppliers"]');
    await ctx1.page.click('[data-testid="add-supplier-btn"]');
    await ctx1.page.fill('[data-testid="supplier-name-input"]', 'PERSISTENT SUPPLIER LTD');
    await ctx1.page.click('[data-testid="supplier-save-btn"]');
    await expect(ctx1.page.locator('text=PERSISTENT SUPPLIER LTD')).toBeVisible();

    // Add Product
    await ctx1.page.click('[data-testid="nav-inventory"]');
    await ctx1.page.click('[data-testid="add-product-btn"]');
    await ctx1.page.fill('[data-testid="product-name-input"]', 'PERSISTENT MEDICINE 100MG');
    await ctx1.page.fill('[data-testid="product-hsn-input"]', '3004');
    await ctx1.page.fill('[data-testid="product-pack-size-input"]', '10 Strips');
    await ctx1.page.fill('[data-testid="product-mfr-input"]', 'PERSIST LABS');
    await ctx1.page.click('[data-testid="product-save-btn"]');
    await expect(ctx1.page.locator('text=PERSISTENT MEDICINE 100MG')).toBeVisible();

    // Close Session 1
    await ctx1.cleanup();

    // Session 2: Launch app using same userDataDir (simulates application restart)
    let ctx2 = await launchElectronApp(customUserDataDir);

    // Verify system does NOT show initial setup wizard (already initialized)
    // Log in with Master credentials created in Session 1
    await expect(ctx2.page.locator('[data-testid="login-id-input"]')).toBeVisible({ timeout: 10000 });
    await ctx2.page.fill('[data-testid="login-id-input"]', 'master_admin');
    await ctx2.page.fill('[data-testid="login-password-input"]', 'MasterPass123!');
    await ctx2.page.click('[data-testid="login-submit-btn"]');

    await expect(ctx2.page.locator('[data-testid="nav-dashboard"]')).toBeVisible();

    // Verify Supplier persisted in SQLite
    await ctx2.page.click('[data-testid="nav-suppliers"]');
    await expect(ctx2.page.locator('text=PERSISTENT SUPPLIER LTD')).toBeVisible();

    // Verify Product persisted in SQLite
    await ctx2.page.click('[data-testid="nav-inventory"]');
    await expect(ctx2.page.locator('text=PERSISTENT MEDICINE 100MG')).toBeVisible();

    await ctx2.cleanup();
  });
});
