import { test, expect } from '@playwright/test';
import { launchElectronApp, ElectronTestContext } from './helpers/electron-app';

test.describe('11. Adversarial Permissions & Input Fuzzing QA', () => {
  let ctx: ElectronTestContext;

  test.afterEach(async () => {
    if (ctx) {
      await ctx.cleanup();
    }
  });

  test('11.1 Should strictly enforce IPC main process authorization checks for STAFF role', async () => {
    ctx = await launchElectronApp();

    // 1. Initial Setup: Create Master and Staff accounts
    await ctx.page.fill('[data-testid="master-login-id"]', 'master_admin');
    await ctx.page.fill('[data-testid="master-password"]', 'MasterPass123!');
    await ctx.page.fill('[data-testid="master-confirm-password"]', 'MasterPass123!');
    await ctx.page.fill('[data-testid="staff-login-id"]', 'staff_operator');
    await ctx.page.fill('[data-testid="staff-password"]', 'StaffPass123!');
    await ctx.page.fill('[data-testid="staff-confirm-password"]', 'StaffPass123!');
    await ctx.page.click('[data-testid="submit-initial-setup"]');

    // 2. Log in as STAFF OPERATOR
    await expect(ctx.page.locator('[data-testid="login-id-input"]')).toBeVisible({ timeout: 10000 });
    await ctx.page.fill('[data-testid="login-id-input"]', 'staff_operator');
    await ctx.page.fill('[data-testid="login-password-input"]', 'StaffPass123!');
    await ctx.page.click('[data-testid="login-submit-btn"]');

    await expect(ctx.page.locator('[data-testid="nav-dashboard"]')).toBeVisible();
    const roleBadge = await ctx.page.textContent('[data-testid="user-role-badge"]');
    expect(roleBadge).toContain('STAFF MODE');

    // 3. Attempt Privileged IPC Operations directly via Electron API as STAFF
    const supplierUpdateRes = await ctx.page.evaluate(async () => {
      return await (window as any).electronAPI.suppliers.update({ id: 1, name: 'HACKED SUPPLIER' });
    });
    expect(supplierUpdateRes.success).toBe(false);
    expect(supplierUpdateRes.error).toContain('Privileged Operation Denied');

    const supplierArchiveRes = await ctx.page.evaluate(async () => {
      return await (window as any).electronAPI.suppliers.archive(1);
    });
    expect(supplierArchiveRes.success).toBe(false);
    expect(supplierArchiveRes.error).toContain('Privileged Operation Denied');

    const productUpdateRes = await ctx.page.evaluate(async () => {
      return await (window as any).electronAPI.products.update({ id: 1, name: 'HACKED PRODUCT', hsn_code: '3004', pack_size: '10' });
    });
    expect(productUpdateRes.success).toBe(false);
    expect(productUpdateRes.error).toContain('Privileged Operation Denied');

    const purchaseDeleteRes = await ctx.page.evaluate(async () => {
      return await (window as any).electronAPI.purchases.delete(1);
    });
    expect(purchaseDeleteRes.success).toBe(false);
    expect(purchaseDeleteRes.error).toContain('Privileged Operation Denied');
  });

  test('11.2 Should safely handle Unicode, Emojis, Quotes, SQL, and HTML strings during form entry', async () => {
    ctx = await launchElectronApp();

    // Perform initial setup & login
    await ctx.page.fill('[data-testid="master-login-id"]', 'master_admin');
    await ctx.page.fill('[data-testid="master-password"]', 'MasterPass123!');
    await ctx.page.fill('[data-testid="master-confirm-password"]', 'MasterPass123!');
    await ctx.page.fill('[data-testid="staff-login-id"]', 'staff_operator');
    await ctx.page.fill('[data-testid="staff-password"]', 'StaffPass123!');
    await ctx.page.fill('[data-testid="staff-confirm-password"]', 'StaffPass123!');
    await ctx.page.click('[data-testid="submit-initial-setup"]');

    await expect(ctx.page.locator('[data-testid="login-id-input"]')).toBeVisible();
    await ctx.page.fill('[data-testid="login-id-input"]', 'master_admin');
    await ctx.page.fill('[data-testid="login-password-input"]', 'MasterPass123!');
    await ctx.page.click('[data-testid="login-submit-btn"]');

    // 1. Create Supplier with Fuzzed Inputs (Quotes, Apostrophes, Unicode, Emojis)
    await ctx.page.click('[data-testid="nav-suppliers"]');
    await ctx.page.click('[data-testid="add-supplier-btn"]');

    const fuzzedSupplierName = `O'Connor & D'Souza "Pharma" 💊 <script>alert(1)</script> ' OR '1'='1`;
    await ctx.page.fill('[data-testid="supplier-name-input"]', fuzzedSupplierName);
    await ctx.page.fill('[data-testid="supplier-gstin-input"]', '10AAACC1234A1Z5');
    await ctx.page.click('[data-testid="supplier-save-btn"]');

    await expect(ctx.page.locator('[data-testid="supplier-form"]')).toBeHidden();

    // Verify row rendered safely without script execution or SQL syntax error
    await expect(ctx.page.locator('text=O\'Connor & D\'Souza')).toBeVisible();

    // 2. Create Product with Fuzzed Inputs
    await ctx.page.click('[data-testid="nav-inventory"]');
    await ctx.page.click('[data-testid="add-product-btn"]');

    const fuzzedProductName = `VITAMIN-C 500MG 🍊 <b style="color:red">Extra</b> ' UNION SELECT 1--`;
    await ctx.page.fill('[data-testid="product-name-input"]', fuzzedProductName);
    await ctx.page.fill('[data-testid="product-hsn-input"]', '3004');
    await ctx.page.fill('[data-testid="product-pack-size-input"]', '10 Tablets');
    await ctx.page.fill('[data-testid="product-mfr-input"]', 'FUZZ LABS');
    await ctx.page.click('[data-testid="product-save-btn"]');

    await expect(ctx.page.locator('[data-testid="product-form"]')).toBeHidden();
    await expect(ctx.page.locator('text=VITAMIN-C 500MG')).toBeVisible();
  });
});
