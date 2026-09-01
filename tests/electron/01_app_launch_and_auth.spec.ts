import { test, expect } from '@playwright/test';
import { launchElectronApp, ElectronTestContext } from './helpers/electron-app';

test.describe('1. Application Launch & Authentication Flow', () => {
  let ctx: ElectronTestContext;

  test.afterEach(async () => {
    if (ctx) {
      await ctx.cleanup();
    }
  });

  test('1.1 Should launch Electron desktop application successfully', async () => {
    ctx = await launchElectronApp();
    expect(ctx.app).toBeTruthy();
    expect(ctx.page).toBeTruthy();

    const title = await ctx.page.title();
    expect(title).toContain('Hospital Inventory');

    // Verify initial setup wizard is visible on clean launch
    const wizardHeader = await ctx.page.textContent('h1');
    expect(wizardHeader).toContain('System Setup Wizard');
  });

  test('1.2 Should enforce form validation on Initial Setup Wizard', async () => {
    ctx = await launchElectronApp();

    // Fill invalid master password (less than 8 chars)
    await ctx.page.fill('[data-testid="master-login-id"]', 'admin_test');
    await ctx.page.fill('[data-testid="master-password"]', 'short');
    await ctx.page.fill('[data-testid="master-confirm-password"]', 'short');
    await ctx.page.fill('[data-testid="staff-login-id"]', 'staff_test');
    await ctx.page.fill('[data-testid="staff-password"]', 'StaffPass123!');
    await ctx.page.fill('[data-testid="staff-confirm-password"]', 'StaffPass123!');

    await ctx.page.click('[data-testid="submit-initial-setup"]');

    const alertText = await ctx.page.textContent('[data-testid="setup-error-alert"]');
    expect(alertText).toContain('Master Admin Password must be at least 8 characters');
  });

  test('1.3 Should complete initial setup, logout, and login with valid/invalid credentials', async () => {
    ctx = await launchElectronApp();

    // 1. Complete Setup
    await ctx.page.fill('[data-testid="master-login-id"]', 'master_admin');
    await ctx.page.fill('[data-testid="master-password"]', 'MasterPass123!');
    await ctx.page.fill('[data-testid="master-confirm-password"]', 'MasterPass123!');
    await ctx.page.fill('[data-testid="staff-login-id"]', 'staff_op');
    await ctx.page.fill('[data-testid="staff-password"]', 'StaffPass123!');
    await ctx.page.fill('[data-testid="staff-confirm-password"]', 'StaffPass123!');

    await ctx.page.click('[data-testid="submit-initial-setup"]');

    // Transitions to Login screen -> Login as Master Admin
    await expect(ctx.page.locator('[data-testid="login-id-input"]')).toBeVisible({ timeout: 10000 });
    await ctx.page.fill('[data-testid="login-id-input"]', 'master_admin');
    await ctx.page.fill('[data-testid="login-password-input"]', 'MasterPass123!');
    await ctx.page.click('[data-testid="login-submit-btn"]');

    // Verify logged into app shell
    await expect(ctx.page.locator('[data-testid="nav-dashboard"]')).toBeVisible({ timeout: 10000 });
    const userBadge = await ctx.page.textContent('[data-testid="user-role-badge"]');
    expect(userBadge).toContain('MASTER ADMIN');

    // 2. Lock / Logout
    await ctx.page.click('[data-testid="nav-logout"]');
    await expect(ctx.page.locator('[data-testid="login-id-input"]')).toBeVisible();

    // 3. Test Invalid Login
    await ctx.page.fill('[data-testid="login-id-input"]', 'wrong_user');
    await ctx.page.fill('[data-testid="login-password-input"]', 'wrong_password');
    await ctx.page.click('[data-testid="login-submit-btn"]');

    const loginError = await ctx.page.textContent('[data-testid="login-error-alert"]');
    expect(loginError).toContain('Invalid Login ID or Password');

    // 4. Test Valid Staff Login
    await ctx.page.fill('[data-testid="login-id-input"]', 'staff_op');
    await ctx.page.fill('[data-testid="login-password-input"]', 'StaffPass123!');
    await ctx.page.click('[data-testid="login-submit-btn"]');

    await expect(ctx.page.locator('[data-testid="nav-dashboard"]')).toBeVisible();
    const staffBadge = await ctx.page.textContent('[data-testid="user-role-badge"]');
    expect(staffBadge).toContain('STAFF MODE');
  });
});
