import { app, BrowserWindow, ipcMain, dialog, shell, Tray, Menu, nativeImage } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { NativeSSHManager } from './services/NativeSSHManager';
import { SSHConnectionManager } from './services/SSHConnectionManager';
import { SFTPManager } from './services/SFTPManager';
import { FTPManager } from './services/FTPManager';
import { RDPManager } from './services/RDPManager';
import { WSSManager } from './services/WSSManager';
import { ServerStore } from './services/ServerStore';
import { BackupService } from './services/BackupService';
import { cloudflareService } from './services/CloudflareService';
import { whoisService } from './services/WhoisService';
import { networkToolsService } from './services/NetworkToolsService';
import { GitHubAuthService } from './services/GitHubAuthService';
import { knownHostsService } from './services/KnownHostsService';
import { sshKeyService } from './services/SSHKeyService';
import { portForwardingService } from './services/PortForwardingService';
import { GitLabOAuthService } from './services/GitLabOAuthService';
import { GitLabApiService } from './services/GitLabApiService';
import { BoxOAuthService } from './services/BoxOAuthService';
import { BoxApiService } from './services/BoxApiService';
import { PortKnockService } from './services/PortKnockService';
import { LANSharingService } from './services/LANSharingService';
import { lanFileTransferService } from './services/LANFileTransferService';
import { getGoogleDriveService } from './services/GoogleDriveService';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
const nativeSSH = new NativeSSHManager();  // For terminal (with MOTD)
const sshManager = new SSHConnectionManager();  // For SFTP
const sftpManager = new SFTPManager();
const ftpManager = new FTPManager();  // For FTP/FTPS
const rdpManager = new RDPManager();  // For RDP/Windows
const wssManager = new WSSManager();  // For WebSocket Secure
const serverStore = new ServerStore();  // For persistent server storage
const backupService = new BackupService();  // For backup/restore
const githubAuthService = new GitHubAuthService();  // For GitHub OAuth
const googleDriveService = getGoogleDriveService();  // For Google Drive backup
const lanSharingService = new LANSharingService();  // For LAN sharing

