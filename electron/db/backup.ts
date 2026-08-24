import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

export interface BackupLogRecord {
  id: number;
  file_path: string;
  file_size_bytes: number;
  backup_type: 'AUTOMATIC_SCHEDULED' | 'MANUAL' | 'ON_SHUTDOWN';
  status: 'SUCCESS' | 'FAILED';
  error_message?: string;
  created_at: string;
}

export class BackupEngine {
  private db: Database.Database;
  private backupDir: string;

  constructor(db: Database.Database) {
    this.db = db;
    const userDataPath = app.getPath('userData');
    this.backupDir = path.join(userDataPath, 'backups');
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  public async createBackup(type: 'AUTOMATIC_SCHEDULED' | 'MANUAL' | 'ON_SHUTDOWN'): Promise<{ success: boolean; path?: string; error?: string }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `inventory_backup_${timestamp}.db`;
    const targetPath = path.join(this.backupDir, fileName);

    try {
      // Use native SQLite backup API (WAL mode safe snapshot copy)
      await this.db.backup(targetPath);

      const stats = fs.statSync(targetPath);
      const fileSize = stats.size;

      // Log success
      this.db.prepare(`
        INSERT INTO backup_logs (file_path, file_size_bytes, backup_type, status, created_at)
        VALUES (?, ?, ?, 'SUCCESS', CURRENT_TIMESTAMP)
      `).run(targetPath, fileSize, type);

      this.cleanupOldBackups(30);

      return { success: true, path: targetPath };
    } catch (err: any) {
      console.error('Backup creation failed:', err);
      try {
        this.db.prepare(`
          INSERT INTO backup_logs (file_path, file_size_bytes, backup_type, status, error_message, created_at)
          VALUES (?, 0, ?, 'FAILED', ?, CURRENT_TIMESTAMP)
        `).run(targetPath, type, err.message);
      } catch (logErr) {
        // ignore log error
      }
      return { success: false, error: err.message };
    }
  }

  public getBackupLogs(): BackupLogRecord[] {
    return this.db.prepare('SELECT * FROM backup_logs ORDER BY created_at DESC LIMIT 50').all() as BackupLogRecord[];
  }

  private cleanupOldBackups(maxFiles = 30): void {
    try {
      const files = fs.readdirSync(this.backupDir)
        .filter((f) => f.startsWith('inventory_backup_') && f.endsWith('.db'))
        .map((f) => ({
          name: f,
          path: path.join(this.backupDir, f),
          ctime: fs.statSync(path.join(this.backupDir, f)).ctimeMs,
        }))
        .sort((a, b) => b.ctime - a.ctime);

      if (files.length > maxFiles) {
        const toDelete = files.slice(maxFiles);
        for (const file of toDelete) {
          fs.unlinkSync(file.path);
        }
      }
    } catch (err) {
      console.error('Error cleaning up old backups:', err);
    }
  }
}
