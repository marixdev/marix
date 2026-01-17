import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { spawn } from 'child_process';

export interface SSHKeyPair {
  id: string;
  name: string;
  type: 'rsa' | 'ed25519' | 'ecdsa';
  bits?: number;
  publicKey: string;
  privateKey: string;
  fingerprint: string;
  createdAt: string;
  comment?: string;
}

export interface SSHKeyInfo {
  id: string;
  name: string;
  type: string;
  fingerprint: string;
  publicKey: string;
  createdAt: string;
  comment?: string;
}

export class SSHKeyService {
  private keysDir: string;
  private keysMetaFile: string;
  private keysMeta: Map<string, SSHKeyInfo> = new Map();

  constructor() {
    // Store in app data directory
    const appDataDir = path.join(os.homedir(), '.marix');
    this.keysDir = path.join(appDataDir, 'ssh_keys');
    this.keysMetaFile = path.join(appDataDir, 'ssh_keys_meta.json');
    
    if (!fs.existsSync(this.keysDir)) {
      fs.mkdirSync(this.keysDir, { recursive: true, mode: 0o700 });
    }
    
    this.loadKeysMeta();
  }

  private loadKeysMeta(): void {
    try {
      if (fs.existsSync(this.keysMetaFile)) {
        const data = JSON.parse(fs.readFileSync(this.keysMetaFile, 'utf-8'));
        this.keysMeta = new Map(Object.entries(data));
      }
    } catch (err) {
      console.error('[SSHKeyService] Failed to load keys meta:', err);
      this.keysMeta = new Map();
    }
  }

  private saveKeysMeta(): void {
    try {
      const data = Object.fromEntries(this.keysMeta);
      fs.writeFileSync(this.keysMetaFile, JSON.stringify(data, null, 2));
    } catch (err) {
      console.error('[SSHKeyService] Failed to save keys meta:', err);
    }
  }

  /**
   * Generate a new SSH key pair
   */
  async generateKey(
    name: string,
    type: 'rsa' | 'ed25519' | 'ecdsa' = 'ed25519',
    bits: number = 4096,
    passphrase?: string,
    comment?: string
  ): Promise<SSHKeyPair> {
    const id = crypto.randomUUID();
    const keyPath = path.join(this.keysDir, id);
    
    return new Promise((resolve, reject) => {
      const args: string[] = [
        '-t', type,
        '-f', keyPath,
        '-N', passphrase || '',
        '-C', comment || `marix-${name}-${Date.now()}`
      ];

      if (type === 'rsa') {
        args.push('-b', bits.toString());
      } else if (type === 'ecdsa') {
        args.push('-b', '521'); // ECDSA uses 521 bits for strongest security
      }

      console.log('[SSHKeyService] Generating key:', type, name);
      
      const keygen = spawn('ssh-keygen', args);
      
      let stderr = '';
      keygen.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      keygen.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`ssh-keygen failed: ${stderr}`));
          return;
        }

