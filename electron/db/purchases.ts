import Database from 'better-sqlite3';

export interface PurchaseItemInput {
  product_id?: number;
  product_name: string;
  hsn_code: string;
  pack_size: string;
  manufacturer: string;
  batch_number: string;
  mfg_date?: string;
  expiry_date: string;
  mrp: number;
  quantity: number;
  free_quantity: number;
  purchase_rate: number;
  discount_percent: number;
  gst_percent: number;
}

export interface PurchaseInvoiceInput {
  supplier_id: number;
  invoice_number: string;
  invoice_date: string;
  remarks?: string;
  items: PurchaseItemInput[];
}

export interface PurchaseInvoice {
  id: number;
  invoice_number: string;
  supplier_id: number;
  supplier_name: string;
  invoice_date: string;
  total_taxable_amount: number;
  total_cgst: number;
  total_sgst: number;
  total_gst: number;
  grand_total: number;
  remarks?: string;
  item_count?: number;
  created_at: string;
}

export class PurchaseDbService {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  public getInvoices(): PurchaseInvoice[] {
    const query = `
      SELECT 
        pi.*,
        s.name AS supplier_name,
        COUNT(pit.id) AS item_count
      FROM purchase_invoices pi
      JOIN suppliers s ON pi.supplier_id = s.id
      LEFT JOIN purchase_items pit ON pi.id = pit.purchase_invoice_id
      GROUP BY pi.id
      ORDER BY pi.invoice_date DESC, pi.id DESC
    `;
    return this.db.prepare(query).all() as PurchaseInvoice[];
  }

