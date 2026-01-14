import * as https from 'https';
import { BoxOAuthService } from './BoxOAuthService';

interface BoxUser {
  id: string;
  name: string;
  login: string;
}

interface BoxFolder {
  id: string;
  name: string;
  type: 'folder';
}

interface BoxFile {
  id: string;
  name: string;
  type: 'file';
  size: number;
  modified_at: string;
}

export class BoxApiService {
  private static readonly BOX_API_BASE = 'https://api.box.com/2.0';
  private static readonly BOX_UPLOAD_BASE = 'https://upload.box.com/api/2.0';
  private static readonly BACKUP_FOLDER_NAME = 'Marix';
  private static readonly BACKUP_FILE_NAME = 'backup.marix';

  /**
   * Make authenticated API request to Box
   */
  private static async apiRequest<T>(
    method: string,
    endpoint: string,
    accessToken: string,
    body?: any
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      // Properly construct the full URL
      const fullUrl = `${this.BOX_API_BASE}${endpoint}`;
      console.log('[Box API] Request:', method, fullUrl);
      const url = new URL(fullUrl);
      
      const options: https.RequestOptions = {
        method,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      };

      const req = https.request(url, options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          console.log('[Box API] Response status:', res.statusCode);
          
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              // Check if response is JSON
              const contentType = res.headers['content-type'] || '';
              if (contentType.includes('application/json')) {
                const result = JSON.parse(data);
                resolve(result);
              } else {
                console.error('[Box API] Expected JSON but got:', contentType);
                console.error('[Box API] Response preview:', data.substring(0, 200));
                reject(new Error('Box API returned non-JSON response. Check token validity.'));
              }
            } catch (error) {
              console.error('[Box API] Failed to parse response:', error);
              reject(error);
            }
          } else {
            console.error('[Box API] Request failed:', data);
            try {
              const errorData = JSON.parse(data);
              reject(new Error(errorData.message || errorData.error_description || `Box API error: ${res.statusCode}`));
            } catch {
              reject(new Error(`Box API request failed with status ${res.statusCode}`));
            }
          }
        });
      });

      req.on('error', (error) => {
        console.error('[Box API] Request error:', error);
        reject(error);
      });

      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  }

  /**
   * Get current authenticated user
   */
  static async getCurrentUser(accessToken: string): Promise<BoxUser> {
    return this.apiRequest<BoxUser>('GET', '/users/me', accessToken);
  }

  /**
   * Get or create Marix backup folder in root
   */
  static async getOrCreateBackupFolder(accessToken: string): Promise<BoxFolder> {
    try {
      console.log('[Box API] Looking for Marix folder in root...');
      
      // Search for Marix folder in root (folder 0)
      const items = await this.apiRequest<{ entries: BoxFolder[] }>(
        'GET',
        '/folders/0/items?fields=id,name,type',
        accessToken
      );
      
      const marixFolder = items.entries.find(
        (item) => item.type === 'folder' && item.name === this.BACKUP_FOLDER_NAME
      );
      
      if (marixFolder) {
        console.log('[Box API] Found existing Marix folder:', marixFolder.id);
        return marixFolder;
      }
      
      // Folder doesn't exist, create it
      console.log('[Box API] Marix folder not found, creating...');
      const newFolder = await this.apiRequest<BoxFolder>(
        'POST',
        '/folders',
        accessToken,
        {
          name: this.BACKUP_FOLDER_NAME,
          parent: { id: '0' }
        }
      );
      
      console.log('[Box API] Created Marix folder:', newFolder.id);
      return newFolder;
    } catch (err) {
      console.error('[Box API] Error getting/creating folder:', err);
      throw err;
    }
  }

  /**
   * Get backup file if it exists
   */
  static async getBackupFile(accessToken: string, folderId: string): Promise<BoxFile | null> {
    try {
      const items = await this.apiRequest<{ entries: BoxFile[] }>(
        'GET',
        `/folders/${folderId}/items?fields=id,name,type,size,modified_at`,
        accessToken
      );
      
      const backupFile = items.entries.find(
        (item) => item.type === 'file' && item.name === this.BACKUP_FILE_NAME
      );
      
      return backupFile || null;
    } catch (err) {
      console.error('[Box API] Error getting backup file:', err);
      return null;
    }
  }

  /**
   * Upload backup file to Box (multipart/form-data)
   */
  static async uploadBackup(
    accessToken: string,
    encryptedData: string
  ): Promise<void> {
    try {
      const folder = await this.getOrCreateBackupFolder(accessToken);
      const existingFile = await this.getBackupFile(accessToken, folder.id);
      
      // Convert encrypted data to buffer
      const fileContent = Buffer.from(encryptedData, 'utf-8');
      
      // Create multipart form data
      const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
      const parts: Buffer[] = [];
      
      if (existingFile) {
        // Update existing file
        console.log('[Box API] Updating existing backup file...');
        
        // Attributes
        parts.push(Buffer.from(`--${boundary}\r\n`));
        parts.push(Buffer.from('Content-Disposition: form-data; name="attributes"\r\n\r\n'));
        parts.push(Buffer.from(JSON.stringify({ name: this.BACKUP_FILE_NAME })));
        parts.push(Buffer.from('\r\n'));
        
        // File content
        parts.push(Buffer.from(`--${boundary}\r\n`));
        parts.push(Buffer.from(`Content-Disposition: form-data; name="file"; filename="${this.BACKUP_FILE_NAME}"\r\n`));
        parts.push(Buffer.from('Content-Type: application/octet-stream\r\n\r\n'));
        parts.push(fileContent);
        parts.push(Buffer.from('\r\n'));
        parts.push(Buffer.from(`--${boundary}--\r\n`));
        
        const body = Buffer.concat(parts);
        
        await this.uploadRequest(
          'POST',
          `/files/${existingFile.id}/content`,
          accessToken,
          body,
          boundary
        );
        
        console.log('[Box API] Backup file updated successfully');
      } else {
        // Create new file
        console.log('[Box API] Creating new backup file...');
        
        // Attributes
        parts.push(Buffer.from(`--${boundary}\r\n`));
        parts.push(Buffer.from('Content-Disposition: form-data; name="attributes"\r\n\r\n'));
        parts.push(Buffer.from(JSON.stringify({
          name: this.BACKUP_FILE_NAME,
          parent: { id: folder.id }
        })));
        parts.push(Buffer.from('\r\n'));
        
        // File content
        parts.push(Buffer.from(`--${boundary}\r\n`));
        parts.push(Buffer.from(`Content-Disposition: form-data; name="file"; filename="${this.BACKUP_FILE_NAME}"\r\n`));
        parts.push(Buffer.from('Content-Type: application/octet-stream\r\n\r\n'));
        parts.push(fileContent);
        parts.push(Buffer.from('\r\n'));
        parts.push(Buffer.from(`--${boundary}--\r\n`));
        
        const body = Buffer.concat(parts);
        
        await this.uploadRequest(
          'POST',
          '/files/content',
          accessToken,
          body,
          boundary
        );
        
        console.log('[Box API] Backup file created successfully');
      }
    } catch (err) {
      console.error('[Box API] Error uploading backup:', err);
      throw err;
    }
  }

  /**
   * Make multipart upload request
   */
  private static async uploadRequest(
    method: string,
    endpoint: string,
    accessToken: string,
    body: Buffer,
    boundary: string
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const fullUrl = `${this.BOX_UPLOAD_BASE}${endpoint}`;
      console.log('[Box API] Upload request:', method, fullUrl);
      const url = new URL(fullUrl);
      
      const options: https.RequestOptions = {
        method,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': body.length
        }
      };

      const req = https.request(url, options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          console.log('[Box API] Upload response status:', res.statusCode);
          
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const result = JSON.parse(data);
              resolve(result);
            } catch (error) {
              resolve(data);
            }
          } else {
            console.error('[Box API] Upload failed:', data);
            try {
              const errorData = JSON.parse(data);
              reject(new Error(errorData.message || `Upload failed: ${res.statusCode}`));
            } catch {
              reject(new Error(`Upload failed with status ${res.statusCode}`));
            }
          }
        });
      });

      req.on('error', (error) => {
        console.error('[Box API] Upload error:', error);
        reject(error);
      });

      req.write(body);
      req.end();
    });
  }

  /**
   * Download backup file from Box
   */
  static async downloadBackup(accessToken: string): Promise<string> {
    try {
      const folder = await this.getOrCreateBackupFolder(accessToken);
      const backupFile = await this.getBackupFile(accessToken, folder.id);
      
      if (!backupFile) {
        throw new Error('Backup file not found');
      }
      
      console.log('[Box API] Downloading backup file...');
      
      return new Promise((resolve, reject) => {
        const url = new URL(`${this.BOX_API_BASE}/files/${backupFile.id}/content`);
        const options: https.RequestOptions = {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        };

        const req = https.request(url, options, (res) => {
          // Box returns 302 redirect to actual download URL
          if (res.statusCode === 302 || res.statusCode === 301) {
            const downloadUrl = res.headers.location;
            if (!downloadUrl) {
              reject(new Error('No download URL provided'));
              return;
            }

            // Follow redirect
            https.get(downloadUrl, (downloadRes) => {
              let data = '';
              downloadRes.setEncoding('utf-8');
              downloadRes.on('data', (chunk) => (data += chunk));
              downloadRes.on('end', () => {
                console.log('[Box API] Backup downloaded successfully');
                resolve(data);
              });
            }).on('error', reject);
          } else if (res.statusCode === 200) {
            // Direct download
            let data = '';
            res.setEncoding('utf-8');
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
              console.log('[Box API] Backup downloaded successfully');
              resolve(data);
            });
          } else {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
              console.error('[Box API] Download failed:', data);
              reject(new Error(`Download failed: ${res.statusCode}`));
            });
          }
        });

        req.on('error', (error) => {
          console.error('[Box API] Download error:', error);
          reject(error);
        });

        req.end();
      });
    } catch (err) {
      console.error('[Box API] Error downloading backup:', err);
      throw err;
    }
  }

  /**
   * Check if backup exists
   */
  static async backupExists(accessToken: string): Promise<boolean> {
    try {
      const folder = await this.getOrCreateBackupFolder(accessToken);
      const backupFile = await this.getBackupFile(accessToken, folder.id);
      return backupFile !== null;
    } catch (err) {
      console.error('[Box API] Error checking backup:', err);
      return false;
    }
  }

  /**
   * Get backup file metadata
   */
  static async getBackupMetadata(accessToken: string): Promise<{ size: number; modified_at: string } | null> {
    try {
      const folder = await this.getOrCreateBackupFolder(accessToken);
      const backupFile = await this.getBackupFile(accessToken, folder.id);
      
      if (!backupFile) {
        return null;
      }
      
      return {
        size: backupFile.size,
        modified_at: backupFile.modified_at
      };
    } catch (err) {
      console.error('[Box API] Error getting backup metadata:', err);
      return null;
    }
  }
}
