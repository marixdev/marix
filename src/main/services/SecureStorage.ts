/**
 * SecureStorage - Encrypts sensitive data using OS-level keychain
 * 
 * Uses Electron's safeStorage API which leverages:
 * - macOS: Keychain
 * - Windows: DPAPI (Data Protection API)
 * - Linux: libsecret (GNOME Keyring, KWallet, etc.)
 * 
 * Data encrypted on one machine CANNOT be decrypted on another machine.
 * This is intentional for security - credentials are tied to the device.
 */

import { safeStorage } from 'electron';

// Prefix to identify encrypted strings
const ENCRYPTED_PREFIX = 'enc:';

export class SecureStorage {
  /**
   * Check if encryption is available on this system
   */
  static isAvailable(): boolean {
    return safeStorage.isEncryptionAvailable();
  }

  /**
   * Encrypt a string using OS-level encryption
   * Returns the encrypted string with a prefix, or original if encryption unavailable
   */
  static encrypt(plaintext: string): string {
    if (!plaintext) return plaintext;
    
    // Already encrypted? Return as-is
    if (plaintext.startsWith(ENCRYPTED_PREFIX)) {
      return plaintext;
    }

    try {
      if (safeStorage.isEncryptionAvailable()) {
        const encrypted = safeStorage.encryptString(plaintext);
        return ENCRYPTED_PREFIX + encrypted.toString('base64');
      }
    } catch (error) {
      console.error('[SecureStorage] Encryption failed:', error);
    }
    
    // Fallback: return original (not recommended, but prevents data loss)
    return plaintext;
  }

  /**
   * Decrypt a string that was encrypted with encrypt()
   * Returns the decrypted string, or original if not encrypted/decryption fails
   */
  static decrypt(ciphertext: string): string {
    if (!ciphertext) return ciphertext;
    
    // Not encrypted? Return as-is
    if (!ciphertext.startsWith(ENCRYPTED_PREFIX)) {
      return ciphertext;
    }

    try {
      if (safeStorage.isEncryptionAvailable()) {
        const base64Data = ciphertext.slice(ENCRYPTED_PREFIX.length);
        const buffer = Buffer.from(base64Data, 'base64');
        return safeStorage.decryptString(buffer);
      }
    } catch (error) {
      console.error('[SecureStorage] Decryption failed:', error);
    }
    
    // Return empty string if decryption fails (prevents showing encrypted gibberish)
    return '';
  }

  /**
   * Check if a string is encrypted
   */
  static isEncrypted(value: string): boolean {
    return value?.startsWith(ENCRYPTED_PREFIX) ?? false;
  }

  /**
   * Encrypt multiple fields in an object
   * @param obj The object to process
   * @param fields Array of field names to encrypt
   * @returns New object with encrypted fields
   */
  static encryptFields<T extends Record<string, any>>(obj: T, fields: (keyof T)[]): T {
    const result = { ...obj };
    for (const field of fields) {
      const value = result[field];
      if (typeof value === 'string' && value) {
        (result as any)[field] = this.encrypt(value);
      }
    }
    return result;
  }

  /**
   * Decrypt multiple fields in an object
   * @param obj The object to process
   * @param fields Array of field names to decrypt
   * @returns New object with decrypted fields
   */
  static decryptFields<T extends Record<string, any>>(obj: T, fields: (keyof T)[]): T {
    const result = { ...obj };
    for (const field of fields) {
      const value = result[field];
      if (typeof value === 'string' && value) {
        (result as any)[field] = this.decrypt(value);
      }
    }
    return result;
  }
}
