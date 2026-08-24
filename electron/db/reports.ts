import Database from 'better-sqlite3';

export interface GstClassSummary {
  gst_class: number;
  total_taxable: number;
  total_cgst: number;
  total_sgst: number;
  total_igst: number;
  total_gst: number;
  grand_total: number;
  item_count: number;
}

export interface ExpiryReportItem {
  batch_id: number;
  product_name: string;
  hsn_code: string;
  pack_size: string;
  manufacturer?: string;
  batch_number: string;
  expiry_date: string;
  days_remaining: number;
  status: 'EXPIRED' | 'EXPIRING_SOON' | 'NORMAL';
  current_stock: number;
  mrp: number;
}

export class ReportsDbService {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  public getGstSummary(startDate: string, endDate: string): GstClassSummary[] {
    const query = `
      SELECT 
        ((pi.cgst_rate_basis_points + pi.sgst_rate_basis_points + pi.igst_rate_basis_points) / 100.0) AS gst_class,
        SUM(pi.calculated_taxable_amount_paise) / 100.0 AS total_taxable,
        SUM(pi.cgst_amount_paise) / 100.0 AS total_cgst,
        SUM(pi.sgst_amount_paise) / 100.0 AS total_sgst,
        SUM(pi.igst_amount_paise) / 100.0 AS total_igst,
        SUM(pi.total_gst_amount_paise) / 100.0 AS total_gst,
        SUM(pi.net_amount_paise) / 100.0 AS grand_total,
        COUNT(pi.id) AS item_count
      FROM purchase_items pi
      JOIN purchase_invoices inv ON pi.purchase_invoice_id = inv.id
      WHERE inv.invoice_date BETWEEN ? AND ? AND inv.is_cancelled = 0
      GROUP BY gst_class
      ORDER BY gst_class ASC
    `;

    return this.db.prepare(query).all(startDate, endDate) as GstClassSummary[];
  }

  public getExpiryReport(): ExpiryReportItem[] {
    const query = `
      SELECT 
        b.id AS batch_id,
        p.name AS product_name,
        p.hsn_code,
        p.pack_size,
        p.manufacturer,
        b.batch_number,
        b.expiry_date,
        b.current_stock,
        (b.mrp_paise / 100.0) AS mrp,
        CAST(JULIANDAY(b.expiry_date) - JULIANDAY(DATE('now')) AS INTEGER) AS days_remaining
      FROM batches b
      JOIN products p ON b.product_id = p.id
      WHERE b.current_stock > 0
      ORDER BY b.expiry_date ASC
    `;

    const rows = this.db.prepare(query).all() as (ExpiryReportItem & { days_remaining: number })[];

    return rows.map((r) => {
      let status: 'EXPIRED' | 'EXPIRING_SOON' | 'NORMAL' = 'NORMAL';
      if (r.days_remaining < 0) {
        status = 'EXPIRED';
      } else if (r.days_remaining <= 30) {
        status = 'EXPIRING_SOON';
      }

      return {
        ...r,
        status,
      };
    });
  }
}
