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
exports.RDPManager = void 0;
const events_1 = require("events");
const child_process_1 = require("child_process");
const os = __importStar(require("os"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class RDPManager {
    constructor() {
        this.connections = new Map();
        this.isWindows = os.platform() === 'win32';
        this.isMacOS = os.platform() === 'darwin';
        this.isLinux = os.platform() === 'linux';
    }
    /**
     * Check if RDP dependencies are installed (Linux only)
     */
    checkDependencies() {
        if (!this.isLinux) {
            return { xfreerdp3: true, xdotool: true, distro: 'unknown' };
        }
        let xfreerdp3 = false;
        let xdotool = false;
        let distro = 'unknown';
        // Check xfreerdp3
        try {
            (0, child_process_1.execSync)('which xfreerdp3', { stdio: 'pipe' });
            xfreerdp3 = true;
        }
        catch {
            // Also check for xfreerdp (older name)
            try {
                (0, child_process_1.execSync)('which xfreerdp', { stdio: 'pipe' });
                xfreerdp3 = true;
            }
            catch {
                xfreerdp3 = false;
            }
        }
        // Check xdotool
        try {
            (0, child_process_1.execSync)('which xdotool', { stdio: 'pipe' });
            xdotool = true;
        }
        catch {
            xdotool = false;
        }
        // Detect Linux distribution
        try {
            if (fs.existsSync('/etc/os-release')) {
                const osRelease = fs.readFileSync('/etc/os-release', 'utf8');
                if (osRelease.includes('ID=debian') || osRelease.includes('ID=ubuntu') || osRelease.includes('ID_LIKE=debian')) {
                    distro = 'debian';
                }
                else if (osRelease.includes('ID=fedora') || osRelease.includes('ID=rhel') || osRelease.includes('ID_LIKE=fedora')) {
                    distro = 'fedora';
                }
                else if (osRelease.includes('ID=arch') || osRelease.includes('ID_LIKE=arch')) {
                    distro = 'arch';
                }
            }
        }
        catch {
            distro = 'unknown';
        }
        console.log(`[RDPManager] Dependencies check: xfreerdp3=${xfreerdp3}, xdotool=${xdotool}, distro=${distro}`);
        return { xfreerdp3, xdotool, distro };
    }
    /**
     * Get installation commands for missing dependencies
     */
    getInstallCommands(deps) {
        const commands = [];
        if (deps.xfreerdp3 && deps.xdotool) {
            return commands;
        }
        const packages = [];
        if (!deps.xfreerdp3) {
            switch (deps.distro) {
                case 'debian':
                    packages.push('freerdp3-x11');
                    break;
                case 'fedora':
                    packages.push('freerdp');
                    break;
                case 'arch':
                    packages.push('freerdp');
                    break;
                default:
                    packages.push('freerdp3-x11'); // Default to Debian package name
            }
        }
        if (!deps.xdotool) {
            packages.push('xdotool');
        }
        if (packages.length === 0)
            return commands;
        // Use pkexec instead of sudo - it shows a GUI password dialog
        switch (deps.distro) {
            case 'debian':
                commands.push(`pkexec apt update`);
                commands.push(`pkexec apt install -y ${packages.join(' ')}`);
                break;
            case 'fedora':
                commands.push(`pkexec dnf install -y ${packages.join(' ')}`);
                break;
            case 'arch':
                commands.push(`pkexec pacman -S --noconfirm ${packages.join(' ')}`);
                break;
            default:
                // Try apt as default
                commands.push(`pkexec apt update`);
                commands.push(`pkexec apt install -y ${packages.join(' ')}`);
        }
        return commands;
    }
    /**
     * Install missing dependencies with streaming output
     */
    installDependencies(deps, onData, onComplete) {
        const commands = this.getInstallCommands(deps);
        if (commands.length === 0) {
            onData('✓ All dependencies are already installed\n');
            onComplete(true);
            return;
        }
        const runCommands = async () => {
            for (const cmd of commands) {
                onData(`\x1b[36m$ ${cmd}\x1b[0m\n`);
                try {
                    const success = await this.runCommandWithStream(cmd, onData);
                    if (!success) {
                        onData(`\x1b[31m✗ Command failed: ${cmd}\x1b[0m\n`);
                        onComplete(false);
                        return;
                    }
                }
                catch (err) {
                    onData(`\x1b[31m✗ Error: ${err.message}\x1b[0m\n`);
                    onComplete(false);
                    return;
                }
            }
            onData(`\x1b[32m✓ Dependencies installed successfully!\x1b[0m\n`);
            onComplete(true);
        };
        runCommands();
    }
    /**
     * Run a command with streaming output
     */
    runCommandWithStream(cmd, onData) {
        return new Promise((resolve) => {
            const process = (0, child_process_1.spawn)('bash', ['-c', cmd], {
                stdio: ['inherit', 'pipe', 'pipe'],
            });
            process.stdout?.on('data', (data) => {
                onData(data.toString());
            });
            process.stderr?.on('data', (data) => {
                onData(data.toString());
            });
            process.on('close', (code) => {
                resolve(code === 0);
            });
            process.on('error', (err) => {
                onData(`Error: ${err.message}\n`);
                resolve(false);
            });
        });
    }
    /**
     * Create RDP connection to Windows server
     * Uses Microsoft Remote Desktop on macOS, xfreerdp3 on Linux, mstsc on Windows
     */
    connect(connectionId, config) {
        const emitter = new events_1.EventEmitter();
        try {
            console.log(`[RDPManager] Connecting to ${config.host}:${config.port} (platform: ${os.platform()})`);
            if (this.isWindows) {
                return this.connectMstsc(connectionId, config, emitter);
            }
            else if (this.isMacOS) {
                return this.connectMacOS(connectionId, config, emitter);
            }
            else {
                return this.connectXfreerdp(connectionId, config, emitter);
            }
        }
        catch (err) {
            console.error('[RDPManager] Connection error:', err);
            return {
                emitter,
                success: false,
                error: err.message || 'Failed to connect',
            };
        }
    }
    /**
     * Connect using mstsc (Windows)
     */
    connectMstsc(connectionId, config, emitter) {
        const width = config.screen?.width || 1280;
        const height = config.screen?.height || 720;
        // Create .rdp file for mstsc
        const rdpContent = [
            `full address:s:${config.host}:${config.port}`,
            `username:s:${config.domain ? `${config.domain}\\${config.username}` : config.username}`,
            `screen mode id:i:${config.fullscreen ? 2 : 1}`,
            `desktopwidth:i:${width}`,
            `desktopheight:i:${height}`,
            `session bpp:i:32`,
            `compression:i:1`,
            `keyboardhook:i:2`,
            `audiocapturemode:i:0`,
            `videoplaybackmode:i:1`,
            `connection type:i:7`,
            `networkautodetect:i:1`,
            `bandwidthautodetect:i:1`,
            `displayconnectionbar:i:1`,
            `enableworkspacereconnect:i:0`,
            `disable wallpaper:i:0`,
            `allow font smoothing:i:1`,
            `allow desktop composition:i:1`,
            `disable full window drag:i:0`,
            `disable menu anims:i:0`,
            `disable themes:i:0`,
            `disable cursor setting:i:0`,
            `bitmapcachepersistenable:i:1`,
            `redirectclipboard:i:1`,
            `redirectprinters:i:0`,
            `redirectcomports:i:0`,
            `redirectsmartcards:i:0`,
            `redirectdrives:i:0`,
            `autoreconnection enabled:i:1`,
            `authentication level:i:0`,
            `prompt for credentials:i:0`,
            `negotiate security layer:i:1`,
            `remoteapplicationmode:i:0`,
            `gatewayusagemethod:i:4`,
            `gatewaycredentialssource:i:4`,
            `gatewayprofileusagemethod:i:0`,
            `promptcredentialonce:i:0`,
            `use redirection server name:i:0`,
        ].join('\r\n');
        // Save .rdp file to temp directory
        const tempDir = os.tmpdir();
        const rdpFilePath = path.join(tempDir, `marix_rdp_${connectionId}.rdp`);
        fs.writeFileSync(rdpFilePath, rdpContent);
        console.log(`[RDPManager] Created RDP file: ${rdpFilePath}`);
        // Store credentials using cmdkey for seamless login
        const credTarget = `TERMSRV/${config.host}`;
        const credUser = config.domain ? `${config.domain}\\${config.username}` : config.username;
        (0, child_process_1.exec)(`cmdkey /generic:"${credTarget}" /user:"${credUser}" /pass:"${config.password}"`, (err) => {
            if (err) {
                console.log('[RDPManager] cmdkey warning:', err.message);
            }
        });
        // Launch mstsc
        const rdpProcess = (0, child_process_1.spawn)('mstsc', [rdpFilePath], {
            detached: true,
            stdio: 'ignore',
            shell: true,
        });
        rdpProcess.unref();
        rdpProcess.on('error', (err) => {
            console.error(`[RDPManager] mstsc error:`, err);
            emitter.emit('error', err);
        });
        // Store connection
        this.connections.set(connectionId, {
            process: rdpProcess,
            connected: true,
            emitter,
            config,
            rdpFilePath,
        });
        setTimeout(() => {
            emitter.emit('connect');
        }, 1000);
        return { emitter, success: true };
    }
    /**
     * Connect using Microsoft Remote Desktop (macOS)
     */
    connectMacOS(connectionId, config, emitter) {
        const width = config.screen?.width || 1280;
        const height = config.screen?.height || 720;
        // Create .rdp file for Microsoft Remote Desktop on macOS
        const rdpContent = [
            `full address:s:${config.host}:${config.port}`,
            `username:s:${config.domain ? `${config.domain}\\${config.username}` : config.username}`,
            `screen mode id:i:${config.fullscreen ? 2 : 1}`,
            `desktopwidth:i:${width}`,
            `desktopheight:i:${height}`,
            `session bpp:i:32`,
            `compression:i:1`,
            `keyboardhook:i:2`,
            `audiocapturemode:i:0`,
            `videoplaybackmode:i:1`,
            `connection type:i:7`,
            `networkautodetect:i:1`,
            `bandwidthautodetect:i:1`,
            `displayconnectionbar:i:1`,
            `disable wallpaper:i:0`,
            `allow font smoothing:i:1`,
            `allow desktop composition:i:1`,
            `disable full window drag:i:0`,
            `disable menu anims:i:0`,
            `disable themes:i:0`,
            `redirectclipboard:i:1`,
            `redirectprinters:i:0`,
            `redirectdrives:i:0`,
            `autoreconnection enabled:i:1`,
            `authentication level:i:0`,
            `prompt for credentials:i:1`, // macOS app handles credentials via its own UI
            `negotiate security layer:i:1`,
        ].join('\r\n');
        // Save .rdp file to temp directory
        const tempDir = os.tmpdir();
        const rdpFilePath = path.join(tempDir, `marix_rdp_${connectionId}.rdp`);
        fs.writeFileSync(rdpFilePath, rdpContent);
        console.log(`[RDPManager] Created RDP file for macOS: ${rdpFilePath}`);
        // Try to open with Microsoft Remote Desktop app
        // The app can be installed from Mac App Store or via brew: brew install --cask microsoft-remote-desktop
        const rdpProcess = (0, child_process_1.spawn)('open', ['-a', 'Microsoft Remote Desktop', rdpFilePath], {
            detached: true,
            stdio: 'ignore',
        });
        rdpProcess.unref();
        rdpProcess.on('error', (err) => {
            console.error(`[RDPManager] Microsoft Remote Desktop error:`, err);
            // Fallback: try opening .rdp file directly (will use default app)
            const fallbackProcess = (0, child_process_1.spawn)('open', [rdpFilePath], {
                detached: true,
                stdio: 'ignore',
            });
            fallbackProcess.unref();
            fallbackProcess.on('error', (fallbackErr) => {
                console.error(`[RDPManager] Fallback open error:`, fallbackErr);
                emitter.emit('error', new Error('Microsoft Remote Desktop is not installed. Please install it from the Mac App Store.'));
            });
        });
        // Store connection
        this.connections.set(connectionId, {
            process: rdpProcess,
            connected: true,
            emitter,
            config,
            rdpFilePath,
        });
        // Emit connect after a short delay (app opens externally)
        setTimeout(() => {
            emitter.emit('connect');
        }, 1500);
        return { emitter, success: true };
    }
    /**
     * Connect using xfreerdp3 (Linux)
     */
    connectXfreerdp(connectionId, config, emitter) {
        const width = config.screen?.width || 1280;
        const height = config.screen?.height || 720;
        const args = [
            `/v:${config.host}:${config.port}`,
            `/u:${config.username}`,
            `/p:${config.password}`,
            `/t:RDP - ${config.host}`,
            '/cert:ignore',
            '/sec:nla',
            '/tls:seclevel:0',
            '+clipboard',
            '/dynamic-resolution',
            '/network:auto',
            '/gfx',
            '/bpp:32',
            '+auto-reconnect',
        ];
        if (config.fullscreen) {
            args.push('/f');
        }
        else {
            args.push(`/size:${width}x${height}`);
        }
        if (config.domain) {
            args.push(`/d:${config.domain}`);
        }
        console.log(`[RDPManager] Running: xfreerdp3 ${args.join(' ').replace(config.password, '****')}`);
        const rdpProcess = (0, child_process_1.spawn)('xfreerdp3', args, {
            detached: true,
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        let connected = false;
        rdpProcess.stdout?.on('data', (data) => {
            const output = data.toString();
            console.log(`[RDPManager] stdout: ${output}`);
            if (!connected && (output.includes('connected') || output.includes('Connection'))) {
                connected = true;
                const conn = this.connections.get(connectionId);
                if (conn)
                    conn.connected = true;
                emitter.emit('connect');
            }
        });
        rdpProcess.stderr?.on('data', (data) => {
            const output = data.toString();
            console.log(`[RDPManager] stderr: ${output}`);
            if (output.includes('[ERROR]') &&
                !output.includes('CONNECT_CANCELLED') &&
                !output.includes('term_handler') &&
                (output.includes('ERRCONNECT') ||
                    output.includes('connect failed') ||
                    output.includes('Authentication failure') ||
                    output.includes('unable to connect'))) {
                emitter.emit('error', new Error(output.trim()));
            }
        });
        rdpProcess.on('close', (code) => {
            console.log(`[RDPManager] xfreerdp3 exited with code ${code}`);
            this.connections.delete(connectionId);
            emitter.emit('close');
        });
        rdpProcess.on('error', (err) => {
            console.error(`[RDPManager] Process error:`, err);
            emitter.emit('error', err);
        });
        this.connections.set(connectionId, {
            process: rdpProcess,
            connected: false,
            emitter,
            config,
        });
        setTimeout(() => {
            const conn = this.connections.get(connectionId);
            if (conn && !conn.connected) {
                conn.connected = true;
                emitter.emit('connect');
            }
        }, 2000);
        return { emitter, success: true };
    }
    /**
     * Disconnect RDP session
     */
    disconnect(connectionId) {
        const conn = this.connections.get(connectionId);
        if (conn) {
            try {
                if (!conn.process.killed) {
                    conn.process.kill('SIGTERM');
                }
                if (this.isWindows) {
                    const credTarget = `TERMSRV/${conn.config.host}`;
                    (0, child_process_1.exec)(`cmdkey /delete:"${credTarget}"`, () => { });
                    if (conn.rdpFilePath && fs.existsSync(conn.rdpFilePath)) {
                        fs.unlinkSync(conn.rdpFilePath);
                    }
                }
            }
            catch (err) {
                console.error(`[RDPManager] Error killing process ${connectionId}:`, err);
            }
            this.connections.delete(connectionId);
            console.log(`[RDPManager] Disconnected: ${connectionId}`);
        }
    }
    /**
     * Check if connection exists and is active
     */
    isConnected(connectionId) {
        const conn = this.connections.get(connectionId);
        return conn?.connected ?? false;
    }
    /**
     * Close all connections - called when app is closing
     */
    closeAll() {
        console.log(`[RDPManager] Closing all ${this.connections.size} RDP connections...`);
        for (const [id, conn] of this.connections) {
            try {
                if (!conn.process.killed) {
                    conn.process.kill('SIGTERM');
                }
                if (this.isWindows) {
                    const credTarget = `TERMSRV/${conn.config.host}`;
                    (0, child_process_1.exec)(`cmdkey /delete:"${credTarget}"`, () => { });
                    if (conn.rdpFilePath && fs.existsSync(conn.rdpFilePath)) {
                        fs.unlinkSync(conn.rdpFilePath);
                    }
                }
            }
            catch (err) {
                console.error(`[RDPManager] Error closing ${id}:`, err);
            }
        }
        this.connections.clear();
        console.log('[RDPManager] All connections closed');
    }
    /**
     * Focus the RDP window using xdotool (Linux only)
     */
    focusWindow(connectionId) {
        if (this.isWindows)
            return;
        const conn = this.connections.get(connectionId);
        if (conn) {
            const title = `RDP - ${conn.config.host}`;
            const xdotool = (0, child_process_1.spawn)('xdotool', ['search', '--name', title, 'windowactivate']);
            xdotool.on('error', (err) => {
                console.error('[RDPManager] xdotool error:', err);
            });
        }
    }
    /**
     * Toggle fullscreen for RDP window (Linux only)
     */
    toggleFullscreen(connectionId) {
        if (this.isWindows)
            return;
        const conn = this.connections.get(connectionId);
        if (conn) {
            const title = `RDP - ${conn.config.host}`;
            const findWindow = (0, child_process_1.spawn)('xdotool', ['search', '--name', title]);
            let windowId = '';
            findWindow.stdout.on('data', (data) => {
                windowId = data.toString().trim().split('\n')[0];
            });
            findWindow.on('close', () => {
                if (windowId) {
                    (0, child_process_1.spawn)('xdotool', ['windowactivate', '--sync', windowId], {
                        stdio: 'ignore'
                    }).on('close', () => {
                        (0, child_process_1.spawn)('xdotool', ['key', '--window', windowId, 'ctrl+alt+Return'], {
                            stdio: 'ignore'
                        });
                    });
                }
            });
            findWindow.on('error', (err) => {
                console.error('[RDPManager] xdotool error:', err);
            });
        }
    }
    // These methods are no longer needed with xfreerdp (it handles input natively)
    sendMouse(connectionId, x, y, button, isPressed) { }
    sendWheel(connectionId, x, y, step, isNegative, isHorizontal) { }
    sendScancode(connectionId, code, isPressed) { }
    sendUnicode(connectionId, code, isPressed) { }
}
exports.RDPManager = RDPManager;
//# sourceMappingURL=RDPManager.js.map