import { test, expect } from '@playwright/test';
import { launchElectronApp, setupInitialAccounts, ElectronTestContext } from './helpers/electron-app';

test.describe('24. Stage 5 — Section 7 & 10: Backup Failure & Permission Recovery QA', () => {
  let ctx: ElectronTestContext;

  test.beforeEach(async () => {
    ctx = await launchElectronApp();
  });

  test.afterEach(async () => {
    if (ctx) {
      await ctx.cleanup();
    }
  });

  test('24.1 Permission Recovery: STAFF role denied backup -> Switch to MASTER -> Backup succeeds', async () => {
    // 1. Setup accounts
    await ctx.page.fill('[data-testid="master-login-id"]', 'master_admin');
    await ctx.page.fill('[data-testid="master-password"]', 'MasterPass123!');
    await ctx.page.fill('[data-testid="master-confirm-password"]', 'MasterPass123!');
    await ctx.page.fill('[data-testid="staff-login-id"]', 'staff_operator');
    await ctx.page.fill('[data-testid="staff-password"]', 'StaffPass123!');
    await ctx.page.fill('[data-testid="staff-confirm-password"]', 'StaffPass123!');
    await ctx.page.click('[data-testid="submit-initial-setup"]');

    // 2. Login as STAFF
    await expect(ctx.page.locator('[data-testid="login-id-input"]')).toBeVisible();
    await ctx.page.fill('[data-testid="login-id-input"]', 'staff_operator');
    await ctx.page.fill('[data-testid="login-password-input"]', 'StaffPass123!');
    await ctx.page.click('[data-testid="login-submit-btn"]');

    // Verify backup button disabled for STAFF role & IPC rejects STAFF backup trigger
    await ctx.page.click('[data-testid="nav-settings"]');
    await expect(ctx.page.locator('[data-testid="trigger-manual-backup-btn"]')).toBeDisabled();

    const staffBackupRes = await ctx.page.evaluate(async () => {
      return await (window as any).electronAPI.backup.trigger();
    });
    expect(staffBackupRes.success).toBe(false);
    expect(staffBackupRes.error).toContain('Privileged Operation Denied');

    // 3. Permission Recovery: Logout & Login as MASTER
    await ctx.page.click('[data-testid="nav-logout"]');
    await ctx.page.fill('[data-testid="login-id-input"]', 'master_admin');
    await ctx.page.fill('[data-testid="login-password-input"]', 'MasterPass123!');
    await ctx.page.click('[data-testid="login-submit-btn"]');

    // Retry backup as MASTER -> Must succeed cleanly
    await ctx.page.click('[data-testid="nav-settings"]');
    await ctx.page.click('[data-testid="trigger-manual-backup-btn"]');
    await expect(ctx.page.locator('text=Manual database backup created successfully')).toBeVisible();
  });
});
