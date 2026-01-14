"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitLabOAuthService = void 0;
const electron_1 = require("electron");
const crypto_1 = require("crypto");
const https = __importStar(require("https"));
const http = __importStar(require("http"));
class GitLabOAuthService {
    /**
     * Generate PKCE code verifier and challenge
     */
    static generatePKCE() {
        // Generate random 64-byte string for verifier
        const verifier = (0, crypto_1.randomBytes)(64).toString('base64url');
        // Generate SHA256 hash and encode as base64url for challenge
        const hash = (0, crypto_1.createHash)('sha256').update(verifier).digest();
        const challenge = hash.toString('base64url');
        return { verifier, challenge };
    }
    /**
     * Start OAuth flow with PKCE
     */
    static async startOAuthFlow(parentWindow) {
        return new Promise((resolve, reject) => {
            try {
                // Generate PKCE challenge
                this.currentChallenge = this.generatePKCE();
                // Start local HTTP server to listen for callback
                this.startCallbackServer(resolve, reject);
                // Build authorization URL
                const authUrl = new URL(this.GITLAB_AUTH_URL);
                authUrl.searchParams.set('client_id', this.CLIENT_ID);
                authUrl.searchParams.set('redirect_uri', this.REDIRECT_URI);
                authUrl.searchParams.set('response_type', 'code');
                authUrl.searchParams.set('code_challenge', this.currentChallenge.challenge);
                authUrl.searchParams.set('code_challenge_method', 'S256');
                authUrl.searchParams.set('scope', 'api');
                console.log('[GitLab OAuth] Opening authorization URL:', authUrl.toString());
                // Open in external browser
                electron_1.shell.openExternal(authUrl.toString());
                // Set timeout for OAuth flow (5 minutes)
                const timeout = setTimeout(() => {
                    this.cleanup();
                    reject(new Error('OAuth flow timed out'));
                }, 5 * 60 * 1000);
                // Store resolver for callback
                global.gitlabOAuthResolver = async (code) => {
                    clearTimeout(timeout);
                    try {
                        const tokens = await this.exchangeCodeForToken(code);
                        this.cleanup();
                        resolve(tokens);
                    }
                    catch (err) {
                        this.cleanup();
                        reject(err);
                    }
                };
            }
            catch (err) {
                this.cleanup();
                reject(err);
            }
        });
    }
    /**
     * Start local HTTP server to listen for OAuth callback
     */
    static startCallbackServer(resolve, reject) {
        this.callbackServer = http.createServer(async (req, res) => {
            const url = new URL(req.url || '', `http://localhost:43823`);
            if (url.pathname === '/callback') {
                const code = url.searchParams.get('code');
                const error = url.searchParams.get('error');
                // Send response to browser
                res.writeHead(200, { 'Content-Type': 'text/html' });
                if (code) {
                    res.end(`
            <html>
              <body style="font-family: sans-serif; text-align: center; padding: 50px;">
                <h1 style="color: #10b981;">✓ Authentication Successful!</h1>
                <p>You can close this window and return to Marix.</p>
                <script>window.close();</script>
              </body>
            </html>
          `);
                }
                else {
                    res.end(`
            <html>
              <body style="font-family: sans-serif; text-align: center; padding: 50px;">
                <h1 style="color: #ef4444;">✗ Authentication Failed</h1>
                <p>${error || 'Unknown error'}</p>
                <p>You can close this window.</p>
              </body>
            </html>
          `);
                }
                // Close server after response
                this.callbackServer?.close();
                this.callbackServer = null;
                // Process the callback
                if (error) {
                    console.error('[GitLab OAuth] Error from GitLab:', error);
                    this.cleanup();
                    reject(new Error(error));
                    return;
                }
                if (code) {
                    console.log('[GitLab OAuth] Received authorization code');
                    try {
                        const tokens = await this.exchangeCodeForToken(code);
                        this.cleanup();
                        resolve(tokens);
                    }
                    catch (err) {
                        this.cleanup();
                        reject(err);
                    }
                }
            }
        });
        this.callbackServer.listen(43823, () => {
            console.log('[GitLab OAuth] Callback server listening on http://localhost:43823');
        });
        this.callbackServer.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.error('[GitLab OAuth] Port 43823 is already in use');
                reject(new Error('Callback server port is already in use. Please try again.'));
            }
            else {
                reject(err);
            }
        });
    }
    /**
     * Handle OAuth callback with authorization code (legacy protocol handler)
     */
    static handleCallback(url) {
        try {
            const urlObj = new URL(url);
            const code = urlObj.searchParams.get('code');
            const error = urlObj.searchParams.get('error');
            if (error) {
                console.error('[GitLab OAuth] Error from GitLab:', error);
                if (global.gitlabOAuthResolver) {
                    const resolver = global.gitlabOAuthResolver;
                    delete global.gitlabOAuthResolver;
                    resolver(null);
                }
                return;
            }
            if (code && global.gitlabOAuthResolver) {
                console.log('[GitLab OAuth] Received authorization code');
                global.gitlabOAuthResolver(code);
            }
        }
        catch (err) {
            console.error('[GitLab OAuth] Error handling callback:', err);
        }
    }
    /**
     * Handle manual code input (fallback when protocol handler doesn't work)
     */
    static handleManualCode(code) {
        console.log('[GitLab OAuth] Received manual code');
        if (global.gitlabOAuthResolver) {
            global.gitlabOAuthResolver(code);
        }
    }
    /**
     * Exchange authorization code for access token
     */
    static async exchangeCodeForToken(code) {
        if (!this.currentChallenge) {
            throw new Error('No PKCE challenge found');
        }
        const postData = new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            code_verifier: this.currentChallenge.verifier,
            client_id: this.CLIENT_ID,
            redirect_uri: this.REDIRECT_URI
        }).toString();
        console.log('[GitLab OAuth] Exchange token with redirect_uri:', this.REDIRECT_URI);
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
                            }
                            catch (e) {
                                // Ignore parse error
                            }
                            reject(new Error(errorMsg));
                            return;
                        }
                        const tokens = JSON.parse(data);
                        tokens.created_at = Date.now();
                        console.log('[GitLab OAuth] Successfully obtained tokens');
                        resolve(tokens);
                    }
                    catch (err) {
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
    static saveTokens(tokens) {
        try {
            if (!electron_1.safeStorage.isEncryptionAvailable()) {
                throw new Error('Encryption not available on this system');
            }
            const tokenJson = JSON.stringify(tokens);
            const encrypted = electron_1.safeStorage.encryptString(tokenJson);
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
        }
        catch (err) {
            console.error('[GitLab OAuth] Error saving tokens:', err);
            throw err;
        }
    }
    /**
     * Load tokens from secure storage
     */
    static loadTokens() {
        try {
            const fs = require('fs');
            const path = require('path');
            const { app } = require('electron');
            const tokenPath = path.join(app.getPath('userData'), 'gitlab', 'tokens.enc');
            if (!fs.existsSync(tokenPath)) {
                return null;
            }
            const encrypted = fs.readFileSync(tokenPath);
            const decrypted = electron_1.safeStorage.decryptString(encrypted);
            const tokens = JSON.parse(decrypted);
            console.log('[GitLab OAuth] Tokens loaded successfully');
            return tokens;
        }
        catch (err) {
            console.error('[GitLab OAuth] Error loading tokens:', err);
            return null;
        }
    }
    /**
     * Check if tokens are still valid
     */
    static isTokenValid(tokens) {
        if (!tokens)
            return false;
        const now = Date.now();
        const expiresAt = tokens.created_at + (tokens.expires_in * 1000);
        // Consider token valid if it expires in more than 5 minutes
        return expiresAt > now + (5 * 60 * 1000);
    }
    /**
     * Refresh access token using refresh token
     */
    static async refreshToken(tokens) {
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
                        const newTokens = JSON.parse(data);
                        newTokens.created_at = Date.now();
                        console.log('[GitLab OAuth] Token refreshed successfully');
                        resolve(newTokens);
                    }
                    catch (err) {
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
    static async getValidAccessToken() {
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
            }
            catch (err) {
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
    static clearTokens() {
        try {
            const fs = require('fs');
            const path = require('path');
            const { app } = require('electron');
            const tokenPath = path.join(app.getPath('userData'), 'gitlab', 'tokens.enc');
            if (fs.existsSync(tokenPath)) {
                fs.unlinkSync(tokenPath);
                console.log('[GitLab OAuth] Tokens cleared');
            }
        }
        catch (err) {
            console.error('[GitLab OAuth] Error clearing tokens:', err);
        }
    }
    /**
     * Cleanup resources
     */
    static cleanup() {
        this.currentChallenge = null;
        if (this.authWindow && !this.authWindow.isDestroyed()) {
            this.authWindow.close();
            this.authWindow = null;
        }
        if (this.callbackServer) {
            this.callbackServer.close();
            this.callbackServer = null;
        }
    }
}
exports.GitLabOAuthService = GitLabOAuthService;
GitLabOAuthService.CLIENT_ID = 'e9b3e0079b96858eaa49ff567f07a9377f975b503b8b8bc1ea90218928e28974';
GitLabOAuthService.REDIRECT_URI = 'http://localhost:43823/callback';
GitLabOAuthService.GITLAB_AUTH_URL = 'https://gitlab.com/oauth/authorize';
GitLabOAuthService.GITLAB_TOKEN_URL = 'https://gitlab.com/oauth/token';
GitLabOAuthService.currentChallenge = null;
GitLabOAuthService.authWindow = null;
GitLabOAuthService.callbackServer = null;
//# sourceMappingURL=GitLabOAuthService.js.map