        try {
          const privateKey = fs.readFileSync(keyPath, 'utf-8');
          const publicKey = fs.readFileSync(keyPath + '.pub', 'utf-8');
          
          // Get fingerprint
          this.getKeyFingerprint(keyPath + '.pub').then((fingerprint) => {
            const keyPair: SSHKeyPair = {
              id,
              name,
              type,
              bits: type === 'rsa' ? bits : undefined,
              publicKey,
              privateKey,
              fingerprint,
              createdAt: new Date().toISOString(),
              comment
            };

            // Save meta info
            this.keysMeta.set(id, {
              id,
              name,
              type,
              fingerprint,
              publicKey,
              createdAt: keyPair.createdAt,
              comment
            });
            this.saveKeysMeta();

            console.log('[SSHKeyService] Key generated:', id);
            resolve(keyPair);
          }).catch(reject);
        } catch (err) {
          reject(err);
        }
      });

      keygen.on('error', (err) => {
        reject(new Error(`ssh-keygen error: ${err.message}`));
      });
    });
  }

  /**
   * Import an existing SSH key
   */
  async importKey(name: string, privateKeyContent: string, comment?: string): Promise<SSHKeyInfo> {
    const id = crypto.randomUUID();
    const keyPath = path.join(this.keysDir, id);
    
    // Save private key
    fs.writeFileSync(keyPath, privateKeyContent, { mode: 0o600 });
    
    // Generate public key from private key
    return new Promise((resolve, reject) => {
      const keygen = spawn('ssh-keygen', ['-y', '-f', keyPath]);
      
      let publicKey = '';
      let stderr = '';
      
      keygen.stdout.on('data', (data) => {
        publicKey += data.toString();
      });
      
      keygen.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      keygen.on('close', async (code) => {
        if (code !== 0 || !publicKey.trim()) {
          // Clean up
          if (fs.existsSync(keyPath)) fs.unlinkSync(keyPath);
          reject(new Error(`Invalid private key: ${stderr}`));
          return;
        }

        try {
          // Save public key
          fs.writeFileSync(keyPath + '.pub', publicKey.trim());
          
          // Determine key type
          let type: 'rsa' | 'ed25519' | 'ecdsa' = 'rsa';
          if (publicKey.includes('ssh-ed25519')) {
            type = 'ed25519';
          } else if (publicKey.includes('ecdsa')) {
            type = 'ecdsa';
          }

          const fingerprint = await this.getKeyFingerprint(keyPath + '.pub');
          
          const keyInfo: SSHKeyInfo = {
            id,
            name,
            type,
            fingerprint,
            publicKey: publicKey.trim(),
            createdAt: new Date().toISOString(),
            comment
          };

          this.keysMeta.set(id, keyInfo);
          this.saveKeysMeta();

          console.log('[SSHKeyService] Key imported:', id);
          resolve(keyInfo);
        } catch (err) {
          // Clean up
          if (fs.existsSync(keyPath)) fs.unlinkSync(keyPath);
          if (fs.existsSync(keyPath + '.pub')) fs.unlinkSync(keyPath + '.pub');
          reject(err);
        }
      });
    });
  }

  /**
   * Get fingerprint of a public key file
   */
  private getKeyFingerprint(pubKeyPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const keygen = spawn('ssh-keygen', ['-lf', pubKeyPath]);
      
      let stdout = '';
      keygen.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      keygen.on('close', (code) => {
        if (code !== 0) {
          reject(new Error('Failed to get fingerprint'));
          return;
        }
        
        // Output format: 256 SHA256:xxx comment (TYPE)
        const match = stdout.match(/SHA256:[^\s]+/);
        resolve(match ? match[0] : 'Unknown');
      });
    });
  }

  /**
   * Get all keys info (without private keys)
   */
  getAllKeys(): SSHKeyInfo[] {
    return Array.from(this.keysMeta.values());
  }

  /**
   * Get key by ID
   */
  getKey(id: string): SSHKeyInfo | undefined {
    return this.keysMeta.get(id);
  }

  /**
   * Get private key content by ID
   */
  getPrivateKey(id: string): string | null {
    const keyPath = path.join(this.keysDir, id);
    if (fs.existsSync(keyPath)) {
      return fs.readFileSync(keyPath, 'utf-8');
    }
    return null;
  }

  /**
   * Delete a key
   */
  deleteKey(id: string): boolean {
    const keyPath = path.join(this.keysDir, id);
    
    try {
      if (fs.existsSync(keyPath)) fs.unlinkSync(keyPath);
      if (fs.existsSync(keyPath + '.pub')) fs.unlinkSync(keyPath + '.pub');
      
      this.keysMeta.delete(id);
      this.saveKeysMeta();
      
      console.log('[SSHKeyService] Key deleted:', id);
      return true;
    } catch (err) {
      console.error('[SSHKeyService] Failed to delete key:', err);
      return false;
    }
  }

  /**
   * Rename a key
   */
  renameKey(id: string, newName: string): boolean {
    const keyInfo = this.keysMeta.get(id);
    if (keyInfo) {
      keyInfo.name = newName;
      this.saveKeysMeta();
      return true;
    }
    return false;
  }

  /**
   * Export all keys for backup (includes private keys)
   */
  exportAllKeysForBackup(): { id: string; name: string; type: string; publicKey: string; privateKey: string; fingerprint: string; createdAt: string; comment?: string }[] {
    const keys: { id: string; name: string; type: string; publicKey: string; privateKey: string; fingerprint: string; createdAt: string; comment?: string }[] = [];
    
    for (const [id, info] of this.keysMeta.entries()) {
      const privateKey = this.getPrivateKey(id);
      if (privateKey) {
        keys.push({
          id: info.id,
          name: info.name,
          type: info.type,
          publicKey: info.publicKey,
          privateKey: privateKey,
          fingerprint: info.fingerprint,
          createdAt: info.createdAt,
          comment: info.comment,
        });
      }
    }
    
    return keys;
  }

  /**
   * Import keys from backup (restores all SSH keys)
   */
  async importKeysFromBackup(keys: { id: string; name: string; type: string; publicKey: string; privateKey: string; fingerprint: string; createdAt: string; comment?: string }[]): Promise<{ imported: number; skipped: number }> {
    let imported = 0;
    let skipped = 0;
    
    for (const key of keys) {
      // Check if key already exists (by fingerprint)
      const existing = Array.from(this.keysMeta.values()).find(k => k.fingerprint === key.fingerprint);
      if (existing) {
        skipped++;
        continue;
      }
      
      try {
        // Save the key files
        const keyPath = path.join(this.keysDir, key.id);
        fs.writeFileSync(keyPath, key.privateKey, { mode: 0o600 });
        fs.writeFileSync(keyPath + '.pub', key.publicKey);
        
        // Save metadata
        this.keysMeta.set(key.id, {
          id: key.id,
          name: key.name,
          type: key.type,
          fingerprint: key.fingerprint,
          publicKey: key.publicKey,
          createdAt: key.createdAt,
          comment: key.comment,
        });
        
        imported++;
      } catch (err) {
        console.error('[SSHKeyService] Failed to import key:', key.id, err);
        skipped++;
      }
    }
    
    this.saveKeysMeta();
    console.log(`[SSHKeyService] Imported ${imported} keys, skipped ${skipped}`);
    return { imported, skipped };
  }
}

export const sshKeyService = new SSHKeyService();