  public createPurchaseInvoice(input: PurchaseInvoiceInput): { success: boolean; id?: number; error?: string } {
    if (!input.items || input.items.length === 0) {
      return { success: false, error: 'Purchase invoice must contain at least one line item.' };
    }

    try {
      // Calculate totals across all items
      let totalTaxable = 0;
      let totalCgst = 0;
      let totalSgst = 0;
      let totalGst = 0;
      let grandTotal = 0;

      const processedItems = input.items.map((item) => {
        const billedQty = item.quantity;
        const freeQty = item.free_quantity || 0;
        const totalUnits = billedQty + freeQty;

        const grossAmount = item.purchase_rate * billedQty;
        const discountAmount = grossAmount * (item.discount_percent / 100);
        const taxableAmount = grossAmount - discountAmount;

        const cgstRate = item.gst_percent / 2;
        const sgstRate = item.gst_percent / 2;
        const cgstAmount = taxableAmount * (cgstRate / 100);
        const sgstAmount = taxableAmount * (sgstRate / 100);
        const lineGst = cgstAmount + sgstAmount;
        const netAmount = taxableAmount + lineGst;
        const netRatePerUnit = totalUnits > 0 ? netAmount / totalUnits : 0;

        totalTaxable += taxableAmount;
        totalCgst += cgstAmount;
        totalSgst += sgstAmount;
        totalGst += lineGst;
        grandTotal += netAmount;

        return {
          ...item,
          totalUnits,
          taxableAmount,
          cgstAmount,
          sgstAmount,
          lineGst,
          netAmount,
          netRatePerUnit,
        };
      });

      // Atomic SQLite Transaction
      const createTx = this.db.transaction(() => {
        // 1. Insert Purchase Invoice Header
        const invStmt = this.db.prepare(`
          INSERT INTO purchase_invoices (
            invoice_number, supplier_id, invoice_date,
            total_taxable_amount, total_cgst, total_sgst, total_gst, grand_total, remarks, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `);
        const invInfo = invStmt.run(
          input.invoice_number.trim(),
          input.supplier_id,
          input.invoice_date,
          totalTaxable,
          totalCgst,
          totalSgst,
          totalGst,
          grandTotal,
          input.remarks?.trim() || null
        );
        const invoiceId = Number(invInfo.lastInsertRowid);

        // 2. Process line items
        for (const item of processedItems) {
          // a. Check or create Product
          let productId: number;
          const existingProd = this.db.prepare('SELECT id FROM products WHERE name = ?').get(item.product_name.trim()) as { id: number } | undefined;
          if (existingProd) {
            productId = existingProd.id;
          } else {
            const prodStmt = this.db.prepare(`
              INSERT INTO products (name, hsn_code, pack_size, manufacturer, min_stock_alert, created_at, updated_at)
              VALUES (?, ?, ?, ?, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `);
            const pInfo = prodStmt.run(item.product_name.trim(), item.hsn_code.trim(), item.pack_size.trim(), item.manufacturer.trim());
            productId = Number(pInfo.lastInsertRowid);
          }

          // b. Check or create Batch
          let batchId: number;
          let newStock = item.totalUnits;

          const existingBatch = this.db.prepare(`
            SELECT id, current_stock FROM batches WHERE product_id = ? AND batch_number = ?
          `).get(productId, item.batch_number.trim()) as { id: number; current_stock: number } | undefined;

          if (existingBatch) {
            batchId = existingBatch.id;
            newStock = existingBatch.current_stock + item.totalUnits;
            this.db.prepare(`
              UPDATE batches
              SET mfg_date = ?, expiry_date = ?, mrp = ?, purchase_rate = ?, discount_percent = ?, gst_percent = ?, current_stock = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `).run(
              item.mfg_date || null,
              item.expiry_date,
              item.mrp,
              item.purchase_rate,
              item.discount_percent,
              item.gst_percent,
              newStock,
              batchId
            );
          } else {
            const batchStmt = this.db.prepare(`
              INSERT INTO batches (
                product_id, batch_number, mfg_date, expiry_date, mrp, purchase_rate, discount_percent, gst_percent, current_stock, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `);
            const bInfo = batchStmt.run(
              productId,
              item.batch_number.trim(),
              item.mfg_date || null,
              item.expiry_date,
              item.mrp,
              item.purchase_rate,
              item.discount_percent,
              item.gst_percent,
              newStock
            );
            batchId = Number(bInfo.lastInsertRowid);
          }

          // c. Insert purchase_items record (Historical values snapshot)
          this.db.prepare(`
            INSERT INTO purchase_items (
              purchase_invoice_id, product_id, batch_id, quantity, free_quantity,
              purchase_rate, discount_percent, gst_percent, taxable_amount,
              cgst_amount, sgst_amount, total_gst_amount, net_amount, net_rate_per_unit, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          `).run(
            invoiceId,
            productId,
            batchId,
            item.quantity,
            item.free_quantity,
            item.purchase_rate,
            item.discount_percent,
            item.gst_percent,
            item.taxableAmount,
            item.cgstAmount,
            item.sgstAmount,
            item.lineGst,
            item.netAmount,
            item.netRatePerUnit
          );

          // d. Insert stock_movements ledger entry
          this.db.prepare(`
            INSERT INTO stock_movements (
              batch_id, movement_type, quantity_changed, balance_after, reference_type, reference_id, reason, created_at
            ) VALUES (?, 'PURCHASE', ?, ?, 'PURCHASE_INVOICE', ?, ?, CURRENT_TIMESTAMP)
          `).run(
            batchId,
            item.totalUnits,
            newStock,
            invoiceId,
            `Purchase Invoice ${input.invoice_number.trim()}`
          );
        }

        return invoiceId;
      });

      const invoiceId = createTx();
      return { success: true, id: invoiceId };
    } catch (err: any) {
      if (err.message?.includes('UNIQUE constraint failed')) {
        return { success: false, error: 'A purchase invoice with this invoice number already exists for this supplier.' };
      }
      return { success: false, error: err.message };
    }
  }

  public deletePurchaseInvoice(invoiceId: number): { success: boolean; error?: string } {
    try {
      const deleteTx = this.db.transaction(() => {
        // Fetch items
        const items = this.db.prepare('SELECT batch_id, quantity, free_quantity FROM purchase_items WHERE purchase_invoice_id = ?').all(invoiceId) as { batch_id: number; quantity: number; free_quantity: number }[];

        for (const item of items) {
          const totalUnits = item.quantity + item.free_quantity;
          const batch = this.db.prepare('SELECT current_stock FROM batches WHERE id = ?').get(item.batch_id) as { current_stock: number } | undefined;
          if (batch) {
            const newStock = Math.max(0, batch.current_stock - totalUnits);
            this.db.prepare('UPDATE batches SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStock, item.batch_id);

            this.db.prepare(`
              INSERT INTO stock_movements (batch_id, movement_type, quantity_changed, balance_after, reference_type, reference_id, reason, created_at)
              VALUES (?, 'RETURN', ?, ?, 'PURCHASE_INVOICE', ?, 'Invoice Deletion Reversal', CURRENT_TIMESTAMP)
            `).run(item.batch_id, -totalUnits, newStock, invoiceId);
          }
        }

        this.db.prepare('DELETE FROM purchase_items WHERE purchase_invoice_id = ?').run(invoiceId);
        this.db.prepare('DELETE FROM purchase_invoices WHERE id = ?').run(invoiceId);
      });

      deleteTx();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}
