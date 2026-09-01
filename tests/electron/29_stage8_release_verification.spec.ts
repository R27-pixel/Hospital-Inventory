import { test, expect } from '@playwright/test';
import { _electron as electron } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { setupInitialAccounts } from './helpers/electron-app';

test.describe('29. Stage 8 — Full Installed Release Verification & Clean Uninstall', () => {
  const installedExePath = 'C:\\TestInstall\\HospitalInventory\\Hospital Inventory.exe';
  const uninstallerPath = 'C:\\TestInstall\\HospitalInventory\\Uninstall Hospital Inventory.exe';
  const cleanUserDataDir = path.join(os.tmpdir(), `hospital-inv-clean-release-${Date.now()}`);

  test('29.1 Application Version, Clean Setup, Database Creation & Backup Snapshot Verification', async () => {
    test.skip(!fs.existsSync(installedExePath), `Installer not found at ${installedExePath} — run the NSIS installer first`);

    // 1. Launch Installed Application with Clean User Data Directory
    const app = await electron.launch({
      executablePath: installedExePath,
      args: [`--user-data-dir="${cleanUserDataDir}"`],
      env: { ...process.env, NODE_ENV: 'production' },
    });

    const page = await app.firstWindow();
    await page.waitForLoadState('domcontentloaded');

    // 2. Verify Application Version (Step 7)
    const version = await page.evaluate(async () => {
      const api = (window as any).electronAPI;
      return await api.system.getAppVersion();
    });
    expect(version).toBe('1.0.0');

    // 3. Verify Initial Setup on Clean User Data Directory (Step 8)
    await setupInitialAccounts(page);
    const authStatus = await page.evaluate(async () => {
      const api = (window as any).electronAPI;
      return await api.auth.getStatus();
    });
    expect(authStatus.initialized).toBe(true);
    expect(authStatus.authenticated).toBe(true);

    // 4. Verify Database Creation on Disk (Step 9)
    const dbPath = path.join(cleanUserDataDir, 'data', 'inventory.db');
    expect(fs.existsSync(dbPath)).toBe(true);
    const dbStats = fs.statSync(dbPath);
    expect(dbStats.size).toBeGreaterThan(0);

    // 5. Verify Backup Snapshot Creation on Disk (Step 10)
    const backupRes = await page.evaluate(async () => {
      const api = (window as any).electronAPI;
      return await api.backup.trigger();
    });
    expect(backupRes.success).toBe(true);
    expect(fs.existsSync(backupRes.path)).toBe(true);
    const backupStats = fs.statSync(backupRes.path);
    expect(backupStats.size).toBeGreaterThan(0);

    await app.close();

    // Cleanup temp test userData
    try {
      if (fs.existsSync(cleanUserDataDir)) {
        fs.rmSync(cleanUserDataDir, { recursive: true, force: true });
      }
    } catch (e) {
      // ignore tmp file lock
    }
  });

  test('29.2 Clean Silent Uninstallation Verification', async () => {
    test.skip(!fs.existsSync(uninstallerPath), `Uninstaller not found at ${uninstallerPath} — run 29.1 first`);

    // 6. Run Uninstaller quietly (Step 11)
    execSync(`"${uninstallerPath}" /S`, { timeout: 30000 });

    // Wait for uninstaller process to complete file deletion
    let exeExists = true;
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 500));
      if (!fs.existsSync(installedExePath)) {
        exeExists = false;
        break;
      }
    }

    expect(exeExists).toBe(false);
  });
});
