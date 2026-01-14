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
exports.BoxOAuthService = void 0;
const electron_1 = require("electron");
const crypto_1 = require("crypto");
const https = __importStar(require("https"));
const http = __importStar(require("http"));
class BoxOAuthService {
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
                const authUrl = new URL(this.BOX_AUTH_URL);
                authUrl.searchParams.set('client_id', this.CLIENT_ID);
                authUrl.searchParams.set('redirect_uri', this.REDIRECT_URI);
                authUrl.searchParams.set('response_type', 'code');
                authUrl.searchParams.set('code_challenge', this.currentChallenge.challenge);
                authUrl.searchParams.set('code_challenge_method', 'S256');
                console.log('[Box OAuth] Opening authorization URL:', authUrl.toString());
                // Open in external browser
                electron_1.shell.openExternal(authUrl.toString());
                // Set timeout for OAuth flow (5 minutes)
                const timeout = setTimeout(() => {
                    this.cleanup();
                    reject(new Error('OAuth flow timed out'));
                }, 5 * 60 * 1000);
                // Store resolver for callback
                global.boxOAuthResolver = async (code) => {
                    clearTimeout(timeout);
                    try {
                        const tokens = await this.exchangeCodeForToken(code);
                        this.cleanup();
                        resolve(tokens);
                    }
                    catch (error) {
                        this.cleanup();
                        reject(error);
                    }
                };
                global.boxOAuthRejecter = (error) => {
                    clearTimeout(timeout);
                    this.cleanup();
                    reject(error);
                };
            }
            catch (error) {
                this.cleanup();
                reject(error);
            }
        });
    }
    /**
     * Start HTTP callback server on localhost
     */
    static startCallbackServer(resolve, reject) {
        // Close existing server if any
        if (this.callbackServer) {
            this.callbackServer.close();
            this.callbackServer = null;
        }
        this.callbackServer = http.createServer((req, res) => {
            const url = new URL(req.url || '', `http://localhost:43823`);
            // Check if this is Box callback
            if (url.pathname === '/callback' && url.searchParams.has('code')) {
                const code = url.searchParams.get('code');
                const error = url.searchParams.get('error');
                const errorDescription = url.searchParams.get('error_description');
                if (error) {
                    console.error('[Box OAuth] Error from Box:', error, errorDescription);
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Box Authentication Failed</title>
              <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f44336; color: white; }
                h1 { font-size: 24px; margin-bottom: 20px; }
                p { font-size: 16px; }
              </style>
            </head>
            <body>
              <h1>❌ Authentication Failed</h1>
              <p>${errorDescription || error}</p>
              <p>You can close this window and try again.</p>
            </body>
            </html>
          `);
                    if (global.boxOAuthRejecter) {
                        global.boxOAuthRejecter(new Error(errorDescription || error));
                    }
                    return;
                }
                if (code) {
                    console.log('[Box OAuth] Received authorization code');
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Box Authentication Successful</title>
              <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #4CAF50; color: white; }
                h1 { font-size: 24px; margin-bottom: 20px; }
                p { font-size: 16px; }
              </style>
            </head>
            <body>
              <h1>✓ Authentication Successful</h1>
              <p>You can close this window and return to Marix.</p>
            </body>
            </html>
          `);
                    // Call the resolver
                    if (global.boxOAuthResolver) {
                        global.boxOAuthResolver(code);
                    }
                    return;
                }
            }
            // Unknown request
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
        });
        this.callbackServer.listen(43823, () => {
            console.log('[Box OAuth] HTTP callback server listening on http://localhost:43823');
        });
        this.callbackServer.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.log('[Box OAuth] Port 43823 already in use, server might already be running');
            }
            else {
                console.error('[Box OAuth] Server error:', error);
                reject(error);
            }
        });
    }
    /**
     * Exchange authorization code for access token using PKCE
     */
    static async exchangeCodeForToken(code) {
        if (!this.currentChallenge) {
            throw new Error('No PKCE challenge found');
        }
        return new Promise((resolve, reject) => {
            const postData = new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                client_id: this.CLIENT_ID,
                client_secret: this.CLIENT_SECRET,
                code_verifier: this.currentChallenge.verifier,
            }).toString();
            const url = new URL(this.BOX_TOKEN_URL);
            const options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(postData),
                },
            };
            console.log('[Box OAuth] Exchanging code for token...');
            const req = https.request(url, options, (res) => {
                let data = '';
                res.on('data', (chunk) => (data += chunk));
                res.on('end', () => {
                    console.log('[Box OAuth] Token exchange response status:', res.statusCode);
                    if (res.statusCode === 200) {
                        try {
                            const tokens = JSON.parse(data);
                            tokens.created_at = Math.floor(Date.now() / 1000);
                            console.log('[Box OAuth] Token received successfully');
                            resolve(tokens);
                        }
                        catch (error) {
                            console.error('[Box OAuth] Failed to parse token response:', error);
                            reject(new Error('Failed to parse token response'));
                        }
                    }
                    else {
                        console.error('[Box OAuth] Token exchange failed:', data);
                        try {
                            const errorData = JSON.parse(data);
                            reject(new Error(errorData.error_description || errorData.error || 'Token exchange failed'));
                        }
                        catch {
                            reject(new Error(`Token exchange failed with status ${res.statusCode}`));
                        }
                    }
                });
            });
            req.on('error', (error) => {
                console.error('[Box OAuth] Request error:', error);
                reject(error);
            });
            req.write(postData);
            req.end();
        });
    }
    /**
     * Refresh access token using refresh token
     */
    static async refreshAccessToken(refreshToken) {
        return new Promise((resolve, reject) => {
            const postData = new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
                client_id: this.CLIENT_ID,
                client_secret: this.CLIENT_SECRET,
            }).toString();
            const url = new URL(this.BOX_TOKEN_URL);
            const options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(postData),
                },
            };
            console.log('[Box OAuth] Refreshing access token...');
            const req = https.request(url, options, (res) => {
                let data = '';
                res.on('data', (chunk) => (data += chunk));
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            const tokens = JSON.parse(data);
                            tokens.created_at = Math.floor(Date.now() / 1000);
                            console.log('[Box OAuth] Token refreshed successfully');
                            resolve(tokens);
                        }
                        catch (error) {
                            console.error('[Box OAuth] Failed to parse refresh response:', error);
                            reject(new Error('Failed to parse refresh response'));
                        }
                    }
                    else {
                        console.error('[Box OAuth] Token refresh failed:', data);
                        reject(new Error('Failed to refresh token'));
                    }
                });
            });
            req.on('error', (error) => {
                console.error('[Box OAuth] Refresh request error:', error);
                reject(error);
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
            const encryptedData = electron_1.safeStorage.encryptString(JSON.stringify(tokens));
            const { app } = require('electron');
            const fs = require('fs');
            const path = require('path');
            const userDataPath = app.getPath('userData');
            const tokenPath = path.join(userDataPath, 'box-tokens.enc');
            fs.writeFileSync(tokenPath, encryptedData);
            console.log('[Box OAuth] Tokens saved successfully');
        }
        catch (error) {
            console.error('[Box OAuth] Failed to save tokens:', error);
            throw error;
        }
    }
    /**
     * Load tokens from secure storage
     */
    static loadTokens() {
        try {
            const { app } = require('electron');
            const fs = require('fs');
            const path = require('path');
            const userDataPath = app.getPath('userData');
            const tokenPath = path.join(userDataPath, 'box-tokens.enc');
            if (!fs.existsSync(tokenPath)) {
                console.log('[Box OAuth] No tokens found');
                return null;
            }
            const encryptedData = fs.readFileSync(tokenPath);
            const decryptedData = electron_1.safeStorage.decryptString(encryptedData);
            const tokens = JSON.parse(decryptedData);
            console.log('[Box OAuth] Tokens loaded successfully');
            return tokens;
        }
        catch (error) {
            console.error('[Box OAuth] Failed to load tokens:', error);
            return null;
        }
    }
    /**
     * Delete stored tokens (logout)
     */
    static deleteTokens() {
        try {
            const { app } = require('electron');
            const fs = require('fs');
            const path = require('path');
            const userDataPath = app.getPath('userData');
            const tokenPath = path.join(userDataPath, 'box-tokens.enc');
            if (fs.existsSync(tokenPath)) {
                fs.unlinkSync(tokenPath);
                console.log('[Box OAuth] Tokens deleted');
            }
        }
        catch (error) {
            console.error('[Box OAuth] Failed to delete tokens:', error);
            throw error;
        }
    }
    /**
     * Check if tokens are valid and refresh if needed
     */
    static async getValidAccessToken() {
        try {
            const tokens = this.loadTokens();
            if (!tokens) {
                console.log('[Box OAuth] No tokens found');
                return null;
            }
            const now = Math.floor(Date.now() / 1000);
            const expiresAt = tokens.created_at + tokens.expires_in;
            const timeUntilExpiry = expiresAt - now;
            console.log('[Box OAuth] Token expires in', timeUntilExpiry, 'seconds');
            // If token expires in less than 5 minutes, refresh it
            if (timeUntilExpiry < 300) {
                console.log('[Box OAuth] Token expiring soon, refreshing...');
                const newTokens = await this.refreshAccessToken(tokens.refresh_token);
                this.saveTokens(newTokens);
                return newTokens.access_token;
            }
            console.log('[Box OAuth] Token is valid');
            return tokens.access_token;
        }
        catch (error) {
            console.error('[Box OAuth] Error getting valid token:', error);
            return null;
        }
    }
    /**
     * Handle OAuth callback from protocol handler (legacy support)
     */
    static handleCallback(url) {
        try {
            const urlObj = new URL(url);
            const code = urlObj.searchParams.get('code');
            const error = urlObj.searchParams.get('error');
            if (error) {
                console.error('[Box OAuth] Error from callback:', error);
                if (global.boxOAuthRejecter) {
                    global.boxOAuthRejecter(new Error(error));
                }
                return;
            }
            if (code && global.boxOAuthResolver) {
                console.log('[Box OAuth] Code received from callback');
                global.boxOAuthResolver(code);
            }
        }
        catch (error) {
            console.error('[Box OAuth] Failed to handle callback:', error);
            if (global.boxOAuthRejecter) {
                global.boxOAuthRejecter(error);
            }
        }
    }
    /**
     * Handle manual code submission (fallback)
     */
    static handleManualCode(code) {
        if (global.boxOAuthResolver) {
            console.log('[Box OAuth] Manual code submitted');
            global.boxOAuthResolver(code);
        }
    }
    /**
     * Cleanup resources
     */
    static cleanup() {
        if (this.callbackServer) {
            this.callbackServer.close();
            this.callbackServer = null;
        }
        if (this.authWindow && !this.authWindow.isDestroyed()) {
            this.authWindow.close();
            this.authWindow = null;
        }
        this.currentChallenge = null;
        delete global.boxOAuthResolver;
        delete global.boxOAuthRejecter;
    }
}
exports.BoxOAuthService = BoxOAuthService;
BoxOAuthService.CLIENT_ID = 'wktv4vmn1a7vroplh7pujybbqq818bmw';
BoxOAuthService.CLIENT_SECRET = 'cf4xFFPNiWL3pGwHcma3XWLG6M93V6ju';
BoxOAuthService.REDIRECT_URI = 'http://localhost:43823/callback';
BoxOAuthService.BOX_AUTH_URL = 'https://account.box.com/api/oauth2/authorize';
BoxOAuthService.BOX_TOKEN_URL = 'https://api.box.com/oauth2/token';
BoxOAuthService.currentChallenge = null;
BoxOAuthService.authWindow = null;
BoxOAuthService.callbackServer = null;
//# sourceMappingURL=BoxOAuthService.js.map