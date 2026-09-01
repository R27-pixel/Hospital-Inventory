import { test, expect } from '@playwright/test';
import { launchElectronApp, ElectronTestContext } from './helpers/electron-app';

test.describe('19. Stage 4 — Section 3, 5 & 10: Database Recovery & Filesystem Failure QA', () => {
  let ctx: ElectronTestContext;

  test.afterEach(async () => {
    if (ctx) {
      await ctx.cleanup();
    }
  });

  test('19.1 Missing Database Recovery: Fresh launch in empty userData directory initializes schema safely', async () => {
    // Launch app in completely new empty userData directory
    ctx = await launchElectronApp();

    // Verify initial setup wizard opens
    await expect(ctx.page.locator('[data-testid="master-login-id"]')).toBeVisible();

    // Complete setup
    await ctx.page.fill('[data-testid="master-login-id"]', 'master_admin');
    await ctx.page.fill('[data-testid="master-password"]', 'MasterPass123!');
    await ctx.page.fill('[data-testid="master-confirm-password"]', 'MasterPass123!');
    await ctx.page.fill('[data-testid="staff-login-id"]', 'staff_operator');
    await ctx.page.fill('[data-testid="staff-password"]', 'StaffPass123!');
    await ctx.page.fill('[data-testid="staff-confirm-password"]', 'StaffPass123!');
    await ctx.page.click('[data-testid="submit-initial-setup"]');

    await expect(ctx.page.locator('[data-testid="login-id-input"]')).toBeVisible();
  });
});
