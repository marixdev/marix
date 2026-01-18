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

// Auto-tune configuration
const TARGET_TIME_MS = 1000;      // Target ~1 second for KDF
const TARGET_TIME_MIN = 800;      // Minimum acceptable time
const TARGET_TIME_MAX = 1200;     // Maximum acceptable time
const CALIBRATION_TIMEOUT = 5000; // Max calibration time

// Password validation regex
// At least 10 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]).{10,}$/;

/**
 * Get baseline Argon2 memory cost based on system RAM
 * This is the STARTING point for auto-tuning
 * - >= 16GB RAM: Start at 512 MB
 * - >= 8GB RAM: Start at 256 MB  
 * - >= 4GB RAM: Start at 128 MB
 * - < 4GB RAM: Start at 64 MB (minimum floor)
 */
function getBaselineMemoryCost(): number {
  const totalMemoryGB = os.totalmem() / (1024 * 1024 * 1024);
  
  if (totalMemoryGB >= 16) {
    return 524288;  // 512 MB
  } else if (totalMemoryGB >= 8) {
    return 262144;  // 256 MB
  } else if (totalMemoryGB >= 4) {
    return 131072;  // 128 MB
  } else {
    return 65536;   // 64 MB minimum
  }
}

// Argon2id configuration interface
interface Argon2Options {
  memoryCost: number;
  timeCost: number;
  parallelism: number;
  hashLength: number;
}

// Cache for calibrated parameters (avoid re-calibrating every time)
let cachedOptions: Argon2Options | null = null;
let lastCalibrationTime: number = 0;
const CALIBRATION_CACHE_TTL = 3600000; // Re-calibrate after 1 hour

/**
 * Auto-tune Argon2id parameters to achieve ~1 second KDF time
 * 
 * Best practice in applied cryptography:
 * - KDF should take ~500ms-1s on user's machine at key creation time
 * - This adapts to both weak and strong machines automatically
 * - Parameters are stored with encrypted data for decryption
 * 
 * Strategy:
 * 1. Start with baseline memory based on system RAM
 * 2. Benchmark with timeCost=1, then scale up timeCost to hit target
 * 3. If still too fast, increase memory; if too slow, decrease
 */
async function calibrateArgon2Options(): Promise<Argon2Options> {
  // Return cached options if still valid
  if (cachedOptions && (Date.now() - lastCalibrationTime) < CALIBRATION_CACHE_TTL) {
    return cachedOptions;
  }

  console.log('[BackupService] Auto-tuning Argon2id parameters for ~1s KDF time...');
  
  const testPassword = 'calibration-test-password';
  const testSalt = crypto.randomBytes(SALT_LENGTH);
  const parallelism = Math.min(4, os.cpus().length);
  
  let memoryCost = getBaselineMemoryCost();
  let timeCost = 1;
  
  // Helper function to benchmark one iteration
  const benchmark = async (mem: number, time: number): Promise<number> => {
    const start = Date.now();
    await argon2id({
      password: testPassword,
      salt: testSalt,
      parallelism: parallelism,
      iterations: time,
      memorySize: mem,
      hashLength: KEY_LENGTH,
      outputType: 'binary',
    });
    return Date.now() - start;
  };

  try {
    // Phase 1: Find baseline time with timeCost=1
    let baseTime = await benchmark(memoryCost, 1);
    console.log(`[BackupService] Baseline: ${memoryCost/1024}MB, timeCost=1 → ${baseTime}ms`);

    // Phase 2: Adjust memory if baseline is way off
    // If single iteration already takes >500ms, reduce memory
    while (baseTime > TARGET_TIME_MS * 0.6 && memoryCost > 65536) {
      memoryCost = Math.floor(memoryCost / 2);
      baseTime = await benchmark(memoryCost, 1);
      console.log(`[BackupService] Reduced memory: ${memoryCost/1024}MB → ${baseTime}ms`);
    }
    
    // If single iteration is very fast (<100ms), try increasing memory first
    while (baseTime < 100 && memoryCost < 1048576) { // Max 1GB
      memoryCost = Math.min(memoryCost * 2, 1048576);
      baseTime = await benchmark(memoryCost, 1);
      console.log(`[BackupService] Increased memory: ${memoryCost/1024}MB → ${baseTime}ms`);
    }

    // Phase 3: Scale timeCost to hit target
    if (baseTime > 0) {
      // Estimate required iterations
      const estimatedIterations = Math.ceil(TARGET_TIME_MS / baseTime);
      timeCost = Math.max(1, Math.min(estimatedIterations, 20)); // Cap at 20 iterations
      
      // Verify with actual benchmark
      let actualTime = await benchmark(memoryCost, timeCost);
      console.log(`[BackupService] Estimated timeCost=${timeCost} → ${actualTime}ms`);
      
      // Fine-tune: increase/decrease timeCost if needed
      let attempts = 0;
      while (attempts < 5 && (actualTime < TARGET_TIME_MIN || actualTime > TARGET_TIME_MAX)) {
        if (actualTime < TARGET_TIME_MIN) {
          timeCost = Math.min(timeCost + 1, 20);
        } else if (actualTime > TARGET_TIME_MAX) {
          timeCost = Math.max(timeCost - 1, 1);
        }
        actualTime = await benchmark(memoryCost, timeCost);
        console.log(`[BackupService] Fine-tune timeCost=${timeCost} → ${actualTime}ms`);
        attempts++;
      }
    }

    // Ensure minimum security floor
    memoryCost = Math.max(memoryCost, 65536); // Min 64MB
    timeCost = Math.max(timeCost, 2);         // Min 2 iterations

    const finalOptions: Argon2Options = {
      memoryCost,
      timeCost,
      parallelism,
      hashLength: KEY_LENGTH,
    };

    // Cache the result
    cachedOptions = finalOptions;
    lastCalibrationTime = Date.now();

    // Final verification
    const finalTime = await benchmark(memoryCost, timeCost);
    console.log(`[BackupService] ✅ Calibrated: ${memoryCost/1024}MB, timeCost=${timeCost}, parallelism=${parallelism} → ${finalTime}ms`);

    return finalOptions;
  } catch (error) {
    console.error('[BackupService] Calibration failed, using safe defaults:', error);
    // Fallback to safe defaults if calibration fails
    return {
      memoryCost: 65536,   // 64MB
      timeCost: 4,
      parallelism: parallelism,
      hashLength: KEY_LENGTH,
    };
  }
}

