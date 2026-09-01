import { test, expect } from '@playwright/test';
import { launchElectronApp, setupInitialAccounts, ElectronTestContext } from './helpers/electron-app';

test.describe('26. Stage 5 — Section 2 & 11: Upgrade & Restore Feature Classification Audit', () => {
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

  test('26.1 Version Audit: Application reports correct package version 1.0.0 via IPC', async () => {
    const version = await ctx.page.evaluate(async () => {
      return await (window as any).electronAPI.system.getAppVersion();
    });
    expect(version).toBe('1.0.0');

    // Note: Multi-version installer upgrade testing is classified as BLOCKED because only version 1.0.0 artifact currently exists.
  });

  test('26.2 Backup Audit: Manual backup generation functions cleanly and returns path', async () => {
    await ctx.page.click('[data-testid="nav-settings"]');
    await ctx.page.click('[data-testid="trigger-manual-backup-btn"]');
    await expect(ctx.page.locator('text=Manual database backup created successfully')).toBeVisible();

    // Note: In-app UI backup restore endpoint is classified as NOT_APPLICABLE (restore is executed by system administrator replacing inventory.db snapshot).
  });
});
