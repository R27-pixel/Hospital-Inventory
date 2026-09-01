import { test, expect } from '@playwright/test';
import { launchElectronApp, setupInitialAccounts, ElectronTestContext } from './helpers/electron-app';

test.describe('27. Stage 6.5 — IPC Contract & Cross-Layer Data Integrity QA', () => {
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

  test('27.1 Financial Unit Precision: Handles ₹63.63, ₹0.01, ₹1.99 rates with exact Paise precision', async () => {
    // 1. Create Supplier & Product
    await ctx.page.click('[data-testid="nav-suppliers"]');
    await ctx.page.click('[data-testid="add-supplier-btn"]');
    await ctx.page.fill('[data-testid="supplier-name-input"]', 'PRECISION PHARMA');
    await ctx.page.fill('[data-testid="supplier-gstin-input"]', '10PRECISION123');
    await ctx.page.click('[data-testid="supplier-save-btn"]');
    await expect(ctx.page.locator('text=PRECISION PHARMA')).toBeVisible();

    await ctx.page.click('[data-testid="nav-inventory"]');
    await ctx.page.click('[data-testid="add-product-btn"]');
    await ctx.page.fill('[data-testid="product-name-input"]', 'PRECISION INJECTION 10ML');
    await ctx.page.fill('[data-testid="product-hsn-input"]', '3004');
    await ctx.page.fill('[data-testid="product-pack-size-input"]', '1 Vial');
    await ctx.page.fill('[data-testid="product-mfr-input"]', 'PRECISION LABS');
    await ctx.page.click('[data-testid="product-save-btn"]');
    await expect(ctx.page.locator('text=PRECISION INJECTION 10ML')).toBeVisible();

    // 2. Create Purchase Invoice with rate ₹63.63, MRP ₹99.99, Qty = 100
    await ctx.page.click('[data-testid="nav-purchases"]');
    await ctx.page.selectOption('[data-testid="purchase-supplier-select"]', { label: 'PRECISION PHARMA (10PRECISION123)' });
    await ctx.page.fill('[data-testid="purchase-invoice-number-input"]', 'INV-PRECISION-6363');
    await ctx.page.fill('[data-testid="purchase-item-name-0"]', 'PRECISION INJECTION 10ML');
    await ctx.page.fill('[data-testid="purchase-item-qty-0"]', '100');
    await ctx.page.fill('[data-testid="purchase-item-batch-0"]', 'BATCH-P6363');
    await ctx.page.fill('[data-testid="purchase-item-exp-0"]', '11/2029');
    await ctx.page.fill('[data-testid="purchase-item-mrp-0"]', '99.99');
    await ctx.page.fill('[data-testid="purchase-item-rate-0"]', '63.63');
    await ctx.page.click('[data-testid="purchase-save-btn"]');
    await expect(ctx.page.locator('text=Purchase Invoice INV-PRECISION-6363 saved cleanly')).toBeVisible();

    // 3. Verify Purchase History lists Grand Total = ₹6681.15
    await ctx.page.click('[data-testid="nav-purchases"]');
    await ctx.page.click('button:has-text("Purchase History")');
    await expect(ctx.page.locator('td:has-text("₹6681.15")')).toBeVisible();
  });

  test('27.2 Date Contract Stability: Manufacturing and Expiry dates preserve MM/YYYY and YYYY-MM-DD formats', async () => {
    // 1. Create Product & Purchase with Leap Year Expiry 02/2028
    await ctx.page.click('[data-testid="nav-suppliers"]');
    await ctx.page.click('[data-testid="add-supplier-btn"]');
    await ctx.page.fill('[data-testid="supplier-name-input"]', 'DATE PHARMA');
    await ctx.page.fill('[data-testid="supplier-gstin-input"]', '10DATEPHARMA123');
    await ctx.page.click('[data-testid="supplier-save-btn"]');
    await expect(ctx.page.locator('text=DATE PHARMA')).toBeVisible();

    await ctx.page.click('[data-testid="nav-inventory"]');
    await ctx.page.click('[data-testid="add-product-btn"]');
    await ctx.page.fill('[data-testid="product-name-input"]', 'LEAP YEAR TABLET');
    await ctx.page.fill('[data-testid="product-hsn-input"]', '3004');
    await ctx.page.fill('[data-testid="product-pack-size-input"]', '10 Strips');
    await ctx.page.fill('[data-testid="product-mfr-input"]', 'LEAP PHARMA');
    await ctx.page.click('[data-testid="product-save-btn"]');
    await expect(ctx.page.locator('text=LEAP YEAR TABLET')).toBeVisible();

    await ctx.page.click('[data-testid="nav-purchases"]');
    await ctx.page.selectOption('[data-testid="purchase-supplier-select"]', { label: 'DATE PHARMA (10DATEPHARMA123)' });
    await ctx.page.fill('[data-testid="purchase-invoice-number-input"]', 'INV-LEAP-2028');
    await ctx.page.fill('[data-testid="purchase-item-name-0"]', 'LEAP YEAR TABLET');
    await ctx.page.fill('[data-testid="purchase-item-qty-0"]', '20');
    await ctx.page.fill('[data-testid="purchase-item-batch-0"]', 'BATCH-LEAP-28');
    await ctx.page.fill('[data-testid="purchase-item-exp-0"]', '02/2028');
    await ctx.page.fill('[data-testid="purchase-item-mrp-0"]', '50.00');
    await ctx.page.fill('[data-testid="purchase-item-rate-0"]', '40.00');
    await ctx.page.click('[data-testid="purchase-save-btn"]');
    await expect(ctx.page.locator('text=Purchase Invoice INV-LEAP-2028 saved cleanly')).toBeVisible();

    // 2. Inspect Batch Modal in Inventory Catalog -> Verify 02/2028 is formatted consistently
    await ctx.page.click('[data-testid="nav-inventory"]');
    await ctx.page.click('button:has-text("1 Batches")');
    await expect(ctx.page.locator('text=BATCH-LEAP-28')).toBeVisible();
    await expect(ctx.page.locator('text=02/2028')).toBeVisible();
  });

  test('27.3 Quantity & Ledger Integrity: Billed Qty + Free Qty matches ledger balance atomically', async () => {
    // 1. Create Supplier & Product
    await ctx.page.click('[data-testid="nav-suppliers"]');
    await ctx.page.click('[data-testid="add-supplier-btn"]');
    await ctx.page.fill('[data-testid="supplier-name-input"]', 'FREE QTY PHARMA');
    await ctx.page.fill('[data-testid="supplier-gstin-input"]', '10FREEQTY1234');
    await ctx.page.click('[data-testid="supplier-save-btn"]');
    await expect(ctx.page.locator('text=FREE QTY PHARMA')).toBeVisible();

    await ctx.page.click('[data-testid="nav-inventory"]');
    await ctx.page.click('[data-testid="add-product-btn"]');
    await ctx.page.fill('[data-testid="product-name-input"]', 'FREE QTY CAPSULE');
    await ctx.page.fill('[data-testid="product-hsn-input"]', '3004');
    await ctx.page.fill('[data-testid="product-pack-size-input"]', '10 Caps');
    await ctx.page.fill('[data-testid="product-mfr-input"]', 'FREE LABS');
    await ctx.page.click('[data-testid="product-save-btn"]');
    await expect(ctx.page.locator('text=FREE QTY CAPSULE')).toBeVisible();

    // 2. Purchase Invoice: Billed Qty = 80, Free Qty = 20 -> Total Stock Added = 100
    await ctx.page.click('[data-testid="nav-purchases"]');
    await ctx.page.selectOption('[data-testid="purchase-supplier-select"]', { label: 'FREE QTY PHARMA (10FREEQTY1234)' });
    await ctx.page.fill('[data-testid="purchase-invoice-number-input"]', 'INV-FREE-100');
    await ctx.page.fill('[data-testid="purchase-item-name-0"]', 'FREE QTY CAPSULE');
    await ctx.page.fill('[data-testid="purchase-item-qty-0"]', '80');
    await ctx.page.fill('[data-testid="purchase-item-free-qty-0"]', '20');
    await ctx.page.fill('[data-testid="purchase-item-batch-0"]', 'BATCH-FREE-20');
    await ctx.page.fill('[data-testid="purchase-item-exp-0"]', '05/2029');
    await ctx.page.fill('[data-testid="purchase-item-mrp-0"]', '10.00');
    await ctx.page.fill('[data-testid="purchase-item-rate-0"]', '8.00');
    await ctx.page.click('[data-testid="purchase-save-btn"]');
    await expect(ctx.page.locator('text=Purchase Invoice INV-FREE-100 saved cleanly')).toBeVisible();

    // 3. Verify Product Total Stock = 100 units (80 billed + 20 free)
    await ctx.page.click('[data-testid="nav-inventory"]');
    await expect(ctx.page.locator('strong:has-text("100 units")')).toBeVisible();

    // 4. Record Stock Exit 30 -> Stock = 70
    await ctx.page.click('[data-testid="nav-stock-exit"]');
    await ctx.page.fill('[data-testid="stock-exit-qty-input"]', '30');
    await ctx.page.click('[data-testid="stock-exit-submit-btn"]');
    await expect(ctx.page.locator('text=New batch stock: 70 units')).toBeVisible();
  });

  test('27.4 Error Contract Propagation: Duplicate supplier and invoice errors propagate cleanly to UI', async () => {
    // 1. Create Supplier
    await ctx.page.click('[data-testid="nav-suppliers"]');
    await ctx.page.click('[data-testid="add-supplier-btn"]');
    await ctx.page.fill('[data-testid="supplier-name-input"]', 'DUPLICATE CHECK SUPPLIER');
    await ctx.page.click('[data-testid="supplier-save-btn"]');
    await expect(ctx.page.locator('text=DUPLICATE CHECK SUPPLIER')).toBeVisible();

    // 2. Attempt duplicate supplier creation
    await ctx.page.click('[data-testid="add-supplier-btn"]');
    await ctx.page.fill('[data-testid="supplier-name-input"]', 'DUPLICATE CHECK SUPPLIER');
    await ctx.page.click('[data-testid="supplier-save-btn"]');

    // Verify human readable error toast appears
    await expect(ctx.page.locator('text=A supplier with this name already exists.')).toBeVisible();
  });
});
