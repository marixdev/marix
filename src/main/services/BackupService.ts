import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { app } from 'electron';
import { argon2id } from 'hash-wasm';

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16;  // 128 bits for GCM
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

// Password validation regex
// At least 10 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]).{10,}$/;

/**
 * Get optimal Argon2 memory cost based on system RAM
 * - >= 8GB RAM: 64 MB (high security)
 * - >= 4GB RAM: 32 MB (medium security)  
 * - < 4GB RAM: 16 MB (low memory mode)
 */
function getOptimalMemoryCost(): number {
  const totalMemoryGB = os.totalmem() / (1024 * 1024 * 1024);
  
  if (totalMemoryGB >= 8) {
    return 65536;  // 64 MB - recommended for modern machines
  } else if (totalMemoryGB >= 4) {
    return 32768;  // 32 MB - balanced
  } else {
    return 16384;  // 16 MB - for low memory machines
  }
}

// Argon2id configuration (auto-adjusted based on system)
interface Argon2Options {
  memoryCost: number;
  timeCost: number;
  parallelism: number;
  hashLength: number;
}

const getArgon2Options = (): Argon2Options => ({
  memoryCost: getOptimalMemoryCost(),
  timeCost: 3,           // 3 iterations
  parallelism: Math.min(4, os.cpus().length), // Use available cores, max 4
  hashLength: KEY_LENGTH,
});

export interface SSHKeyBackup {
  id: string;
  name: string;
  type: string;
  publicKey: string;
  privateKey: string;
  fingerprint: string;
  createdAt: string;
  comment?: string;
}

export interface BackupData {
  version: string;
  timestamp: number;
  servers: any[];
  tagColors: { [key: string]: string };
  settings?: {
    currentTheme?: string;
    appTheme?: string;
  };
  cloudflareToken?: string; // Encrypted in backup
  sshKeys?: SSHKeyBackup[]; // SSH keys from keychain
  totpEntries?: any[]; // 2FA TOTP entries
  portForwards?: any[]; // Port forwarding configurations
}

export interface EncryptedBackup {
  version: string;
  encrypted: string; // Base64 encoded
  salt: string;      // Base64 encoded
  iv: string;        // Base64 encoded
  authTag: string;   // Base64 encoded
  kdf: 'argon2id';   // Key derivation function used
  memoryCost?: number; // Store memory cost used for decryption
}

export interface PasswordValidation {
  valid: boolean;
  errors: string[];
}

/**
 * Validate password strength
 * Requirements:
 * - At least 10 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character
 */
export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = [];
  
  if (password.length < 10) {
    errors.push('Password must be at least 10 characters');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least 1 lowercase letter');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least 1 uppercase letter');
  }
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least 1 number');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
    errors.push('Password must contain at least 1 special character (!@#$%^&*...)');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

export class BackupService {
  private backupDir: string;

  constructor() {
    // Store backups in user data directory
    this.backupDir = path.join(app.getPath('userData'), 'backups');
    this.ensureBackupDir();
    
    // Log system info
    const memGB = (os.totalmem() / (1024 * 1024 * 1024)).toFixed(1);
    const memoryCost = getOptimalMemoryCost();
    console.log(`[BackupService] System RAM: ${memGB}GB, Argon2 memoryCost: ${memoryCost / 1024}MB`);
  }

