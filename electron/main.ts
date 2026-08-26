import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
import { AuthManager } from './auth';
import { initializeDatabaseSchema } from './db/schema';
import { InventoryDbService, PurchaseInvoiceInput } from './db/index';
import { ReportsDbService } from './db/reports';
import { BackupEngine } from './db/backup';

// Silence Chromium GPU Shader cache disk permission logs on Windows
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

let mainWindow: BrowserWindow | null = null;
let db: Database.Database | null = null;
let authManager: AuthManager | null = null;
let dbService: InventoryDbService | null = null;
let reportsDbService: ReportsDbService | null = null;
let backupEngine: BackupEngine | null = null;
let backupTimer: NodeJS.Timeout | null = null;

function initDatabase(): boolean {
  try {
    const userDataPath = app.getPath('userData');
    const dataDir = path.join(userDataPath, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const dbPath = path.join(dataDir, 'inventory.db');
    db = new Database(dbPath);

    // Initialize full schema
    initializeDatabaseSchema(db);

    authManager = new AuthManager(db);

    // Check for development CLI reset flag (DISABLED in packaged production builds!)
    if (!app.isPackaged && (process.argv.includes('--reset-auth') || process.env.RESET_AUTH === '1')) {
      db.prepare('DELETE FROM users').run();
      console.log('[SECURITY] Development reset: Cleared users table in unpackaged dev environment.');
    }

    dbService = new InventoryDbService(db);
    reportsDbService = new ReportsDbService(db);
    backupEngine = new BackupEngine(db);

    // Startup Backup Execution
    backupEngine.createBackup('AUTOMATIC_SCHEDULED').catch((err) => console.error('Startup backup failed:', err));

    // Daily 24-hour backup timer scheduler
    backupTimer = setInterval(() => {
      if (backupEngine) {
        backupEngine.createBackup('AUTOMATIC_SCHEDULED').catch((err) => console.error('Daily backup failed:', err));
      }
    }, 24 * 60 * 60 * 1000);

    // Run startup non-silent stock integrity check
    if (dbService) {
      const unresolvedDiscrepancies = dbService.checkStockIntegrity();
      if (unresolvedDiscrepancies.length > 0) {
        console.warn(`[DATA INTEGRITY AUDIT] Found ${unresolvedDiscrepancies.length} stock balance discrepancies.`);
      }
    }

    return true;
  } catch (error) {
    console.error('Failed to initialize SQLite database:', error);
    return false;
  }
}

function registerIpcHandlers(): void {
  ipcMain.handle('system:ping', () => 'pong');
  ipcMain.handle('system:version', () => app.getVersion());

  // --- Auth IPC Handlers ---
  ipcMain.handle('auth:getStatus', () => {
    if (!authManager) return { initialized: false, authenticated: false, user: null };
    const session = authManager.getActiveSession();
    return {
      initialized: authManager.isInitialized(),
      authenticated: !!session,
      user: session,
    };
  });

  ipcMain.handle('auth:setup', (_event, payload: any) => {
    if (!authManager) return { success: false, error: 'Auth system unavailable.' };
    return authManager.setupAccounts(payload);
  });

  ipcMain.handle('auth:login', (_event, credentials: { loginId: string; password: string }) => {
    if (!authManager) return { success: false, error: 'Auth system unavailable.' };
    return authManager.login(credentials.loginId, credentials.password);
  });

  ipcMain.handle('auth:logout', () => {
    if (authManager) authManager.logout();
    return { success: true };
  });

  ipcMain.handle('auth:changePassword', (_event, params: { targetRole: 'STAFF' | 'MASTER'; currentPassword?: string; newPassword: string }) => {
    if (!authManager) return { success: false, error: 'Auth system unavailable.' };
    const session = authManager.getActiveSession();
    if (!session) return { success: false, error: 'Unauthenticated: Please log in to proceed.' };
    return authManager.changePassword(params);
  });

  // --- Supplier IPC Handlers ---
  ipcMain.handle('suppliers:getAll', (_event, includeArchived?: boolean) => {
    if (!authManager || !authManager.getActiveSession() || !dbService) return [];
    return dbService.getSuppliers(includeArchived);
  });

  ipcMain.handle('suppliers:create', (_event, data) => {
    if (!authManager || !dbService) return { success: false, error: 'DB Service unavailable' };
    const session = authManager.getActiveSession();
    if (!session) return { success: false, error: 'Unauthenticated: Please log in to proceed.' };
    return dbService.createSupplier(data, session.userId);
  });

  ipcMain.handle('suppliers:update', (_event, data) => {
    if (!authManager || !dbService) return { success: false, error: 'DB Service unavailable' };
    const session = authManager.getActiveSession();
    if (!session || session.role !== 'MASTER') {
      return { success: false, error: 'Privileged Operation Denied: Master Admin authorization required.' };
    }
    return dbService.updateSupplier(data, session.userId);
  });

  ipcMain.handle('suppliers:archive', (_event, id: number) => {
    if (!authManager || !dbService) return { success: false, error: 'DB Service unavailable' };
    const session = authManager.getActiveSession();
    if (!session || session.role !== 'MASTER') {
      return { success: false, error: 'Privileged Operation Denied: Master Admin authorization required.' };
    }
    return dbService.archiveSupplier(id, session.userId);
  });

  // --- Product IPC Handlers ---
  ipcMain.handle('products:getAll', (_event, includeArchived?: boolean) => {
    if (!authManager || !authManager.getActiveSession() || !dbService) return [];
    return dbService.getProducts(includeArchived);
  });

  ipcMain.handle('products:create', (_event, data) => {
    if (!authManager || !dbService) return { success: false, error: 'DB Service unavailable' };
    const session = authManager.getActiveSession();
    if (!session) return { success: false, error: 'Unauthenticated: Please log in to proceed.' };
    return dbService.createProduct(data, session.userId);
  });

  ipcMain.handle('products:update', (_event, data) => {
    if (!authManager || !dbService) return { success: false, error: 'DB Service unavailable' };
    const session = authManager.getActiveSession();
    if (!session || session.role !== 'MASTER') {
      return { success: false, error: 'Privileged Operation Denied: Master Admin authorization required.' };
    }
    return dbService.updateProduct(data, session.userId);
  });

  ipcMain.handle('products:archive', (_event, id: number) => {
    if (!authManager || !dbService) return { success: false, error: 'DB Service unavailable' };
    const session = authManager.getActiveSession();
    if (!session || session.role !== 'MASTER') {
      return { success: false, error: 'Privileged Operation Denied: Master Admin authorization required.' };
    }
    return dbService.archiveProduct(id, session.userId);
  });

  // --- Batch IPC Handlers ---
  ipcMain.handle('batches:getByProduct', (_event, productId: number) => {
    if (!authManager || !authManager.getActiveSession() || !dbService) return [];
    return dbService.getBatchesByProduct(productId);
  });

  ipcMain.handle('batches:getAll', () => {
    if (!authManager || !authManager.getActiveSession() || !dbService) return [];
    return dbService.getAllBatches();
  });

  // --- Purchase Invoice IPC Handlers ---
  ipcMain.handle('purchases:getAll', () => {
    if (!authManager || !authManager.getActiveSession() || !dbService) return [];
    return dbService.getInvoices();
  });

  ipcMain.handle('purchases:create', (_event, input: any) => {
    if (!authManager || !dbService) return { success: false, error: 'DB Service unavailable' };
    const session = authManager.getActiveSession();
    if (!session) return { success: false, error: 'Unauthenticated: Please log in to proceed.' };

    let approvedByUserId: number | undefined = undefined;

    if (input.master_elevation_credentials) {
      const verifyRes = authManager.verifyMasterPassword(input.master_elevation_credentials.password);
      if (!verifyRes.success || !verifyRes.masterUserId) {
        return { success: false, error: verifyRes.error || 'Master Admin authorization failed.' };
      }
      approvedByUserId = verifyRes.masterUserId;
    } else if (session.role === 'MASTER') {
      approvedByUserId = session.userId;
    }

    const sanitizedInput = { ...input };
    delete sanitizedInput.master_elevation_credentials;

    return dbService.createPurchaseInvoice(sanitizedInput, session.userId, approvedByUserId);
  });

  ipcMain.handle('purchases:delete', (_event, payload: { id: number; reason?: string } | number) => {
    if (!authManager || !dbService) return { success: false, error: 'DB Service unavailable' };
    const session = authManager.getActiveSession();
    if (!session || session.role !== 'MASTER') {
      return { success: false, error: 'Privileged Operation Denied: Master Admin authorization required.' };
    }
    const invoiceId = typeof payload === 'number' ? payload : payload.id;
    const reason = typeof payload === 'object' && payload.reason ? payload.reason : 'Cancelled by Master Admin';
    return dbService.cancelPurchaseInvoice(invoiceId, session.userId, reason);
  });

  // --- Reports IPC Handlers ---
  ipcMain.handle('reports:getGstSummary', (_event, params: { startDate: string; endDate: string }) => {
    if (!authManager || !authManager.getActiveSession() || !reportsDbService) return [];
    return reportsDbService.getGstSummary(params.startDate, params.endDate);
  });

  ipcMain.handle('reports:getExpiryReport', () => {
    if (!authManager || !authManager.getActiveSession() || !reportsDbService) return [];
    return reportsDbService.getExpiryReport();
  });

  // --- Stock Exit IPC Handlers ---
  ipcMain.handle('stock:exit', (_event, data: { product_id: number; batch_id: number; quantity: number; reason: string }) => {
    if (!authManager || !dbService) return { success: false, error: 'Database service unavailable.' };
    const session = authManager.getActiveSession();
    if (!session) {
      return { success: false, error: 'Unauthenticated: Please log in to proceed.' };
    }
    if (!data || !Number.isInteger(data.quantity) || data.quantity <= 0) {
      return { success: false, error: 'Invalid Exit Quantity: Quantity must be a positive integer.' };
    }
    return dbService.recordStockExit(data, session.userId);
  });

  ipcMain.handle('stock:getExitHistory', () => {
    if (!authManager || !authManager.getActiveSession() || !dbService) return [];
    return dbService.getStockExitHistory();
  });

  // --- Backup IPC Handlers ---
  ipcMain.handle('backup:trigger', async () => {
    if (!authManager || !backupEngine) return { success: false, error: 'Backup Engine unavailable' };
    const session = authManager.getActiveSession();
    if (!session || session.role !== 'MASTER') {
      return { success: false, error: 'Privileged Operation Denied: Master Admin authorization required.' };
    }
    return await backupEngine.createBackup('MANUAL');
  });

  ipcMain.handle('backup:getLogs', () => {
    if (!authManager || !authManager.getActiveSession() || !backupEngine) return [];
    return backupEngine.getBackupLogs();
  });

  // --- System Integrity IPC Handler ---
  ipcMain.handle('system:checkIntegrity', () => {
    if (!authManager || !authManager.getActiveSession() || !dbService) return [];
    return dbService.checkStockIntegrity();
  });
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: 'Hospital Inventory Management System',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  const distPath = path.join(__dirname, '../dist/index.html');
  const devServerUrl = process.env.VITE_DEV_SERVER_URL;

  // Window & Popup Restriction: Deny unexpected window.open
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    console.warn(`[SECURITY] Blocked window.open request to: ${url}`);
    return { action: 'deny' };
  });

  // Navigation Lock: Restrict unexpected renderer navigation in production
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const isDev = !!devServerUrl;
    if (!isDev && !url.startsWith('file://')) {
      event.preventDefault();
      console.warn(`[SECURITY] Blocked navigation attempt to: ${url}`);
    }
  });

  // DevTools Shortcut Suppression in Production
  const isDev = !!devServerUrl || !app.isPackaged;
  if (!isDev) {
    mainWindow.webContents.on('before-input-event', (event, input) => {
      const isF12 = input.key === 'F12';
      const isDevToolsShortcut = (input.control || input.meta) && input.shift && (input.key.toLowerCase() === 'i' || input.key.toLowerCase() === 'j');
      if (isF12 || isDevToolsShortcut) {
        event.preventDefault();
      }
    });
  }

  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools();
  } else if (fs.existsSync(distPath)) {
    mainWindow.loadFile(distPath);
  } else {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  const dbOk = initDatabase();
  if (!dbOk) {
    app.quit();
    return;
  }

  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', async () => {
  if (backupTimer) clearInterval(backupTimer);
  if (backupEngine) {
    try {
      await backupEngine.createBackup('ON_SHUTDOWN');
    } catch (err) {
      console.error('Shutdown backup error:', err);
    }
  }
  if (db) {
    db.close();
    db = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
