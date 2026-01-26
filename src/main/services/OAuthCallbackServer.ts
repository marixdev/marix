import * as http from 'http';
import * as net from 'net';

export interface OAuthCallbackOptions {
  serviceName: string;
  serviceIcon?: string;  // SVG path or emoji
  serviceColor?: string; // Gradient colors
  callbackPath?: string;
  fixedPort?: number;    // Use fixed port instead of random
  useLoopbackIP?: boolean; // Use 127.0.0.1 instead of localhost (RFC 8252 - allows any port)
}

/**
 * Generate the beautiful OAuth callback HTML page
 */
function generateSuccessHTML(options: OAuthCallbackOptions): string {
  const serviceName = options.serviceName || 'Service';
  const color = options.serviceColor || '#10b981, #059669';
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Connected to ${serviceName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
      padding: 20px;
    }
    
    .card {
      background: rgba(15, 23, 42, 0.8);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(100, 116, 139, 0.2);
      border-radius: 24px;
      padding: 48px 40px;
      max-width: 420px;
      width: 100%;
      text-align: center;
      box-shadow: 
        0 25px 50px -12px rgba(0, 0, 0, 0.5),
        0 0 0 1px rgba(255, 255, 255, 0.05),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
      animation: slideUp 0.5s ease-out;
    }
    
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .icon-wrapper {
      position: relative;
      width: 80px;
      height: 80px;
      margin: 0 auto 28px;
    }
    
    .icon-bg {
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, ${color});
      border-radius: 50%;
      animation: pulse 2s ease-in-out infinite;
    }
    
    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.05); opacity: 0.8; }
    }
    
    .icon-ring {
      position: absolute;
      inset: -4px;
      border-radius: 50%;
      border: 2px solid transparent;
      background: linear-gradient(135deg, ${color}) border-box;
      -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      animation: spin 3s linear infinite;
    }
    
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    .icon {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1;
    }
    
    .icon svg {
      width: 40px;
      height: 40px;
      color: white;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
    }
    
    .checkmark {
      stroke-dasharray: 50;
      stroke-dashoffset: 50;
      animation: draw 0.6s ease-out 0.3s forwards;
    }
    
    @keyframes draw {
      to { stroke-dashoffset: 0; }
    }
    
    h1 {
      color: #f8fafc;
      font-size: 26px;
      font-weight: 700;
      margin-bottom: 12px;
      letter-spacing: -0.5px;
    }
    
    .subtitle {
      color: #94a3b8;
      font-size: 15px;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    
    .service-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: linear-gradient(135deg, ${color});
      color: white;
      padding: 10px 20px;
      border-radius: 100px;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
    }
    
    .progress-bar {
      width: 100%;
      height: 4px;
      background: rgba(100, 116, 139, 0.2);
      border-radius: 4px;
      margin-top: 32px;
      overflow: hidden;
    }
    
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, ${color});
      border-radius: 4px;
      animation: progress 2s ease-out forwards;
    }
    
    @keyframes progress {
      from { width: 0%; }
      to { width: 100%; }
    }
    
    .close-hint {
      color: #94a3b8;
      font-size: 14px;
      margin-top: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    
    .close-hint svg {
      color: #10b981;
    }
    
    .keyboard-hint {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(100, 116, 139, 0.15);
      padding: 8px 16px;
      border-radius: 8px;
      margin-top: 16px;
      color: #64748b;
      font-size: 13px;
    }
    
    kbd {
      background: rgba(100, 116, 139, 0.3);
      border: 1px solid rgba(100, 116, 139, 0.4);
      border-radius: 4px;
      padding: 2px 8px;
      font-family: 'SF Mono', Monaco, 'Courier New', monospace;
      font-size: 12px;
      color: #e2e8f0;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-wrapper">
      <div class="icon-bg"></div>
      <div class="icon-ring"></div>
      <div class="icon">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path class="checkmark" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path>
        </svg>
      </div>
    </div>
    
    <h1>Successfully Connected!</h1>
    <p class="subtitle">Your account has been linked successfully. You can now use ${serviceName} with Marix.</p>
    
    <div class="service-badge">
      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
      </svg>
      ${serviceName}
    </div>
    
    <p class="close-hint">
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
      </svg>
      You can safely close this tab and return to Marix
    </p>
    
    <div class="keyboard-hint">
      Press <kbd>Ctrl</kbd> + <kbd>W</kbd> to close
    </div>
  </div>
</body>
</html>`;
}

function generateErrorHTML(options: OAuthCallbackOptions, errorMessage: string): string {
  const serviceName = options.serviceName || 'Service';
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Connection Failed</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
      padding: 20px;
    }
    
    .card {
      background: rgba(15, 23, 42, 0.8);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(100, 116, 139, 0.2);
      border-radius: 24px;
      padding: 48px 40px;
      max-width: 420px;
      width: 100%;
      text-align: center;
      box-shadow: 
        0 25px 50px -12px rgba(0, 0, 0, 0.5),
        0 0 0 1px rgba(255, 255, 255, 0.05),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
      animation: shake 0.5s ease-out;
    }
    
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      20%, 60% { transform: translateX(-5px); }
      40%, 80% { transform: translateX(5px); }
    }
    
    .icon-wrapper {
      position: relative;
      width: 80px;
      height: 80px;
      margin: 0 auto 28px;
    }
    
    .icon-bg {
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, #ef4444, #dc2626);
      border-radius: 50%;
    }
    
    .icon {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .icon svg {
      width: 40px;
      height: 40px;
      color: white;
    }
    
    h1 {
      color: #f8fafc;
      font-size: 26px;
      font-weight: 700;
      margin-bottom: 12px;
    }
    
    .subtitle {
      color: #94a3b8;
      font-size: 15px;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    
    .error-box {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 24px;
    }
    
    .error-label {
      color: #f87171;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    
    .error-message {
      color: #fca5a5;
      font-size: 14px;
      font-family: 'SF Mono', Monaco, 'Courier New', monospace;
      word-break: break-all;
    }
    
    .retry-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(100, 116, 139, 0.2);
      border: 1px solid rgba(100, 116, 139, 0.3);
      color: #e2e8f0;
      padding: 12px 24px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .retry-btn:hover {
      background: rgba(100, 116, 139, 0.3);
    }
    
    .close-hint {
      color: #64748b;
      font-size: 13px;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-wrapper">
      <div class="icon-bg"></div>
      <div class="icon">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </div>
    </div>
    
    <h1>Connection Failed</h1>
    <p class="subtitle">Unable to connect to ${serviceName}. Please try again.</p>
    
    <div class="error-box">
      <div class="error-label">Error Details</div>
      <div class="error-message">${errorMessage}</div>
    </div>
    
    <button class="retry-btn" onclick="window.close()">
      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
      </svg>
      Close Window
    </button>
    
    <p class="close-hint">Return to Marix to try again</p>
  </div>
</body>
</html>`;
}

/**
 * Find an available random port
 */
export function findAvailablePort(startPort: number = 40000, endPort: number = 50000): Promise<number> {
  return new Promise((resolve, reject) => {
    const tryPort = (port: number) => {
      if (port > endPort) {
        reject(new Error('No available port found'));
        return;
      }

      const server = net.createServer();
      server.unref();
      server.on('error', () => {
        // Port in use, try next
        tryPort(port + 1);
      });
      server.listen(port, () => {
        server.close(() => {
          resolve(port);
        });
      });
    };

    // Start from a random port in the range
    const randomStart = startPort + Math.floor(Math.random() * (endPort - startPort));
    tryPort(randomStart);
  });
}

/**
 * Modern OAuth Callback Server with beautiful UI
 */
export class OAuthCallbackServer {
  private server: http.Server | null = null;
  private port: number = 0;
  private options: OAuthCallbackOptions;
  private resolveCallback: ((result: { code: string; port: number }) => void) | null = null;
  private rejectCallback: ((error: Error) => void) | null = null;

  constructor(options: OAuthCallbackOptions) {
    this.options = {
      callbackPath: '/callback',
      ...options
    };
  }

  /**
   * Get the current port (after server started)
   */
  getPort(): number {
    return this.port;
  }

  /**
   * Get the callback URL
   */
  getCallbackUrl(): string {
    const host = this.options.useLoopbackIP ? '127.0.0.1' : 'localhost';
    return `http://${host}:${this.port}${this.options.callbackPath}`;
  }

  /**
   * Start HTTP server - waits for port assignment before returning
   */
  startServer(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        const url = new URL(req.url!, `http://localhost:${this.port}`);
        
        if (url.pathname === this.options.callbackPath) {
          const code = url.searchParams.get('code');
          const error = url.searchParams.get('error');
          const errorDescription = url.searchParams.get('error_description');

          if (error) {
            const errorMsg = errorDescription || error;
            res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(generateErrorHTML(this.options, errorMsg));
            this.stop();
            if (this.rejectCallback) {
              this.rejectCallback(new Error(errorMsg));
              this.rejectCallback = null;
              this.resolveCallback = null;
            }
            return;
          }

          if (code) {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(generateSuccessHTML(this.options));
            this.stop();
            if (this.resolveCallback) {
              this.resolveCallback({ code, port: this.port });
              this.resolveCallback = null;
              this.rejectCallback = null;
            }
            return;
          }

          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(generateErrorHTML(this.options, 'Missing authorization code'));
          this.stop();
          if (this.rejectCallback) {
            this.rejectCallback(new Error('Missing authorization code'));
            this.rejectCallback = null;
            this.resolveCallback = null;
          }
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not found');
        }
      });

      this.server.on('error', (err) => {
        console.error(`[OAuthCallback:${this.options.serviceName}] Server error:`, err);
        reject(err);
      });

      // Listen on fixed port or 0 for OS-assigned random port
      const listenPort = this.options.fixedPort || 0;
      this.server.listen(listenPort, '127.0.0.1', () => {
        const address = this.server?.address();
        if (typeof address === 'object' && address) {
          this.port = address.port;
          console.log(`[OAuthCallback:${this.options.serviceName}] Server listening on http://localhost:${this.port}`);
          resolve(this.port);
        } else {
          console.error(`[OAuthCallback:${this.options.serviceName}] Failed to get server address`);
          this.stop();
          reject(new Error('Failed to start callback server'));
        }
      });
    });
  }

  /**
   * Wait for OAuth callback.
   * If startServer() was already called, just wait for callback
   */
  async start(): Promise<{ code: string; port: number }> {
    // Only start server if not already running
    if (!this.server) {
      await this.startServer();
    }
    
    return new Promise((resolve, reject) => {
      this.resolveCallback = resolve;
      this.rejectCallback = reject;

      // Timeout after 5 minutes
      setTimeout(() => {
        if (this.server && this.rejectCallback) {
          this.stop();
          this.rejectCallback(new Error('OAuth timeout - no response received'));
          this.rejectCallback = null;
          this.resolveCallback = null;
        }
      }, 5 * 60 * 1000);
    });
  }

  /**
   * Stop the server
   */
  stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
      console.log(`[OAuthCallback:${this.options.serviceName}] Server stopped`);
    }
  }
}

// Service-specific configurations
export const GoogleDriveOAuthServer = () => new OAuthCallbackServer({
  serviceName: 'Google Drive',
  serviceColor: '#4285f4, #34a853',
  callbackPath: '/oauth2callback'
});

export const BoxOAuthServer = () => new OAuthCallbackServer({
  serviceName: 'Box',
  serviceColor: '#0061d5, #0048a8',
  callbackPath: '/callback'
});

export const GitLabOAuthServer = () => new OAuthCallbackServer({
  serviceName: 'GitLab',
  serviceColor: '#fc6d26, #e24329',
  callbackPath: '/callback',
  useLoopbackIP: true  // RFC 8252: 127.0.0.1 allows any port
});

export const GitHubOAuthServer = () => new OAuthCallbackServer({
  serviceName: 'GitHub',
  serviceColor: '#6e5494, #4078c0',
  callbackPath: '/callback'
});