  private ensureBackupDir(): void {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Validate password strength (wrapper for the standalone function)
   */
  validatePassword(password: string): PasswordValidation {
    return validatePassword(password);
  }

  /**
   * Derive encryption key from password using Argon2id (hash-wasm)
   */
  private async deriveKey(password: string, salt: Buffer, memoryCost?: number): Promise<Buffer> {
    const options = getArgon2Options();
    // Use provided memoryCost (for decryption) or auto-detected value
    if (memoryCost) {
      options.memoryCost = memoryCost;
    }
    
    const hash = await argon2id({
      password: password,
      salt: salt,
      parallelism: options.parallelism,
      iterations: options.timeCost,
      memorySize: options.memoryCost,
      hashLength: options.hashLength,
      outputType: 'binary',
    });
    return Buffer.from(hash);
  }

  /**
   * Encrypt data with password using Argon2id + AES-256-GCM
   */
  async encrypt(data: BackupData, password: string): Promise<EncryptedBackup> {
    const memoryCost = getOptimalMemoryCost();
    const salt = crypto.randomBytes(SALT_LENGTH);
    const key = await this.deriveKey(password, salt, memoryCost);
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv) as crypto.CipherGCM;
    
    const jsonData = JSON.stringify(data);
    let encrypted = cipher.update(jsonData, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const authTag = cipher.getAuthTag();

    return {
      version: '2.0', // Version 2.0 uses Argon2id
      encrypted,
      salt: salt.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      kdf: 'argon2id',
      memoryCost, // Store memoryCost for cross-machine compatibility
    };
  }

  /**
   * Decrypt backup with password
   */
  async decrypt(encryptedBackup: EncryptedBackup, password: string): Promise<BackupData | null> {
    try {
      const salt = Buffer.from(encryptedBackup.salt, 'base64');
      const iv = Buffer.from(encryptedBackup.iv, 'base64');
      const authTag = Buffer.from(encryptedBackup.authTag, 'base64');
      // Use stored memoryCost from backup or auto-detect
      const memoryCost = encryptedBackup.memoryCost || getOptimalMemoryCost();
      const key = await this.deriveKey(password, salt, memoryCost);

      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv) as crypto.DecipherGCM;
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encryptedBackup.encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted) as BackupData;
    } catch (error) {
      console.error('[BackupService] Decryption failed:', error);
      return null;
    }
  }

  /**
   * Create a backup file locally
   */
  async createLocalBackup(data: BackupData, password: string, customPath?: string): Promise<{ success: boolean; path?: string; error?: string }> {
    try {
      const encryptedBackup = await this.encrypt(data, password);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `arix-backup-${timestamp}.arix`;
      const filePath = customPath || path.join(this.backupDir, filename);

      fs.writeFileSync(filePath, JSON.stringify(encryptedBackup, null, 2), 'utf8');
      
      console.log('[BackupService] Backup created:', filePath);
      return { success: true, path: filePath };
    } catch (error: any) {
      console.error('[BackupService] Backup failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Restore from a local backup file
   */
  async restoreLocalBackup(filePath: string, password: string): Promise<{ success: boolean; data?: BackupData; error?: string }> {
    try {
      if (!fs.existsSync(filePath)) {
        return { success: false, error: 'Backup file not found' };
      }

      const fileContent = fs.readFileSync(filePath, 'utf8');
      const encryptedBackup: EncryptedBackup = JSON.parse(fileContent);

      // Validate backup format
      if (!encryptedBackup.version || !encryptedBackup.encrypted || !encryptedBackup.salt) {
        return { success: false, error: 'Invalid backup file format' };
      }

      const data = await this.decrypt(encryptedBackup, password);
      
      if (!data) {
        return { success: false, error: 'Incorrect password or corrupted backup' };
      }

      console.log('[BackupService] Backup restored:', filePath);
      return { success: true, data };
    } catch (error: any) {
      console.error('[BackupService] Restore failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * List all local backups
   */
  listLocalBackups(): { name: string; path: string; size: number; created: Date }[] {
    try {
      this.ensureBackupDir();
      const files = fs.readdirSync(this.backupDir);
      
      return files
        .filter(f => f.endsWith('.arix'))
        .map(f => {
          const filePath = path.join(this.backupDir, f);
          const stats = fs.statSync(filePath);
          return {
            name: f,
            path: filePath,
            size: stats.size,
            created: stats.mtime,
          };
        })
        .sort((a, b) => b.created.getTime() - a.created.getTime()); // Newest first
    } catch (error) {
      console.error('[BackupService] List backups failed:', error);
      return [];
    }
  }

  /**
   * Delete a local backup
   */
  deleteLocalBackup(filePath: string): boolean {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('[BackupService] Backup deleted:', filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[BackupService] Delete backup failed:', error);
      return false;
    }
  }

  /**
   * Get default backup directory
   */
  getBackupDir(): string {
    return this.backupDir;
  }

  /**
   * Create encrypted backup content for GitHub repo upload
   */
  async createBackupContent(
    password: string,
    servers: any[],
    tagColors: { [key: string]: string },
    cloudflareToken?: string,
    sshKeys?: SSHKeyBackup[],
    totpEntries?: any[],
    portForwards?: any[]
  ): Promise<{ success: boolean; content?: string; error?: string }> {
    try {
      const backupData: BackupData = {
        version: '2.1.0',
        timestamp: Date.now(),
        servers,
        tagColors,
        cloudflareToken,
        sshKeys,
        totpEntries,
        portForwards,
      };

      const encryptedContent = await this.encrypt(backupData, password);
      return { success: true, content: JSON.stringify(encryptedContent) };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Restore backup from encrypted content
   */
  async restoreBackupContent(
    content: string,
    password: string
  ): Promise<{ success: boolean; data?: BackupData; error?: string }> {
    try {
      const encryptedBackup: EncryptedBackup = JSON.parse(content);
      const backupData = await this.decrypt(encryptedBackup, password);
      
      if (!backupData) {
        return { success: false, error: 'Invalid password or corrupted backup' };
      }
      
      return { success: true, data: backupData };
    } catch (error: any) {
      return { success: false, error: 'Invalid backup data or wrong password' };
    }
  }

  /**
   * Create backup and upload to GitHub Gist (legacy - keeping for compatibility)
   */
  async createGithubBackup(
    githubToken: string,
    gistId: string | null,
    password: string,
    servers: any[],
    tagColors: { [key: string]: string },
    cloudflareToken?: string
  ): Promise<{ success: boolean; gistId?: string; error?: string }> {
    try {
      // First create encrypted backup data
      const backupData: BackupData = {
        version: '1.0.0',
        timestamp: Date.now(),
        servers,
        tagColors,
        cloudflareToken,
      };

      const encryptedContent = await this.encrypt(backupData, password);
      const base64Content = JSON.stringify(encryptedContent);

      const gistData = {
        description: 'Arix SSH Client Backup (Encrypted)',
        public: false,
        files: {
          'arix-backup.enc': {
            content: base64Content
          },
          'metadata.json': {
            content: JSON.stringify({
              version: '1.0.0',
              timestamp: Date.now(),
              serverCount: servers.length,
              encrypted: true
            }, null, 2)
          }
        }
      };

      const https = require('https');
      
      return new Promise((resolve) => {
        const options: any = {
          hostname: 'api.github.com',
          path: gistId ? `/gists/${gistId}` : '/gists',
          method: gistId ? 'PATCH' : 'POST',
          headers: {
            'Authorization': `Bearer ${githubToken}`,
            'User-Agent': 'Arix-SSH-Client',
            'Accept': 'application/vnd.github+json',
            'Content-Type': 'application/json',
            'X-GitHub-Api-Version': '2022-11-28'
          }
        };

        const req = https.request(options, (res: any) => {
          let data = '';
          res.on('data', (chunk: string) => data += chunk);
          res.on('end', () => {
            try {
              const response = JSON.parse(data);
              if (res.statusCode === 200 || res.statusCode === 201) {
                console.log('[BackupService] GitHub Gist backup created:', response.id);
                resolve({ success: true, gistId: response.id });
              } else {
                resolve({ success: false, error: response.message || 'GitHub API error' });
              }
            } catch (e) {
              resolve({ success: false, error: 'Failed to parse response' });
            }
          });
        });

        req.on('error', (e: any) => {
          resolve({ success: false, error: e.message });
        });

        req.write(JSON.stringify(gistData));
        req.end();
      });
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Restore backup from GitHub Gist
   */
  async restoreGithubBackup(
    githubToken: string,
    gistId: string,
    password: string
  ): Promise<{ success: boolean; data?: BackupData; error?: string }> {
    try {
      const https = require('https');
      
      return new Promise((resolve) => {
        const options: any = {
          hostname: 'api.github.com',
          path: `/gists/${gistId}`,
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${githubToken}`,
            'User-Agent': 'Arix-SSH-Client',
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28'
          }
        };

        const req = https.request(options, (res: any) => {
          let data = '';
          res.on('data', (chunk: string) => data += chunk);
          res.on('end', async () => {
            try {
              const response = JSON.parse(data);
              if (res.statusCode !== 200) {
                resolve({ success: false, error: response.message || 'GitHub API error' });
                return;
              }

              const encryptedFile = response.files?.['arix-backup.enc'];
              if (!encryptedFile) {
                resolve({ success: false, error: 'No backup file found in Gist' });
                return;
              }

              const encryptedContent = encryptedFile.content;
              
              try {
                const encryptedBackup: EncryptedBackup = JSON.parse(encryptedContent);
                const backupData = await this.decrypt(encryptedBackup, password);
                if (!backupData) {
                  resolve({ success: false, error: 'Invalid password or corrupted backup' });
                  return;
                }
                console.log('[BackupService] GitHub Gist backup restored');
                resolve({ success: true, data: backupData });
              } catch (decryptError: any) {
                resolve({ success: false, error: 'Invalid password or corrupted backup' });
              }
            } catch (e) {
              resolve({ success: false, error: 'Failed to parse response' });
            }
          });
        });

        req.on('error', (e: any) => {
          resolve({ success: false, error: e.message });
        });

        req.end();
      });
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
