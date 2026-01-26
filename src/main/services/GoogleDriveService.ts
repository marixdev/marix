import { google, drive_v3 } from 'googleapis';
import { OAuth2Client, CodeChallengeMethod } from 'google-auth-library';
import { app, shell } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import Store from 'electron-store';
import { GoogleDriveOAuthServer, OAuthCallbackServer } from './OAuthCallbackServer';

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const TOKEN_PATH = path.join(app.getPath('userData'), 'google-drive-token.json');

interface GoogleDriveTokens {
  access_token?: string | null;
  refresh_token?: string | null;
  scope?: string;
  token_type?: string;
  expiry_date?: number | null;
}

interface GoogleDriveCredentials {
  installed?: {
    client_id: string;
    client_secret?: string; // Optional - not needed with PKCE
    redirect_uris?: string[];
  };
  web?: {
    client_id: string;
    client_secret?: string; // Optional - not needed with PKCE
    redirect_uris?: string[];
  };
}

interface PKCEChallenge {
  verifier: string;
  challenge: string;
}

export class GoogleDriveService {
  private oauth2Client: OAuth2Client | null = null;
  private drive: drive_v3.Drive | null = null;
  private store: any;
  private credentials: GoogleDriveCredentials | null = null;
  private callbackServer: OAuthCallbackServer | null = null;
  private currentPkceVerifier: string | null = null;
  private currentRedirectUri: string | null = null;

  constructor() {
    this.store = new Store({ name: 'google-drive-config' });
    this.loadCredentials();
  }

  /**
   * Load OAuth2 credentials from file
   */
  private loadCredentials(): void {
    try {
      // Try multiple paths for credentials file
      const possiblePaths = [
        // Production: same directory as compiled code
        path.join(__dirname, 'google-credentials.json'),
        // Development: source directory
        path.join(__dirname, '..', '..', '..', 'src', 'main', 'services', 'google-credentials.json'),
        // App root
        path.join(app.getAppPath(), 'src', 'main', 'services', 'google-credentials.json'),
        // User data directory (most portable)
        path.join(app.getPath('userData'), 'google-credentials.json'),
      ];

      for (const credPath of possiblePaths) {
        if (fs.existsSync(credPath)) {
          const content = fs.readFileSync(credPath, 'utf-8');
          this.credentials = JSON.parse(content);
          console.log('[GoogleDrive] Loaded credentials from:', credPath);
          return;
        }
      }

      // Try to load from electron store (user can paste their credentials)
      const storedCreds = this.store.get('credentials') as GoogleDriveCredentials;
      if (storedCreds) {
        this.credentials = storedCreds;
        console.log('[GoogleDrive] Loaded credentials from store');
        return;
      }

      console.warn('[GoogleDrive] No credentials found. Searched paths:', possiblePaths);
    } catch (error: any) {
      console.error('[GoogleDrive] Error loading credentials:', error.message);
    }
  }

  /**
   * Save user credentials to store
   */
  saveCredentials(credentials: GoogleDriveCredentials): void {
    this.credentials = credentials;
    this.store.set('credentials', credentials);
  }

  /**
   * Check if credentials are configured
   */
  hasCredentials(): boolean {
    if (!this.credentials) return false;
    
    const creds = this.credentials.installed || this.credentials.web;
    if (!creds) return false;
    
    // Check if credentials are valid (not placeholders)
    if (creds.client_id.startsWith('PLACEHOLDER') || 
        !creds.client_secret || 
        creds.client_secret.startsWith('PLACEHOLDER')) {
      return false;
    }
    
    return true;
  }

  /**
   * Initialize OAuth2 client with dynamic redirect URI
   */
  private initOAuth2Client(redirectUri?: string): OAuth2Client {
    if (!this.credentials) {
      throw new Error('Google Drive credentials not configured');
    }

    const creds = this.credentials.installed || this.credentials.web;
    if (!creds) {
      throw new Error('Invalid credentials format');
    }

    // Validate credentials are not placeholders
    if (creds.client_id.startsWith('PLACEHOLDER') || 
        !creds.client_secret || 
        creds.client_secret.startsWith('PLACEHOLDER')) {
      throw new Error('Google Drive credentials not configured. Please set up valid OAuth credentials.');
    }

    // Use provided redirect URI or default
    const uri = redirectUri || this.currentRedirectUri || 'http://localhost:3000/oauth2callback';

    this.oauth2Client = new google.auth.OAuth2(
      creds.client_id,
      creds.client_secret,
      uri
    );

    // Load saved tokens if available
    const tokens = this.store.get('tokens') as GoogleDriveTokens;
    if (tokens) {
      this.oauth2Client.setCredentials(tokens);
    }

    return this.oauth2Client;
  }

