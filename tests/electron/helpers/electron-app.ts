import { _electron as electron, ElectronApplication, Page, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';

export interface ElectronTestContext {
  app: ElectronApplication;
  page: Page;
  userDataDir: string;
  cleanup: (preserveDir?: boolean) => Promise<void>;
}

export const EXE_PATH = process.env.TEST_EXE_PATH || path.join(__dirname, '../../../release/win-unpacked/Hospital Inventory.exe');

export async function launchElectronApp(customUserDataDir?: string): Promise<ElectronTestContext> {
  if (!fs.existsSync(EXE_PATH)) {
    throw new Error(`Target executable not found at: ${EXE_PATH}. Please run 'npm run build' first.`);
  }

  const userDataDir = customUserDataDir || fs.mkdtempSync(path.join(os.tmpdir(), 'hospital-inv-qa-'));

  const app = await electron.launch({
    executablePath: EXE_PATH,
    args: [`--user-data-dir="${userDataDir}"`],
    env: {
      ...process.env,
      NODE_ENV: 'test',
    },
  });

  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');

  const cleanup = async (preserveDir = false) => {
    try {
      await app.close();
    } catch (e) {
      // ignore if process terminated
    }
    try {
      if (!preserveDir && !customUserDataDir && fs.existsSync(userDataDir)) {
        fs.rmSync(userDataDir, { recursive: true, force: true });
      }
    } catch (e) {
      // ignore tmp lock on Windows
    }
  };

  return { app, page, userDataDir, cleanup };
}

export async function setupInitialAccounts(
  page: Page,
  masterId = 'master_admin',
  masterPass = 'MasterPass123!',
  staffId = 'staff_operator',
  staffPass = 'StaffPass123!'
) {
  const isSetupVisible = await page.isVisible('[data-testid="master-login-id"]', { timeout: 5000 }).catch(() => false);
  if (isSetupVisible) {
    await page.fill('[data-testid="master-login-id"]', masterId);
    await page.fill('[data-testid="master-password"]', masterPass);
    await page.fill('[data-testid="master-confirm-password"]', masterPass);
    await page.fill('[data-testid="staff-login-id"]', staffId);
    await page.fill('[data-testid="staff-password"]', staffPass);
    await page.fill('[data-testid="staff-confirm-password"]', staffPass);
    await page.click('[data-testid="submit-initial-setup"]');
  }

  const isLoginVisible = await page.isVisible('[data-testid="login-id-input"]', { timeout: 5000 }).catch(() => false);
  if (isLoginVisible) {
    await page.fill('[data-testid="login-id-input"]', masterId);
    await page.fill('[data-testid="login-password-input"]', masterPass);
    await page.click('[data-testid="login-submit-btn"]');
  }

  await expect(page.locator('[data-testid="nav-dashboard"]')).toBeVisible({ timeout: 10000 });
}
