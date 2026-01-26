import { BrowserWindow, shell, safeStorage } from 'electron';
import { randomBytes, createHash } from 'crypto';
import * as https from 'https';
import { GitLabOAuthServer, OAuthCallbackServer } from './OAuthCallbackServer';

interface GitLabTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  created_at: number;
}

interface PKCEChallenge {
  verifier: string;
  challenge: string;
}

export class GitLabOAuthService {
  private static CLIENT_ID = 'e9b3e0079b96858eaa49ff567f07a9377f975b503b8b8bc1ea90218928e28974';
  private static GITLAB_AUTH_URL = 'https://gitlab.com/oauth/authorize';
  private static GITLAB_TOKEN_URL = 'https://gitlab.com/oauth/token';
  
  private static currentChallenge: PKCEChallenge | null = null;
  private static currentRedirectUri: string | null = null;
  private static authWindow: BrowserWindow | null = null;
  private static callbackServer: OAuthCallbackServer | null = null;

  /**
   * Generate PKCE code verifier and challenge
   */
  private static generatePKCE(): PKCEChallenge {
    // Generate random 64-byte string for verifier
    const verifier = randomBytes(64).toString('base64url');
    
    // Generate SHA256 hash and encode as base64url for challenge
    const hash = createHash('sha256').update(verifier).digest();
    const challenge = hash.toString('base64url');
    
    return { verifier, challenge };
  }

  /**
   * Start OAuth flow with PKCE
   */
  static async startOAuthFlow(parentWindow?: BrowserWindow): Promise<GitLabTokens> {
    try {
      // Generate PKCE challenge
      this.currentChallenge = this.generatePKCE();
      
      // Create callback server with random port
      this.callbackServer = GitLabOAuthServer();
      
      // Start server and wait for port assignment
      await this.callbackServer.startServer();
      
      // Get the callback URL with the assigned port
      this.currentRedirectUri = this.callbackServer.getCallbackUrl();
      console.log('[GitLab OAuth] Using callback URL:', this.currentRedirectUri);
      
      // Build authorization URL
      const authUrl = new URL(this.GITLAB_AUTH_URL);
      authUrl.searchParams.set('client_id', this.CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', this.currentRedirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('code_challenge', this.currentChallenge.challenge);
      authUrl.searchParams.set('code_challenge_method', 'S256');
      authUrl.searchParams.set('scope', 'api');
      
      console.log('[GitLab OAuth] Opening authorization URL');
      
      // Open in external browser
      await shell.openExternal(authUrl.toString());
      
      // Wait for authorization code
      const { code } = await this.callbackServer.start();
      
      // Exchange code for tokens
      const tokens = await this.exchangeCodeForToken(code);
      this.cleanup();
      
      return tokens;
    } catch (error) {
      this.cleanup();
      throw error;
    }
  }

  /**
   * Exchange authorization code for access token
   */
  private static async exchangeCodeForToken(code: string): Promise<GitLabTokens> {
    if (!this.currentChallenge) {
      throw new Error('No PKCE challenge found');
    }
    
    if (!this.currentRedirectUri) {
      throw new Error('No redirect URI found');
    }

    const postData = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      code_verifier: this.currentChallenge.verifier,
      client_id: this.CLIENT_ID,
      redirect_uri: this.currentRedirectUri
    }).toString();

    console.log('[GitLab OAuth] Exchange token with redirect_uri:', this.currentRedirectUri);

