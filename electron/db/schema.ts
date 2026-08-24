import Database from 'better-sqlite3';

export function initializeDatabaseSchema(db: Database.Database): void {
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;

    -- 1. Users Table (Enforces Exactly One STAFF and One MASTER Account)
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      login_id TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      role TEXT NOT NULL UNIQUE CHECK(role IN ('STAFF', 'MASTER')),
      display_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 2. Audit Logs Table (Security & Data Audit Ledger)
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
    );

    -- 3. Buyer / Hospital Profile
    CREATE TABLE IF NOT EXISTS buyer_profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      hospital_name TEXT NOT NULL,
      address TEXT NOT NULL,
      state_name TEXT NOT NULL DEFAULT 'BIHAR',
      state_code TEXT NOT NULL DEFAULT '10',
      phone TEXT,
      email TEXT,
      gstin TEXT,
      pan_no TEXT,
      drug_license_no TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Insert default buyer profile if not exists
    INSERT OR IGNORE INTO buyer_profile (id, hospital_name, address, state_name, state_code, phone, drug_license_no)
    VALUES (1, 'CRITICARE HOSPITAL', 'CHAKIYA, EAST CHAMPARAN', 'BIHAR', '10', '7535057777', 'REG NO-42501');

    -- 4. Supplier Directory
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      gstin TEXT,
      pan_no TEXT,
      drug_license_no TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      state_name TEXT DEFAULT 'BIHAR',
      state_code TEXT DEFAULT '10',
      is_archived INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 5. Master Product Catalog
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      hsn_code TEXT NOT NULL,
      pack_size TEXT NOT NULL,
      manufacturer TEXT,
      min_stock_alert INTEGER,
      is_archived INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 6. Batches Catalog
    CREATE TABLE IF NOT EXISTS batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      batch_number TEXT NOT NULL,
      mfg_date TEXT,
      expiry_date TEXT NOT NULL,
      mrp_paise INTEGER NOT NULL,
      purchase_rate_paise INTEGER NOT NULL,
      discount_rate_basis_points INTEGER NOT NULL DEFAULT 0,
      cgst_rate_basis_points INTEGER NOT NULL DEFAULT 0,
      sgst_rate_basis_points INTEGER NOT NULL DEFAULT 0,
      igst_rate_basis_points INTEGER NOT NULL DEFAULT 0,
      current_stock INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
      UNIQUE(product_id, batch_number)
    );

    -- 7. Purchase Invoices Header (Captures Supplier Printed Totals + System Calculated Totals)
    CREATE TABLE IF NOT EXISTS purchase_invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER NOT NULL,
      created_by_user_id INTEGER,
      approved_by_user_id INTEGER,
      document_type TEXT NOT NULL DEFAULT 'TAX_INVOICE' CHECK(document_type IN ('TAX_INVOICE', 'CHALLAN')),
      invoice_number TEXT NOT NULL,
      invoice_date TEXT NOT NULL,
      order_no TEXT,
      order_date TEXT,
      lr_no TEXT,
      lr_date TEXT,
      cases_count INTEGER DEFAULT 0,
      total_items INTEGER NOT NULL DEFAULT 0,
      total_quantity INTEGER NOT NULL DEFAULT 0,
      supplier_taxable_total_paise INTEGER NOT NULL DEFAULT 0,
      supplier_scheme_total_paise INTEGER NOT NULL DEFAULT 0,
      supplier_discount_total_paise INTEGER NOT NULL DEFAULT 0,
      supplier_cgst_total_paise INTEGER NOT NULL DEFAULT 0,
      supplier_sgst_total_paise INTEGER NOT NULL DEFAULT 0,
      supplier_igst_total_paise INTEGER NOT NULL DEFAULT 0,
      supplier_total_gst_paise INTEGER NOT NULL DEFAULT 0,
      supplier_other_charges_paise INTEGER NOT NULL DEFAULT 0,
      supplier_round_off_paise INTEGER NOT NULL DEFAULT 0,
      supplier_grand_total_paise INTEGER NOT NULL DEFAULT 0,
      calculated_taxable_total_paise INTEGER NOT NULL DEFAULT 0,
      calculated_gst_total_paise INTEGER NOT NULL DEFAULT 0,
      calculated_grand_total_paise INTEGER NOT NULL DEFAULT 0,
      has_arithmetic_override INTEGER NOT NULL DEFAULT 0,
      approved_at DATETIME,
      remarks TEXT,
      is_cancelled INTEGER NOT NULL DEFAULT 0,
      cancelled_by_user_id INTEGER,
      cancelled_at DATETIME,
      cancellation_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
      FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
      FOREIGN KEY (approved_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
      FOREIGN KEY (cancelled_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
      UNIQUE(supplier_id, invoice_number)
    );

    -- 8. Purchase Line Items (Preserves Historical Supplier Printed Values)
    CREATE TABLE IF NOT EXISTS purchase_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_invoice_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      batch_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      free_quantity INTEGER NOT NULL DEFAULT 0,
      purchase_rate_paise INTEGER NOT NULL,
      discount_rate_basis_points INTEGER NOT NULL DEFAULT 0,
      discount_amount_paise INTEGER NOT NULL DEFAULT 0,
      cgst_rate_basis_points INTEGER NOT NULL DEFAULT 0,
      cgst_amount_paise INTEGER NOT NULL DEFAULT 0,
      sgst_rate_basis_points INTEGER NOT NULL DEFAULT 0,
      sgst_amount_paise INTEGER NOT NULL DEFAULT 0,
      igst_rate_basis_points INTEGER NOT NULL DEFAULT 0,
      igst_amount_paise INTEGER NOT NULL DEFAULT 0,
      supplier_net_rate_paise INTEGER NOT NULL DEFAULT 0,
      calculated_net_rate_paise INTEGER NOT NULL DEFAULT 0,
      supplier_line_amount_paise INTEGER NOT NULL DEFAULT 0,
      calculated_taxable_amount_paise INTEGER NOT NULL DEFAULT 0,
      is_arithmetic_override INTEGER NOT NULL DEFAULT 0,
      total_gst_amount_paise INTEGER NOT NULL DEFAULT 0,
      net_amount_paise INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (purchase_invoice_id) REFERENCES purchase_invoices(id) ON DELETE RESTRICT,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
      FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE RESTRICT
    );

    -- 9. Stock Movements Audit Ledger
    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id INTEGER NOT NULL,
      created_by_user_id INTEGER,
      movement_type TEXT NOT NULL CHECK(movement_type IN ('PURCHASE', 'EXIT', 'RETURN', 'DAMAGE', 'ADJUSTMENT')),
      quantity_changed INTEGER NOT NULL,
      balance_after INTEGER NOT NULL,
      reference_type TEXT NOT NULL CHECK(reference_type IN ('PURCHASE_INVOICE', 'MANUAL_ADJUSTMENT', 'STOCK_EXIT', 'DAMAGE_REPORT', 'RETURN_NOTE')),
      reference_id INTEGER,
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE RESTRICT,
      FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT
    );

    -- 10. Discrepancy Log Table
    CREATE TABLE IF NOT EXISTS discrepancy_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id INTEGER NOT NULL,
      cached_stock INTEGER NOT NULL,
      audited_stock INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'UNRESOLVED' CHECK(status IN ('UNRESOLVED', 'RESOLVED')),
      resolved_at DATETIME,
      resolution_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE RESTRICT
    );

    -- 11. Backup Audit Log Table
    CREATE TABLE IF NOT EXISTS backup_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_path TEXT NOT NULL,
      file_size_bytes INTEGER NOT NULL,
      backup_type TEXT NOT NULL CHECK(backup_type IN ('AUTOMATIC_SCHEDULED', 'MANUAL', 'ON_SHUTDOWN')),
      status TEXT NOT NULL CHECK(status IN ('SUCCESS', 'FAILED')),
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Performance Indexes
    CREATE INDEX IF NOT EXISTS idx_users_login ON users(login_id);
    CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
    CREATE INDEX IF NOT EXISTS idx_batches_product ON batches(product_id);
    CREATE INDEX IF NOT EXISTS idx_movements_batch ON stock_movements(batch_id);
    CREATE INDEX IF NOT EXISTS idx_movements_type ON stock_movements(movement_type);
  `);

  // --- AUTOMATIC SCHEMA MIGRATION FOR PRE-EXISTING TABLES ---
  try {
    // 1. Suppliers Table Migration
    const supplierColumns = db.prepare("PRAGMA table_info(suppliers)").all() as { name: string }[];
    const supCols = supplierColumns.map((c) => c.name);

    if (!supCols.includes('pan_no')) db.exec("ALTER TABLE suppliers ADD COLUMN pan_no TEXT;");
    if (!supCols.includes('drug_license_no')) db.exec("ALTER TABLE suppliers ADD COLUMN drug_license_no TEXT;");
    if (!supCols.includes('email')) db.exec("ALTER TABLE suppliers ADD COLUMN email TEXT;");
    if (!supCols.includes('state_name')) db.exec("ALTER TABLE suppliers ADD COLUMN state_name TEXT DEFAULT 'BIHAR';");
    if (!supCols.includes('state_code')) db.exec("ALTER TABLE suppliers ADD COLUMN state_code TEXT DEFAULT '10';");

    // 2. Purchase Invoices Table Migration
    const invColumns = db.prepare("PRAGMA table_info(purchase_invoices)").all() as { name: string }[];
    const invCols = invColumns.map((c) => c.name);

    if (!invCols.includes('created_by_user_id')) db.exec("ALTER TABLE purchase_invoices ADD COLUMN created_by_user_id INTEGER;");
    if (!invCols.includes('approved_by_user_id')) db.exec("ALTER TABLE purchase_invoices ADD COLUMN approved_by_user_id INTEGER;");
    if (!invCols.includes('supplier_taxable_total_paise')) db.exec("ALTER TABLE purchase_invoices ADD COLUMN supplier_taxable_total_paise INTEGER DEFAULT 0;");
    if (!invCols.includes('supplier_scheme_total_paise')) db.exec("ALTER TABLE purchase_invoices ADD COLUMN supplier_scheme_total_paise INTEGER DEFAULT 0;");
    if (!invCols.includes('supplier_discount_total_paise')) db.exec("ALTER TABLE purchase_invoices ADD COLUMN supplier_discount_total_paise INTEGER DEFAULT 0;");
    if (!invCols.includes('supplier_cgst_total_paise')) db.exec("ALTER TABLE purchase_invoices ADD COLUMN supplier_cgst_total_paise INTEGER DEFAULT 0;");
    if (!invCols.includes('supplier_sgst_total_paise')) db.exec("ALTER TABLE purchase_invoices ADD COLUMN supplier_sgst_total_paise INTEGER DEFAULT 0;");
    if (!invCols.includes('supplier_igst_total_paise')) db.exec("ALTER TABLE purchase_invoices ADD COLUMN supplier_igst_total_paise INTEGER DEFAULT 0;");
    if (!invCols.includes('supplier_total_gst_paise')) db.exec("ALTER TABLE purchase_invoices ADD COLUMN supplier_total_gst_paise INTEGER DEFAULT 0;");
    if (!invCols.includes('supplier_other_charges_paise')) db.exec("ALTER TABLE purchase_invoices ADD COLUMN supplier_other_charges_paise INTEGER DEFAULT 0;");
    if (!invCols.includes('supplier_round_off_paise')) db.exec("ALTER TABLE purchase_invoices ADD COLUMN supplier_round_off_paise INTEGER DEFAULT 0;");
    if (!invCols.includes('supplier_grand_total_paise')) db.exec("ALTER TABLE purchase_invoices ADD COLUMN supplier_grand_total_paise INTEGER DEFAULT 0;");
    if (!invCols.includes('calculated_taxable_total_paise')) db.exec("ALTER TABLE purchase_invoices ADD COLUMN calculated_taxable_total_paise INTEGER DEFAULT 0;");
    if (!invCols.includes('calculated_gst_total_paise')) db.exec("ALTER TABLE purchase_invoices ADD COLUMN calculated_gst_total_paise INTEGER DEFAULT 0;");
    if (!invCols.includes('calculated_grand_total_paise')) db.exec("ALTER TABLE purchase_invoices ADD COLUMN calculated_grand_total_paise INTEGER DEFAULT 0;");
    if (!invCols.includes('approved_at')) db.exec("ALTER TABLE purchase_invoices ADD COLUMN approved_at DATETIME;");
    if (!invCols.includes('is_cancelled')) db.exec("ALTER TABLE purchase_invoices ADD COLUMN is_cancelled INTEGER DEFAULT 0;");
    if (!invCols.includes('cancelled_by_user_id')) db.exec("ALTER TABLE purchase_invoices ADD COLUMN cancelled_by_user_id INTEGER;");
    if (!invCols.includes('cancelled_at')) db.exec("ALTER TABLE purchase_invoices ADD COLUMN cancelled_at DATETIME;");
    if (!invCols.includes('cancellation_reason')) db.exec("ALTER TABLE purchase_invoices ADD COLUMN cancellation_reason TEXT;");

    // 3. Purchase Items Table Migration
    const pitColumns = db.prepare("PRAGMA table_info(purchase_items)").all() as { name: string }[];
    const pitCols = pitColumns.map((c) => c.name);

    if (!pitCols.includes('supplier_net_rate_paise')) db.exec("ALTER TABLE purchase_items ADD COLUMN supplier_net_rate_paise INTEGER DEFAULT 0;");
    if (!pitCols.includes('calculated_net_rate_paise')) db.exec("ALTER TABLE purchase_items ADD COLUMN calculated_net_rate_paise INTEGER DEFAULT 0;");
    if (!pitCols.includes('supplier_line_amount_paise')) db.exec("ALTER TABLE purchase_items ADD COLUMN supplier_line_amount_paise INTEGER DEFAULT 0;");

    // 4. Stock Movements Table Migration
    const smColumns = db.prepare("PRAGMA table_info(stock_movements)").all() as { name: string }[];
    const smCols = smColumns.map((c) => c.name);

    if (!smCols.includes('created_by_user_id')) db.exec("ALTER TABLE stock_movements ADD COLUMN created_by_user_id INTEGER;");
  } catch (err) {
    console.error('[SCHEMA MIGRATION] Error migrating columns:', err);
  }
}
