import * as https from 'https';

export interface GitLabProject {
  id: number;
  name: string;
  path: string;
  path_with_namespace: string;
  visibility: string;
}

export interface GitLabFile {
  file_name: string;
  file_path: string;
  size: number;
  encoding: string;
  content: string;
  content_sha256: string;
  ref: string;
  blob_id: string;
  commit_id: string;
  last_commit_id: string;
}

export class GitLabApiService {
  private static GITLAB_API_BASE = 'https://gitlab.com/api/v4';
  private static BACKUP_REPO_NAME = 'marix-backup';
  private static BACKUP_FILE_PATH = 'backup.marix';

  /**
   * Make authenticated API request to GitLab
   */
  private static async apiRequest<T>(
    method: string,
    endpoint: string,
    accessToken: string,
    body?: any
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      // Properly construct the full URL
      const fullUrl = `${this.GITLAB_API_BASE}${endpoint}`;
      console.log('[GitLab API] Request:', method, fullUrl);
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
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            // Check if response is not JSON (e.g., HTML error page)
            const contentType = res.headers['content-type'] || '';
            if (!contentType.includes('application/json') && data.trim().startsWith('<!DOCTYPE')) {
              console.error('[GitLab API] Received HTML instead of JSON');
              console.error('[GitLab API] Status:', res.statusCode);
              console.error('[GitLab API] Endpoint:', url.toString());
              console.error('[GitLab API] This usually means invalid token or wrong API endpoint');
              reject(new Error(`GitLab API returned HTML (${res.statusCode}). Check token validity.`));
              return;
            }
            
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              const result = data ? JSON.parse(data) : null;
              resolve(result);
            } else {
              console.error(`[GitLab API] Request failed: ${res.statusCode}`);
              console.error('[GitLab API] Response:', data.substring(0, 200));
              let errorMsg = `GitLab API error: ${res.statusCode}`;
              try {
                const errorData = JSON.parse(data);
                if (errorData.message) {
                  errorMsg += ` - ${errorData.message}`;
                }
              } catch (e) {
                // Not JSON, use raw data
                errorMsg += ` - ${data.substring(0, 100)}`;
              }
              reject(new Error(errorMsg));
            }
          } catch (err) {
            console.error('[GitLab API] Parse error:', err);
            console.error('[GitLab API] Response data:', data.substring(0, 200));
            reject(err);
          }
        });
      });

      req.on('error', (err) => {
        console.error('[GitLab API] Request error:', err);
        reject(err);
      });

      if (body) {
        req.write(JSON.stringify(body));
      }
      
      req.end();
    });
  }

  /**
   * Get current user info
   */
  static async getCurrentUser(accessToken: string): Promise<any> {
    return this.apiRequest('GET', '/user', accessToken);
  }

  /**
   * Get or create marix-backup repository
   */
  static async getOrCreateBackupRepo(accessToken: string): Promise<GitLabProject> {
    try {
      // First, try to find existing backup repo
      const user = await this.getCurrentUser(accessToken);
      const username = user.username;
      
      console.log('[GitLab API] Looking for existing backup repo...');
      
      try {
        const project = await this.apiRequest<GitLabProject>(
          'GET',
          `/projects/${encodeURIComponent(username + '/' + this.BACKUP_REPO_NAME)}`,
          accessToken
        );
        
        console.log('[GitLab API] Found existing backup repo:', project.path_with_namespace);
        return project;
      } catch (err) {
        // Repo doesn't exist, create it
        console.log('[GitLab API] Backup repo not found, creating new one...');
        
        const newProject = await this.apiRequest<GitLabProject>(
          'POST',
          '/projects',
          accessToken,
          {
            name: this.BACKUP_REPO_NAME,
            description: 'Marix SSH Client encrypted backup storage',
            visibility: 'private',
            initialize_with_readme: false
          }
        );
        
        console.log('[GitLab API] Created backup repo:', newProject.path_with_namespace);
        return newProject;
      }
    } catch (err) {
      console.error('[GitLab API] Error getting/creating backup repo:', err);
      throw err;
    }
  }

  /**
   * Upload backup file to GitLab repository
   */
  static async uploadBackup(
    accessToken: string,
    encryptedData: string
  ): Promise<void> {
    try {
      const project = await this.getOrCreateBackupRepo(accessToken);
      const projectId = encodeURIComponent(project.id);
      const filePath = encodeURIComponent(this.BACKUP_FILE_PATH);
      
      // Convert encrypted data to base64
      const base64Content = Buffer.from(encryptedData, 'utf-8').toString('base64');
      
      // Get current date for commit message
      const now = new Date();
      const dd = String(now.getUTCDate()).padStart(2, '0');
      const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
      const yyyy = now.getUTCFullYear();
      const hours = String(now.getUTCHours()).padStart(2, '0');
      const minutes = String(now.getUTCMinutes()).padStart(2, '0');
      const commitMessage = `Marix backup ${dd}-${mm}-${yyyy} ${hours}:${minutes} (UTC)`;
      
      console.log('[GitLab API] Uploading backup file...');
      
      // Check if file exists first
      const fileExists = await this.backupExists(accessToken);
      
      if (fileExists) {
        // Update existing file
        await this.apiRequest(
          'PUT',
          `/projects/${projectId}/repository/files/${filePath}`,
          accessToken,
          {
            branch: 'main',
            content: base64Content,
            commit_message: commitMessage,
            encoding: 'base64'
          }
        );
        console.log('[GitLab API] Backup file updated successfully');
      } else {
        // Create new file
        console.log('[GitLab API] Creating new backup file...');
        await this.apiRequest(
          'POST',
          `/projects/${projectId}/repository/files/${filePath}`,
          accessToken,
          {
            branch: 'main',
            content: base64Content,
            commit_message: commitMessage,
            encoding: 'base64'
          }
        );
        console.log('[GitLab API] Backup file created successfully');
      }
    } catch (err) {
      console.error('[GitLab API] Error uploading backup:', err);
      throw err;
    }
  }

  /**
   * Download backup file from GitLab repository
   */
  static async downloadBackup(accessToken: string): Promise<string> {
    try {
      const project = await this.getOrCreateBackupRepo(accessToken);
      const projectId = encodeURIComponent(project.id);
      const filePath = encodeURIComponent(this.BACKUP_FILE_PATH);
      
      console.log('[GitLab API] Downloading backup file...');
      
      const file = await this.apiRequest<GitLabFile>(
        'GET',
        `/projects/${projectId}/repository/files/${filePath}?ref=main`,
        accessToken
      );
      
      // Decode base64 content
      const content = Buffer.from(file.content, 'base64').toString('utf-8');
      
      console.log('[GitLab API] Backup file downloaded successfully');
      return content;
    } catch (err) {
      console.error('[GitLab API] Error downloading backup:', err);
      throw err;
    }
  }

  /**
   * Check if backup file exists
   */
  static async backupExists(accessToken: string): Promise<boolean> {
    try {
      const project = await this.getOrCreateBackupRepo(accessToken);
      const projectId = encodeURIComponent(project.id);
      const filePath = encodeURIComponent(this.BACKUP_FILE_PATH);
      
      await this.apiRequest<GitLabFile>(
        'GET',
        `/projects/${projectId}/repository/files/${filePath}?ref=main`,
        accessToken
      );
      
      return true;
    } catch (err) {
      return false;
    }
  }

  /**
   * Get backup file metadata
   */
  static async getBackupMetadata(accessToken: string): Promise<{ size: number; lastModified: string } | null> {
    try {
      const project = await this.getOrCreateBackupRepo(accessToken);
      const projectId = encodeURIComponent(project.id);
      const filePath = encodeURIComponent(this.BACKUP_FILE_PATH);
      
      const file = await this.apiRequest<GitLabFile>(
        'GET',
        `/projects/${projectId}/repository/files/${filePath}?ref=main`,
        accessToken
      );
      
      // Get commit info for last modified date
      const commits = await this.apiRequest<any[]>(
        'GET',
        `/projects/${projectId}/repository/commits?path=${filePath}&per_page=1`,
        accessToken
      );
      
      return {
        size: file.size,
        lastModified: commits[0]?.created_at || ''
      };
    } catch (err) {
      console.error('[GitLab API] Error getting backup metadata:', err);
      return null;
    }
  }
}