    return new Promise((resolve, reject) => {
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(this.GITLAB_TOKEN_URL, options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            if (res.statusCode !== 200) {
              console.error('[GitLab OAuth] Token exchange failed:', res.statusCode);
              console.error('[GitLab OAuth] Response body:', data);
              let errorMsg = `Token exchange failed: ${res.statusCode}`;
              try {
                const errorData = JSON.parse(data);
                if (errorData.error_description) {
                  errorMsg += ` - ${errorData.error_description}`;
                }
              } catch (e) {
                // Ignore parse error
              }
              reject(new Error(errorMsg));
              return;
            }
            
            const tokens: GitLabTokens = JSON.parse(data);
            tokens.created_at = Date.now();
            console.log('[GitLab OAuth] Successfully obtained tokens');
            resolve(tokens);
          } catch (err) {
            reject(err);
          }
        });
      });

      req.on('error', (err) => {
        console.error('[GitLab OAuth] Request error:', err);
        reject(err);
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * Save tokens securely using Electron safeStorage
   */
  static saveTokens(tokens: GitLabTokens): void {
    try {
      if (!safeStorage.isEncryptionAvailable()) {
        throw new Error('Encryption not available on this system');
      }
      
      const tokenJson = JSON.stringify(tokens);
      const encrypted = safeStorage.encryptString(tokenJson);
      
      // Store in a config file or use electron-store
      const fs = require('fs');
      const path = require('path');
      const { app } = require('electron');
      
      const configDir = path.join(app.getPath('userData'), 'gitlab');
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      const tokenPath = path.join(configDir, 'tokens.enc');
      fs.writeFileSync(tokenPath, encrypted);
      
      console.log('[GitLab OAuth] Tokens saved securely');
    } catch (err) {
      console.error('[GitLab OAuth] Error saving tokens:', err);
      throw err;
    }
  }

  /**
   * Load tokens from secure storage
   */
  static loadTokens(): GitLabTokens | null {
    try {
      const fs = require('fs');
      const path = require('path');
      const { app } = require('electron');
      
      const tokenPath = path.join(app.getPath('userData'), 'gitlab', 'tokens.enc');
      
      if (!fs.existsSync(tokenPath)) {
        return null;
      }
      
      const encrypted = fs.readFileSync(tokenPath);
      const decrypted = safeStorage.decryptString(encrypted);
      const tokens: GitLabTokens = JSON.parse(decrypted);
      
      console.log('[GitLab OAuth] Tokens loaded successfully');
      return tokens;
    } catch (err) {
      console.error('[GitLab OAuth] Error loading tokens:', err);
      return null;
    }
  }

  /**
   * Check if tokens are still valid
   */
  static isTokenValid(tokens: GitLabTokens): boolean {
    if (!tokens) return false;
    
    const now = Date.now();
    const expiresAt = tokens.created_at + (tokens.expires_in * 1000);
    
    // Consider token valid if it expires in more than 5 minutes
    return expiresAt > now + (5 * 60 * 1000);
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshToken(tokens: GitLabTokens): Promise<GitLabTokens> {
    const postData = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokens.refresh_token,
      client_id: this.CLIENT_ID
    }).toString();

    return new Promise((resolve, reject) => {
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(this.GITLAB_TOKEN_URL, options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            if (res.statusCode !== 200) {
              console.error('[GitLab OAuth] Token refresh failed:', res.statusCode, data);
              reject(new Error(`Token refresh failed: ${res.statusCode}`));
              return;
            }
            
            const newTokens: GitLabTokens = JSON.parse(data);
            newTokens.created_at = Date.now();
            console.log('[GitLab OAuth] Token refreshed successfully');
            resolve(newTokens);
          } catch (err) {
            reject(err);
          }
        });
      });

      req.on('error', (err) => {
        console.error('[GitLab OAuth] Refresh request error:', err);
        reject(err);
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * Get valid access token (refresh if needed)
   */
  static async getValidAccessToken(): Promise<string | null> {
    let tokens = this.loadTokens();
    
    if (!tokens) {
      console.log('[GitLab OAuth] No tokens found');
      return null;
    }
    
    console.log('[GitLab OAuth] Found tokens, checking validity...');
    
    if (!this.isTokenValid(tokens)) {
      console.log('[GitLab OAuth] Token expired, refreshing...');
      try {
        tokens = await this.refreshToken(tokens);
        this.saveTokens(tokens);
      } catch (err) {
        console.error('[GitLab OAuth] Failed to refresh token:', err);
        return null;
      }
    }
    
    console.log('[GitLab OAuth] Token is valid');
    return tokens.access_token;
  }

  /**
   * Clear saved tokens (logout)
   */
  static clearTokens(): void {
    try {
      const fs = require('fs');
      const path = require('path');
      const { app } = require('electron');
      
      const tokenPath = path.join(app.getPath('userData'), 'gitlab', 'tokens.enc');
      
      if (fs.existsSync(tokenPath)) {
        fs.unlinkSync(tokenPath);
        console.log('[GitLab OAuth] Tokens cleared');
      }
    } catch (err) {
      console.error('[GitLab OAuth] Error clearing tokens:', err);
    }
  }

  /**
   * Handle OAuth callback with authorization code (legacy protocol handler)
   * Note: With random ports, this is only used if app registers a custom protocol
   */
  static handleCallback(url: string): void {
    // Legacy handler - with random ports, callbacks come directly to the HTTP server
    console.log('[GitLab OAuth] handleCallback called (legacy):', url);
  }

  /**
   * Handle manual code input (fallback when automatic flow doesn't work)
   * Note: With random ports, this may need updates in the UI
   */
  static handleManualCode(code: string): void {
    console.log('[GitLab OAuth] handleManualCode called (legacy):', code);
    // Manual code entry is no longer needed with HTTP callback server
  }

  /**
   * Cleanup resources
   */
  private static cleanup(): void {
    this.currentChallenge = null;
    this.currentRedirectUri = null;
    if (this.authWindow && !this.authWindow.isDestroyed()) {
      this.authWindow.close();
      this.authWindow = null;
    }
    if (this.callbackServer) {
      this.callbackServer.stop();
      this.callbackServer = null;
    }
  }
}
