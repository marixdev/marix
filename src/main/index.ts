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
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    frame: false,
    titleBarStyle: 'hidden',
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
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

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
  const { validatePassword } = require('./services/BackupService');
  return validatePassword(password);
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

ipcMain.handle('github:getRepoName', async () => {
  return await githubAuthService.getRepoName();
});

ipcMain.handle('github:saveRepoName', async (event, repoName: string) => {
  await githubAuthService.saveRepoName(repoName);
  return { success: true };
});

ipcMain.handle('github:uploadBackup', async (event, password: string) => {
  // Validate password first (same as local backup)
  const validation = backupService.validatePassword(password);
  if (!validation.valid) {
    return { success: false, error: validation.errors.join('\n') };
  }
  
  const servers = serverStore.getAllServers();
  const tagColors = serverStore.getTagColors();
  const cloudflareToken = cloudflareService.getToken() || undefined;
  const sshKeys = sshKeyService.exportAllKeysForBackup();
  
  // Create encrypted backup content
  const backupResult = await backupService.createBackupContent(password, servers, tagColors, cloudflareToken, sshKeys);
  if (!backupResult.success || !backupResult.content) {
    return { success: false, error: backupResult.error };
  }
  
  // Upload to GitHub (will overwrite existing backup.arix file)
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return await githubAuthService.uploadBackup(backupResult.content, `Marix backup ${timestamp}`);
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
  
  return { success: true, serverCount: restoreResult.data.servers.length, sshKeyCount };
});

ipcMain.handle('github:openAuthUrl', async (event, url: string) => {
  shell.openExternal(url);
  return { success: true };
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

// Check for updates from GitHub
ipcMain.handle('app:checkForUpdates', async () => {
  try {
    const https = require('https');
    return new Promise((resolve) => {
      const options = {
        hostname: 'api.github.com',
        path: '/repos/datvuong166/marix/releases/latest',
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
              const release = JSON.parse(data);
              resolve({
                success: true,
                latestVersion: release.tag_name?.replace('v', '') || release.name,
                releaseUrl: release.html_url,
                publishedAt: release.published_at,
                releaseNotes: release.body
              });
            } else {
              resolve({ success: false, error: 'Could not fetch release info' });
            }
          } catch (e) {
            resolve({ success: false, error: 'Failed to parse response' });
          }
        });
      }).on('error', (err: any) => {
        resolve({ success: false, error: err.message });
      });
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
