import { test, expect } from '@playwright/test';
import { launchElectronApp, setupInitialAccounts, ElectronTestContext } from './helpers/electron-app';

test.describe('12. Stage 3 — Priority 1: Invoice Cancellation & Reversal QA', () => {
  let ctx: ElectronTestContext;

  test.afterEach(async () => {
    if (ctx) {
      await ctx.cleanup();
    }
  });

  test('12.1 Purchase 100 -> Verify Stock 100 -> Cancel Invoice via UI -> Verify Stock 0', async () => {
    ctx = await launchElectronApp();
    await setupInitialAccounts(ctx.page);

    // Setup Supplier & Product
    await ctx.page.click('[data-testid="nav-suppliers"]');
    await ctx.page.click('[data-testid="add-supplier-btn"]');
    await ctx.page.fill('[data-testid="supplier-name-input"]', 'CANCEL PHARMA AGENCY');
    await ctx.page.click('[data-testid="supplier-save-btn"]');

    await ctx.page.click('[data-testid="nav-inventory"]');
    await ctx.page.click('[data-testid="add-product-btn"]');
    await ctx.page.fill('[data-testid="product-name-input"]', 'CANCEL MEDICINE 500MG');
    await ctx.page.fill('[data-testid="product-hsn-input"]', '3004');
    await ctx.page.fill('[data-testid="product-pack-size-input"]', '10 Tabs');
    await ctx.page.fill('[data-testid="product-mfr-input"]', 'CANCEL LABS');
    await ctx.page.click('[data-testid="product-save-btn"]');

    // 1. Purchase 100
    await ctx.page.click('[data-testid="nav-purchases"]');
    await ctx.page.selectOption('[data-testid="purchase-supplier-select"]', { label: 'CANCEL PHARMA AGENCY' });
    await ctx.page.fill('[data-testid="purchase-invoice-number-input"]', 'INV-CANCEL-001');
    await ctx.page.fill('[data-testid="purchase-item-name-0"]', 'CANCEL MEDICINE 500MG');
    await ctx.page.fill('[data-testid="purchase-item-qty-0"]', '100');
    await ctx.page.fill('[data-testid="purchase-item-batch-0"]', 'BATCH-CANCEL-A');
    await ctx.page.fill('[data-testid="purchase-item-exp-0"]', '12/2028');
    await ctx.page.fill('[data-testid="purchase-item-mrp-0"]', '100.00');
    await ctx.page.fill('[data-testid="purchase-item-rate-0"]', '80.00');
    await ctx.page.click('[data-testid="purchase-save-btn"]');
    await expect(ctx.page.locator('text=Purchase Invoice INV-CANCEL-001 saved cleanly')).toBeVisible();

    // Verify Catalog stock = 100 units
    await ctx.page.click('[data-testid="nav-inventory"]');
    await expect(ctx.page.locator('strong:has-text("100 units")')).toBeVisible();

    // 2. Cancel Invoice via UI in Purchase History Ledger
    await ctx.page.click('[data-testid="nav-purchases"]');
    await ctx.page.click('button:has-text("Purchase History")');
    await expect(ctx.page.locator('text=INV-CANCEL-001')).toBeVisible();

    const cancelBtn = ctx.page.locator('[data-testid^="cancel-invoice-btn-"]').first();
    await cancelBtn.click();

    await expect(ctx.page.locator('[data-testid^="inv-cancelled-badge-"]').first()).toBeVisible();

    // 3. Verify Product Catalog stock reverted to 0 units
    await ctx.page.click('[data-testid="nav-inventory"]');
    await expect(ctx.page.locator('strong:has-text("0 units")')).toBeVisible();
  });

  test('12.2 Purchase 100 -> Exit 30 (Stock 70) -> Cancel Invoice -> Reverts remaining 70 without stock < 0', async () => {
    ctx = await launchElectronApp();
    await setupInitialAccounts(ctx.page);

    // Setup Supplier & Product
    await ctx.page.click('[data-testid="nav-suppliers"]');
    await ctx.page.click('[data-testid="add-supplier-btn"]');
    await ctx.page.fill('[data-testid="supplier-name-input"]', 'PARTIAL CANCEL SUPPLIER');
    await ctx.page.click('[data-testid="supplier-save-btn"]');

    await ctx.page.click('[data-testid="nav-inventory"]');
    await ctx.page.click('[data-testid="add-product-btn"]');
    await ctx.page.fill('[data-testid="product-name-input"]', 'PARTIAL CANCEL SYRUP');
    await ctx.page.fill('[data-testid="product-hsn-input"]', '3004');
    await ctx.page.fill('[data-testid="product-pack-size-input"]', '100ml');
    await ctx.page.fill('[data-testid="product-mfr-input"]', 'PARTIAL LABS');
    await ctx.page.click('[data-testid="product-save-btn"]');

    // Purchase 100
    await ctx.page.click('[data-testid="nav-purchases"]');
    await ctx.page.selectOption('[data-testid="purchase-supplier-select"]', { label: 'PARTIAL CANCEL SUPPLIER' });
    await ctx.page.fill('[data-testid="purchase-invoice-number-input"]', 'INV-PARTIAL-002');
    await ctx.page.fill('[data-testid="purchase-item-name-0"]', 'PARTIAL CANCEL SYRUP');
    await ctx.page.fill('[data-testid="purchase-item-qty-0"]', '100');
    await ctx.page.fill('[data-testid="purchase-item-batch-0"]', 'BATCH-PARTIAL-X');
    await ctx.page.fill('[data-testid="purchase-item-exp-0"]', '12/2028');
    await ctx.page.fill('[data-testid="purchase-item-mrp-0"]', '50.00');
    await ctx.page.fill('[data-testid="purchase-item-rate-0"]', '40.00');
    await ctx.page.click('[data-testid="purchase-save-btn"]');
    await expect(ctx.page.locator('text=Purchase Invoice INV-PARTIAL-002 saved cleanly')).toBeVisible();

    // Exit 30 units (Stock = 70)
    await ctx.page.click('[data-testid="nav-stock-exit"]');
    await ctx.page.fill('[data-testid="stock-exit-qty-input"]', '30');
    await ctx.page.click('[data-testid="stock-exit-submit-btn"]');
    await expect(ctx.page.locator('text=New batch stock: 70 units')).toBeVisible();

    // Cancel Invoice via IPC
    const cancelRes = await ctx.page.evaluate(async () => {
      const invs = await (window as any).electronAPI.purchases.getAll();
      const targetInv = invs.find((i: any) => i.invoice_number === 'INV-PARTIAL-002');
      return await (window as any).electronAPI.purchases.delete({ id: targetInv.id, reason: 'Testing partial cancellation reversal' });
    });
    expect(cancelRes.success).toBe(true);

    // Verify stock is cleanly set to 0 (reverting remaining 70 units)
    await ctx.page.click('[data-testid="nav-inventory"]');
    await expect(ctx.page.locator('strong:has-text("0 units")')).toBeVisible();
  });

  test('12.3 Should prevent double cancellation and enforce MASTER role authorization on cancellation', async () => {
    ctx = await launchElectronApp();

    // 1. Initial Setup: Create Master and Staff accounts
    await ctx.page.fill('[data-testid="master-login-id"]', 'master_admin');
    await ctx.page.fill('[data-testid="master-password"]', 'MasterPass123!');
    await ctx.page.fill('[data-testid="master-confirm-password"]', 'MasterPass123!');
    await ctx.page.fill('[data-testid="staff-login-id"]', 'staff_operator');
    await ctx.page.fill('[data-testid="staff-password"]', 'StaffPass123!');
    await ctx.page.fill('[data-testid="staff-confirm-password"]', 'StaffPass123!');
    await ctx.page.click('[data-testid="submit-initial-setup"]');

    // 2. Login as MASTER and create purchase invoice
    await expect(ctx.page.locator('[data-testid="login-id-input"]')).toBeVisible();
    await ctx.page.fill('[data-testid="login-id-input"]', 'master_admin');
    await ctx.page.fill('[data-testid="login-password-input"]', 'MasterPass123!');
    await ctx.page.click('[data-testid="login-submit-btn"]');

    await ctx.page.click('[data-testid="nav-suppliers"]');
    await ctx.page.click('[data-testid="add-supplier-btn"]');
    await ctx.page.fill('[data-testid="supplier-name-input"]', 'AUTH CANCEL SUPPLIER');
    await ctx.page.click('[data-testid="supplier-save-btn"]');

    await ctx.page.click('[data-testid="nav-inventory"]');
    await ctx.page.click('[data-testid="add-product-btn"]');
    await ctx.page.fill('[data-testid="product-name-input"]', 'AUTH CANCEL PRODUCT');
    await ctx.page.fill('[data-testid="product-hsn-input"]', '3004');
    await ctx.page.fill('[data-testid="product-pack-size-input"]', '10 Tabs');
    await ctx.page.fill('[data-testid="product-mfr-input"]', 'AUTH LABS');
    await ctx.page.click('[data-testid="product-save-btn"]');

    await ctx.page.click('[data-testid="nav-purchases"]');
    await ctx.page.selectOption('[data-testid="purchase-supplier-select"]', { label: 'AUTH CANCEL SUPPLIER' });
    await ctx.page.fill('[data-testid="purchase-invoice-number-input"]', 'INV-AUTH-999');
    await ctx.page.fill('[data-testid="purchase-item-name-0"]', 'AUTH CANCEL PRODUCT');
    await ctx.page.fill('[data-testid="purchase-item-qty-0"]', '50');
    await ctx.page.fill('[data-testid="purchase-item-batch-0"]', 'BATCH-AUTH-99');
    await ctx.page.fill('[data-testid="purchase-item-exp-0"]', '12/2028');
    await ctx.page.fill('[data-testid="purchase-item-mrp-0"]', '100.00');
    await ctx.page.fill('[data-testid="purchase-item-rate-0"]', '80.00');
    await ctx.page.click('[data-testid="purchase-save-btn"]');
    await expect(ctx.page.locator('text=Purchase Invoice INV-AUTH-999 saved cleanly')).toBeVisible();

    // 3. Logout and Login as STAFF OPERATOR
    await ctx.page.click('[data-testid="nav-logout"]');
    await ctx.page.fill('[data-testid="login-id-input"]', 'staff_operator');
    await ctx.page.fill('[data-testid="login-password-input"]', 'StaffPass123!');
    await ctx.page.click('[data-testid="login-submit-btn"]');

    // Attempt cancellation as STAFF (Must reject)
    const staffCancelRes = await ctx.page.evaluate(async () => {
      const invs = await (window as any).electronAPI.purchases.getAll();
      const targetInv = invs.find((i: any) => i.invoice_number === 'INV-AUTH-999');
      return await (window as any).electronAPI.purchases.delete({ id: targetInv.id, reason: 'Staff attempt' });
    });
    expect(staffCancelRes.success).toBe(false);
    expect(staffCancelRes.error).toContain('Privileged Operation Denied');

    // 4. Logout and Login back as MASTER
    await ctx.page.click('[data-testid="nav-logout"]');
    await ctx.page.fill('[data-testid="login-id-input"]', 'master_admin');
    await ctx.page.fill('[data-testid="login-password-input"]', 'MasterPass123!');
    await ctx.page.click('[data-testid="login-submit-btn"]');

    // Cancel invoice as MASTER (Must succeed)
    const firstCancelRes = await ctx.page.evaluate(async () => {
      const invs = await (window as any).electronAPI.purchases.getAll();
      const targetInv = invs.find((i: any) => i.invoice_number === 'INV-AUTH-999');
      return await (window as any).electronAPI.purchases.delete({ id: targetInv.id, reason: 'Master cancel' });
    });
    expect(firstCancelRes.success).toBe(true);

    // Attempt double cancellation (Must reject with 'already cancelled')
    const secondCancelRes = await ctx.page.evaluate(async () => {
      const invs = await (window as any).electronAPI.purchases.getAll();
      const targetInv = invs.find((i: any) => i.invoice_number === 'INV-AUTH-999');
      return await (window as any).electronAPI.purchases.delete({ id: targetInv.id, reason: 'Duplicate cancel attempt' });
    });
    expect(secondCancelRes.success).toBe(false);
    expect(secondCancelRes.error).toContain('already cancelled');
  });
});