function createAppMenu() {
  const template: any[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Send Files via LAN',
          accelerator: 'CmdOrCtrl+Shift+F',
          click: () => {
            mainWindow?.webContents.send('menu:send-files');
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Marix',
          click: () => {
            mainWindow?.webContents.send('menu:about');
          }
        }
      ]
    }
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createTray() {
  // Try multiple icon paths
  const iconPaths = [
    path.join(__dirname, '../../icon/i.png'),
    path.join(__dirname, '../icon/i.png'),
    path.join(app.getAppPath(), 'icon/i.png'),
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

  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  
  const contextMenu = Menu.buildFromTemplate([
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
        app.quit();
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
  const isMac = process.platform === 'darwin';
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    frame: false,
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    trafficLightPosition: isMac ? { x: 12, y: 12 } : undefined,
    icon: path.join(__dirname, '../../icon/i.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false,  // Keep app responsive in background
      spellcheck: false,  // Disable spellcheck for performance
    },
    backgroundColor: '#1a1d2e',
    show: false,  // Don't show until ready
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
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Register protocol handler for OAuth callbacks
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient('marix', process.execPath, [path.resolve(process.argv[1])]);
    }
  } else {
    app.setAsDefaultProtocolClient('marix');
  }
  
  // Handle protocol URL from command line args (Linux)
  const protocolUrl = process.argv.find(arg => arg.startsWith('marix://'));
  if (protocolUrl) {
    console.log('[Protocol] Received URL from argv:', protocolUrl);
    setTimeout(() => {
      if (protocolUrl.startsWith('marix://oauth/gitlab')) {
        GitLabOAuthService.handleCallback(protocolUrl);
      }
    }, 1000); // Wait for app to initialize
  }
  
  createWindow();
  createTray();
  createAppMenu();
  
  // Start LAN sharing service on app startup for always-on discovery
  lanSharingService.start().then(() => {
    console.log('[App] LAN sharing service started on app ready');
  }).catch((err) => {
    console.error('[App] Failed to start LAN sharing on startup:', err);
  });
  
  // Start file transfer service
  lanFileTransferService.start().catch((err: any) => {
    console.error('[FileTransfer] Failed to start:', err);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Handle protocol URLs (OAuth callbacks)
app.on('open-url', (event, url) => {
  event.preventDefault();
  console.log('[Protocol] Received URL:', url);
  
  if (url.startsWith('marix://oauth/gitlab')) {
    GitLabOAuthService.handleCallback(url);
  }
});

// Handle protocol URLs on Windows
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine) => {
    // Handle protocol URL on Windows (from commandLine)
    const url = commandLine.find(arg => arg.startsWith('marix://'));
    if (url) {
      console.log('[Protocol] Received URL from second instance:', url);
      if (url.startsWith('marix://oauth/gitlab')) {
        GitLabOAuthService.handleCallback(url);
      }
    }
    
    // Focus main window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

app.on('window-all-closed', () => {
  // Close all RDP sessions before quitting
  rdpManager.closeAll();
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Cleanup before quit
app.on('before-quit', () => {
  console.log('[App] Cleaning up before quit...');
  rdpManager.closeAll();
  nativeSSH.closeAll();
  sshManager.closeAll();
});

// Window control handlers
ipcMain.handle('window:minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.handle('window:close', () => {
  mainWindow?.close();
});

// Dialog handler for file selection
ipcMain.handle('dialog:openFile', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow!, {
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
  } catch (err: any) {
    return { error: err.message };
  }
});

// IPC Handlers - Use NativeSSH for terminal (proper MOTD support)
ipcMain.handle('ssh:connect', async (event, config) => {
  try {
    // Perform port knocking if enabled
    if (config.knockEnabled && config.knockSequence && config.knockSequence.length > 0) {
      console.log('[Main] Port knocking enabled, knocking before SSH connect...');
      await PortKnockService.knock(config.host, config.knockSequence);
    }
    
    // Connect using native SSH (spawns ssh command with PTY)
    const { connectionId, emitter } = await nativeSSH.connectAndCreateShell(config);
    
    // Setup data forwarding to renderer
    const dataHandler = (data: string) => {
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
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// Local Terminal - spawn local shell without SSH
ipcMain.handle('local:createShell', async (event, cols, rows) => {
  try {
    const { connectionId, emitter } = nativeSSH.createLocalShell(cols, rows);
    
    // Setup data forwarding to renderer
    const dataHandler = (data: string) => {
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
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// Get local OS info
ipcMain.handle('local:getOsInfo', async () => {
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
        } else {
          osName = 'Linux';
        }
      } catch {
        osName = 'Linux';
      }
    } else if (osName === 'Darwin') {
      osName = 'macOS';
    } else if (osName === 'Windows_NT') {
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
      if (ip) break;
    }
    
    return {
      os: osName,
      ip: ip || 'localhost',
      provider: null, // Local machine, no provider
    };
  } catch (error: any) {
    console.error('[Main] Error getting local OS info:', error);
    return {
      os: require('os').type(),
      ip: 'localhost',
      provider: null,
    };
  }
});

ipcMain.handle('ssh:disconnect', async (event, connectionId) => {
  try {
    nativeSSH.disconnect(connectionId);
    await sshManager.disconnect(connectionId).catch(() => {});
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ssh:execute', async (event, connectionId, command) => {
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
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// Shell already created in ssh:connect, this is just for compatibility
ipcMain.handle('ssh:createShell', async (event, connectionId, cols, rows) => {
  try {
    // Shell already exists from connect, just return success
    if (nativeSSH.isConnected(connectionId)) {
      return { success: true };
    }
    return { success: false, error: 'Not connected' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ssh:writeShell', async (event, connectionId, data) => {
  try {
    nativeSSH.writeToShell(connectionId, data);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ssh:resizeShell', async (event, connectionId, cols, rows) => {
  try {
    nativeSSH.resizeShell(connectionId, cols, rows);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('sftp:connect', async (event, connectionId, config) => {
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
  } catch (error: any) {
    console.error('[Main] SFTP connect error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('sftp:list', async (event, connectionId, remotePath) => {
  try {
    console.log('[Main] sftp:list', connectionId, remotePath);
    const files = await sftpManager.listFiles(connectionId, remotePath);
    return { success: true, files };
  } catch (error: any) {
    console.error('[Main] sftp:list error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('sftp:download', async (event, connectionId, remotePath, localPath) => {
  try {
    console.log('[Main] sftp:download', connectionId, remotePath, '->', localPath);
    await sftpManager.downloadFile(connectionId, remotePath, localPath);
    console.log('[Main] sftp:download success');
    return { success: true };
  } catch (error: any) {
    console.error('[Main] sftp:download error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('sftp:upload', async (event, connectionId, localPath, remotePath) => {
  try {
    console.log('[Main] sftp:upload', connectionId, localPath, '->', remotePath);
    await sftpManager.uploadFile(connectionId, localPath, remotePath);
    console.log('[Main] sftp:upload success');
    return { success: true };
  } catch (error: any) {
    console.error('[Main] sftp:upload error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('sftp:delete', async (event, connectionId, remotePath) => {
  try {
    console.log('[Main] sftp:delete', connectionId, remotePath);
    await sftpManager.deleteFile(connectionId, remotePath);
    return { success: true };
  } catch (error: any) {
    console.error('[Main] sftp:delete error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('sftp:mkdir', async (event, connectionId, remotePath) => {
  try {
    console.log('[Main] sftp:mkdir', connectionId, remotePath);
    await sftpManager.createDirectory(connectionId, remotePath);
    console.log('[Main] sftp:mkdir success');
    return { success: true };
  } catch (error: any) {
    console.error('[Main] sftp:mkdir error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('sftp:readFile', async (event, connectionId, remotePath) => {
  try {
    console.log('[Main] sftp:readFile', connectionId, remotePath);
    const content = await sftpManager.readFile(connectionId, remotePath);
    console.log('[Main] sftp:readFile success, length:', content.length);
    return { success: true, content };
  } catch (error: any) {
    console.error('[Main] sftp:readFile error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('sftp:writeFile', async (event, connectionId, remotePath, content) => {
  try {
    console.log('[Main] sftp:writeFile', connectionId, remotePath);
    await sftpManager.writeFile(connectionId, remotePath, content);
    console.log('[Main] sftp:writeFile success');
    return { success: true };
  } catch (error: any) {
    console.error('[Main] sftp:writeFile error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('sftp:chmod', async (event, connectionId, remotePath, mode) => {
  try {
    console.log('[Main] sftp:chmod', connectionId, remotePath, mode);
    await sftpManager.chmod(connectionId, remotePath, mode);
    return { success: true };
  } catch (error: any) {
    console.error('[Main] sftp:chmod error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('sftp:rename', async (event, connectionId, oldPath, newPath) => {
  try {
    console.log('[Main] sftp:rename', connectionId, oldPath, '->', newPath);
    await sftpManager.rename(connectionId, oldPath, newPath);
    return { success: true };
  } catch (error: any) {
    console.error('[Main] sftp:rename error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('sftp:deleteDir', async (event, connectionId, remotePath) => {
  try {
    console.log('[Main] sftp:deleteDir', connectionId, remotePath);
    await sftpManager.deleteDirectory(connectionId, remotePath);
    return { success: true };
  } catch (error: any) {
    console.error('[Main] sftp:deleteDir error:', error.message);
    return { success: false, error: error.message };
  }
});

// Server storage handlers
ipcMain.handle('servers:getAll', async () => {
  try {
    const servers = serverStore.getAllServers();
    return { success: true, servers };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('servers:add', async (event, server) => {
  try {
    const newServer = serverStore.addServer(server);
    return { success: true, server: newServer };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('servers:update', async (event, server) => {
  try {
    serverStore.updateServer(server.id, server);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('servers:delete', async (event, id) => {
  try {
    serverStore.deleteServer(id);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('servers:importAll', async (event, servers) => {
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
  } catch (error: any) {
    console.error('[Main] servers:importAll error:', error.message);
    return { success: false, error: error.message };
  }
});

// Tag management handlers
ipcMain.handle('tags:getColors', async () => {
  try {
    const tagColors = serverStore.getTagColors();
    return { success: true, tagColors };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('tags:setColor', async (event, tagName: string, color: string) => {
  try {
    serverStore.setTagColor(tagName, color);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('tags:saveColors', async (event, tagColors: { [key: string]: string }) => {
  try {
    // Save all tag colors at once (for backup restore)
    for (const [tagName, color] of Object.entries(tagColors)) {
      serverStore.setTagColor(tagName, color);
    }
    console.log('[Main] tags:saveColors - saved', Object.keys(tagColors).length, 'tag colors');
    return { success: true };
  } catch (error: any) {
    console.error('[Main] tags:saveColors error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('tags:delete', async (event, tagName: string) => {
  try {
    serverStore.deleteTagFromAllServers(tagName);
    // Return updated servers list
    const servers = serverStore.getAllServers();
    return { success: true, servers };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// FTP/FTPS handlers
ipcMain.handle('ftp:connect', async (event, connectionId, config) => {
  try {
    await ftpManager.connect(connectionId, config);
    return { success: true };
  } catch (error: any) {
    console.error('[Main] ftp:connect error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ftp:disconnect', async (event, connectionId) => {
  try {
    await ftpManager.disconnect(connectionId);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ftp:list', async (event, connectionId, remotePath) => {
  try {
    const files = await ftpManager.listFiles(connectionId, remotePath);
    return { success: true, files };
  } catch (error: any) {
    console.error('[Main] ftp:list error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ftp:download', async (event, connectionId, remotePath, localPath) => {
  try {
    await ftpManager.downloadFile(connectionId, remotePath, localPath);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ftp:upload', async (event, connectionId, localPath, remotePath) => {
  try {
    await ftpManager.uploadFile(connectionId, localPath, remotePath);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ftp:delete', async (event, connectionId, remotePath) => {
  try {
    await ftpManager.deleteFile(connectionId, remotePath);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ftp:deleteDir', async (event, connectionId, remotePath) => {
  try {
    await ftpManager.deleteDirectory(connectionId, remotePath);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ftp:mkdir', async (event, connectionId, remotePath) => {
  try {
    await ftpManager.createDirectory(connectionId, remotePath);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ftp:rename', async (event, connectionId, oldPath, newPath) => {
  try {
    await ftpManager.rename(connectionId, oldPath, newPath);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ftp:readFile', async (event, connectionId, remotePath) => {
  try {
    console.log('[Main] ftp:readFile', connectionId, remotePath);
    const content = await ftpManager.readFile(connectionId, remotePath);
    console.log('[Main] ftp:readFile success, length:', content.length);
    return { success: true, content };
  } catch (error: any) {
    console.error('[Main] ftp:readFile error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ftp:writeFile', async (event, connectionId, remotePath, content) => {
  try {
    console.log('[Main] ftp:writeFile', connectionId, remotePath);
    await ftpManager.writeFile(connectionId, remotePath, content);
    console.log('[Main] ftp:writeFile success');
    return { success: true };
  } catch (error: any) {
    console.error('[Main] ftp:writeFile error:', error.message);
    return { success: false, error: error.message };
  }
});

// RDP (Windows Remote Desktop) handlers
ipcMain.handle('rdp:connect', async (event, connectionId, config) => {
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

    emitter.on('error', (err: Error) => {
      if (event.sender && !event.sender.isDestroyed()) {
        event.sender.send('rdp:error', connectionId, err.message);
      }
    });

    return { success: true, connectionId };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('rdp:disconnect', async (event, connectionId) => {
  try {
    rdpManager.disconnect(connectionId);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('rdp:focus', async (event, connectionId) => {
  try {
    rdpManager.focusWindow(connectionId);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('rdp:fullscreen', async (event, connectionId) => {
  try {
    rdpManager.toggleFullscreen(connectionId);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('rdp:mouse', async (event, connectionId, x, y, button, isPressed) => {
  try {
    rdpManager.sendMouse(connectionId, x, y, button, isPressed);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('rdp:wheel', async (event, connectionId, x, y, step, isNegative, isHorizontal) => {
  try {
    rdpManager.sendWheel(connectionId, x, y, step, isNegative, isHorizontal);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('rdp:scancode', async (event, connectionId, code, isPressed) => {
  try {
    rdpManager.sendScancode(connectionId, code, isPressed);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('rdp:unicode', async (event, connectionId, code, isPressed) => {
  try {
    rdpManager.sendUnicode(connectionId, code, isPressed);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// ===================== WSS (WebSocket Secure) Handlers =====================

// Setup WSS event listeners once
wssManager.on('connect', (connectionId: string) => {
  mainWindow?.webContents.send('wss:connect', connectionId);
});

wssManager.on('message', (connectionId: string, message: string) => {
  mainWindow?.webContents.send('wss:message', connectionId, message);
});

wssManager.on('close', (connectionId: string, code: number, reason: string) => {
  mainWindow?.webContents.send('wss:close', connectionId, code, reason);
});

wssManager.on('error', (connectionId: string, error: string) => {
  mainWindow?.webContents.send('wss:error', connectionId, error);
});

ipcMain.handle('wss:connect', async (event, connectionId, config) => {
  try {
    const result = wssManager.connect(connectionId, config);
    return { success: result.success, error: result.error };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('wss:send', async (event, connectionId, message) => {
  try {
    const success = wssManager.send(connectionId, message);
    return { success };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('wss:disconnect', async (event, connectionId) => {
  try {
    wssManager.disconnect(connectionId);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('wss:history', async (event, connectionId) => {
  try {
    const history = wssManager.getHistory(connectionId);
    return { success: true, history };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// Backup handlers
ipcMain.handle('backup:validatePassword', async (event, password) => {
  return backupService.validatePassword(password);
});

ipcMain.handle('backup:create', async (event, data, password, customPath) => {
  try {
    console.log('[Main] backup:create');
    const result = await backupService.createLocalBackup(data, password, customPath);
    return result;
  } catch (error: any) {
    console.error('[Main] backup:create error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('backup:restore', async (event, filePath, password) => {
  try {
    console.log('[Main] backup:restore from:', filePath);
    const result = await backupService.restoreLocalBackup(filePath, password);
    return result;
  } catch (error: any) {
    console.error('[Main] backup:restore error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('backup:list', async (event) => {
  try {
    const backups = backupService.listLocalBackups();
    return { success: true, backups };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('backup:delete', async (event, filePath) => {
  try {
    const success = backupService.deleteLocalBackup(filePath);
    return { success };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('backup:selectFile', async (event) => {
  try {
    const result = await dialog.showOpenDialog(mainWindow!, {
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
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('backup:selectSaveLocation', async (event) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const defaultName = `marix-backup-${timestamp}.marix`;
    
    const result = await dialog.showSaveDialog(mainWindow!, {
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
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('backup:getDir', async (event) => {
  return { success: true, dir: backupService.getBackupDir() };
});

ipcMain.handle('backup:createGithub', async (event, githubToken: string, gistId: string | null, password: string) => {
  const servers = serverStore.getAllServers();
  const tagColors = serverStore.getTagColors();
  const cloudflareToken = cloudflareService.getToken() || undefined;
  return await backupService.createGithubBackup(githubToken, gistId || null, password, servers, tagColors, cloudflareToken);
});

ipcMain.handle('backup:restoreGithub', async (event, githubToken: string, gistId: string, password: string) => {
  const result = await backupService.restoreGithubBackup(githubToken, gistId, password);
  if (result.success && result.data) {
    serverStore.setServers(result.data.servers);
    serverStore.setTagColors(result.data.tagColors);
    if (result.data.cloudflareToken) {
      cloudflareService.setToken(result.data.cloudflareToken);
    }
    return { success: true, serverCount: result.data.servers.length };
  }
  return result;
});

// ==================== GitHub OAuth Handlers ====================

ipcMain.handle('github:requestDeviceCode', async () => {
  return await githubAuthService.requestDeviceCode();
});

ipcMain.handle('github:pollForToken', async (event, deviceCode: string, interval: number) => {
  return await githubAuthService.pollForToken(deviceCode, interval);
});

ipcMain.handle('github:stopPolling', async () => {
  githubAuthService.stopPolling();
  return { success: true };
});

ipcMain.handle('github:hasToken', async () => {
  return await githubAuthService.hasToken();
});

ipcMain.handle('github:verifyToken', async () => {
  return await githubAuthService.verifyToken();
});

ipcMain.handle('github:logout', async () => {
  await githubAuthService.logout();
  return { success: true };
});

ipcMain.handle('github:createBackupRepo', async (event, repoName?: string) => {
  return await githubAuthService.createBackupRepo(repoName);
});

ipcMain.handle('github:listRepos', async () => {
  return await githubAuthService.listRepos();
});

// ==================== Google Drive Backup Handlers ====================

ipcMain.handle('gdrive:hasCredentials', async () => {
  return { success: true, hasCredentials: googleDriveService.hasCredentials() };
});

ipcMain.handle('gdrive:saveCredentials', async (event, credentials) => {
  try {
    googleDriveService.saveCredentials(credentials);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('gdrive:startAuth', async () => {
  return await googleDriveService.startAuthFlow();
});

ipcMain.handle('gdrive:handleAuthCode', async (event, code: string) => {
  return await googleDriveService.handleAuthCallback(code);
});

ipcMain.handle('gdrive:isAuthenticated', async () => {
  return { success: true, authenticated: googleDriveService.isAuthenticated() };
});

ipcMain.handle('gdrive:getUserInfo', async () => {
  return await googleDriveService.getUserInfo();
});

ipcMain.handle('gdrive:disconnect', async () => {
  googleDriveService.disconnect();
  return { success: true };
});

ipcMain.handle('gdrive:checkBackup', async () => {
  return await googleDriveService.checkBackup();
});

ipcMain.handle('gdrive:createBackup', async (event, password: string) => {
  try {
    const servers = serverStore.getAllServers();
    const tagColors = serverStore.getTagColors();
    const cloudflareToken = cloudflareService.getToken() || undefined;
    
    // Get SSH keys
    const sshKeys = sshKeyService.exportAllKeysForBackup();
    
    // Get 2FA TOTP entries
    const totpJson = await mainWindow?.webContents.executeJavaScript('localStorage.getItem("totp_entries")');
    const totpEntries = totpJson ? JSON.parse(totpJson) : [];
    
    // Get Port Forwards
    const pfJson = await mainWindow?.webContents.executeJavaScript('localStorage.getItem("port_forwards")');
    const portForwards = pfJson ? JSON.parse(pfJson) : [];

    // Create encrypted backup
    const result = await backupService.createBackupContent(
      password,
      servers,
      tagColors,
      cloudflareToken,
      sshKeys,
      totpEntries,
      portForwards
    );
    
    if (!result.success || !result.content) {
      return { success: false, error: result.error || 'Failed to create backup content' };
    }

    // Upload to Google Drive
    const fileName = 'marix-backup.marix';
    const uploadResult = await googleDriveService.uploadBackup(fileName, result.content);

    if (uploadResult.success) {
      return {
        success: true,
        serverCount: servers.length,
        fileId: uploadResult.fileId,
      };
    }

    return result;
  } catch (error: any) {
    console.error('[Main] gdrive:createBackup error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('gdrive:restoreBackup', async (event, password: string) => {
  try {
    // Download backup from Google Drive
    const downloadResult = await googleDriveService.downloadBackup();
    
    if (!downloadResult.success || !downloadResult.data) {
      return { success: false, error: downloadResult.error || 'Failed to download backup' };
    }

    // Parse and decrypt backup
    const result = await backupService.restoreBackupContent(downloadResult.data, password);

    if (result.success && result.data) {
      // Restore data
      serverStore.setServers(result.data.servers);
      serverStore.setTagColors(result.data.tagColors);
      
      if (result.data.cloudflareToken) {
        cloudflareService.setToken(result.data.cloudflareToken);
      }

      return {
        success: true,
        serverCount: result.data.servers.length,
        metadata: downloadResult.metadata,
      };
    }

    return result;
  } catch (error: any) {
    console.error('[Main] gdrive:restoreBackup error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('github:getRepoName', async () => {
  return await githubAuthService.getRepoName();
});

ipcMain.handle('github:saveRepoName', async (event, repoName: string) => {
  await githubAuthService.saveRepoName(repoName);
  return { success: true };
});

ipcMain.handle('github:uploadBackup', async (event, password: string, totpEntries?: any[], portForwards?: any[]) => {
  // Validate password first (same as local backup)
  const validation = backupService.validatePassword(password);
  if (!validation.valid) {
    return { success: false, error: validation.errors.join('\n') };
  }
  
  const servers = serverStore.getAllServers();
  const tagColors = serverStore.getTagColors();
  const cloudflareToken = cloudflareService.getToken() || undefined;
  const sshKeys = sshKeyService.exportAllKeysForBackup();
  
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

ipcMain.handle('github:downloadBackup', async (event, password: string) => {
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
    cloudflareService.setToken(restoreResult.data.cloudflareToken);
  }
  
  // Restore SSH keys
  let sshKeyCount = 0;
  if (restoreResult.data.sshKeys && restoreResult.data.sshKeys.length > 0) {
    const importResult = await sshKeyService.importKeysFromBackup(restoreResult.data.sshKeys);
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

ipcMain.handle('github:openAuthUrl', async (event, url: string) => {
  shell.openExternal(url);
  return { success: true };
});

// ==================== GitLab OAuth Handlers ====================

ipcMain.handle('gitlab:startOAuth', async () => {
  try {
    const tokens = await GitLabOAuthService.startOAuthFlow(mainWindow || undefined);
    GitLabOAuthService.saveTokens(tokens);
    return { success: true };
  } catch (error: any) {
    console.error('[GitLab OAuth] Error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('gitlab:submitCode', async (event, code: string) => {
  try {
    GitLabOAuthService.handleManualCode(code);
    return { success: true };
  } catch (error: any) {
    console.error('[GitLab OAuth] Error submitting code:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('gitlab:hasToken', async () => {
  const tokens = GitLabOAuthService.loadTokens();
  if (!tokens) {
    return { hasToken: false };
  }
  
  // Check if token is valid or can be refreshed
  if (GitLabOAuthService.isTokenValid(tokens)) {
    return { hasToken: true };
  }
  
  // Try to refresh
  try {
    const newTokens = await GitLabOAuthService.refreshToken(tokens);
    GitLabOAuthService.saveTokens(newTokens);
    return { hasToken: true };
  } catch (err) {
    return { hasToken: false };
  }
});

ipcMain.handle('gitlab:logout', async () => {
  GitLabOAuthService.clearTokens();
  return { success: true };
});

ipcMain.handle('gitlab:uploadBackup', async (event, password: string, totpEntries?: any[], portForwards?: any[]) => {
  try {
    // Validate password first
    const validation = backupService.validatePassword(password);
    if (!validation.valid) {
      return { success: false, error: validation.errors.join('\n') };
    }
    
    // Get access token
    const accessToken = await GitLabOAuthService.getValidAccessToken();
    if (!accessToken) {
      return { success: false, error: 'Not authenticated with GitLab. Please connect first.' };
    }
    
    // Gather data to backup
    const servers = serverStore.getAllServers();
    const tagColors = serverStore.getTagColors();
    const cloudflareToken = cloudflareService.getToken() || undefined;
    const sshKeys = sshKeyService.exportAllKeysForBackup();
    
    // Create encrypted backup content
    const backupResult = await backupService.createBackupContent(
      password, 
      servers, 
      tagColors, 
      cloudflareToken, 
      sshKeys, 
      totpEntries, 
      portForwards
    );
    
    if (!backupResult.success || !backupResult.content) {
      return { success: false, error: backupResult.error };
    }
    
    // Upload to GitLab
    await GitLabApiService.uploadBackup(accessToken, backupResult.content);
    
    return { success: true };
  } catch (error: any) {
    console.error('[GitLab] Upload backup error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('gitlab:downloadBackup', async (event, password: string) => {
  try {
    // Get access token
    const accessToken = await GitLabOAuthService.getValidAccessToken();
    if (!accessToken) {
      return { success: false, error: 'Not authenticated with GitLab. Please connect first.' };
    }
    
    // Download from GitLab
    const encryptedContent = await GitLabApiService.downloadBackup(accessToken);
    
    // Decrypt backup
    const restoreResult = await backupService.restoreBackupContent(encryptedContent, password);
    if (!restoreResult.success || !restoreResult.data) {
      return { success: false, error: restoreResult.error };
    }
    
    // Restore data
    serverStore.setServers(restoreResult.data.servers);
    serverStore.setTagColors(restoreResult.data.tagColors);
    if (restoreResult.data.cloudflareToken) {
      cloudflareService.setToken(restoreResult.data.cloudflareToken);
    }
    
    // Restore SSH keys
    let sshKeyCount = 0;
    if (restoreResult.data.sshKeys && restoreResult.data.sshKeys.length > 0) {
      const importResult = await sshKeyService.importKeysFromBackup(restoreResult.data.sshKeys);
      sshKeyCount = importResult.imported;
    }
    
    return { 
      success: true, 
      serverCount: restoreResult.data.servers.length,
      sshKeyCount,
      totpEntries: restoreResult.data.totpEntries,
      portForwards: restoreResult.data.portForwards
    };
  } catch (error: any) {
    console.error('[GitLab] Download backup error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('gitlab:checkBackup', async () => {
  try {
    const accessToken = await GitLabOAuthService.getValidAccessToken();
    if (!accessToken) {
      return { exists: false };
    }
    
    const exists = await GitLabApiService.backupExists(accessToken);
    if (!exists) {
      return { exists: false };
    }
    
    const metadata = await GitLabApiService.getBackupMetadata(accessToken);
    return { exists: true, metadata };
  } catch (error: any) {
    console.error('[GitLab] Check backup error:', error);
    return { exists: false };
  }
});

// ==================== Box OAuth Handlers ====================

ipcMain.handle('box:startOAuth', async () => {
  try {
    const tokens = await BoxOAuthService.startOAuthFlow(mainWindow || undefined);
    BoxOAuthService.saveTokens(tokens);
    return { success: true };
  } catch (error: any) {
    console.error('[Box OAuth] Error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('box:submitCode', async (event, code: string) => {
  try {
    BoxOAuthService.handleManualCode(code);
    return { success: true };
  } catch (error: any) {
    console.error('[Box OAuth] Error submitting code:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('box:hasToken', async () => {
  const accessToken = await BoxOAuthService.getValidAccessToken();
  return { hasToken: !!accessToken };
});

ipcMain.handle('box:logout', async () => {
  try {
    BoxOAuthService.deleteTokens();
    return { success: true };
  } catch (error: any) {
    console.error('[Box] Logout error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('box:uploadBackup', async (event, password: string, totpEntries?: any[], portForwards?: any[]) => {
  try {
    // Validate password
    const validation = backupService.validatePassword(password);
    if (!validation.valid) {
      return { success: false, error: validation.errors.join('\n') };
    }
    
    // Get access token
    const accessToken = await BoxOAuthService.getValidAccessToken();
    if (!accessToken) {
      return { success: false, error: 'Not authenticated with Box. Please connect first.' };
    }
    
    const servers = serverStore.getAllServers();
    const tagColors = serverStore.getTagColors();
    const cloudflareToken = cloudflareService.getToken() || undefined;
    const sshKeys = sshKeyService.exportAllKeysForBackup();
    
    // Create encrypted backup content
    const backupResult = await backupService.createBackupContent(
      password, 
      servers, 
      tagColors, 
      cloudflareToken, 
      sshKeys, 
      totpEntries, 
      portForwards
    );
    
    if (!backupResult.success || !backupResult.content) {
      return { success: false, error: backupResult.error };
    }
    
    // Upload to Box
    await BoxApiService.uploadBackup(accessToken, backupResult.content);
    
    return { success: true };
  } catch (error: any) {
    console.error('[Box] Upload backup error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('box:downloadBackup', async (event, password: string) => {
  try {
    // Get access token
    const accessToken = await BoxOAuthService.getValidAccessToken();
    if (!accessToken) {
      return { success: false, error: 'Not authenticated with Box. Please connect first.' };
    }
    
    // Download from Box
    const encryptedContent = await BoxApiService.downloadBackup(accessToken);
    
    // Decrypt backup
    const restoreResult = await backupService.restoreBackupContent(encryptedContent, password);
    if (!restoreResult.success || !restoreResult.data) {
      return { success: false, error: restoreResult.error };
    }
    
    // Restore data
    serverStore.setServers(restoreResult.data.servers);
    serverStore.setTagColors(restoreResult.data.tagColors);
    if (restoreResult.data.cloudflareToken) {
      cloudflareService.setToken(restoreResult.data.cloudflareToken);
    }
    
    // Restore SSH keys
    let sshKeyCount = 0;
    if (restoreResult.data.sshKeys && restoreResult.data.sshKeys.length > 0) {
      const importResult = await sshKeyService.importKeysFromBackup(restoreResult.data.sshKeys);
      sshKeyCount = importResult.imported;
    }
    
    return { 
      success: true, 
      serverCount: restoreResult.data.servers.length,
      sshKeyCount,
      totpEntries: restoreResult.data.totpEntries,
      portForwards: restoreResult.data.portForwards
    };
  } catch (error: any) {
    console.error('[Box] Download backup error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('box:checkBackup', async () => {
  try {
    const accessToken = await BoxOAuthService.getValidAccessToken();
    if (!accessToken) {
      return { exists: false };
    }
    
    const exists = await BoxApiService.backupExists(accessToken);
    if (!exists) {
      return { exists: false };
    }
    
    const metadata = await BoxApiService.getBackupMetadata(accessToken);
    return { exists: true, metadata };
  } catch (error: any) {
    console.error('[Box] Check backup error:', error);
    return { exists: false };
  }
});

// ==================== Cloudflare API Handlers ====================

ipcMain.handle('cloudflare:hasToken', async () => {
  return cloudflareService.hasToken();
});

ipcMain.handle('cloudflare:getToken', async () => {
  return cloudflareService.getToken();
});

ipcMain.handle('cloudflare:setToken', async (event, token: string) => {
  cloudflareService.setToken(token);
  return { success: true };
});

ipcMain.handle('cloudflare:removeToken', async () => {
  cloudflareService.removeToken();
  return { success: true };
});

ipcMain.handle('cloudflare:verifyToken', async () => {
  return await cloudflareService.verifyToken();
});

ipcMain.handle('cloudflare:listZones', async () => {
  return await cloudflareService.listZones();
});

ipcMain.handle('cloudflare:listDNSRecords', async (event, zoneId: string) => {
  return await cloudflareService.listDNSRecords(zoneId);
});

ipcMain.handle('cloudflare:createDNSRecord', async (event, zoneId: string, type: string, name: string, content: string, ttl: number, proxied: boolean, comment?: string, priority?: number, srvData?: any) => {
  return await cloudflareService.createDNSRecord(zoneId, type, name, content, ttl, proxied, comment, priority, srvData);
});

ipcMain.handle('cloudflare:updateDNSRecord', async (event, zoneId: string, recordId: string, type: string, name: string, content: string, ttl: number, proxied: boolean, comment?: string, priority?: number, srvData?: any) => {
  return await cloudflareService.updateDNSRecord(zoneId, recordId, type, name, content, ttl, proxied, comment, priority, srvData);
});

ipcMain.handle('cloudflare:deleteDNSRecord', async (event, zoneId: string, recordId: string) => {
  return await cloudflareService.deleteDNSRecord(zoneId, recordId);
});

// DNS resolution for server hosts (domain to IP)
ipcMain.handle('dns:resolve', async (event, hostname: string) => {
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
    const ipv4Results: string[] = [];
    const ipv6Results: string[] = [];
    
    try {
      const addresses = await dns.resolve4(hostname);
      ipv4Results.push(...addresses);
    } catch (e) {
      // No A records
    }
    
    try {
      const addresses = await dns.resolve6(hostname);
      ipv6Results.push(...addresses);
    } catch (e) {
      // No AAAA records
    }
    
    return { success: true, ipv4: ipv4Results, ipv6: ipv6Results, isIp: false };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// ==================== WHOIS Handlers ====================

ipcMain.handle('whois:lookup', async (event, domain: string) => {
  return await whoisService.lookup(domain);
});

// ==================== Network Tools Handlers ====================

ipcMain.handle('networktools:mx', async (event, domain: string) => {
  return await networkToolsService.mxLookup(domain);
});

ipcMain.handle('networktools:a', async (event, hostname: string) => {
  return await networkToolsService.aLookup(hostname);
});

ipcMain.handle('networktools:aaaa', async (event, hostname: string) => {
  return await networkToolsService.aaaaLookup(hostname);
});

ipcMain.handle('networktools:txt', async (event, domain: string) => {
  return await networkToolsService.txtLookup(domain);
});

ipcMain.handle('networktools:spf', async (event, domain: string) => {
  return await networkToolsService.spfLookup(domain);
});

ipcMain.handle('networktools:cname', async (event, hostname: string) => {
  return await networkToolsService.cnameLookup(hostname);
});

ipcMain.handle('networktools:ns', async (event, domain: string) => {
  return await networkToolsService.nsLookup(domain);
});

ipcMain.handle('networktools:soa', async (event, domain: string) => {
  return await networkToolsService.soaLookup(domain);
});

ipcMain.handle('networktools:ptr', async (event, ip: string) => {
  return await networkToolsService.ptrLookup(ip);
});

ipcMain.handle('networktools:ping', async (event, host: string, count?: number) => {
  return await networkToolsService.ping(host, count);
});

ipcMain.handle('networktools:trace', async (event, host: string) => {
  return await networkToolsService.traceroute(host);
});

ipcMain.handle('networktools:tcp', async (event, host: string, port: number) => {
  return await networkToolsService.tcpTest(host, port);
});

ipcMain.handle('networktools:http', async (event, url: string) => {
  return await networkToolsService.httpCheck(url);
});

ipcMain.handle('networktools:https', async (event, url: string) => {
  return await networkToolsService.httpsCheck(url);
});

ipcMain.handle('networktools:smtp', async (event, host: string, port?: number) => {
  return await networkToolsService.smtpTest(host, port);
});

ipcMain.handle('networktools:blacklist', async (event, ip: string) => {
  return await networkToolsService.blacklistCheck(ip);
});

ipcMain.handle('networktools:dns', async (event, domain: string) => {
  return await networkToolsService.dnsCheck(domain);
});

ipcMain.handle('networktools:arin', async (event, ip: string) => {
  return await networkToolsService.arinLookup(ip);
});

ipcMain.handle('networktools:whois', async (event, domain: string) => {
  return await networkToolsService.whoisLookup(domain);
});

ipcMain.handle('networktools:webcheck', async (event, url: string) => {
  return await networkToolsService.webCheck(url);
});

// Known Hosts handlers
ipcMain.handle('knownhosts:check', async (event, host: string, port: number) => {
  return await knownHostsService.getHostFingerprint(host, port);
});

ipcMain.handle('knownhosts:accept', async (event, host: string, port: number, keyType: string, fingerprint: string, fullKey: string) => {
  knownHostsService.addKnownHost(host, port, keyType, fingerprint, fullKey);
  return { success: true };
});

ipcMain.handle('knownhosts:remove', async (event, host: string, port: number) => {
  knownHostsService.removeKnownHost(host, port);
  return { success: true };
});

ipcMain.handle('knownhosts:list', async () => {
  return knownHostsService.getAllKnownHosts();
});

ipcMain.handle('knownhosts:get', async (event, host: string, port: number) => {
  return knownHostsService.getKnownHost(host, port);
});

ipcMain.handle('knownhosts:clear', async () => {
  knownHostsService.clearAllKnownHosts();
  return { success: true };
});

// SSH Key handlers
ipcMain.handle('sshkey:generate', async (event, name: string, type: 'rsa' | 'ed25519' | 'ecdsa', bits?: number, passphrase?: string, comment?: string) => {
  try {
    const key = await sshKeyService.generateKey(name, type, bits, passphrase, comment);
    return { success: true, key };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('sshkey:import', async (event, name: string, privateKey: string, comment?: string) => {
  try {
    const key = await sshKeyService.importKey(name, privateKey, comment);
    return { success: true, key };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('sshkey:list', async () => {
  return sshKeyService.getAllKeys();
});

ipcMain.handle('sshkey:get', async (event, id: string) => {
  return sshKeyService.getKey(id);
});

ipcMain.handle('sshkey:getPrivate', async (event, id: string) => {
  return sshKeyService.getPrivateKey(id);
});

ipcMain.handle('sshkey:delete', async (event, id: string) => {
  return sshKeyService.deleteKey(id);
});

ipcMain.handle('sshkey:rename', async (event, id: string, newName: string) => {
  return sshKeyService.renameKey(id, newName);
});

ipcMain.handle('sshkey:exportAll', async () => {
  return sshKeyService.exportAllKeysForBackup();
});

ipcMain.handle('sshkey:importFromBackup', async (event, keys: any[]) => {
  return await sshKeyService.importKeysFromBackup(keys);
});

// Export single SSH key to file
ipcMain.handle('sshkey:exportToFile', async (event, keyId: string, keyName: string, includePrivate: boolean) => {
  try {
    const keyInfo = sshKeyService.getKey(keyId);
    if (!keyInfo) {
      return { success: false, error: 'Key not found' };
    }
    
    if (includePrivate) {
      // Export both public and private keys
      const privateKey = sshKeyService.getPrivateKey(keyId);
      if (!privateKey) {
        return { success: false, error: 'Private key not found' };
      }
      
      // Ask for folder to save
      const result = await dialog.showOpenDialog(mainWindow!, {
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
    } else {
      // Export only public key
      const result = await dialog.showSaveDialog(mainWindow!, {
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
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// Select and read SSH key file for import
ipcMain.handle('sshkey:selectFile', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow!, {
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
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// Tools handlers
ipcMain.handle('tools:smtpTest', async (event, config: {
  server: string;
  port: number;
  encryption: 'starttls' | 'ssl';
  useAuth: boolean;
  username?: string;
  password?: string;
  fromEmail?: string;
  toEmail?: string;
}) => {
  return await networkToolsService.advancedSmtpTest(config);
});

ipcMain.handle('tools:proxyCheck', async (event, config: {
  type: 'http' | 'socks4' | 'socks5';
  server: string;
  port: number;
  username?: string;
  password?: string;
  testUrl: string;
}) => {
  return await networkToolsService.proxyCheck(config);
});

ipcMain.handle('tools:portListener', async () => {
  return await networkToolsService.getListeningPorts();
});

// Port Forwarding handlers
portForwardingService.on('status', (config: any) => {
  if (mainWindow) {
    mainWindow.webContents.send('portforward:status', config);
  }
});

ipcMain.handle('portforward:create', async (event, config: any) => {
  try {
    switch (config.type) {
      case 'local':
        await portForwardingService.createLocalForward(config);
        break;
      case 'remote':
        await portForwardingService.createRemoteForward(config);
        break;
      case 'dynamic':
        await portForwardingService.createDynamicForward(config);
        break;
      default:
        throw new Error('Invalid forward type');
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('portforward:stop', async (event, tunnelId: string) => {
  try {
    await portForwardingService.stopTunnel(tunnelId);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('portforward:list', async () => {
  return portForwardingService.getAllTunnels();
});

ipcMain.handle('portforward:get', async (event, tunnelId: string) => {
  return portForwardingService.getTunnel(tunnelId);
});

// Port Knocking IPC Handlers
ipcMain.handle('portknock:generateSequence', async (event, length: number = 4) => {
  return PortKnockService.generateRandomSequence(length);
});

ipcMain.handle('portknock:validate', async (event, sequence: string) => {
  return PortKnockService.validateKnockSequence(sequence);
});

// Check for updates from GitHub
ipcMain.handle('app:checkForUpdates', async () => {
  try {
    const https = require('https');
    return new Promise((resolve) => {
      // First try releases, then fall back to tags
      const tryFetch = (path: string, isRelease: boolean) => {
        const options = {
          hostname: 'api.github.com',
          path,
          headers: {
            'User-Agent': 'Marix-SSH-Client',
            'Accept': 'application/vnd.github.v3+json'
          }
        };
        
        https.get(options, (res: any) => {
          let data = '';
          res.on('data', (chunk: string) => data += chunk);
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
                } else {
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
                  } else {
                    resolve({ success: false, error: 'No releases or tags found' });
                  }
                }
              } else if (res.statusCode === 404 && isRelease) {
                // No releases found, try tags
                tryFetch('/repos/marixdev/marix/tags', false);
              } else {
                console.log('[Update] GitHub API response:', res.statusCode, data);
                resolve({ success: false, error: `GitHub API error: ${res.statusCode}` });
              }
            } catch (e: any) {
              console.error('[Update] Parse error:', e);
              resolve({ success: false, error: 'Failed to parse response' });
            }
          });
        }).on('error', (err: any) => {
          console.error('[Update] Request error:', err);
          resolve({ success: false, error: err.message });
        });
      };
      
      // Start with releases endpoint
      tryFetch('/repos/marixdev/marix/releases/latest', true);
    });
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// Open URL in browser
ipcMain.handle('app:openUrl', async (event, url: string) => {
  const { shell } = require('electron');
  shell.openExternal(url);
});

// ==================== LAN Sharing ====================

// Start LAN sharing service
ipcMain.handle('lan-share:start', async () => {
  try {
    await lanSharingService.start();
    return { success: true };
  } catch (error: any) {
    console.error('[LANShare] Start error:', error);
    return { success: false, error: error.message };
  }
});

// Stop LAN sharing service
ipcMain.handle('lan-share:stop', () => {
  try {
    lanSharingService.stop();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// Get discovered peers
ipcMain.handle('lan-share:getPeers', () => {
  return lanSharingService.getPeers();
});

// Share servers with peer
ipcMain.handle('lan-share:shareWithPeer', (event, peerId: string, servers: any[], code: string) => {
  const success = lanSharingService.shareWithPeer(peerId, servers, code);
  return { success };
});

// Generate pairing code
ipcMain.handle('lan-share:generateCode', () => {
  return lanSharingService.generatePairingCode();
});

// Decrypt received data
ipcMain.handle('lan-share:decrypt', (event, encrypted: string, code: string) => {
  const decrypted = lanSharingService.decrypt(encrypted, code);
  if (decrypted) {
    try {
      return { success: true, data: JSON.parse(decrypted) };
    } catch (err) {
      return { success: false, error: 'Invalid data format' };
    }
  }
  return { success: false, error: 'Decryption failed - wrong code?' };
});

// Get device info
ipcMain.handle('lan-share:getDeviceInfo', () => {
  return lanSharingService.getDeviceInfo();
});

// Send ACK to peer
ipcMain.handle('lan-share:sendAck', (event, peerId: string, data: any) => {
  const success = lanSharingService.sendAck(peerId, data);
  return { success };
});

// Setup event forwarding to renderer
lanSharingService.on('peer-found', (peer: any) => {
  mainWindow?.webContents.send('lan-share:peer-found', peer);
});

lanSharingService.on('peer-lost', (peerId: string) => {
  mainWindow?.webContents.send('lan-share:peer-lost', peerId);
});

lanSharingService.on('share-received', (data: any) => {
  mainWindow?.webContents.send('lan-share:share-received', data);
});

lanSharingService.on('share-request', (data: any) => {
  mainWindow?.webContents.send('lan-share:share-request', data);
});

lanSharingService.on('share-ack', (data: any) => {
  mainWindow?.webContents.send('lan-share:ack-received', data);
});

// ==================== LAN File Transfer ====================

// IPC Handlers for file transfer
ipcMain.handle('file-transfer:getDeviceInfo', () => {
  return lanFileTransferService.getDeviceInfo();
});

ipcMain.handle('file-transfer:generateCode', () => {
  return lanFileTransferService.generatePairingCode();
});

// NEW FLOW: Sender prepares files and waits for receiver
ipcMain.handle('file-transfer:prepareToSend', async (event, filePaths: string[], pairingCode: string) => {
  try {
    const result = lanFileTransferService.prepareToSend(filePaths, pairingCode);
    return { success: true, ...result };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

// NEW FLOW: Receiver requests files from sender
ipcMain.handle('file-transfer:requestFiles', async (event, peerAddress: string, peerPort: number, pairingCode: string, savePath: string) => {
  try {
    const sessionId = await lanFileTransferService.requestFiles(peerAddress, peerPort, pairingCode, savePath);
    return { success: true, sessionId };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('file-transfer:cancelTransfer', async (event, sessionId: string) => {
  lanFileTransferService.cancelTransfer(sessionId);
  return { success: true };
});

ipcMain.handle('file-transfer:getSessions', () => {
  return lanFileTransferService.getSessions();
});

ipcMain.handle('file-transfer:selectFiles', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: 'Select Files to Send',
    properties: ['openFile', 'multiSelections'],
  });
  if (result.canceled) return { success: false, canceled: true };
  return { success: true, filePaths: result.filePaths };
});

ipcMain.handle('file-transfer:selectFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: 'Select Folder to Send',
    properties: ['openDirectory'],
  });
  if (result.canceled) return { success: false, canceled: true };
  return { success: true, filePaths: result.filePaths };
});

ipcMain.handle('file-transfer:selectSaveLocation', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: 'Select Save Location',
    properties: ['openDirectory', 'createDirectory'],
  });
  if (result.canceled) return { success: false, canceled: true };
  return { success: true, savePath: result.filePaths[0] };
});

// Event forwarding for file transfer
lanFileTransferService.on('transfer-request', (data: any) => {
  mainWindow?.webContents.send('file-transfer:request', data);
});

lanFileTransferService.on('transfer-waiting', (data: any) => {
  mainWindow?.webContents.send('file-transfer:waiting', data);
});

lanFileTransferService.on('transfer-connected', (data: any) => {
  mainWindow?.webContents.send('file-transfer:connected', data);
});

lanFileTransferService.on('transfer-fileinfo', (data: any) => {
  mainWindow?.webContents.send('file-transfer:fileinfo', data);
});

lanFileTransferService.on('transfer-started', (data: any) => {
  mainWindow?.webContents.send('file-transfer:started', data);
});

lanFileTransferService.on('transfer-progress', (data: any) => {
  mainWindow?.webContents.send('file-transfer:progress', data);
});

lanFileTransferService.on('transfer-completed', (data: any) => {
  mainWindow?.webContents.send('file-transfer:completed', data);
});

lanFileTransferService.on('transfer-error', (data: any) => {
  mainWindow?.webContents.send('file-transfer:error', data);
});

lanFileTransferService.on('transfer-cancelled', (data: any) => {
  mainWindow?.webContents.send('file-transfer:cancelled', data);
});

// ==================== Find Sender by Code ====================

// IPC handler for finding sender by pairing code (broadcasts to LAN)
ipcMain.handle('file-transfer:findSenderByCode', async (event, pairingCode: string) => {
  lanSharingService.findSenderByCode(pairingCode);
  return { success: true };
});

// IPC handler to set active pairing code when preparing to send
ipcMain.handle('file-transfer:setActivePairingCode', async (event, code: string | null) => {
  lanSharingService.setActivePairingCode(code);
  return { success: true };
});

// Event forwarding when sender is found via LAN broadcast
lanSharingService.on('sender-found', (data: any) => {
  mainWindow?.webContents.send('file-transfer:sender-found', data);
});
