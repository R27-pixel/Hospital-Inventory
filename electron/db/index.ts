import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { initializeDatabaseSchema } from './schema';

export interface Product {
  id: number;
  name: string;
  hsn_code: string;
  pack_size: string;
  manufacturer?: string;
  min_stock_alert?: number;
  is_archived: number;
  total_stock?: number;
  batch_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: number;
  name: string;
  gstin?: string;
  pan_no?: string;
  drug_license_no?: string;
  phone?: string;
  email?: string;
  address?: string;
  state_name?: string;
  state_code?: string;
  is_archived: number;
  created_at: string;
  updated_at: string;
}

export interface Batch {
  id: number;
  product_id: number;
  product_name?: string;
  batch_number: string;
  mfg_date?: string;
  expiry_date: string;
  mrp: number; // in Rupees
  purchase_rate: number; // in Rupees
  discount_percent: number;
  cgst_percent: number;
  sgst_percent: number;
  igst_percent: number;
  current_stock: number;
  created_at: string;
  updated_at: string;
}

export interface PurchaseItemInput {
  product_id?: number;
  product_name: string;
  hsn_code: string;
  pack_size: string;
  manufacturer?: string;
  batch_number: string;
  mfg_date?: string;
  expiry_date: string;
  mrp: number; // in Rupees
  quantity: number;
  free_quantity: number;
  purchase_rate: number; // in Rupees
  discount_percent: number;
  cgst_percent: number;
  sgst_percent: number;
  igst_percent: number;
  supplier_net_rate?: number; // Printed N.Rate per unit (in Rupees)
  supplier_line_amount?: number; // Printed Amount on line (in Rupees)
}

export interface PurchaseInvoiceInput {
  supplier_id: number;
  document_type?: 'TAX_INVOICE' | 'CHALLAN';
  invoice_number: string;
  invoice_date: string;
  order_no?: string;
  order_date?: string;
  lr_no?: string;
  lr_date?: string;
  cases_count?: number;

  // Supplier Printed Totals (in Rupees)
  supplier_taxable_total?: number;
  supplier_scheme_total?: number;
  supplier_discount_total?: number;
  supplier_cgst_total?: number;
  supplier_sgst_total?: number;
  supplier_igst_total?: number;
  supplier_total_gst?: number;
  supplier_other_charges?: number;
  supplier_round_off?: number;
  supplier_grand_total?: number;

  remarks?: string;
  items: PurchaseItemInput[];
}

export interface StockDiscrepancy {
  id: number;
  batch_id: number;
  product_name: string;
  batch_number: string;
  cached_stock: number;
  audited_stock: number;
  status: 'UNRESOLVED' | 'RESOLVED';
  created_at: string;
}

export interface StockExitInput {
  product_id: number;
  batch_id: number;
  quantity: number;
  reason: string;
}

// Financial Helper: Convert Rupees to INTEGER Paise & Basis Points
function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

function paiseToRupees(paise: number): number {
  return paise / 100;
}

function percentToBasisPoints(percent: number): number {
  return Math.round(percent * 100);
}

export class InventoryDbService {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  // --- SUPPLIERS CATALOG ---
  public getSuppliers(includeArchived: boolean = false): any[] {
    const query = `
      SELECT * FROM suppliers
      ${includeArchived ? '' : 'WHERE is_archived = 0'}
      ORDER BY name ASC
    `;
    return this.db.prepare(query).all();
  }