  /**
   * Generate PKCE code verifier and challenge
   */
  private generatePKCE(): PKCEChallenge {
    // Generate random 64-byte string for verifier (43-128 chars required)
    const verifier = crypto.randomBytes(64).toString('base64url');
    
    // Generate SHA256 hash and encode as base64url for challenge
    const hash = crypto.createHash('sha256').update(verifier).digest();
    const challenge = hash.toString('base64url');
    
    return { verifier, challenge };
  }

  /**
   * Get authorization URL for OAuth flow with PKCE
   */
  getAuthUrl(): string {
    if (!this.oauth2Client) {
      this.initOAuth2Client();
    }

    // Generate PKCE challenge
    const pkce = this.generatePKCE();
    this.currentPkceVerifier = pkce.verifier;

    const authUrl = this.oauth2Client!.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent', // Force to get refresh_token
      code_challenge: pkce.challenge,
      code_challenge_method: CodeChallengeMethod.S256,
    });

    return authUrl;
  }

  /**
   * Start OAuth flow - opens browser for user to authenticate
   */
  async startAuthFlow(): Promise<{ success: boolean; authUrl?: string; error?: string }> {
    try {
      if (!this.hasCredentials()) {
        return {
          success: false,
          error: 'Google Drive credentials not configured. Please add your credentials first.',
        };
      }

      // Create callback server with random port
      this.callbackServer = GoogleDriveOAuthServer();
      
      // Start server and wait for port assignment
      await this.callbackServer.startServer();
      
      // Get the callback URL with the assigned port
      this.currentRedirectUri = this.callbackServer.getCallbackUrl();
      console.log('[GoogleDrive] Using callback URL:', this.currentRedirectUri);

      // Get auth URL with the dynamic redirect URI
      const authUrl = this.getAuthUrl();
      
      // Open browser for user to authenticate
      await shell.openExternal(authUrl);

      // Wait for authorization code (start() now just waits for callback)
      const { code } = await this.callbackServer.start();

      // Handle the callback
      const result = await this.handleAuthCallback(code);

      return { success: result.success, error: result.error };
    } catch (error: any) {
      console.error('[GoogleDrive] Error starting auth flow:', error);
      if (this.callbackServer) {
        this.callbackServer.stop();
      }
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle OAuth callback with authorization code
   */
  async handleAuthCallback(code: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.oauth2Client) {
        this.initOAuth2Client();
      }

      // Use PKCE code_verifier for additional security
      if (!this.currentPkceVerifier) {
        throw new Error('PKCE verifier is missing. Please restart the auth flow.');
      }

      console.log('[GoogleDrive] Exchanging code for tokens with PKCE...');

      const { tokens } = await this.oauth2Client!.getToken({
        code,
        codeVerifier: this.currentPkceVerifier,
        redirect_uri: this.currentRedirectUri!,
      });
      
      this.oauth2Client!.setCredentials(tokens);
      
      // Clear PKCE verifier after use
      this.currentPkceVerifier = null;

      // Save tokens for future use
      this.store.set('tokens', tokens);

      // Initialize Drive API
      this.drive = google.drive({ version: 'v3', auth: this.oauth2Client! });

      console.log('[GoogleDrive] Authentication successful');
      return { success: true };
    } catch (error: any) {
      console.error('[GoogleDrive] Error handling auth callback:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const tokens = this.store.get('tokens') as GoogleDriveTokens;
    return tokens !== undefined && tokens.access_token !== null;
  }

  /**
   * Get user info
   */
  async getUserInfo(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      if (!this.isAuthenticated()) {
        return { success: false, error: 'Not authenticated' };
      }

      if (!this.oauth2Client) {
        this.initOAuth2Client();
      }

      if (!this.drive) {
        this.drive = google.drive({ version: 'v3', auth: this.oauth2Client! });
      }

      const response = await this.drive.about.get({
        fields: 'user(displayName,emailAddress,photoLink)',
      });

      return { success: true, data: response.data.user };
    } catch (error: any) {
      console.error('[GoogleDrive] Error getting user info:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Disconnect - remove stored tokens
   */
  disconnect(): void {
    this.store.delete('tokens');
    this.oauth2Client = null;
    this.drive = null;
    console.log('[GoogleDrive] Disconnected');
  }

  /**
   * Upload backup file to Google Drive
   */
  async uploadBackup(
    fileName: string,
    content: string
  ): Promise<{ success: boolean; fileId?: string; error?: string }> {
    try {
      if (!this.isAuthenticated()) {
        return { success: false, error: 'Not authenticated. Please connect to Google Drive first.' };
      }

      if (!this.oauth2Client) {
        this.initOAuth2Client();
      }

      if (!this.drive) {
        this.drive = google.drive({ version: 'v3', auth: this.oauth2Client! });
      }

      // Create app folder if not exists
      const folderId = await this.getOrCreateAppFolder();

      // Check if file already exists
      const existingFile = await this.findBackupFile(fileName);
      
      if (existingFile) {
        // Update existing file
        const response = await this.drive.files.update({
          fileId: existingFile.id!,
          media: {
            mimeType: 'application/json',
            body: content,
          },
          fields: 'id',
        });

        console.log('[GoogleDrive] Backup updated:', response.data.id);
        return { success: true, fileId: response.data.id! };
      } else {
        // Create new file
        const response = await this.drive.files.create({
          requestBody: {
            name: fileName,
            mimeType: 'application/json',
            parents: [folderId],
          },
          media: {
            mimeType: 'application/json',
            body: content,
          },
          fields: 'id',
        });

        console.log('[GoogleDrive] Backup created:', response.data.id);
        return { success: true, fileId: response.data.id! };
      }
    } catch (error: any) {
      console.error('[GoogleDrive] Error uploading backup:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Download backup file from Google Drive
   */
  async downloadBackup(): Promise<{ success: boolean; data?: string; metadata?: any; error?: string }> {
    try {
      if (!this.isAuthenticated()) {
        return { success: false, error: 'Not authenticated' };
      }

      if (!this.drive) {
        this.drive = google.drive({ version: 'v3', auth: this.oauth2Client! });
      }

      // Find the backup file
      const backupFile = await this.findBackupFile('marix-backup.marix');
      
      if (!backupFile) {
        return { success: false, error: 'No backup found on Google Drive' };
      }

      // Download file content
      const response = await this.drive.files.get({
        fileId: backupFile.id!,
        alt: 'media',
      }, { responseType: 'text' });

      // Get file metadata
      const metadata = await this.drive.files.get({
        fileId: backupFile.id!,
        fields: 'name,modifiedTime,size',
      });

      return {
        success: true,
        data: response.data as string,
        metadata: {
          name: metadata.data.name,
          lastModified: metadata.data.modifiedTime,
          size: metadata.data.size,
        },
      };
    } catch (error: any) {
      console.error('[GoogleDrive] Error downloading backup:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if backup exists
   */
  async checkBackup(): Promise<{ exists: boolean; metadata?: any; error?: string }> {
    try {
      if (!this.isAuthenticated()) {
        return { exists: false, error: 'Not authenticated' };
      }

      if (!this.drive) {
        this.drive = google.drive({ version: 'v3', auth: this.oauth2Client! });
      }

      const backupFile = await this.findBackupFile('marix-backup.marix');
      
      if (!backupFile) {
        return { exists: false };
      }

      return {
        exists: true,
        metadata: {
          name: backupFile.name,
          lastModified: backupFile.modifiedTime,
          size: backupFile.size,
        },
      };
    } catch (error: any) {
      console.error('[GoogleDrive] Error checking backup:', error);
      return { exists: false, error: error.message };
    }
  }

  /**
   * Get or create app folder in Google Drive
   */
  private async getOrCreateAppFolder(): Promise<string> {
    const folderName = 'Marix Backups';

    // Search for existing folder
    const response = await this.drive!.files.list({
      q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    if (response.data.files && response.data.files.length > 0) {
      return response.data.files[0].id!;
    }

    // Create folder if not exists
    const folderResponse = await this.drive!.files.create({
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      },
      fields: 'id',
    });

    return folderResponse.data.id!;
  }

  /**
   * Find backup file in app folder
   */
  private async findBackupFile(fileName: string): Promise<drive_v3.Schema$File | null> {
    const folderId = await this.getOrCreateAppFolder();

    const response = await this.drive!.files.list({
      q: `name='${fileName}' and '${folderId}' in parents and trashed=false`,
      fields: 'files(id, name, modifiedTime, size)',
      spaces: 'drive',
      orderBy: 'modifiedTime desc',
    });

    if (response.data.files && response.data.files.length > 0) {
      return response.data.files[0];
    }

    return null;
  }
}

// Singleton instance
let googleDriveService: GoogleDriveService | null = null;

export function getGoogleDriveService(): GoogleDriveService {
  if (!googleDriveService) {
    googleDriveService = new GoogleDriveService();
  }
  return googleDriveService;
}
