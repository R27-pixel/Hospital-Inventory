import { test, expect } from '@playwright/test';
import { launchElectronApp, setupInitialAccounts, ElectronTestContext } from './helpers/electron-app';

test.describe('6. GST Reports & Database Backup / Security Workflow', () => {
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

  test('6.1 Should navigate to GST Reports and trigger date filter', async () => {
    await ctx.page.click('[data-testid="nav-reports"]');
    await expect(ctx.page.locator('h2:has-text("Purchase GST Report")')).toBeVisible();

    await ctx.page.click('[data-testid="gst-apply-filter-btn"]');
    await expect(ctx.page.locator('text=TOTAL PURCHASE GST')).toBeVisible();
  });

  test('6.2 Should trigger manual database backup & update account password (Regression test for BUG-001)', async () => {
    await ctx.page.click('[data-testid="nav-settings"]');
    await expect(ctx.page.locator('[data-testid="trigger-manual-backup-btn"]')).toBeVisible();

    // 1. Trigger Manual Backup
    await ctx.page.click('[data-testid="trigger-manual-backup-btn"]');
    await expect(ctx.page.locator('[data-testid="backup-success-alert"]')).toBeVisible({ timeout: 10000 });

    // 2. Change Password Form (Regression test for BUG-001: supply current password)
    await ctx.page.fill('[data-testid="change-pass-current-input"]', 'MasterPass123!');
    await ctx.page.fill('[data-testid="change-pass-new-input"]', 'NewMasterPass123!');
    await ctx.page.fill('[data-testid="change-pass-confirm-input"]', 'NewMasterPass123!');
    await ctx.page.click('[data-testid="change-pass-submit-btn"]');

    // UI displays success alert
    await expect(ctx.page.locator('[data-testid="change-pass-success-alert"]')).toBeVisible();
    const successText = await ctx.page.textContent('[data-testid="change-pass-success-alert"]');
    expect(successText).toContain('Password for MASTER account updated successfully');

    // 3. Verify logging out and logging in with new password
    await ctx.page.click('[data-testid="nav-logout"]');
    await expect(ctx.page.locator('[data-testid="login-id-input"]')).toBeVisible();

    await ctx.page.fill('[data-testid="login-id-input"]', 'master_admin');
    await ctx.page.fill('[data-testid="login-password-input"]', 'NewMasterPass123!');
    await ctx.page.click('[data-testid="login-submit-btn"]');

    await expect(ctx.page.locator('[data-testid="nav-dashboard"]')).toBeVisible();
  });
});