  public createSupplier(data: { name: string; gstin?: string; pan_no?: string; drug_license_no?: string; phone?: string; email?: string; address?: string; state_name?: string; state_code?: string }, userId?: number): { success: boolean; id?: number; error?: string } {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO suppliers (name, gstin, pan_no, drug_license_no, phone, email, address, state_name, state_code)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const info = stmt.run(
        data.name.trim(),
        data.gstin ? data.gstin.trim() : null,
        data.pan_no ? data.pan_no.trim() : null,
        data.drug_license_no ? data.drug_license_no.trim() : null,
        data.phone ? data.phone.trim() : null,
        data.email ? data.email.trim() : null,
        data.address ? data.address.trim() : null,
        data.state_name ? data.state_name.trim() : 'BIHAR',
        data.state_code ? data.state_code.trim() : '10'
      );
      const supplierId = info.lastInsertRowid as number;
      if (userId) {
        this.db.prepare(`
          INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
          VALUES (?, 'SUPPLIER_CREATE', 'SUPPLIER', ?, ?)
        `).run(userId, supplierId, `Created Supplier ${data.name.trim()}`);
      }
      return { success: true, id: supplierId };
    } catch (err: any) {
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        return { success: false, error: 'A supplier with this name already exists.' };
      }
      return { success: false, error: err.message };
    }
  }

  public updateSupplier(data: { id: number; name: string; gstin?: string; pan_no?: string; drug_license_no?: string; phone?: string; email?: string; address?: string; state_name?: string; state_code?: string }, userId?: number): { success: boolean; error?: string } {
    try {
      const stmt = this.db.prepare(`
        UPDATE suppliers
        SET name = ?, gstin = ?, pan_no = ?, drug_license_no = ?, phone = ?, email = ?, address = ?, state_name = ?, state_code = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      stmt.run(
        data.name.trim(),
        data.gstin ? data.gstin.trim() : null,
        data.pan_no ? data.pan_no.trim() : null,
        data.drug_license_no ? data.drug_license_no.trim() : null,
        data.phone ? data.phone.trim() : null,
        data.email ? data.email.trim() : null,
        data.address ? data.address.trim() : null,
        data.state_name ? data.state_name.trim() : 'BIHAR',
        data.state_code ? data.state_code.trim() : '10',
        data.id
      );
      if (userId) {
        this.db.prepare(`
          INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
          VALUES (?, 'SUPPLIER_UPDATE', 'SUPPLIER', ?, ?)
        `).run(userId, data.id, `Updated Supplier ${data.name.trim()}`);
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public archiveSupplier(id: number, userId?: number): { success: boolean; error?: string } {
    try {
      this.db.prepare('UPDATE suppliers SET is_archived = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
      if (userId) {
        this.db.prepare(`
          INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
          VALUES (?, 'SUPPLIER_ARCHIVE', 'SUPPLIER', ?, ?)
        `).run(userId, id, `Archived Supplier ID ${id}`);
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // --- PRODUCTS MASTER CATALOG ---
  public getProducts(includeArchived: boolean = false): Product[] {
    const query = `
      SELECT 
        p.*,
        COALESCE(SUM(b.current_stock), 0) AS total_stock,
        COUNT(b.id) AS batch_count
      FROM products p
      LEFT JOIN batches b ON p.id = b.product_id
      ${includeArchived ? '' : 'WHERE p.is_archived = 0'}
      GROUP BY p.id
      ORDER BY p.name ASC
    `;
    return this.db.prepare(query).all() as Product[];
  }

  public createProduct(data: { name: string; hsn_code: string; pack_size: string; manufacturer?: string; min_stock_alert?: number }, userId?: number): { success: boolean; id?: number; error?: string } {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO products (name, hsn_code, pack_size, manufacturer, min_stock_alert)
        VALUES (?, ?, ?, ?, ?)
      `);
      const info = stmt.run(
        data.name.trim(),
        data.hsn_code.trim(),
        data.pack_size.trim(),
        data.manufacturer ? data.manufacturer.trim() : null,
        data.min_stock_alert !== undefined && data.min_stock_alert !== null ? data.min_stock_alert : null
      );
      const productId = info.lastInsertRowid as number;
      if (userId) {
        this.db.prepare(`
          INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
          VALUES (?, 'PRODUCT_CREATE', 'PRODUCT', ?, ?)
        `).run(userId, productId, `Created Product ${data.name.trim()} (HSN: ${data.hsn_code.trim()})`);
      }
      return { success: true, id: productId };
    } catch (err: any) {
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        return { success: false, error: 'A product with this exact name already exists.' };
      }
      return { success: false, error: err.message };
    }
  }

  public updateProduct(data: { id: number; name: string; hsn_code: string; pack_size: string; manufacturer?: string; min_stock_alert?: number }, userId?: number): { success: boolean; error?: string } {
    try {
      const stmt = this.db.prepare(`
        UPDATE products
        SET name = ?, hsn_code = ?, pack_size = ?, manufacturer = ?, min_stock_alert = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      stmt.run(
        data.name.trim(),
        data.hsn_code.trim(),
        data.pack_size.trim(),
        data.manufacturer ? data.manufacturer.trim() : null,
        data.min_stock_alert !== undefined && data.min_stock_alert !== null ? data.min_stock_alert : null,
        data.id
      );
      if (userId) {
        this.db.prepare(`
          INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
          VALUES (?, 'PRODUCT_UPDATE', 'PRODUCT', ?, ?)
        `).run(userId, data.id, `Updated Product ${data.name.trim()}`);
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public archiveProduct(id: number, userId?: number): { success: boolean; error?: string } {
    try {
      this.db.prepare('UPDATE products SET is_archived = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
      if (userId) {
        this.db.prepare(`
          INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
          VALUES (?, 'PRODUCT_ARCHIVE', 'PRODUCT', ?, ?)
        `).run(userId, id, `Archived Product ID ${id}`);
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // --- BATCHES CATALOG ---
  public getBatchesByProduct(productId: number): Batch[] {
    const rows = this.db.prepare(`
      SELECT b.*, p.name AS product_name
      FROM batches b
      JOIN products p ON b.product_id = p.id
      WHERE b.product_id = ?
      ORDER BY b.expiry_date ASC
    `).all(productId) as any[];

    return rows.map((r) => ({
      ...r,
      mrp: paiseToRupees(r.mrp_paise),
      purchase_rate: paiseToRupees(r.purchase_rate_paise),
      discount_percent: r.discount_rate_basis_points / 100,
      cgst_percent: r.cgst_rate_basis_points / 100,
      sgst_percent: r.sgst_rate_basis_points / 100,
      igst_percent: r.igst_rate_basis_points / 100,
    }));
  }

  public getAllBatches(): Batch[] {
    const rows = this.db.prepare(`
      SELECT b.*, p.name AS product_name
      FROM batches b
      JOIN products p ON b.product_id = p.id
      ORDER BY b.expiry_date ASC
    `).all() as any[];

    return rows.map((r) => ({
      ...r,
      mrp: paiseToRupees(r.mrp_paise),
      purchase_rate: paiseToRupees(r.purchase_rate_paise),
      discount_percent: r.discount_rate_basis_points / 100,
      cgst_percent: r.cgst_rate_basis_points / 100,
      sgst_percent: r.sgst_rate_basis_points / 100,
      igst_percent: r.igst_rate_basis_points / 100,
    }));
  }

  // --- PURCHASE INVOICE & INWARD ENTRY (INTEGER-PAISE ATOMIC ENGINE) ---
  public createPurchaseInvoice(
    input: PurchaseInvoiceInput,
    userId?: number,
    approvedByUserId?: number
  ): { success: boolean; id?: number; error?: string } {
    if (!input.items || input.items.length === 0) {
      return { success: false, error: 'Purchase invoice must contain at least one line item.' };
    }

    try {
      let totalItems = input.items.length;
      let totalQuantity = 0;

      let calcTaxablePaise = 0;
      let calcDiscountPaise = 0;
      let calcCgstPaise = 0;
      let calcSgstPaise = 0;
      let calcIgstPaise = 0;
      let hasLineDiscrepancy = false;

      const processedItems = input.items.map((item) => {
        const billedQty = item.quantity;
        const freeQty = item.free_quantity || 0;
        const totalStockAdded = billedQty + freeQty; // Stock Added = Qty + Free
        totalQuantity += totalStockAdded;

        const ratePaise = rupeesToPaise(item.purchase_rate || 0);
        const mrpPaise = rupeesToPaise(item.mrp || 0);
        const discBp = percentToBasisPoints(item.discount_percent || 0);
        const cgstBp = percentToBasisPoints(item.cgst_percent || 0);
        const sgstBp = percentToBasisPoints(item.sgst_percent || 0);
        const igstBp = percentToBasisPoints(item.igst_percent || 0);

        const grossPaise = ratePaise * billedQty;
        const discAmountPaise = Math.round(grossPaise * (discBp / 10000));
        const lineTaxablePaise = grossPaise - discAmountPaise;

        const cgstAmountPaise = Math.round(lineTaxablePaise * (cgstBp / 10000));
        const sgstAmountPaise = Math.round(lineTaxablePaise * (sgstBp / 10000));
        const igstAmountPaise = Math.round(lineTaxablePaise * (igstBp / 10000));
        const lineGstPaise = cgstAmountPaise + sgstAmountPaise + igstAmountPaise;
        const lineNetPaise = lineTaxablePaise + lineGstPaise;

        const calculatedNetRatePaise = totalStockAdded > 0 ? Math.round(lineNetPaise / totalStockAdded) : 0;
        const supplierNetRatePaise = rupeesToPaise(item.supplier_net_rate || 0);
        const supplierLineAmountPaise = rupeesToPaise(item.supplier_line_amount || paiseToRupees(lineNetPaise));

        calcTaxablePaise += lineTaxablePaise;
        calcDiscountPaise += discAmountPaise;
        calcCgstPaise += cgstAmountPaise;
        calcSgstPaise += sgstAmountPaise;
        calcIgstPaise += igstAmountPaise;

        if (supplierLineAmountPaise > 0 && Math.abs(supplierLineAmountPaise - lineNetPaise) > 1) {
          hasLineDiscrepancy = true;
        }

        return {
          item,
          billedQty,
          freeQty,
          totalStockAdded,
          ratePaise,
          mrpPaise,
          discBp,
          discAmountPaise,
          cgstBp,
          cgstAmountPaise,
          sgstBp,
          sgstAmountPaise,
          igstBp,
          igstAmountPaise,
          lineTaxablePaise,
          supplierNetRatePaise,
          calculatedNetRatePaise,
          supplierLineAmountPaise,
          lineNetPaise,
        };
      });

      const calcGstPaise = calcCgstPaise + calcSgstPaise + calcIgstPaise;
      const supplierOtherChargesPaise = rupeesToPaise(input.supplier_other_charges || 0);
      const supplierRoundOffPaise = rupeesToPaise(input.supplier_round_off || 0);
      const calcGrandTotalPaise = calcTaxablePaise + calcGstPaise + supplierOtherChargesPaise + supplierRoundOffPaise;

      const supplierGrandTotalPaise = rupeesToPaise(input.supplier_grand_total || paiseToRupees(calcGrandTotalPaise));
      const hasArithmeticOverride = (hasLineDiscrepancy || Math.abs(supplierGrandTotalPaise - calcGrandTotalPaise) > 1) ? 1 : 0;

      // Atomic SQLite Transaction
      const transaction = this.db.transaction(() => {
        if (hasArithmeticOverride === 1 && !approvedByUserId) {
          throw new Error('Privileged Operation Denied: Master Admin authorization required for purchase invoice arithmetic discrepancies.');
        }

        // Insert Invoice Header
        const invStmt = this.db.prepare(`
          INSERT INTO purchase_invoices (
            supplier_id, created_by_user_id, approved_by_user_id, document_type, invoice_number, invoice_date, order_no, order_date, lr_no, lr_date, cases_count,
            total_items, total_quantity, supplier_taxable_total_paise, supplier_scheme_total_paise, supplier_discount_total_paise,
            supplier_cgst_total_paise, supplier_sgst_total_paise, supplier_igst_total_paise, supplier_total_gst_paise, supplier_other_charges_paise,
            supplier_round_off_paise, supplier_grand_total_paise, calculated_taxable_total_paise, calculated_gst_total_paise,
            calculated_grand_total_paise, has_arithmetic_override, approved_at, remarks
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const invInfo = invStmt.run(
          input.supplier_id,
          userId || null,
          approvedByUserId || null,
          input.document_type || 'TAX_INVOICE',
          input.invoice_number.trim(),
          input.invoice_date,
          input.order_no || null,
          input.order_date || null,
          input.lr_no || null,
          input.lr_date || null,
          input.cases_count || 0,
          totalItems,
          totalQuantity,
          rupeesToPaise(input.supplier_taxable_total || paiseToRupees(calcTaxablePaise)),
          rupeesToPaise(input.supplier_scheme_total || 0),
          rupeesToPaise(input.supplier_discount_total || paiseToRupees(calcDiscountPaise)),
          rupeesToPaise(input.supplier_cgst_total || paiseToRupees(calcCgstPaise)),
          rupeesToPaise(input.supplier_sgst_total || paiseToRupees(calcSgstPaise)),
          rupeesToPaise(input.supplier_igst_total || paiseToRupees(calcIgstPaise)),
          rupeesToPaise(input.supplier_total_gst || paiseToRupees(calcGstPaise)),
          supplierOtherChargesPaise,
          supplierRoundOffPaise,
          supplierGrandTotalPaise,
          calcTaxablePaise,
          calcGstPaise,
          calcGrandTotalPaise,
          hasArithmeticOverride,
          hasArithmeticOverride ? new Date().toISOString() : null,
          input.remarks || null
        );

        const invoiceId = invInfo.lastInsertRowid as number;

        // Process Items & Batches
        for (const p of processedItems) {
          let productId = p.item.product_id;

          // Auto-Create Product if absent
          if (!productId) {
            const findProd = this.db.prepare('SELECT id FROM products WHERE name = ?').get(p.item.product_name.trim()) as { id: number } | undefined;
            if (findProd) {
              productId = findProd.id;
            } else {
              const newProd = this.db.prepare(`
                INSERT INTO products (name, hsn_code, pack_size, manufacturer)
                VALUES (?, ?, ?, ?)
              `).run(
                p.item.product_name.trim(),
                p.item.hsn_code.trim(),
                p.item.pack_size.trim(),
                p.item.manufacturer ? p.item.manufacturer.trim() : null
              );
              productId = newProd.lastInsertRowid as number;
            }
          }

          // Check/Create Batch
          let batchId: number;
          const existingBatch = this.db.prepare('SELECT id, current_stock FROM batches WHERE product_id = ? AND batch_number = ?').get(productId, p.item.batch_number.trim()) as { id: number; current_stock: number } | undefined;

          if (existingBatch) {
            batchId = existingBatch.id;
            const newStock = existingBatch.current_stock + p.totalStockAdded; // Stock Added = Qty + Free
            this.db.prepare(`
              UPDATE batches 
              SET current_stock = ?, expiry_date = ?, mrp_paise = ?, purchase_rate_paise = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `).run(newStock, p.item.expiry_date, p.mrpPaise, p.ratePaise, batchId);
          } else {
            const newBatch = this.db.prepare(`
              INSERT INTO batches (
                product_id, batch_number, mfg_date, expiry_date, mrp_paise, purchase_rate_paise,
                discount_rate_basis_points, cgst_rate_basis_points, sgst_rate_basis_points, igst_rate_basis_points, current_stock
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              productId,
              p.item.batch_number.trim(),
              p.item.mfg_date || null,
              p.item.expiry_date,
              p.mrpPaise,
              p.ratePaise,
              p.discBp,
              p.cgstBp,
              p.sgstBp,
              p.igstBp,
              p.totalStockAdded
            );
            batchId = newBatch.lastInsertRowid as number;
          }

          const updatedBatch = this.db.prepare('SELECT current_stock FROM batches WHERE id = ?').get(batchId) as { current_stock: number };

          // Insert Purchase Item Snapshot (Preserves Historical Printed Values)
          this.db.prepare(`
            INSERT INTO purchase_items (
              purchase_invoice_id, product_id, batch_id, quantity, free_quantity, purchase_rate_paise,
              discount_rate_basis_points, discount_amount_paise, cgst_rate_basis_points, cgst_amount_paise,
              sgst_rate_basis_points, sgst_amount_paise, igst_rate_basis_points, igst_amount_paise,
              supplier_net_rate_paise, calculated_net_rate_paise, supplier_line_amount_paise,
              calculated_taxable_amount_paise, is_arithmetic_override, total_gst_amount_paise, net_amount_paise
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            invoiceId,
            productId,
            batchId,
            p.billedQty,
            p.freeQty,
            p.ratePaise,
            p.discBp,
            p.discAmountPaise,
            p.cgstBp,
            p.cgstAmountPaise,
            p.sgstBp,
            p.sgstAmountPaise,
            p.igstBp,
            p.igstAmountPaise,
            p.supplierNetRatePaise,
            p.calculatedNetRatePaise,
            p.supplierLineAmountPaise,
            p.lineTaxablePaise,
            hasArithmeticOverride,
            p.cgstAmountPaise + p.sgstAmountPaise + p.igstAmountPaise,
            p.lineNetPaise
          );

          // Record Positive Stock Movement: quantity_changed = +(quantity + free_quantity)
          this.db.prepare(`
            INSERT INTO stock_movements (
              batch_id, created_by_user_id, movement_type, quantity_changed, balance_after, reference_type, reference_id, reason
            ) VALUES (?, ?, 'PURCHASE', ?, ?, 'PURCHASE_INVOICE', ?, ?)
          `).run(
            batchId,
            userId || null,
            p.totalStockAdded,
            updatedBatch.current_stock,
            invoiceId,
            `Purchase Invoice ${input.invoice_number}`
          );
        }

        // Write Audit Log Entry if Master Discrepancy Override Approved
        if (hasArithmeticOverride === 1 && approvedByUserId) {
          this.db.prepare(`
            INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
            VALUES (?, 'DISCREPANCY_APPROVAL', 'PURCHASE_INVOICE', ?, ?)
          `).run(
            approvedByUserId,
            invoiceId,
            `Approved arithmetic override for Purchase Invoice ${input.invoice_number} (Supplier Grand Total: ₹${paiseToRupees(supplierGrandTotalPaise)}, Calculated: ₹${paiseToRupees(calcGrandTotalPaise)})`
          );
        }

        return invoiceId;
      });

      const newInvId = transaction();
      return { success: true, id: newInvId };
    } catch (err: any) {
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        return { success: false, error: 'An invoice with this number already exists for this supplier.' };
      }
      return { success: false, error: err.message || 'Failed to save purchase invoice.' };
    }
  }

  public getInvoices(): any[] {
    const query = `
      SELECT 
        pi.id,
        pi.invoice_number,
        pi.supplier_id,
        s.name AS supplier_name,
        pi.invoice_date,
        pi.supplier_grand_total_paise,
        pi.calculated_grand_total_paise,
        pi.has_arithmetic_override,
        pi.is_cancelled,
        pi.cancelled_at,
        pi.cancellation_reason,
        pi.remarks,
        pi.created_at
      FROM purchase_invoices pi
      JOIN suppliers s ON pi.supplier_id = s.id
      ORDER BY pi.invoice_date DESC, pi.id DESC
    `;
    const rows = this.db.prepare(query).all() as any[];
    return rows.map((r) => ({
      ...r,
      total_taxable_amount: paiseToRupees(r.supplier_grand_total_paise || r.calculated_grand_total_paise),
      total_gst: 0,
      grand_total: paiseToRupees(r.supplier_grand_total_paise || r.calculated_grand_total_paise),
    }));
  }

  public cancelPurchaseInvoice(id: number, cancelledByUserId: number, reason: string): { success: boolean; error?: string } {
    try {
      const cancelTx = this.db.transaction(() => {
        const invoice = this.db.prepare('SELECT * FROM purchase_invoices WHERE id = ?').get(id) as any;
        if (!invoice) throw new Error('Purchase invoice not found.');
        if (invoice.is_cancelled === 1) throw new Error('Purchase invoice is already cancelled.');

        const items = this.db.prepare('SELECT * FROM purchase_items WHERE purchase_invoice_id = ?').all(id) as any[];

        for (const item of items) {
          const originalQty = item.quantity + (item.free_quantity || 0);
          const batch = this.db.prepare('SELECT current_stock FROM batches WHERE id = ?').get(item.batch_id) as { current_stock: number } | undefined;
          if (!batch) continue;

          // Reverse only the quantity that remains in stock (never allowing stock < 0)
          const reversibleQty = Math.min(originalQty, Math.max(0, batch.current_stock));
          const consumedQty = originalQty - reversibleQty;
          const newStock = batch.current_stock - reversibleQty;

          // Update batch stock atomically
          this.db.prepare('UPDATE batches SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStock, item.batch_id);

          // Record reversing stock movement
          this.db.prepare(`
            INSERT INTO stock_movements (
              batch_id, created_by_user_id, movement_type, quantity_changed, balance_after, reference_type, reference_id, reason
            ) VALUES (?, ?, 'RETURN', ?, ?, 'PURCHASE_INVOICE', ?, ?)
          `).run(
            item.batch_id,
            cancelledByUserId,
            -reversibleQty,
            newStock,
            id,
            `Purchase Invoice ${invoice.invoice_number} Cancellation: Reverted ${reversibleQty} of ${originalQty} units (Consumed: ${consumedQty}). Reason: ${reason || 'N/A'}`
          );
        }

        // Mark invoice as cancelled
        this.db.prepare(`
          UPDATE purchase_invoices
          SET is_cancelled = 1, cancelled_by_user_id = ?, cancelled_at = CURRENT_TIMESTAMP, cancellation_reason = ?
          WHERE id = ?
        `).run(cancelledByUserId, reason || 'Cancelled by Master Admin', id);

        // Audit log entry
        this.db.prepare(`
          INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
          VALUES (?, 'PURCHASE_CANCEL', 'PURCHASE_INVOICE', ?, ?)
        `).run(
          cancelledByUserId,
          id,
          `Cancelled Purchase Invoice ${invoice.invoice_number}. Reason: ${reason || 'N/A'}`
        );

        return true;
      });

      cancelTx();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // --- OUTBOUND INVENTORY / STOCK EXIT WORKFLOW ---
  public recordStockExit(input: StockExitInput, userId?: number): { success: boolean; balance_after?: number; error?: string } {
    try {
      const exitTx = this.db.transaction(() => {
        if (!input.quantity || !Number.isInteger(input.quantity) || input.quantity <= 0) {
          throw new Error('Invalid exit quantity: Exit quantity must be a positive integer.');
        }

        const batch = this.db.prepare('SELECT current_stock FROM batches WHERE id = ?').get(input.batch_id) as { current_stock: number } | undefined;
        if (!batch) throw new Error('Batch not found.');
        if (batch.current_stock < input.quantity) {
          throw new Error(`Insufficient stock. Current stock is ${batch.current_stock} units.`);
        }

        const newStock = batch.current_stock - input.quantity;
        this.db.prepare('UPDATE batches SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStock, input.batch_id);

        this.db.prepare(`
          INSERT INTO stock_movements (
            batch_id, created_by_user_id, movement_type, quantity_changed, balance_after, reference_type, reason
          ) VALUES (?, ?, 'EXIT', ?, ?, 'STOCK_EXIT', ?)
        `).run(
          input.batch_id,
          userId || null,
          -input.quantity,
          newStock,
          input.reason
        );

        if (userId) {
          this.db.prepare(`
            INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
            VALUES (?, 'STOCK_EXIT', 'BATCH', ?, ?)
          `).run(userId, input.batch_id, `Stock exit of ${input.quantity} units recorded for Batch ID ${input.batch_id}. Reason: ${input.reason}`);
        }

        return newStock;
      });

      const newBalance = exitTx();
      return { success: true, balance_after: newBalance };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public getStockExitHistory(): any[] {
    const query = `
      SELECT 
        sm.id,
        sm.batch_id,
        p.name AS product_name,
        b.batch_number,
        sm.quantity_changed,
        sm.balance_after,
        sm.reason,
        sm.created_at
      FROM stock_movements sm
      JOIN batches b ON sm.batch_id = b.id
      JOIN products p ON b.product_id = p.id
      WHERE sm.movement_type = 'EXIT'
      ORDER BY sm.created_at DESC
    `;
    return this.db.prepare(query).all();
  }

  public checkStockIntegrity(): StockDiscrepancy[] {
    const query = `
      SELECT 
        b.id AS batch_id,
        p.name AS product_name,
        b.batch_number,
        b.current_stock AS cached_stock,
        COALESCE(SUM(sm.quantity_changed), 0) AS audited_stock
      FROM batches b
      JOIN products p ON b.product_id = p.id
      LEFT JOIN stock_movements sm ON b.id = sm.batch_id
      GROUP BY b.id
      HAVING cached_stock != audited_stock
    `;

    const mismatches = this.db.prepare(query).all() as { batch_id: number; product_name: string; batch_number: string; cached_stock: number; audited_stock: number }[];

    if (mismatches.length > 0) {
      const insertDiscrepancy = this.db.prepare(`
        INSERT INTO discrepancy_logs (batch_id, cached_stock, audited_stock, status, created_at)
        VALUES (?, ?, ?, 'UNRESOLVED', CURRENT_TIMESTAMP)
      `);

      const logTransaction = this.db.transaction(() => {
        for (const m of mismatches) {
          const existing = this.db.prepare('SELECT id FROM discrepancy_logs WHERE batch_id = ? AND status = "UNRESOLVED"').get(m.batch_id);
          if (!existing) {
            insertDiscrepancy.run(m.batch_id, m.cached_stock, m.audited_stock);
          }
        }
      });
      logTransaction();
    }

    const getUnresolved = `
      SELECT 
        dl.id,
        dl.batch_id,
        p.name AS product_name,
        b.batch_number,
        dl.cached_stock,
        dl.audited_stock,
        dl.status,
        dl.created_at
      FROM discrepancy_logs dl
      JOIN batches b ON dl.batch_id = b.id
      JOIN products p ON b.product_id = p.id
      WHERE dl.status = 'UNRESOLVED'
      ORDER BY dl.created_at DESC
    `;
    return this.db.prepare(getUnresolved).all() as StockDiscrepancy[];
  }
}
