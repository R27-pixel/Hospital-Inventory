import Database from 'better-sqlite3';
import crypto from 'crypto';

export interface ActiveUserSession {
  userId: number;
  loginId: string;
  role: 'STAFF' | 'MASTER';
  displayName: string;
}

export interface UserRecord {
  id: number;
  login_id: string;
  password_hash: string;
  salt: string;
  role: 'STAFF' | 'MASTER';
  display_name: string;
  created_at: string;
  updated_at: string;
}

export class AuthManager {
  private db: Database.Database;
  private activeSession: ActiveUserSession | null = null;
  private failedLoginAttempts: Map<string, { attempts: number; lockUntil: number }> = new Map();

  constructor(db: Database.Database) {
    this.db = db;
  }

  private hashPassword(password: string, salt: string): string {
    return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  }

  public getActiveSession(): ActiveUserSession | null {
    return this.activeSession;
  }

  public isInitialized(): boolean {
    const countRow = this.db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number };
    return countRow.cnt >= 2;
  }

  public setupAccounts(payload: {
    master: { login_id: string; password: string; display_name?: string };
    staff: { login_id: string; password: string; display_name?: string };
  }): { success: boolean; error?: string } {
    const existingCount = this.db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number };
    if (existingCount.cnt > 0) {
      return { success: false, error: 'Initial account setup has already been completed.' };
    }

    if (!payload.master || !payload.staff) {
      return { success: false, error: 'Both Master Admin and Staff account credentials must be provided.' };
    }

    if (!payload.master.password || payload.master.password.length < 8 || !payload.staff.password || payload.staff.password.length < 8) {
      return { success: false, error: 'Passwords must be at least 8 characters long.' };
    }

    try {
      const masterSalt = crypto.randomBytes(16).toString('hex');
      const masterHash = this.hashPassword(payload.master.password, masterSalt);

      const staffSalt = crypto.randomBytes(16).toString('hex');
      const staffHash = this.hashPassword(payload.staff.password, staffSalt);

      const setupTx = this.db.transaction(() => {
        const countRow = this.db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number };
        if (countRow.cnt > 0) {
          throw new Error('Initial account setup has already been completed.');
        }

        this.db.prepare(`
          INSERT INTO users (login_id, password_hash, salt, role, display_name)
          VALUES (?, ?, ?, 'MASTER', ?)
        `).run(payload.master.login_id.trim(), masterHash, masterSalt, payload.master.display_name?.trim() || 'Master Admin');

        this.db.prepare(`
          INSERT INTO users (login_id, password_hash, salt, role, display_name)
          VALUES (?, ?, ?, 'STAFF', ?)
        `).run(payload.staff.login_id.trim(), staffHash, staffSalt, payload.staff.display_name?.trim() || 'Staff Operator');
      });

      setupTx();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to setup accounts.' };
    }
  }

  public login(login_id: string, password: string): { success: boolean; error?: string; user?: ActiveUserSession } {
    if (!this.isInitialized()) {
      return { success: false, error: 'Application accounts are not initialized yet.' };
    }
    if (!login_id || !password) {
      return { success: false, error: 'Login ID and Password are required.' };
    }

    const key = login_id.trim().toLowerCase();
    const record = this.failedLoginAttempts.get(key);

    if (record && record.lockUntil > Date.now()) {
      const remainingMins = Math.ceil((record.lockUntil - Date.now()) / 60000);
      return {
        success: false,
        error: `Too many failed login attempts. Account temporarily locked for ${remainingMins} minute(s).`
      };
    }

    const user = this.db.prepare('SELECT * FROM users WHERE login_id = ?').get(login_id.trim()) as UserRecord | undefined;
    if (!user) {
      this.recordFailedAttempt(key);
      return { success: false, error: 'Invalid Login ID or Password.' };
    }

    const computedHash = this.hashPassword(password, user.salt);
    const hashBufferA = Buffer.from(computedHash, 'hex');
    const hashBufferB = Buffer.from(user.password_hash, 'hex');

    if (hashBufferA.length === hashBufferB.length && crypto.timingSafeEqual(hashBufferA, hashBufferB)) {
      // Clear lockout counter on successful authentication
      this.failedLoginAttempts.delete(key);
      this.activeSession = {
        userId: user.id,
        loginId: user.login_id,
        role: user.role,
        displayName: user.display_name || user.login_id,
      };
      return { success: true, user: this.activeSession };
    } else {
      this.recordFailedAttempt(key);
      return { success: false, error: 'Invalid Login ID or Password.' };
    }
  }

  private recordFailedAttempt(key: string): void {
    const current = this.failedLoginAttempts.get(key) || { attempts: 0, lockUntil: 0 };
    const newAttempts = current.attempts + 1;
    let lockUntil = 0;
    if (newAttempts >= 5) {
      lockUntil = Date.now() + 5 * 60 * 1000; // 5 minutes lockout
    }
    this.failedLoginAttempts.set(key, { attempts: newAttempts, lockUntil });
  }

  public verifyMasterPassword(password: string): { success: boolean; masterUserId?: number; error?: string } {
    const masterUser = this.db.prepare("SELECT * FROM users WHERE role = 'MASTER'").get() as UserRecord | undefined;
    if (!masterUser) {
      return { success: false, error: 'Master Admin account is not configured.' };
    }

    const computedHash = this.hashPassword(password, masterUser.salt);
    const hashBufferA = Buffer.from(computedHash, 'hex');
    const hashBufferB = Buffer.from(masterUser.password_hash, 'hex');

    if (hashBufferA.length === hashBufferB.length && crypto.timingSafeEqual(hashBufferA, hashBufferB)) {
      return { success: true, masterUserId: masterUser.id };
    } else {
      return { success: false, error: 'Invalid Master Admin Password.' };
    }
  }

  public logout(): { success: boolean } {
    this.activeSession = null;
    return { success: true };
  }

  public changePassword(params: {
    targetRole: 'STAFF' | 'MASTER';
    currentPassword?: string;
    newPassword: string;
  }): { success: boolean; error?: string } {
    if (!this.activeSession) {
      return { success: false, error: 'Unauthenticated.' };
    }

    if (!params.newPassword || params.newPassword.trim().length < 8) {
      return { success: false, error: 'New password must be at least 8 characters long.' };
    }

    if (params.targetRole === 'MASTER' && this.activeSession.role !== 'MASTER') {
      return { success: false, error: 'Privileged Operation Denied: Only Master Admin can change Master password.' };
    }

    // Verify current password when changing own password
    const isChangingOwnPassword = (this.activeSession.role === params.targetRole);
    if (isChangingOwnPassword) {
      if (!params.currentPassword) {
        return { success: false, error: 'Current password is required to change password.' };
      }
      const currentUser = this.db.prepare('SELECT * FROM users WHERE id = ?').get(this.activeSession.userId) as UserRecord | undefined;
      if (!currentUser) {
        return { success: false, error: 'Active user record not found.' };
      }
      const computedHash = this.hashPassword(params.currentPassword, currentUser.salt);
      const hashBufferA = Buffer.from(computedHash, 'hex');
      const hashBufferB = Buffer.from(currentUser.password_hash, 'hex');
      if (hashBufferA.length !== hashBufferB.length || !crypto.timingSafeEqual(hashBufferA, hashBufferB)) {
        return { success: false, error: 'Incorrect current password.' };
      }
    }

    const newSalt = crypto.randomBytes(16).toString('hex');
    const newHash = this.hashPassword(params.newPassword, newSalt);

    try {
      this.db.prepare(`
        UPDATE users
        SET password_hash = ?, salt = ?, updated_at = CURRENT_TIMESTAMP
        WHERE role = ?
      `).run(newHash, newSalt, params.targetRole);

      this.db.prepare(`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
        VALUES (?, 'PASSWORD_CHANGE', 'USER', ?, ?)
      `).run(
        this.activeSession.userId,
        this.activeSession.userId,
        `Password changed for role ${params.targetRole}`
      );

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to change password.' };
    }
  }
}
