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
const electron_1 = require("electron");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const NativeSSHManager_1 = require("./services/NativeSSHManager");
const SSHConnectionManager_1 = require("./services/SSHConnectionManager");
const SFTPManager_1 = require("./services/SFTPManager");
const FTPManager_1 = require("./services/FTPManager");
const RDPManager_1 = require("./services/RDPManager");
const WSSManager_1 = require("./services/WSSManager");
const ServerStore_1 = require("./services/ServerStore");
const BackupService_1 = require("./services/BackupService");
const CloudflareService_1 = require("./services/CloudflareService");
const WhoisService_1 = require("./services/WhoisService");
const NetworkToolsService_1 = require("./services/NetworkToolsService");
const GitHubAuthService_1 = require("./services/GitHubAuthService");
const KnownHostsService_1 = require("./services/KnownHostsService");
const SSHKeyService_1 = require("./services/SSHKeyService");
const PortForwardingService_1 = require("./services/PortForwardingService");
const GitLabOAuthService_1 = require("./services/GitLabOAuthService");
const GitLabApiService_1 = require("./services/GitLabApiService");
const BoxOAuthService_1 = require("./services/BoxOAuthService");
const BoxApiService_1 = require("./services/BoxApiService");
const PortKnockService_1 = require("./services/PortKnockService");
let mainWindow = null;
let tray = null;
const nativeSSH = new NativeSSHManager_1.NativeSSHManager(); // For terminal (with MOTD)
const sshManager = new SSHConnectionManager_1.SSHConnectionManager(); // For SFTP
const sftpManager = new SFTPManager_1.SFTPManager();
const ftpManager = new FTPManager_1.FTPManager(); // For FTP/FTPS
const rdpManager = new RDPManager_1.RDPManager(); // For RDP/Windows
const wssManager = new WSSManager_1.WSSManager(); // For WebSocket Secure
const serverStore = new ServerStore_1.ServerStore(); // For persistent server storage
const backupService = new BackupService_1.BackupService(); // For backup/restore
const githubAuthService = new GitHubAuthService_1.GitHubAuthService(); // For GitHub OAuth
function createTray() {
    // Try multiple icon paths
    const iconPaths = [
        path.join(__dirname, '../../icon/i.png'),
        path.join(__dirname, '../icon/i.png'),
        path.join(electron_1.app.getAppPath(), 'icon/i.png'),
    ];
    let iconPath = '';
    for (const p of iconPaths) {
        if (fs.existsSync(p)) {
            iconPath = p;
            break;
        }
    }
    if (!iconPath) {
        console.log('[Tray] Icon not found, skipping tray creation');
        return;
    }
    const icon = electron_1.nativeImage.createFromPath(iconPath);
    tray = new electron_1.Tray(icon.resize({ width: 16, height: 16 }));
    const contextMenu = electron_1.Menu.buildFromTemplate([
        {
            label: 'Show Marix',
            click: () => {
                mainWindow?.show();
                mainWindow?.focus();
            }
        },
        { type: 'separator' },
        {
            label: 'Exit',
            click: () => {
                electron_1.app.quit();
            }
        }
    ]);
    tray.setToolTip('Marix SSH Client');
    tray.setContextMenu(contextMenu);
    tray.on('click', () => {
        mainWindow?.show();
        mainWindow?.focus();
    });
}
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1400,
        height: 900,
        frame: false,
        titleBarStyle: 'hidden',
        icon: path.join(__dirname, '../../icon/i.png'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            backgroundThrottling: false, // Keep app responsive in background
            spellcheck: false, // Disable spellcheck for performance
        },
        backgroundColor: '#1a1d2e',
        show: false, // Don't show until ready
    });
    // Show window when ready to prevent white flash
    mainWindow.once('ready-to-show', () => {
        mainWindow?.show();
    });
    // Optimize rendering
    mainWindow.webContents.on('did-finish-load', () => {
        // Force garbage collection hint
        if (global.gc) {
            global.gc();
        }
    });
    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:8080');
        mainWindow.webContents.openDevTools();
    }
    else {
        mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
electron_1.app.whenReady().then(() => {
    // Register protocol handler for OAuth callbacks
    if (process.defaultApp) {
        if (process.argv.length >= 2) {
            electron_1.app.setAsDefaultProtocolClient('marix', process.execPath, [path.resolve(process.argv[1])]);
        }
    }
    else {
        electron_1.app.setAsDefaultProtocolClient('marix');
    }
    // Handle protocol URL from command line args (Linux)
    const protocolUrl = process.argv.find(arg => arg.startsWith('marix://'));
    if (protocolUrl) {
        console.log('[Protocol] Received URL from argv:', protocolUrl);
        setTimeout(() => {
            if (protocolUrl.startsWith('marix://oauth/gitlab')) {
                GitLabOAuthService_1.GitLabOAuthService.handleCallback(protocolUrl);
            }
        }, 1000); // Wait for app to initialize
    }
    createWindow();
    createTray();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
// Handle protocol URLs (OAuth callbacks)
electron_1.app.on('open-url', (event, url) => {
    event.preventDefault();
    console.log('[Protocol] Received URL:', url);
    if (url.startsWith('marix://oauth/gitlab')) {
        GitLabOAuthService_1.GitLabOAuthService.handleCallback(url);
    }
});
// Handle protocol URLs on Windows
const gotTheLock = electron_1.app.requestSingleInstanceLock();
if (!gotTheLock) {
    electron_1.app.quit();
}
else {
    electron_1.app.on('second-instance', (event, commandLine) => {
        // Handle protocol URL on Windows (from commandLine)
        const url = commandLine.find(arg => arg.startsWith('marix://'));
        if (url) {
            console.log('[Protocol] Received URL from second instance:', url);
            if (url.startsWith('marix://oauth/gitlab')) {
                GitLabOAuthService_1.GitLabOAuthService.handleCallback(url);
            }
        }
        // Focus main window
        if (mainWindow) {
            if (mainWindow.isMinimized())
                mainWindow.restore();
            mainWindow.focus();
        }
    });
}
electron_1.app.on('window-all-closed', () => {
    // Close all RDP sessions before quitting
    rdpManager.closeAll();
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
// Cleanup before quit
electron_1.app.on('before-quit', () => {
    console.log('[App] Cleaning up before quit...');
    rdpManager.closeAll();
    nativeSSH.closeAll();
    sshManager.closeAll();
});
// Window control handlers
electron_1.ipcMain.handle('window:minimize', () => {
    mainWindow?.minimize();
});
electron_1.ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
        mainWindow.unmaximize();
    }
    else {
        mainWindow?.maximize();
    }
});
electron_1.ipcMain.handle('window:close', () => {
    mainWindow?.close();
});
// Dialog handler for file selection
electron_1.ipcMain.handle('dialog:openFile', async (event, options) => {
    const result = await electron_1.dialog.showOpenDialog(mainWindow, {
        title: options.title || 'Select File',
        filters: options.filters || [],
        properties: ['openFile'],
    });
    if (result.canceled || result.filePaths.length === 0) {
        return null;
    }
    try {
        const content = fs.readFileSync(result.filePaths[0], 'utf-8');
        return { path: result.filePaths[0], content };
    }
    catch (err) {
        return { error: err.message };
    }
});
// IPC Handlers - Use NativeSSH for terminal (proper MOTD support)
electron_1.ipcMain.handle('ssh:connect', async (event, config) => {
    try {
        // Perform port knocking if enabled
        if (config.knockEnabled && config.knockSequence && config.knockSequence.length > 0) {
            console.log('[Main] Port knocking enabled, knocking before SSH connect...');
            await PortKnockService_1.PortKnockService.knock(config.host, config.knockSequence);
        }
        // Connect using native SSH (spawns ssh command with PTY)
        const { connectionId, emitter } = await nativeSSH.connectAndCreateShell(config);
        // Setup data forwarding to renderer
        const dataHandler = (data) => {
            if (event.sender && !event.sender.isDestroyed()) {
                event.sender.send('ssh:shellData', connectionId, data);
            }
        };
        const closeHandler = () => {
            if (event.sender && !event.sender.isDestroyed()) {
                event.sender.send('ssh:shellClose', connectionId);
            }
        };
        emitter.on('data', dataHandler);
        emitter.on('close', closeHandler);
        // Also connect SSH2 in background for execute commands (OS info, etc)
        // Don't await - let it connect in parallel
        sshManager.connect(config).then(() => {
            console.log('[Main] SSH2 connected in background for:', connectionId);
        }).catch(err => {
            console.log('[Main] SSH2 background connect failed:', err.message);
        });
        return { success: true, connectionId };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
// Local Terminal - spawn local shell without SSH
electron_1.ipcMain.handle('local:createShell', async (event, cols, rows) => {
    try {
        const { connectionId, emitter } = nativeSSH.createLocalShell(cols, rows);
        // Setup data forwarding to renderer
        const dataHandler = (data) => {
            if (event.sender && !event.sender.isDestroyed()) {
                event.sender.send('ssh:shellData', connectionId, data);
            }
        };
        const closeHandler = () => {
            if (event.sender && !event.sender.isDestroyed()) {
                event.sender.send('ssh:shellClose', connectionId);
            }
        };
        emitter.on('data', dataHandler);
        emitter.on('close', closeHandler);
        return { success: true, connectionId };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
// Get local OS info
electron_1.ipcMain.handle('local:getOsInfo', async () => {
    try {
        const os = require('os');
        const { execSync } = require('child_process');
        let osName = os.type(); // 'Linux', 'Darwin', 'Windows_NT'
        let ip = '';
        // Get more detailed OS info on Linux
        if (osName === 'Linux') {
            try {
                const osRelease = execSync('cat /etc/os-release 2>/dev/null | grep -E "^PRETTY_NAME" | head -1 | cut -d= -f2 | tr -d \'"\'', { encoding: 'utf8' });
                if (osRelease.trim()) {
                    osName = osRelease.trim();
                }
                else {
                    osName = 'Linux';
                }
            }
            catch {
                osName = 'Linux';
            }
        }
        else if (osName === 'Darwin') {
            osName = 'macOS';
        }
        else if (osName === 'Windows_NT') {
            osName = 'Windows';
        }
        // Get local IP
        const networkInterfaces = os.networkInterfaces();
        for (const name of Object.keys(networkInterfaces)) {
            const iface = networkInterfaces[name];
            if (iface) {
                for (const net of iface) {
                    // Skip internal and non-IPv4 addresses
                    if (!net.internal && net.family === 'IPv4') {
                        ip = net.address;
                        break;
                    }
                }
            }
            if (ip)
                break;
        }
        return {
            os: osName,
            ip: ip || 'localhost',
            provider: null, // Local machine, no provider
        };
    }
    catch (error) {
        console.error('[Main] Error getting local OS info:', error);
        return {
            os: require('os').type(),
            ip: 'localhost',
            provider: null,
        };
    }
});
electron_1.ipcMain.handle('ssh:disconnect', async (event, connectionId) => {
    try {
        nativeSSH.disconnect(connectionId);
        await sshManager.disconnect(connectionId).catch(() => { });
        return { success: true };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('ssh:execute', async (event, connectionId, command) => {
    try {
        // Wait a bit for SSH2 to connect (it connects in background)
        let client = sshManager.getConnection(connectionId);
        let retries = 0;
        while (!client && retries < 10) {
            await new Promise(resolve => setTimeout(resolve, 300));
            client = sshManager.getConnection(connectionId);
            retries++;
        }
        if (!client) {
            return { success: false, error: 'SSH2 not connected yet. Please try again.' };
        }
        const result = await sshManager.executeCommand(connectionId, command);
        return { success: true, output: result };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
// Shell already created in ssh:connect, this is just for compatibility
electron_1.ipcMain.handle('ssh:createShell', async (event, connectionId, cols, rows) => {
    try {
        // Shell already exists from connect, just return success
        if (nativeSSH.isConnected(connectionId)) {
            return { success: true };
        }
        return { success: false, error: 'Not connected' };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('ssh:writeShell', async (event, connectionId, data) => {
    try {
        nativeSSH.writeToShell(connectionId, data);
        return { success: true };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('ssh:resizeShell', async (event, connectionId, cols, rows) => {
    try {
        nativeSSH.resizeShell(connectionId, cols, rows);
        return { success: true };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('sftp:connect', async (event, connectionId, config) => {
    try {
        // Check if ssh2 already connected
        let client = sshManager.getConnection(connectionId);
        if (!client) {
            // Connect ssh2 on-demand for SFTP - need to use the same connectionId format
            console.log('[Main] Connecting SSH2 for SFTP, connectionId:', connectionId);
            const newConnId = await sshManager.connect(config);
            console.log('[Main] SSH2 connected, newConnId:', newConnId);
            // newConnId should match connectionId (both are user@host:port format)
            client = sshManager.getConnection(newConnId);
            console.log('[Main] SSH2 client found:', !!client);
        }
        if (!client) {
            throw new Error('Failed to establish SSH2 connection for SFTP');
        }
        await sftpManager.connect(connectionId, client);
        console.log('[Main] SFTP subsystem ready for:', connectionId);
        return { success: true };
    }
    catch (error) {
        console.error('[Main] SFTP connect error:', error.message);
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('sftp:list', async (event, connectionId, remotePath) => {
    try {
        console.log('[Main] sftp:list', connectionId, remotePath);
        const files = await sftpManager.listFiles(connectionId, remotePath);
        return { success: true, files };
    }
    catch (error) {
        console.error('[Main] sftp:list error:', error.message);
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('sftp:download', async (event, connectionId, remotePath, localPath) => {
    try {
        console.log('[Main] sftp:download', connectionId, remotePath, '->', localPath);
        await sftpManager.downloadFile(connectionId, remotePath, localPath);
        console.log('[Main] sftp:download success');
        return { success: true };
    }
    catch (error) {
        console.error('[Main] sftp:download error:', error.message);
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('sftp:upload', async (event, connectionId, localPath, remotePath) => {
    try {
        console.log('[Main] sftp:upload', connectionId, localPath, '->', remotePath);
        await sftpManager.uploadFile(connectionId, localPath, remotePath);
        console.log('[Main] sftp:upload success');
        return { success: true };
    }
    catch (error) {
        console.error('[Main] sftp:upload error:', error.message);
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('sftp:delete', async (event, connectionId, remotePath) => {
    try {
        console.log('[Main] sftp:delete', connectionId, remotePath);
        await sftpManager.deleteFile(connectionId, remotePath);
        return { success: true };
    }
    catch (error) {
        console.error('[Main] sftp:delete error:', error.message);
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('sftp:mkdir', async (event, connectionId, remotePath) => {
    try {
        console.log('[Main] sftp:mkdir', connectionId, remotePath);
        await sftpManager.createDirectory(connectionId, remotePath);
        console.log('[Main] sftp:mkdir success');
        return { success: true };
    }
    catch (error) {
        console.error('[Main] sftp:mkdir error:', error.message);
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('sftp:readFile', async (event, connectionId, remotePath) => {
    try {
        console.log('[Main] sftp:readFile', connectionId, remotePath);
        const content = await sftpManager.readFile(connectionId, remotePath);
        console.log('[Main] sftp:readFile success, length:', content.length);
        return { success: true, content };
    }
    catch (error) {
        console.error('[Main] sftp:readFile error:', error.message);
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('sftp:writeFile', async (event, connectionId, remotePath, content) => {
    try {
        console.log('[Main] sftp:writeFile', connectionId, remotePath);
        await sftpManager.writeFile(connectionId, remotePath, content);
        console.log('[Main] sftp:writeFile success');
        return { success: true };
    }
    catch (error) {
        console.error('[Main] sftp:writeFile error:', error.message);
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('sftp:chmod', async (event, connectionId, remotePath, mode) => {
    try {
        console.log('[Main] sftp:chmod', connectionId, remotePath, mode);
        await sftpManager.chmod(connectionId, remotePath, mode);
        return { success: true };
    }
    catch (error) {
        console.error('[Main] sftp:chmod error:', error.message);
        return { success: false, error: error.message };
    }
});
// Server storage handlers
electron_1.ipcMain.handle('servers:getAll', async () => {
    try {
        const servers = serverStore.getAllServers();
        return { success: true, servers };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('servers:add', async (event, server) => {
    try {
        const newServer = serverStore.addServer(server);
        return { success: true, server: newServer };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('servers:update', async (event, server) => {
    try {
        serverStore.updateServer(server.id, server);
        return { success: true };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('servers:delete', async (event, id) => {
    try {
        serverStore.deleteServer(id);
        return { success: true };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('servers:importAll', async (event, servers) => {
    try {
        // Clear existing servers and import new ones
        const existingServers = serverStore.getAllServers();
        for (const server of existingServers) {
            serverStore.deleteServer(server.id);
        }
        // Add all new servers
        for (const server of servers) {
            serverStore.addServer(server);
        }
        console.log('[Main] servers:importAll - imported', servers.length, 'servers');
        return { success: true };
    }
    catch (error) {
        console.error('[Main] servers:importAll error:', error.message);
        return { success: false, error: error.message };
    }
});
// Tag management handlers
electron_1.ipcMain.handle('tags:getColors', async () => {
    try {
        const tagColors = serverStore.getTagColors();
        return { success: true, tagColors };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('tags:setColor', async (event, tagName, color) => {
    try {
        serverStore.setTagColor(tagName, color);
        return { success: true };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('tags:saveColors', async (event, tagColors) => {
    try {
        // Save all tag colors at once (for backup restore)
        for (const [tagName, color] of Object.entries(tagColors)) {
            serverStore.setTagColor(tagName, color);
        }
        console.log('[Main] tags:saveColors - saved', Object.keys(tagColors).length, 'tag colors');
        return { success: true };
    }
    catch (error) {
        console.error('[Main] tags:saveColors error:', error.message);
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('tags:delete', async (event, tagName) => {
    try {
        serverStore.deleteTagFromAllServers(tagName);
        // Return updated servers list
        const servers = serverStore.getAllServers();
        return { success: true, servers };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
// FTP/FTPS handlers
electron_1.ipcMain.handle('ftp:connect', async (event, connectionId, config) => {
    try {
        await ftpManager.connect(connectionId, config);
        return { success: true };
    }
    catch (error) {
        console.error('[Main] ftp:connect error:', error.message);
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('ftp:disconnect', async (event, connectionId) => {
    try {
        await ftpManager.disconnect(connectionId);
        return { success: true };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('ftp:list', async (event, connectionId, remotePath) => {
    try {
        const files = await ftpManager.listFiles(connectionId, remotePath);
        return { success: true, files };
    }
    catch (error) {
        console.error('[Main] ftp:list error:', error.message);
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('ftp:download', async (event, connectionId, remotePath, localPath) => {
    try {
        await ftpManager.downloadFile(connectionId, remotePath, localPath);
        return { success: true };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('ftp:upload', async (event, connectionId, localPath, remotePath) => {
    try {
        await ftpManager.uploadFile(connectionId, localPath, remotePath);
        return { success: true };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('ftp:delete', async (event, connectionId, remotePath) => {
    try {
        await ftpManager.deleteFile(connectionId, remotePath);
        return { success: true };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('ftp:deleteDir', async (event, connectionId, remotePath) => {
    try {
        await ftpManager.deleteDirectory(connectionId, remotePath);
        return { success: true };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('ftp:mkdir', async (event, connectionId, remotePath) => {
    try {
        await ftpManager.createDirectory(connectionId, remotePath);
        return { success: true };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('ftp:rename', async (event, connectionId, oldPath, newPath) => {
    try {
        await ftpManager.rename(connectionId, oldPath, newPath);
        return { success: true };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('ftp:readFile', async (event, connectionId, remotePath) => {
    try {
        console.log('[Main] ftp:readFile', connectionId, remotePath);
        const content = await ftpManager.readFile(connectionId, remotePath);
        console.log('[Main] ftp:readFile success, length:', content.length);
        return { success: true, content };
    }
    catch (error) {
        console.error('[Main] ftp:readFile error:', error.message);
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('ftp:writeFile', async (event, connectionId, remotePath, content) => {
    try {
        console.log('[Main] ftp:writeFile', connectionId, remotePath);
        await ftpManager.writeFile(connectionId, remotePath, content);
        console.log('[Main] ftp:writeFile success');
        return { success: true };
    }
    catch (error) {
        console.error('[Main] ftp:writeFile error:', error.message);
        return { success: false, error: error.message };
    }
});
// RDP (Windows Remote Desktop) handlers
electron_1.ipcMain.handle('rdp:connect', async (event, connectionId, config) => {
    try {
        const { emitter, success, error } = rdpManager.connect(connectionId, {
            host: config.host,
            port: config.port || 3389,
            username: config.username,
            password: config.password,
            domain: config.domain,
            screen: config.screen || { width: 1280, height: 720 },
        });
        if (!success) {
            return { success: false, error: error || 'Failed to connect' };
        }
        // Forward RDP events to renderer
        emitter.on('connect', () => {
            if (event.sender && !event.sender.isDestroyed()) {
                event.sender.send('rdp:connect', connectionId);
            }
        });
        emitter.on('close', () => {
            if (event.sender && !event.sender.isDestroyed()) {
                event.sender.send('rdp:close', connectionId);
            }
        });
        emitter.on('error', (err) => {
            if (event.sender && !event.sender.isDestroyed()) {
                event.sender.send('rdp:error', connectionId, err.message);
            }
        });
        return { success: true, connectionId };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('rdp:disconnect', async (event, connectionId) => {
    try {
        rdpManager.disconnect(connectionId);
        return { success: true };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('rdp:focus', async (event, connectionId) => {
    try {
        rdpManager.focusWindow(connectionId);
        return { success: true };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('rdp:fullscreen', async (event, connectionId) => {
    try {
        rdpManager.toggleFullscreen(connectionId);
        return { success: true };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('rdp:mouse', async (event, connectionId, x, y, button, isPressed) => {
    try {
        rdpManager.sendMouse(connectionId, x, y, button, isPressed);
        return { success: true };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('rdp:wheel', async (event, connectionId, x, y, step, isNegative, isHorizontal) => {
    try {
        rdpManager.sendWheel(connectionId, x, y, step, isNegative, isHorizontal);
        return { success: true };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('rdp:scancode', async (event, connectionId, code, isPressed) => {
    try {
        rdpManager.sendScancode(connectionId, code, isPressed);
        return { success: true };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('rdp:unicode', async (event, connectionId, code, isPressed) => {
    try {
        rdpManager.sendUnicode(connectionId, code, isPressed);
        return { success: true };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
// ===================== WSS (WebSocket Secure) Handlers =====================
// Setup WSS event listeners once
wssManager.on('connect', (connectionId) => {
    mainWindow?.webContents.send('wss:connect', connectionId);
});
wssManager.on('message', (connectionId, message) => {
    mainWindow?.webContents.send('wss:message', connectionId, message);
});
wssManager.on('close', (connectionId, code, reason) => {
    mainWindow?.webContents.send('wss:close', connectionId, code, reason);
});
wssManager.on('error', (connectionId, error) => {
    mainWindow?.webContents.send('wss:error', connectionId, error);
});
electron_1.ipcMain.handle('wss:connect', async (event, connectionId, config) => {
    try {
        const result = wssManager.connect(connectionId, config);
        return { success: result.success, error: result.error };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('wss:send', async (event, connectionId, message) => {
    try {
        const success = wssManager.send(connectionId, message);
        return { success };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('wss:disconnect', async (event, connectionId) => {
    try {
        wssManager.disconnect(connectionId);
        return { success: true };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('wss:history', async (event, connectionId) => {
    try {
        const history = wssManager.getHistory(connectionId);
        return { success: true, history };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
// Backup handlers
electron_1.ipcMain.handle('backup:validatePassword', async (event, password) => {
    return backupService.validatePassword(password);
});
electron_1.ipcMain.handle('backup:create', async (event, data, password, customPath) => {
    try {
        console.log('[Main] backup:create');
        const result = await backupService.createLocalBackup(data, password, customPath);
        return result;
    }
    catch (error) {
        console.error('[Main] backup:create error:', error.message);
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('backup:restore', async (event, filePath, password) => {
    try {
        console.log('[Main] backup:restore from:', filePath);
        const result = await backupService.restoreLocalBackup(filePath, password);
        return result;
    }
    catch (error) {
        console.error('[Main] backup:restore error:', error.message);
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('backup:list', async (event) => {
    try {
        const backups = backupService.listLocalBackups();
        return { success: true, backups };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('backup:delete', async (event, filePath) => {
    try {
        const success = backupService.deleteLocalBackup(filePath);
        return { success };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('backup:selectFile', async (event) => {
    try {
        const result = await electron_1.dialog.showOpenDialog(mainWindow, {
            title: 'Select Backup File',
            filters: [
                { name: 'Marix Backup', extensions: ['marix'] },
                { name: 'All Files', extensions: ['*'] },
            ],
            properties: ['openFile'],
        });
        if (result.canceled || result.filePaths.length === 0) {
            return { success: false, canceled: true };
        }
        return { success: true, filePath: result.filePaths[0] };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('backup:selectSaveLocation', async (event) => {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const defaultName = `marix-backup-${timestamp}.marix`;
        const result = await electron_1.dialog.showSaveDialog(mainWindow, {
            title: 'Save Backup File',
            defaultPath: defaultName,
            filters: [
                { name: 'Marix Backup', extensions: ['marix'] },
            ],
        });
        if (result.canceled || !result.filePath) {
            return { success: false, canceled: true };
        }
        return { success: true, filePath: result.filePath };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('backup:getDir', async (event) => {
    return { success: true, dir: backupService.getBackupDir() };
});
electron_1.ipcMain.handle('backup:createGithub', async (event, githubToken, gistId, password) => {
    const servers = serverStore.getAllServers();
    const tagColors = serverStore.getTagColors();
    const cloudflareToken = CloudflareService_1.cloudflareService.getToken() || undefined;
    return await backupService.createGithubBackup(githubToken, gistId || null, password, servers, tagColors, cloudflareToken);
});
electron_1.ipcMain.handle('backup:restoreGithub', async (event, githubToken, gistId, password) => {
    const result = await backupService.restoreGithubBackup(githubToken, gistId, password);
    if (result.success && result.data) {
        serverStore.setServers(result.data.servers);
        serverStore.setTagColors(result.data.tagColors);
        if (result.data.cloudflareToken) {
            CloudflareService_1.cloudflareService.setToken(result.data.cloudflareToken);
        }
        return { success: true, serverCount: result.data.servers.length };
    }
    return result;
});
// ==================== GitHub OAuth Handlers ====================
electron_1.ipcMain.handle('github:requestDeviceCode', async () => {
    return await githubAuthService.requestDeviceCode();
});
electron_1.ipcMain.handle('github:pollForToken', async (event, deviceCode, interval) => {
    return await githubAuthService.pollForToken(deviceCode, interval);
});
electron_1.ipcMain.handle('github:stopPolling', async () => {
    githubAuthService.stopPolling();
    return { success: true };
});
electron_1.ipcMain.handle('github:hasToken', async () => {
    return await githubAuthService.hasToken();
});
electron_1.ipcMain.handle('github:verifyToken', async () => {
    return await githubAuthService.verifyToken();
});
electron_1.ipcMain.handle('github:logout', async () => {
    await githubAuthService.logout();
    return { success: true };
});
electron_1.ipcMain.handle('github:createBackupRepo', async (event, repoName) => {
    return await githubAuthService.createBackupRepo(repoName);
});
electron_1.ipcMain.handle('github:listRepos', async () => {
    return await githubAuthService.listRepos();
});
electron_1.ipcMain.handle('github:getRepoName', async () => {
    return await githubAuthService.getRepoName();
});
electron_1.ipcMain.handle('github:saveRepoName', async (event, repoName) => {
    await githubAuthService.saveRepoName(repoName);
    return { success: true };
});
electron_1.ipcMain.handle('github:uploadBackup', async (event, password, totpEntries, portForwards) => {
    // Validate password first (same as local backup)
    const validation = backupService.validatePassword(password);
    if (!validation.valid) {
        return { success: false, error: validation.errors.join('\n') };
    }
    const servers = serverStore.getAllServers();
    const tagColors = serverStore.getTagColors();
    const cloudflareToken = CloudflareService_1.cloudflareService.getToken() || undefined;
    const sshKeys = SSHKeyService_1.sshKeyService.exportAllKeysForBackup();
    // Create encrypted backup content (including 2FA and port forwards)
    const backupResult = await backupService.createBackupContent(password, servers, tagColors, cloudflareToken, sshKeys, totpEntries, portForwards);
    if (!backupResult.success || !backupResult.content) {
        return { success: false, error: backupResult.error };
    }
    // Upload to GitHub (will overwrite existing backup.arix file)
    const now = new Date();
    const dd = String(now.getUTCDate()).padStart(2, '0');
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = now.getUTCFullYear();
    const hours = String(now.getUTCHours()).padStart(2, '0');
    const minutes = String(now.getUTCMinutes()).padStart(2, '0');
    const commitMessage = `Marix backup ${dd}-${mm}-${yyyy} ${hours}:${minutes} (UTC)`;
    return await githubAuthService.uploadBackup(backupResult.content, commitMessage);
});
electron_1.ipcMain.handle('github:downloadBackup', async (event, password) => {
    // Download from GitHub
    const downloadResult = await githubAuthService.downloadBackup();
    if (!downloadResult.success || !downloadResult.content) {
        return { success: false, error: downloadResult.error };
    }
    // Decrypt backup
    const restoreResult = await backupService.restoreBackupContent(downloadResult.content, password);
    if (!restoreResult.success || !restoreResult.data) {
        return { success: false, error: restoreResult.error };
    }
    // Restore data
    serverStore.setServers(restoreResult.data.servers);
    serverStore.setTagColors(restoreResult.data.tagColors);
    if (restoreResult.data.cloudflareToken) {
        CloudflareService_1.cloudflareService.setToken(restoreResult.data.cloudflareToken);
    }
    // Restore SSH keys
    let sshKeyCount = 0;
    if (restoreResult.data.sshKeys && restoreResult.data.sshKeys.length > 0) {
        const importResult = await SSHKeyService_1.sshKeyService.importKeysFromBackup(restoreResult.data.sshKeys);
        sshKeyCount = importResult.imported;
    }
    return {
        success: true,
        serverCount: restoreResult.data.servers.length,
        sshKeyCount,
        totpEntries: restoreResult.data.totpEntries,
        portForwards: restoreResult.data.portForwards
    };
});
electron_1.ipcMain.handle('github:openAuthUrl', async (event, url) => {
    electron_1.shell.openExternal(url);
    return { success: true };
});
// ==================== GitLab OAuth Handlers ====================
electron_1.ipcMain.handle('gitlab:startOAuth', async () => {
    try {
        const tokens = await GitLabOAuthService_1.GitLabOAuthService.startOAuthFlow(mainWindow || undefined);
        GitLabOAuthService_1.GitLabOAuthService.saveTokens(tokens);
        return { success: true };
    }
    catch (error) {
        console.error('[GitLab OAuth] Error:', error);
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('gitlab:submitCode', async (event, code) => {
    try {
        GitLabOAuthService_1.GitLabOAuthService.handleManualCode(code);
        return { success: true };
    }
    catch (error) {
        console.error('[GitLab OAuth] Error submitting code:', error);
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('gitlab:hasToken', async () => {
    const tokens = GitLabOAuthService_1.GitLabOAuthService.loadTokens();
    if (!tokens) {
        return { hasToken: false };
    }
    // Check if token is valid or can be refreshed
    if (GitLabOAuthService_1.GitLabOAuthService.isTokenValid(tokens)) {
        return { hasToken: true };
    }
    // Try to refresh
    try {
        const newTokens = await GitLabOAuthService_1.GitLabOAuthService.refreshToken(tokens);
        GitLabOAuthService_1.GitLabOAuthService.saveTokens(newTokens);
        return { hasToken: true };
    }
    catch (err) {
        return { hasToken: false };
    }
});
electron_1.ipcMain.handle('gitlab:logout', async () => {
    GitLabOAuthService_1.GitLabOAuthService.clearTokens();
    return { success: true };
});
electron_1.ipcMain.handle('gitlab:uploadBackup', async (event, password, totpEntries, portForwards) => {
    try {
        // Validate password first
        const validation = backupService.validatePassword(password);
        if (!validation.valid) {
            return { success: false, error: validation.errors.join('\n') };
        }
        // Get access token
        const accessToken = await GitLabOAuthService_1.GitLabOAuthService.getValidAccessToken();
        if (!accessToken) {
            return { success: false, error: 'Not authenticated with GitLab. Please connect first.' };
        }
        // Gather data to backup
        const servers = serverStore.getAllServers();
        const tagColors = serverStore.getTagColors();
        const cloudflareToken = CloudflareService_1.cloudflareService.getToken() || undefined;
        const sshKeys = SSHKeyService_1.sshKeyService.exportAllKeysForBackup();
        // Create encrypted backup content
        const backupResult = await backupService.createBackupContent(password, servers, tagColors, cloudflareToken, sshKeys, totpEntries, portForwards);
        if (!backupResult.success || !backupResult.content) {
            return { success: false, error: backupResult.error };
        }
        // Upload to GitLab
        await GitLabApiService_1.GitLabApiService.uploadBackup(accessToken, backupResult.content);
        return { success: true };
    }
    catch (error) {
        console.error('[GitLab] Upload backup error:', error);
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('gitlab:downloadBackup', async (event, password) => {
    try {
        // Get access token
        const accessToken = await GitLabOAuthService_1.GitLabOAuthService.getValidAccessToken();
        if (!accessToken) {
            return { success: false, error: 'Not authenticated with GitLab. Please connect first.' };
        }
        // Download from GitLab
        const encryptedContent = await GitLabApiService_1.GitLabApiService.downloadBackup(accessToken);
        // Decrypt backup
        const restoreResult = await backupService.restoreBackupContent(encryptedContent, password);
        if (!restoreResult.success || !restoreResult.data) {
            return { success: false, error: restoreResult.error };
        }
        // Restore data
        serverStore.setServers(restoreResult.data.servers);
        serverStore.setTagColors(restoreResult.data.tagColors);
        if (restoreResult.data.cloudflareToken) {
            CloudflareService_1.cloudflareService.setToken(restoreResult.data.cloudflareToken);
        }
        // Restore SSH keys
        let sshKeyCount = 0;
        if (restoreResult.data.sshKeys && restoreResult.data.sshKeys.length > 0) {
            const importResult = await SSHKeyService_1.sshKeyService.importKeysFromBackup(restoreResult.data.sshKeys);
            sshKeyCount = importResult.imported;
        }
        return {
            success: true,
            serverCount: restoreResult.data.servers.length,
            sshKeyCount,
            totpEntries: restoreResult.data.totpEntries,
            portForwards: restoreResult.data.portForwards
        };
    }
    catch (error) {
        console.error('[GitLab] Download backup error:', error);
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('gitlab:checkBackup', async () => {
    try {
        const accessToken = await GitLabOAuthService_1.GitLabOAuthService.getValidAccessToken();
        if (!accessToken) {
            return { exists: false };
        }
        const exists = await GitLabApiService_1.GitLabApiService.backupExists(accessToken);
        if (!exists) {
            return { exists: false };
        }
        const metadata = await GitLabApiService_1.GitLabApiService.getBackupMetadata(accessToken);
        return { exists: true, metadata };
    }
    catch (error) {
        console.error('[GitLab] Check backup error:', error);
        return { exists: false };
    }
});
// ==================== Box OAuth Handlers ====================
electron_1.ipcMain.handle('box:startOAuth', async () => {
    try {
        const tokens = await BoxOAuthService_1.BoxOAuthService.startOAuthFlow(mainWindow || undefined);
        BoxOAuthService_1.BoxOAuthService.saveTokens(tokens);
        return { success: true };
    }
    catch (error) {
        console.error('[Box OAuth] Error:', error);
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('box:submitCode', async (event, code) => {
    try {
        BoxOAuthService_1.BoxOAuthService.handleManualCode(code);
        return { success: true };
    }
    catch (error) {
        console.error('[Box OAuth] Error submitting code:', error);
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('box:hasToken', async () => {
    const accessToken = await BoxOAuthService_1.BoxOAuthService.getValidAccessToken();
    return { hasToken: !!accessToken };
});
electron_1.ipcMain.handle('box:logout', async () => {
    try {
        BoxOAuthService_1.BoxOAuthService.deleteTokens();
        return { success: true };
    }
    catch (error) {
        console.error('[Box] Logout error:', error);
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('box:uploadBackup', async (event, password, totpEntries, portForwards) => {
    try {
        // Validate password
        const validation = backupService.validatePassword(password);
        if (!validation.valid) {
            return { success: false, error: validation.errors.join('\n') };
        }
        // Get access token
        const accessToken = await BoxOAuthService_1.BoxOAuthService.getValidAccessToken();
        if (!accessToken) {
            return { success: false, error: 'Not authenticated with Box. Please connect first.' };
        }
        const servers = serverStore.getAllServers();
        const tagColors = serverStore.getTagColors();
        const cloudflareToken = CloudflareService_1.cloudflareService.getToken() || undefined;
        const sshKeys = SSHKeyService_1.sshKeyService.exportAllKeysForBackup();
        // Create encrypted backup content
        const backupResult = await backupService.createBackupContent(password, servers, tagColors, cloudflareToken, sshKeys, totpEntries, portForwards);
        if (!backupResult.success || !backupResult.content) {
            return { success: false, error: backupResult.error };
        }
        // Upload to Box
        await BoxApiService_1.BoxApiService.uploadBackup(accessToken, backupResult.content);
        return { success: true };
    }
    catch (error) {
        console.error('[Box] Upload backup error:', error);
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('box:downloadBackup', async (event, password) => {
    try {
        // Get access token
        const accessToken = await BoxOAuthService_1.BoxOAuthService.getValidAccessToken();
        if (!accessToken) {
            return { success: false, error: 'Not authenticated with Box. Please connect first.' };
        }
        // Download from Box
        const encryptedContent = await BoxApiService_1.BoxApiService.downloadBackup(accessToken);
        // Decrypt backup
        const restoreResult = await backupService.restoreBackupContent(encryptedContent, password);
        if (!restoreResult.success || !restoreResult.data) {
            return { success: false, error: restoreResult.error };
        }
        // Restore data
        serverStore.setServers(restoreResult.data.servers);
        serverStore.setTagColors(restoreResult.data.tagColors);
        if (restoreResult.data.cloudflareToken) {
            CloudflareService_1.cloudflareService.setToken(restoreResult.data.cloudflareToken);
        }
        // Restore SSH keys
        let sshKeyCount = 0;
        if (restoreResult.data.sshKeys && restoreResult.data.sshKeys.length > 0) {
            const importResult = await SSHKeyService_1.sshKeyService.importKeysFromBackup(restoreResult.data.sshKeys);
            sshKeyCount = importResult.imported;
        }
        return {
            success: true,
            serverCount: restoreResult.data.servers.length,
            sshKeyCount,
            totpEntries: restoreResult.data.totpEntries,
            portForwards: restoreResult.data.portForwards
        };
    }
    catch (error) {
        console.error('[Box] Download backup error:', error);
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('box:checkBackup', async () => {
    try {
        const accessToken = await BoxOAuthService_1.BoxOAuthService.getValidAccessToken();
        if (!accessToken) {
            return { exists: false };
        }
        const exists = await BoxApiService_1.BoxApiService.backupExists(accessToken);
        if (!exists) {
            return { exists: false };
        }
        const metadata = await BoxApiService_1.BoxApiService.getBackupMetadata(accessToken);
        return { exists: true, metadata };
    }
    catch (error) {
        console.error('[Box] Check backup error:', error);
        return { exists: false };
    }
});
// ==================== Cloudflare API Handlers ====================
electron_1.ipcMain.handle('cloudflare:hasToken', async () => {
    return CloudflareService_1.cloudflareService.hasToken();
});
electron_1.ipcMain.handle('cloudflare:getToken', async () => {
    return CloudflareService_1.cloudflareService.getToken();
});
electron_1.ipcMain.handle('cloudflare:setToken', async (event, token) => {
    CloudflareService_1.cloudflareService.setToken(token);
    return { success: true };
});
electron_1.ipcMain.handle('cloudflare:removeToken', async () => {
    CloudflareService_1.cloudflareService.removeToken();
    return { success: true };
});
electron_1.ipcMain.handle('cloudflare:verifyToken', async () => {
    return await CloudflareService_1.cloudflareService.verifyToken();
});
electron_1.ipcMain.handle('cloudflare:listZones', async () => {
    return await CloudflareService_1.cloudflareService.listZones();
});
electron_1.ipcMain.handle('cloudflare:listDNSRecords', async (event, zoneId) => {
    return await CloudflareService_1.cloudflareService.listDNSRecords(zoneId);
});
electron_1.ipcMain.handle('cloudflare:createDNSRecord', async (event, zoneId, type, name, content, ttl, proxied, comment, priority, srvData) => {
    return await CloudflareService_1.cloudflareService.createDNSRecord(zoneId, type, name, content, ttl, proxied, comment, priority, srvData);
});
electron_1.ipcMain.handle('cloudflare:updateDNSRecord', async (event, zoneId, recordId, type, name, content, ttl, proxied, comment, priority, srvData) => {
    return await CloudflareService_1.cloudflareService.updateDNSRecord(zoneId, recordId, type, name, content, ttl, proxied, comment, priority, srvData);
});
electron_1.ipcMain.handle('cloudflare:deleteDNSRecord', async (event, zoneId, recordId) => {
    return await CloudflareService_1.cloudflareService.deleteDNSRecord(zoneId, recordId);
});
// DNS resolution for server hosts (domain to IP)
electron_1.ipcMain.handle('dns:resolve', async (event, hostname) => {
    const dns = require('dns').promises;
    try {
        // Check if it's already an IP address (IPv4 or IPv6)
        const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
        const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
        if (ipv4Regex.test(hostname)) {
            return { success: true, ipv4: [hostname], ipv6: [], isIp: true };
        }
        if (ipv6Regex.test(hostname)) {
            return { success: true, ipv4: [], ipv6: [hostname], isIp: true };
        }
        // Resolve domain to IP addresses
        const ipv4Results = [];
        const ipv6Results = [];
        try {
            const addresses = await dns.resolve4(hostname);
            ipv4Results.push(...addresses);
        }
        catch (e) {
            // No A records
        }
        try {
            const addresses = await dns.resolve6(hostname);
            ipv6Results.push(...addresses);
        }
        catch (e) {
            // No AAAA records
        }
        return { success: true, ipv4: ipv4Results, ipv6: ipv6Results, isIp: false };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
// ==================== WHOIS Handlers ====================
electron_1.ipcMain.handle('whois:lookup', async (event, domain) => {
    return await WhoisService_1.whoisService.lookup(domain);
});
// ==================== Network Tools Handlers ====================
electron_1.ipcMain.handle('networktools:mx', async (event, domain) => {
    return await NetworkToolsService_1.networkToolsService.mxLookup(domain);
});
electron_1.ipcMain.handle('networktools:a', async (event, hostname) => {
    return await NetworkToolsService_1.networkToolsService.aLookup(hostname);
});
electron_1.ipcMain.handle('networktools:aaaa', async (event, hostname) => {
    return await NetworkToolsService_1.networkToolsService.aaaaLookup(hostname);
});
electron_1.ipcMain.handle('networktools:txt', async (event, domain) => {
    return await NetworkToolsService_1.networkToolsService.txtLookup(domain);
});
electron_1.ipcMain.handle('networktools:spf', async (event, domain) => {
    return await NetworkToolsService_1.networkToolsService.spfLookup(domain);
});
electron_1.ipcMain.handle('networktools:cname', async (event, hostname) => {
    return await NetworkToolsService_1.networkToolsService.cnameLookup(hostname);
});
electron_1.ipcMain.handle('networktools:ns', async (event, domain) => {
    return await NetworkToolsService_1.networkToolsService.nsLookup(domain);
});
electron_1.ipcMain.handle('networktools:soa', async (event, domain) => {
    return await NetworkToolsService_1.networkToolsService.soaLookup(domain);
});
electron_1.ipcMain.handle('networktools:ptr', async (event, ip) => {
    return await NetworkToolsService_1.networkToolsService.ptrLookup(ip);
});
electron_1.ipcMain.handle('networktools:ping', async (event, host, count) => {
    return await NetworkToolsService_1.networkToolsService.ping(host, count);
});
electron_1.ipcMain.handle('networktools:trace', async (event, host) => {
    return await NetworkToolsService_1.networkToolsService.traceroute(host);
});
electron_1.ipcMain.handle('networktools:tcp', async (event, host, port) => {
    return await NetworkToolsService_1.networkToolsService.tcpTest(host, port);
});
electron_1.ipcMain.handle('networktools:http', async (event, url) => {
    return await NetworkToolsService_1.networkToolsService.httpCheck(url);
});
electron_1.ipcMain.handle('networktools:https', async (event, url) => {
    return await NetworkToolsService_1.networkToolsService.httpsCheck(url);
});
electron_1.ipcMain.handle('networktools:smtp', async (event, host, port) => {
    return await NetworkToolsService_1.networkToolsService.smtpTest(host, port);
});
electron_1.ipcMain.handle('networktools:blacklist', async (event, ip) => {
    return await NetworkToolsService_1.networkToolsService.blacklistCheck(ip);
});
electron_1.ipcMain.handle('networktools:dns', async (event, domain) => {
    return await NetworkToolsService_1.networkToolsService.dnsCheck(domain);
});
electron_1.ipcMain.handle('networktools:arin', async (event, ip) => {
    return await NetworkToolsService_1.networkToolsService.arinLookup(ip);
});
electron_1.ipcMain.handle('networktools:whois', async (event, domain) => {
    return await NetworkToolsService_1.networkToolsService.whoisLookup(domain);
});
electron_1.ipcMain.handle('networktools:webcheck', async (event, url) => {
    return await NetworkToolsService_1.networkToolsService.webCheck(url);
});
// Known Hosts handlers
electron_1.ipcMain.handle('knownhosts:check', async (event, host, port) => {
    return await KnownHostsService_1.knownHostsService.getHostFingerprint(host, port);
});
electron_1.ipcMain.handle('knownhosts:accept', async (event, host, port, keyType, fingerprint, fullKey) => {
    KnownHostsService_1.knownHostsService.addKnownHost(host, port, keyType, fingerprint, fullKey);
    return { success: true };
});
electron_1.ipcMain.handle('knownhosts:remove', async (event, host, port) => {
    KnownHostsService_1.knownHostsService.removeKnownHost(host, port);
    return { success: true };
});
electron_1.ipcMain.handle('knownhosts:list', async () => {
    return KnownHostsService_1.knownHostsService.getAllKnownHosts();
});
electron_1.ipcMain.handle('knownhosts:get', async (event, host, port) => {
    return KnownHostsService_1.knownHostsService.getKnownHost(host, port);
});
electron_1.ipcMain.handle('knownhosts:clear', async () => {
    KnownHostsService_1.knownHostsService.clearAllKnownHosts();
    return { success: true };
});
// SSH Key handlers
electron_1.ipcMain.handle('sshkey:generate', async (event, name, type, bits, passphrase, comment) => {
    try {
        const key = await SSHKeyService_1.sshKeyService.generateKey(name, type, bits, passphrase, comment);
        return { success: true, key };
    }
    catch (err) {
        return { success: false, error: err.message };
    }
});
electron_1.ipcMain.handle('sshkey:import', async (event, name, privateKey, comment) => {
    try {
        const key = await SSHKeyService_1.sshKeyService.importKey(name, privateKey, comment);
        return { success: true, key };
    }
    catch (err) {
        return { success: false, error: err.message };
    }
});
electron_1.ipcMain.handle('sshkey:list', async () => {
    return SSHKeyService_1.sshKeyService.getAllKeys();
});
electron_1.ipcMain.handle('sshkey:get', async (event, id) => {
    return SSHKeyService_1.sshKeyService.getKey(id);
});
electron_1.ipcMain.handle('sshkey:getPrivate', async (event, id) => {
    return SSHKeyService_1.sshKeyService.getPrivateKey(id);
});
electron_1.ipcMain.handle('sshkey:delete', async (event, id) => {
    return SSHKeyService_1.sshKeyService.deleteKey(id);
});
electron_1.ipcMain.handle('sshkey:rename', async (event, id, newName) => {
    return SSHKeyService_1.sshKeyService.renameKey(id, newName);
});
electron_1.ipcMain.handle('sshkey:exportAll', async () => {
    return SSHKeyService_1.sshKeyService.exportAllKeysForBackup();
});
electron_1.ipcMain.handle('sshkey:importFromBackup', async (event, keys) => {
    return await SSHKeyService_1.sshKeyService.importKeysFromBackup(keys);
});
// Export single SSH key to file
electron_1.ipcMain.handle('sshkey:exportToFile', async (event, keyId, keyName, includePrivate) => {
    try {
        const keyInfo = SSHKeyService_1.sshKeyService.getKey(keyId);
        if (!keyInfo) {
            return { success: false, error: 'Key not found' };
        }
        if (includePrivate) {
            // Export both public and private keys
            const privateKey = SSHKeyService_1.sshKeyService.getPrivateKey(keyId);
            if (!privateKey) {
                return { success: false, error: 'Private key not found' };
            }
            // Ask for folder to save
            const result = await electron_1.dialog.showOpenDialog(mainWindow, {
                title: 'Select folder to save SSH keys',
                properties: ['openDirectory', 'createDirectory'],
            });
            if (result.canceled || result.filePaths.length === 0) {
                return { success: false, canceled: true };
            }
            const folderPath = result.filePaths[0];
            const safeName = keyName.replace(/[^a-zA-Z0-9_-]/g, '_');
            // Save private key
            const privateKeyPath = path.join(folderPath, safeName);
            fs.writeFileSync(privateKeyPath, privateKey, { mode: 0o600 });
            // Save public key
            const publicKeyPath = path.join(folderPath, `${safeName}.pub`);
            fs.writeFileSync(publicKeyPath, keyInfo.publicKey);
            return { success: true, path: folderPath, files: [safeName, `${safeName}.pub`] };
        }
        else {
            // Export only public key
            const result = await electron_1.dialog.showSaveDialog(mainWindow, {
                title: 'Save Public Key',
                defaultPath: `${keyName.replace(/[^a-zA-Z0-9_-]/g, '_')}.pub`,
                filters: [
                    { name: 'Public Key', extensions: ['pub'] },
                    { name: 'All Files', extensions: ['*'] },
                ],
            });
            if (result.canceled || !result.filePath) {
                return { success: false, canceled: true };
            }
            fs.writeFileSync(result.filePath, keyInfo.publicKey);
            return { success: true, path: result.filePath };
        }
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
// Select and read SSH key file for import
electron_1.ipcMain.handle('sshkey:selectFile', async () => {
    try {
        const result = await electron_1.dialog.showOpenDialog(mainWindow, {
            title: 'Select SSH Private Key File',
            properties: ['openFile'],
            filters: [
                { name: 'SSH Key Files', extensions: ['pem', 'key', 'ppk', ''] },
                { name: 'All Files', extensions: ['*'] },
            ],
        });
        if (result.canceled || result.filePaths.length === 0) {
            return { success: false, canceled: true };
        }
        const filePath = result.filePaths[0];
        const content = fs.readFileSync(filePath, 'utf-8');
        const fileName = path.basename(filePath);
        return { success: true, content, fileName, filePath };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
// Tools handlers
electron_1.ipcMain.handle('tools:smtpTest', async (event, config) => {
    return await NetworkToolsService_1.networkToolsService.advancedSmtpTest(config);
});
electron_1.ipcMain.handle('tools:proxyCheck', async (event, config) => {
    return await NetworkToolsService_1.networkToolsService.proxyCheck(config);
});
electron_1.ipcMain.handle('tools:portListener', async () => {
    return await NetworkToolsService_1.networkToolsService.getListeningPorts();
});
// Port Forwarding handlers
PortForwardingService_1.portForwardingService.on('status', (config) => {
    if (mainWindow) {
        mainWindow.webContents.send('portforward:status', config);
    }
});
electron_1.ipcMain.handle('portforward:create', async (event, config) => {
    try {
        switch (config.type) {
            case 'local':
                await PortForwardingService_1.portForwardingService.createLocalForward(config);
                break;
            case 'remote':
                await PortForwardingService_1.portForwardingService.createRemoteForward(config);
                break;
            case 'dynamic':
                await PortForwardingService_1.portForwardingService.createDynamicForward(config);
                break;
            default:
                throw new Error('Invalid forward type');
        }
        return { success: true };
    }
    catch (err) {
        return { success: false, error: err.message };
    }
});
electron_1.ipcMain.handle('portforward:stop', async (event, tunnelId) => {
    try {
        await PortForwardingService_1.portForwardingService.stopTunnel(tunnelId);
        return { success: true };
    }
    catch (err) {
        return { success: false, error: err.message };
    }
});
electron_1.ipcMain.handle('portforward:list', async () => {
    return PortForwardingService_1.portForwardingService.getAllTunnels();
});
electron_1.ipcMain.handle('portforward:get', async (event, tunnelId) => {
    return PortForwardingService_1.portForwardingService.getTunnel(tunnelId);
});
// Port Knocking IPC Handlers
electron_1.ipcMain.handle('portknock:generateSequence', async (event, length = 4) => {
    return PortKnockService_1.PortKnockService.generateRandomSequence(length);
});
electron_1.ipcMain.handle('portknock:validate', async (event, sequence) => {
    return PortKnockService_1.PortKnockService.validateKnockSequence(sequence);
});
// Check for updates from GitHub
electron_1.ipcMain.handle('app:checkForUpdates', async () => {
    try {
        const https = require('https');
        return new Promise((resolve) => {
            // First try releases, then fall back to tags
            const tryFetch = (path, isRelease) => {
                const options = {
                    hostname: 'api.github.com',
                    path,
                    headers: {
                        'User-Agent': 'Marix-SSH-Client',
                        'Accept': 'application/vnd.github.v3+json'
                    }
                };
                https.get(options, (res) => {
                    let data = '';
                    res.on('data', (chunk) => data += chunk);
                    res.on('end', () => {
                        try {
                            if (res.statusCode === 200) {
                                const result = JSON.parse(data);
                                if (isRelease) {
                                    resolve({
                                        success: true,
                                        latestVersion: result.tag_name?.replace('v', '') || result.name,
                                        releaseUrl: result.html_url,
                                        publishedAt: result.published_at,
                                        releaseNotes: result.body
                                    });
                                }
                                else {
                                    // Tags endpoint returns array
                                    if (Array.isArray(result) && result.length > 0) {
                                        const latestTag = result[0];
                                        resolve({
                                            success: true,
                                            latestVersion: latestTag.name?.replace('v', '') || latestTag.ref?.split('/').pop()?.replace('v', ''),
                                            releaseUrl: `https://github.com/marixdev/marix/releases/tag/${latestTag.name}`,
                                            publishedAt: null,
                                            releaseNotes: null
                                        });
                                    }
                                    else {
                                        resolve({ success: false, error: 'No releases or tags found' });
                                    }
                                }
                            }
                            else if (res.statusCode === 404 && isRelease) {
                                // No releases found, try tags
                                tryFetch('/repos/marixdev/marix/tags', false);
                            }
                            else {
                                console.log('[Update] GitHub API response:', res.statusCode, data);
                                resolve({ success: false, error: `GitHub API error: ${res.statusCode}` });
                            }
                        }
                        catch (e) {
                            console.error('[Update] Parse error:', e);
                            resolve({ success: false, error: 'Failed to parse response' });
                        }
                    });
                }).on('error', (err) => {
                    console.error('[Update] Request error:', err);
                    resolve({ success: false, error: err.message });
                });
            };
            // Start with releases endpoint
            tryFetch('/repos/marixdev/marix/releases/latest', true);
        });
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
// Open URL in browser
electron_1.ipcMain.handle('app:openUrl', async (event, url) => {
    const { shell } = require('electron');
    shell.openExternal(url);
});
//# sourceMappingURL=index.js.map