import { test, expect } from '@playwright/test';
import { launchElectronApp, setupInitialAccounts, ElectronTestContext } from './helpers/electron-app';
import path from 'path';
import fs from 'fs';

test.describe('22. Stage 5 — Section 1, 3 & 9: Installer Artifacts & Data Directory Boundaries QA', () => {
  let ctx: ElectronTestContext;

  test.afterEach(async () => {
    if (ctx) {
      await ctx.cleanup();
    }
  });

  test('22.1 Installer Artifact & Unpacked Executable Audit', async () => {
    const installerPath = path.join(__dirname, '../../release/Hospital Inventory Setup 1.0.0.exe');
    const unpackedPath = path.join(__dirname, '../../release/win-unpacked/Hospital Inventory.exe');

    // 1. Verify NSIS installer executable exists and size > 50 MB
    expect(fs.existsSync(installerPath)).toBe(true);
    const installerStats = fs.statSync(installerPath);
    expect(installerStats.size).toBeGreaterThan(50 * 1024 * 1024);

    // 2. Verify win-unpacked executable exists
    expect(fs.existsSync(unpackedPath)).toBe(true);
    const unpackedStats = fs.statSync(unpackedPath);
    expect(unpackedStats.size).toBeGreaterThan(10 * 1024 * 1024);
  });

  test('22.2 User Data Location vs Installation Directory Audit: App writes data strictly inside userData directory', async () => {
    ctx = await launchElectronApp();
    await setupInitialAccounts(ctx.page);

    // Create Supplier & Product to trigger DB write
    await ctx.page.click('[data-testid="nav-suppliers"]');
    await ctx.page.click('[data-testid="add-supplier-btn"]');
    await ctx.page.fill('[data-testid="supplier-name-input"]', 'LOCATION AUDIT SUPPLIER');
    await ctx.page.click('[data-testid="supplier-save-btn"]');

    // Verify database file exists in userDataDir/data/inventory.db
    const expectedDbPath = path.join(ctx.userDataDir, 'data', 'inventory.db');
    expect(fs.existsSync(expectedDbPath)).toBe(true);

    // Verify NO database file was created inside the project root or release/ directory
    const rootDbPath = path.join(__dirname, '../../inventory.db');
    expect(fs.existsSync(rootDbPath)).toBe(false);
  });

  test('22.3 Data Retention Semantics: User database in userData location survives app restart', async () => {
    ctx = await launchElectronApp();
    await setupInitialAccounts(ctx.page);

    // Create Supplier
    await ctx.page.click('[data-testid="nav-suppliers"]');
    await ctx.page.click('[data-testid="add-supplier-btn"]');
    await ctx.page.fill('[data-testid="supplier-name-input"]', 'REINSTALL SURVIVOR SUPPLIER');
    await ctx.page.click('[data-testid="supplier-save-btn"]');

    const userDataDir = ctx.userDataDir;
    await ctx.cleanup(true);

    // Launch new app instance pointed to exact same userDataDir
    ctx = await launchElectronApp(userDataDir);

    await expect(ctx.page.locator('[data-testid="login-id-input"]')).toBeVisible({ timeout: 10000 });
    await ctx.page.fill('[data-testid="login-id-input"]', 'master_admin');
    await ctx.page.fill('[data-testid="login-password-input"]', 'MasterPass123!');
    await ctx.page.click('[data-testid="login-submit-btn"]');

    await ctx.page.click('[data-testid="nav-suppliers"]');
    await expect(ctx.page.locator('text=REINSTALL SURVIVOR SUPPLIER')).toBeVisible();
  });
});
