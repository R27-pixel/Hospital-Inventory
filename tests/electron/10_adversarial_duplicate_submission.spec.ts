import { test, expect } from '@playwright/test';
import { launchElectronApp, setupInitialAccounts, ElectronTestContext } from './helpers/electron-app';

test.describe('10. Adversarial Duplicate Submission & Integrity QA', () => {
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

  test('10.1 Should enforce UNIQUE supplier name constraint and prevent duplicate supplier registration', async () => {
    await ctx.page.click('[data-testid="nav-suppliers"]');

    // Create Supplier 1
    await ctx.page.click('[data-testid="add-supplier-btn"]');
    await ctx.page.fill('[data-testid="supplier-name-input"]', 'UNIQUE SUPPLIER AGENCY');
    await ctx.page.click('[data-testid="supplier-save-btn"]');
    await expect(ctx.page.locator('[data-testid="supplier-form"]')).toBeHidden();

    // Attempt Duplicate Supplier Name
    await ctx.page.click('[data-testid="add-supplier-btn"]');
    await ctx.page.fill('[data-testid="supplier-name-input"]', 'UNIQUE SUPPLIER AGENCY');
    await ctx.page.click('[data-testid="supplier-save-btn"]');

    // Form stays open or error alert displayed
    await expect(ctx.page.locator('text=A supplier with this name already exists.')).toBeVisible();
    await ctx.page.click('[data-testid="supplier-cancel-btn"]');
  });

  test('10.2 Should enforce UNIQUE product name constraint and prevent duplicate product registration', async () => {
    await ctx.page.click('[data-testid="nav-inventory"]');

    // Create Product 1
    await ctx.page.click('[data-testid="add-product-btn"]');
    await ctx.page.fill('[data-testid="product-name-input"]', 'UNIQUE SYRUP 100ML');
    await ctx.page.fill('[data-testid="product-hsn-input"]', '3004');
    await ctx.page.fill('[data-testid="product-pack-size-input"]', '100ml Bottle');
    await ctx.page.fill('[data-testid="product-mfr-input"]', 'UNIQUE LABS');
    await ctx.page.click('[data-testid="product-save-btn"]');
    await expect(ctx.page.locator('[data-testid="product-form"]')).toBeHidden();

    // Attempt Duplicate Product Name
    await ctx.page.click('[data-testid="add-product-btn"]');
    await ctx.page.fill('[data-testid="product-name-input"]', 'UNIQUE SYRUP 100ML');
    await ctx.page.fill('[data-testid="product-hsn-input"]', '3004');
    await ctx.page.fill('[data-testid="product-pack-size-input"]', '100ml Bottle');
    await ctx.page.fill('[data-testid="product-mfr-input"]', 'UNIQUE LABS');
    await ctx.page.click('[data-testid="product-save-btn"]');

    await expect(ctx.page.locator('text=A product with this exact name already exists.')).toBeVisible();
    await ctx.page.click('[data-testid="product-cancel-btn"]');
  });

  test('10.3 Should enforce UNIQUE(supplier_id, invoice_number) constraint while allowing duplicate invoice numbers across different suppliers', async () => {
    // Setup Supplier A & Supplier B
    await ctx.page.click('[data-testid="nav-suppliers"]');
    await ctx.page.click('[data-testid="add-supplier-btn"]');
    await ctx.page.fill('[data-testid="supplier-name-input"]', 'ALPHA PHARMA');
    await ctx.page.click('[data-testid="supplier-save-btn"]');

    await ctx.page.click('[data-testid="add-supplier-btn"]');
    await ctx.page.fill('[data-testid="supplier-name-input"]', 'BETA PHARMA');
    await ctx.page.click('[data-testid="supplier-save-btn"]');

    // Setup Product
    await ctx.page.click('[data-testid="nav-inventory"]');
    await ctx.page.click('[data-testid="add-product-btn"]');
    await ctx.page.fill('[data-testid="product-name-input"]', 'SHARED PRODUCT 500MG');
    await ctx.page.fill('[data-testid="product-hsn-input"]', '3004');
    await ctx.page.fill('[data-testid="product-pack-size-input"]', '10 Tabs');
    await ctx.page.fill('[data-testid="product-mfr-input"]', 'SHARED LABS');
    await ctx.page.click('[data-testid="product-save-btn"]');

    // 1. Create Invoice INV-SHARED-100 for ALPHA PHARMA
    await ctx.page.click('[data-testid="nav-purchases"]');
    await ctx.page.selectOption('[data-testid="purchase-supplier-select"]', { label: 'ALPHA PHARMA' });
    await ctx.page.fill('[data-testid="purchase-invoice-number-input"]', 'INV-SHARED-100');
    await ctx.page.fill('[data-testid="purchase-item-name-0"]', 'SHARED PRODUCT 500MG');
    await ctx.page.fill('[data-testid="purchase-item-qty-0"]', '5');
    await ctx.page.fill('[data-testid="purchase-item-batch-0"]', 'BATCH-ALPHA-01');
    await ctx.page.fill('[data-testid="purchase-item-exp-0"]', '12/2028');
    await ctx.page.fill('[data-testid="purchase-item-mrp-0"]', '50.00');
    await ctx.page.fill('[data-testid="purchase-item-rate-0"]', '40.00');
    await ctx.page.click('[data-testid="purchase-save-btn"]');
    await expect(ctx.page.locator('text=Purchase Invoice INV-SHARED-100 saved cleanly')).toBeVisible();

    // 2. Attempt Duplicate Invoice INV-SHARED-100 for ALPHA PHARMA (Must reject)
    await ctx.page.selectOption('[data-testid="purchase-supplier-select"]', { label: 'ALPHA PHARMA' });
    await ctx.page.fill('[data-testid="purchase-invoice-number-input"]', 'INV-SHARED-100');
    await ctx.page.fill('[data-testid="purchase-item-name-0"]', 'SHARED PRODUCT 500MG');
    await ctx.page.fill('[data-testid="purchase-item-qty-0"]', '5');
    await ctx.page.fill('[data-testid="purchase-item-batch-0"]', 'BATCH-ALPHA-02');
    await ctx.page.fill('[data-testid="purchase-item-exp-0"]', '12/2028');
    await ctx.page.fill('[data-testid="purchase-item-mrp-0"]', '50.00');
    await ctx.page.fill('[data-testid="purchase-item-rate-0"]', '40.00');
    await ctx.page.click('[data-testid="purchase-save-btn"]');
    await expect(ctx.page.locator('text=An invoice with this number already exists for this supplier.')).toBeVisible();

    // 3. Create Invoice INV-SHARED-100 for BETA PHARMA (Must succeed per UNIQUE(supplier_id, invoice_number) schema rule)
    await ctx.page.selectOption('[data-testid="purchase-supplier-select"]', { label: 'BETA PHARMA' });
    await ctx.page.fill('[data-testid="purchase-invoice-number-input"]', 'INV-SHARED-100');
    await ctx.page.fill('[data-testid="purchase-item-name-0"]', 'SHARED PRODUCT 500MG');
    await ctx.page.fill('[data-testid="purchase-item-qty-0"]', '10');
    await ctx.page.fill('[data-testid="purchase-item-batch-0"]', 'BATCH-BETA-01');
    await ctx.page.fill('[data-testid="purchase-item-exp-0"]', '12/2028');
    await ctx.page.fill('[data-testid="purchase-item-mrp-0"]', '50.00');
    await ctx.page.fill('[data-testid="purchase-item-rate-0"]', '40.00');
    await ctx.page.click('[data-testid="purchase-save-btn"]');
    await expect(ctx.page.locator('text=Purchase Invoice INV-SHARED-100 saved cleanly')).toBeVisible();
  });
});