/**
 * Get Argon2 options - uses cached calibrated values or calibrates
 */
const getArgon2Options = async (): Promise<Argon2Options> => {
  return calibrateArgon2Options();
};

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
  parallelism?: number; // Store parallelism for cross-machine compatibility
  timeCost?: number;    // Store iterations for cross-machine compatibility
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
  private calibrationPromise: Promise<void> | null = null;

  constructor() {
    // Store backups in user data directory
    this.backupDir = path.join(app.getPath('userData'), 'backups');
    this.ensureBackupDir();
    
    // Log system info and start calibration in background
    const memGB = (os.totalmem() / (1024 * 1024 * 1024)).toFixed(1);
    const baselineMemory = getBaselineMemoryCost();
    console.log(`[BackupService] System RAM: ${memGB}GB, Baseline memory: ${baselineMemory / 1024}MB`);
    
    // Pre-calibrate in background so first backup is fast
    this.calibrationPromise = calibrateArgon2Options().then(() => {
      console.log('[BackupService] Background calibration complete');
    }).catch(err => {
      console.error('[BackupService] Background calibration failed:', err);
    });
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
   * @param password - User password
   * @param salt - Random salt
   * @param kdfOptions - KDF options from backup file (for cross-machine compatibility)
   */
  private async deriveKey(
    password: string, 
    salt: Buffer, 
    kdfOptions?: { memoryCost?: number; parallelism?: number; timeCost?: number }
  ): Promise<Buffer> {
    // Get auto-tuned options (or use provided options for decryption)
    const defaultOptions = await getArgon2Options();
    
    // Use stored options from backup (for decryption) or auto-tuned values (for encryption)
    const memoryCost = kdfOptions?.memoryCost || defaultOptions.memoryCost;
    const parallelism = kdfOptions?.parallelism || defaultOptions.parallelism;
    const timeCost = kdfOptions?.timeCost || defaultOptions.timeCost;
    
    console.log(`[BackupService] Argon2id: memoryCost=${memoryCost/1024}MB, parallelism=${parallelism}, timeCost=${timeCost}`);
    
    const startTime = Date.now();
    const hash = await argon2id({
      password: password,
      salt: salt,
      parallelism: parallelism,
      iterations: timeCost,
      memorySize: memoryCost,
      hashLength: KEY_LENGTH,
      outputType: 'binary',
    });
    console.log(`[BackupService] Key derivation took ${Date.now() - startTime}ms`);
    
    return Buffer.from(hash);
  }

  /**
   * Encrypt data with password using Argon2id + AES-256-GCM
   */
  async encrypt(data: BackupData, password: string): Promise<EncryptedBackup> {
    const options = await getArgon2Options();
    const salt = crypto.randomBytes(SALT_LENGTH);
    const key = await this.deriveKey(password, salt, {
      memoryCost: options.memoryCost,
      parallelism: options.parallelism,
      timeCost: options.timeCost,
    });
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv) as crypto.CipherGCM;
    
    const jsonData = JSON.stringify(data);
    let encrypted = cipher.update(jsonData, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const authTag = cipher.getAuthTag();

    return {
      version: '2.2', // Version 2.2: Auto-tuned KDF params stored for cross-machine compatibility
      encrypted,
      salt: salt.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      kdf: 'argon2id',
      memoryCost: options.memoryCost,
      parallelism: options.parallelism,
      timeCost: options.timeCost,
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
      
      // IMPORTANT: For cross-machine compatibility, we MUST use stored KDF params from backup
      // If backup has stored params (v2.1+), use them exactly
      // If backup is old (v2.0), use FIXED legacy defaults (not auto-tuned values!)
      
      let kdfOptions: { memoryCost: number; parallelism: number; timeCost: number };
      
      if (encryptedBackup.memoryCost && encryptedBackup.timeCost) {
        // New backup format (v2.1+) - use stored params exactly
        kdfOptions = {
          memoryCost: encryptedBackup.memoryCost,
          parallelism: encryptedBackup.parallelism || 4,
          timeCost: encryptedBackup.timeCost,
        };
        console.log(`[BackupService] Using stored KDF params from backup v${encryptedBackup.version}`);
      } else {
        // Legacy backup (v2.0 or earlier) - use FIXED legacy defaults
        // These were the hardcoded values used before auto-tune was implemented
        // DO NOT use auto-tuned values here, as they would differ from encryption machine!
        kdfOptions = {
          memoryCost: 65536,   // 64MB - the old default
          parallelism: 4,      // the old default
          timeCost: 3,         // the old default (before we changed to 4)
        };
        console.warn(`[BackupService] Legacy backup v${encryptedBackup.version} detected - using fixed legacy KDF params`);
      }
      
      console.log(`[BackupService] Decrypting with KDF options:`, kdfOptions);
      const key = await this.deriveKey(password, salt, kdfOptions);

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
