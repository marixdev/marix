import { app, BrowserWindow, ipcMain, dialog, shell, Tray, Menu, nativeImage } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as dns from 'dns';
import * as https from 'https';
import { promisify } from 'util';

// ============================================================================
// MEMORY OPTIMIZATION FLAGS (applied before app ready)
// ============================================================================
// Limit V8 memory for renderer process  
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=256 --optimize-for-size');
// Disable GPU process if not needed (saves ~50MB)
app.commandLine.appendSwitch('disable-gpu-compositing');
// Reduce memory usage by limiting background processes
app.commandLine.appendSwitch('disable-background-timer-throttling');
// Disable hardware acceleration for lower memory (can enable if needed)
// app.commandLine.appendSwitch('disable-hardware-acceleration');

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
import { OneDriveOAuthService } from './services/OneDriveOAuthService';
import { OneDriveApiService } from './services/OneDriveApiService';
import { PortKnockService } from './services/PortKnockService';
import { LANSharingService } from './services/LANSharingService';
import { lanFileTransferService } from './services/LANFileTransferService';
import { getGoogleDriveService } from './services/GoogleDriveService';
import { sessionMonitor, SessionMonitorData } from './services/SSHSessionMonitor';
import { appSettings } from './services/AppSettingsStore';
import { initDatabaseHandlers, getDatabaseConnectionCount, closeAllDatabaseConnections } from './databaseService';
import buildInfo from './buildInfo';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

// Cached close dialog translations (updated when language changes)
let closeDialogTranslations = {
  title: 'Active Connections',
  message: 'You have {{count}} active connection(s).',
  detail: 'Do you want to close all connections and exit?',
  closeButton: 'Close All & Exit',
  cancelButton: 'Cancel'
};

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
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      backgroundThrottling: false,  // Keep app responsive in background
      spellcheck: false,  // Disable spellcheck for performance
    },
    backgroundColor: '#1a1d2e',
    show: false,  // Don't show until ready
  });

  // Show window when ready to prevent white flash
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    
    // Setup periodic memory cleanup (every 5 minutes)
    setInterval(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        // Trigger renderer garbage collection via low memory signal
        mainWindow.webContents.session.clearCache();
        
        // Log memory usage periodically (debug)
        const memUsage = process.memoryUsage();
        console.log(`[Memory] Heap: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB / ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB, RSS: ${Math.round(memUsage.rss / 1024 / 1024)}MB`);
      }
    }, 5 * 60 * 1000); // Every 5 minutes
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

  // Handle close event - ask user if there are active connections
  // Uses pre-cached translations for instant response
  let isQuitting = false;
  
  mainWindow.on('close', (event) => {
    console.log('[App] Close event triggered, isQuitting:', isQuitting);
    const startTime = Date.now();
    
    if (isQuitting) return; // Already confirmed, let it close
    
    // Check for active connections
    const activeSSH = nativeSSH.getActiveCount();
    const activeRDP = rdpManager.getActiveCount();
    const activeWSS = wssManager.getActiveCount();
    const activeFTP = ftpManager.getActiveCount();
    const activeDB = getDatabaseConnectionCount();
    const totalActive = activeSSH + activeRDP + activeWSS + activeFTP + activeDB;
    
    console.log('[App] Active connections check took:', Date.now() - startTime, 'ms, total:', totalActive);

    if (totalActive > 0) {
      event.preventDefault();
      
      // Build detail message
      const details: string[] = [];
      if (activeSSH > 0) details.push(`SSH: ${activeSSH}`);
      if (activeRDP > 0) details.push(`RDP: ${activeRDP}`);
      if (activeWSS > 0) details.push(`WebSocket: ${activeWSS}`);
      if (activeFTP > 0) details.push(`FTP: ${activeFTP}`);
      if (activeDB > 0) details.push(`Database: ${activeDB}`);
      
      // Use cached translations - instant, no IPC needed
      const t = closeDialogTranslations;
      const message = t.message.replace('{{count}}', String(totalActive));
      
      console.log('[App] Showing dialog (sync) at:', Date.now() - startTime, 'ms');
      
      // Use SYNCHRONOUS dialog for instant display
      const response = dialog.showMessageBoxSync(mainWindow!, {
        type: 'question',
        buttons: [t.closeButton, t.cancelButton],
        defaultId: 1,
        cancelId: 1,
        title: t.title,
        message: message,
        detail: `${details.join(', ')}\n\n${t.detail}`,
      });
      
      console.log('[App] Dialog response:', response, 'at:', Date.now() - startTime, 'ms');
      
      if (response === 0) {
        isQuitting = true;
        console.log('[App] Closing all connections...');
        rdpManager.closeAll();
        nativeSSH.closeAll();
        sshManager.closeAll();
        wssManager.closeAll();
        ftpManager.closeAll();
        closeAllDatabaseConnections();
        console.log('[App] Destroying window at:', Date.now() - startTime, 'ms');
        mainWindow?.destroy();
      }
      // If cancelled, do nothing - event already prevented
    }
  });

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
  
  // Initialize database handlers
  initDatabaseHandlers();
  
  // Initialize session monitor with saved setting
  sessionMonitor.setEnabled(appSettings.get('sessionMonitorEnabled'));
  
  // LAN sharing and file transfer services are started on-demand
  // when user enables LAN Discovery toggle in the UI
  // (via 'lan-share:start' IPC handler)

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
  // Close all sessions before quitting
  sessionMonitor.cleanup();
  rdpManager.closeAll();
  nativeSSH.closeAll();
  sshManager.closeAll();
  wssManager.closeAll();
  ftpManager.closeAll();
  closeAllDatabaseConnections();
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Cleanup before quit
app.on('before-quit', (event) => {
  console.log('[App] Cleaning up before quit...');
  sessionMonitor.cleanup();
  rdpManager.closeAll();
  nativeSSH.closeAll();
  sshManager.closeAll();
  wssManager.closeAll();
  ftpManager.closeAll();
  closeAllDatabaseConnections();
});

// Additional cleanup on will-quit (ensures processes are killed)
app.on('will-quit', (event) => {
  console.log('[App] Will quit - final cleanup...');
  // Force kill any remaining processes
  rdpManager.closeAll();
  nativeSSH.closeAll();
  sshManager.closeAll();
  wssManager.closeAll();
  ftpManager.closeAll();
  closeAllDatabaseConnections();
});

// Theme loading handlers (for lazy theme loading)
ipcMain.handle('themes:getList', async () => {
  try {
    const themesDir = path.join(__dirname, '../../theme');
    const files = fs.readdirSync(themesDir);
    const themeNames = files
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''))
      .sort();
    return { success: true, themes: themeNames };
  } catch (err: any) {
    console.error('[Themes] Failed to list themes:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('themes:getTheme', async (_, themeName: string) => {
  try {
    const themePath = path.join(__dirname, '../../theme', `${themeName}.json`);
    if (!fs.existsSync(themePath)) {
      return { success: false, error: 'Theme not found' };
    }
    const themeData = JSON.parse(fs.readFileSync(themePath, 'utf-8'));
    
    // Convert VSCode terminal color format to xterm.js format
    const colors = themeData.workbench?.colorCustomizations || themeData;
    const theme = {
      background: colors['terminal.background'] || '#1a1d2e',
      foreground: colors['terminal.foreground'] || '#f8f8f2',
      cursor: colors['terminalCursor.foreground'] || colors['terminal.foreground'] || '#f8f8f2',
      cursorAccent: colors['terminalCursor.background'] || colors['terminal.background'] || '#000000',
      selectionBackground: colors['terminal.selectionBackground'] || '#44475a',
      black: colors['terminal.ansiBlack'] || '#000000',
      red: colors['terminal.ansiRed'] || '#ff5555',
      green: colors['terminal.ansiGreen'] || '#50fa7b',
      yellow: colors['terminal.ansiYellow'] || '#f1fa8c',
      blue: colors['terminal.ansiBlue'] || '#bd93f9',
      magenta: colors['terminal.ansiMagenta'] || '#ff79c6',
      cyan: colors['terminal.ansiCyan'] || '#8be9fd',
      white: colors['terminal.ansiWhite'] || '#f8f8f2',
      brightBlack: colors['terminal.ansiBrightBlack'] || '#6272a4',
      brightRed: colors['terminal.ansiBrightRed'] || '#ff6e6e',
      brightGreen: colors['terminal.ansiBrightGreen'] || '#69ff94',
      brightYellow: colors['terminal.ansiBrightYellow'] || '#ffffa5',
      brightBlue: colors['terminal.ansiBrightBlue'] || '#d6acff',
      brightMagenta: colors['terminal.ansiBrightMagenta'] || '#ff92df',
      brightCyan: colors['terminal.ansiBrightCyan'] || '#a4ffff',
      brightWhite: colors['terminal.ansiBrightWhite'] || '#ffffff',
    };
    return { success: true, theme };
  } catch (err: any) {
    console.error('[Themes] Failed to load theme:', err);
    return { success: false, error: err.message };
  }
});

// System info handlers
ipcMain.handle('system:getUserInfo', () => {
  const os = require('os');
  return {
    username: os.userInfo().username,
    homedir: os.homedir(),
    platform: os.platform(),
  };
});

// Update close dialog translations (called when language changes)
ipcMain.on('app:setCloseDialogTranslations', (_, translations: {
  title: string;
  message: string;
  detail: string;
  closeButton: string;
  cancelButton: string;
}) => {
  closeDialogTranslations = translations;
});

// Local filesystem handlers (for contextIsolation: true)
ipcMain.handle('local:homedir', () => {
  const os = require('os');
  return os.homedir();
});

// Get available drives/mount points
ipcMain.handle('local:getDrives', async () => {
  const os = require('os');
  const { execSync } = require('child_process');
  const platform = os.platform();
  const drives: { name: string; path: string; type: string; mounted: boolean; device?: string }[] = [];
  
  if (platform === 'win32') {
    // Windows: Check drive letters A-Z
    try {
      // Use WMIC to get drives
      const output = execSync('wmic logicaldisk get caption,drivetype', { encoding: 'utf8' });
      const lines = output.split('\n').slice(1); // Skip header
      for (const line of lines) {
        const match = line.trim().match(/^([A-Z]:)\s+(\d+)/i);
        if (match) {
          const letter = match[1];
          const driveType = parseInt(match[2]);
          // DriveType: 2=Removable, 3=Local, 4=Network, 5=CD-ROM
          const typeNames: { [key: number]: string } = {
            2: 'USB',
            3: 'Local',
            4: 'Network',
            5: 'CD-ROM'
          };
          drives.push({
            name: letter,
            path: letter + '\\',
            type: typeNames[driveType] || 'Unknown',
            mounted: true
          });
        }
      }
    } catch (e) {
      // Fallback: check common drive letters
      for (const letter of 'CDEFGHIJKLMNOPQRSTUVWXYZ') {
        const drivePath = `${letter}:\\`;
        try {
          fs.accessSync(drivePath);
          drives.push({ name: `${letter}:`, path: drivePath, type: 'Local', mounted: true });
        } catch {}
      }
    }
  } else if (platform === 'darwin') {
    // macOS: /Volumes contains mounted drives + use diskutil for unmounted
    try {
      drives.push({ name: 'Macintosh HD', path: '/', type: 'System', mounted: true });
      drives.push({ name: 'Home', path: os.homedir(), type: 'Home', mounted: true });
      
      // Get mounted volumes
      const volumes = fs.readdirSync('/Volumes');
      for (const vol of volumes) {
        if (vol !== 'Macintosh HD') {
          const volPath = `/Volumes/${vol}`;
          // Determine type
          let volType = 'Volume';
          try {
            const diskInfo = execSync(`diskutil info "${volPath}" 2>/dev/null`, { encoding: 'utf8' });
            if (diskInfo.includes('USB') || diskInfo.includes('External')) {
              volType = 'USB';
            } else if (diskInfo.includes('NTFS') || diskInfo.includes('Windows_NTFS')) {
              volType = 'NTFS';
            } else if (diskInfo.includes('Network')) {
              volType = 'Network';
            }
          } catch {}
          drives.push({ name: vol, path: volPath, type: volType, mounted: true });
        }
      }
      
      // Check for unmounted disks using diskutil
      try {
        const listOutput = execSync('diskutil list -plist external 2>/dev/null', { encoding: 'utf8' });
        // Parse plist output for unmounted external drives
        // This is simplified - in practice you'd parse the plist properly
      } catch {}
    } catch (e) {
      drives.push({ name: '/', path: '/', type: 'System', mounted: true });
    }
  } else {
    // Linux: Use lsblk to get all block devices including unmounted ones
    drives.push({ name: '/', path: '/', type: 'System', mounted: true });
    drives.push({ name: 'Home', path: os.homedir(), type: 'Home', mounted: true });
    
    try {
      // Get all block devices with lsblk (JSON output)
      const lsblkOutput = execSync('lsblk -J -o NAME,SIZE,TYPE,MOUNTPOINT,FSTYPE,LABEL,HOTPLUG 2>/dev/null', { encoding: 'utf8' });
      const lsblkData = JSON.parse(lsblkOutput);
      
      const processDevices = (devices: any[], parentDevice?: string) => {
        for (const dev of devices) {
          // Process partitions (type === 'part') and check if it's a filesystem we care about
          if (dev.type === 'part' || dev.type === 'disk') {
            const fstype = dev.fstype?.toLowerCase() || '';
            const isRemovable = dev.hotplug === '1' || dev.hotplug === true;
            const label = dev.label || dev.name;
            const mountpoint = dev.mountpoint;
            const devicePath = `/dev/${dev.name}`;
            
            // Skip swap, boot, and system partitions
            if (fstype === 'swap' || fstype === 'vfat' && dev.size?.includes('M')) continue;
            
            // Include ntfs, ext4, exfat, btrfs, xfs partitions
            if (['ntfs', 'ext4', 'ext3', 'exfat', 'btrfs', 'xfs', 'vfat', 'fuseblk'].includes(fstype)) {
              let driveType = 'Partition';
              if (fstype === 'ntfs' || fstype === 'fuseblk') driveType = 'NTFS';
              else if (fstype === 'exfat') driveType = 'ExFAT';
              else if (isRemovable) driveType = 'USB';
              
              // Skip if already in drives (by mountpoint or label)
              const alreadyExists = drives.some(d => 
                (mountpoint && d.path === mountpoint) || 
                (d.name === label && d.mounted)
              );
              
              if (!alreadyExists) {
                drives.push({
                  name: label,
                  path: mountpoint || '', // Empty if not mounted
                  type: driveType,
                  mounted: !!mountpoint,
                  device: devicePath
                });
              }
            }
          }
          
          // Process children (partitions)
          if (dev.children) {
            processDevices(dev.children, dev.name);
          }
        }
      };
      
      if (lsblkData.blockdevices) {
        processDevices(lsblkData.blockdevices);
      }
    } catch (e) {
      console.error('[getDrives] lsblk failed:', e);
    }
    
    // Also add mounted points from /media and /mnt that might not show in lsblk
    const mountPoints = ['/mnt', '/media', `/media/${os.userInfo().username}`, `/run/media/${os.userInfo().username}`];
    for (const mp of mountPoints) {
      try {
        const subdirs = fs.readdirSync(mp);
        for (const subdir of subdirs) {
          const fullPath = path.join(mp, subdir);
          try {
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
              // Check if already added
              if (!drives.some(d => d.path === fullPath)) {
                const contents = fs.readdirSync(fullPath);
                if (contents.length > 0) {
                  drives.push({ 
                    name: subdir, 
                    path: fullPath, 
                    type: mp.includes('media') ? 'Media' : 'Mount',
                    mounted: true 
                  });
                }
              }
            }
          } catch {}
        }
      } catch {}
    }
  }
  
  return drives;
});

// Mount a drive (Linux/macOS) - may require password for NTFS on some systems
ipcMain.handle('local:mountDrive', async (_, device: string, password?: string) => {
  const os = require('os');
  const { exec, execSync } = require('child_process');
  const platform = os.platform();
  
  if (platform === 'win32') {
    return { success: false, error: 'Mount not supported on Windows' };
  }
  
  // Get device info
  let mountPoint = '';
  let fstype = '';
  
  try {
    const lsblkOutput = execSync(`lsblk -J -o NAME,FSTYPE,LABEL,MOUNTPOINT ${device} 2>/dev/null`, { encoding: 'utf8' });
    const data = JSON.parse(lsblkOutput);
    const devInfo = data.blockdevices?.[0];
    if (devInfo) {
      fstype = devInfo.fstype || '';
      if (devInfo.mountpoint) {
        return { success: true, mountPoint: devInfo.mountpoint, alreadyMounted: true };
      }
      // Create mount point based on label or device name
      const label = devInfo.label || path.basename(device);
      mountPoint = `/media/${os.userInfo().username}/${label}`;
    }
  } catch (e) {
    return { success: false, error: 'Failed to get device info' };
  }
  
  // For NTFS on Debian/Ubuntu, we might need to use udisksctl which handles polkit auth
  return new Promise((resolve) => {
    if (platform === 'linux') {
      // Try udisksctl first (handles polkit authentication automatically with GUI prompt)
      const udisksCmd = `udisksctl mount -b ${device}`;
      
      exec(udisksCmd, (error: any, stdout: string, stderr: string) => {
        if (!error) {
          // Parse mount point from output: "Mounted /dev/sdb1 at /media/user/DriveName"
          const match = stdout.match(/at (.+?)\.?\s*$/);
          if (match) {
            resolve({ success: true, mountPoint: match[1].trim() });
          } else {
            resolve({ success: true, mountPoint: '' });
          }
        } else {
          // Check if it's an authentication error
          if (stderr.includes('Not authorized') || stderr.includes('authentication') || stderr.includes('polkit')) {
            resolve({ 
              success: false, 
              error: 'Authentication required',
              needsAuth: true,
              device 
            });
          } else {
            resolve({ success: false, error: stderr || error.message });
          }
        }
      });
    } else if (platform === 'darwin') {
      // macOS: use diskutil
      exec(`diskutil mount ${device}`, (error: any, stdout: string, stderr: string) => {
        if (!error) {
          const match = stdout.match(/mounted at (.+)/i);
          resolve({ success: true, mountPoint: match ? match[1] : '' });
        } else {
          resolve({ success: false, error: stderr || error.message });
        }
      });
    } else {
      resolve({ success: false, error: 'Unsupported platform' });
    }
  });
});

// Mount with pkexec (for systems that need root password)
ipcMain.handle('local:mountDriveWithAuth', async (_, device: string) => {
  const os = require('os');
  const { exec } = require('child_process');
  const platform = os.platform();
  
  if (platform !== 'linux') {
    return { success: false, error: 'Only supported on Linux' };
  }
  
  return new Promise((resolve) => {
    // Use pkexec to get graphical password prompt
    // First, we need to create mount point and mount
    const username = os.userInfo().username;
    
    // Get device label for mount point name
    const { execSync } = require('child_process');
    let label = path.basename(device);
    try {
      const lsblkOutput = execSync(`lsblk -n -o LABEL ${device} 2>/dev/null`, { encoding: 'utf8' });
      label = lsblkOutput.trim() || label;
    } catch {}
    
    const mountPoint = `/media/${username}/${label}`;
    
    // Use pkexec to mount with graphical auth dialog
    const cmd = `pkexec sh -c "mkdir -p '${mountPoint}' && mount '${device}' '${mountPoint}' && chown ${username}:${username} '${mountPoint}'"`;
    
    exec(cmd, (error: any, stdout: string, stderr: string) => {
      if (!error) {
        resolve({ success: true, mountPoint });
      } else {
        // User cancelled or auth failed
        if (stderr.includes('dismissed') || stderr.includes('cancelled')) {
          resolve({ success: false, error: 'Authentication cancelled', cancelled: true });
        } else {
          resolve({ success: false, error: stderr || error.message });
        }
      }
    });
  });
});

ipcMain.handle('local:pathJoin', (_, ...paths: string[]) => {
  return path.join(...paths);
});

ipcMain.handle('local:pathDirname', (_, p: string) => {
  return path.dirname(p);
});

ipcMain.handle('local:pathBasename', (_, p: string) => {
  return path.basename(p);
});

ipcMain.handle('local:readDir', async (_, dirPath: string) => {
  try {
    const items = fs.readdirSync(dirPath);
    const files = items.map(name => {
      try {
        const fullPath = path.join(dirPath, name);
        const stats = fs.statSync(fullPath);
        return {
          name,
          type: stats.isDirectory() ? 'directory' : stats.isSymbolicLink() ? 'symlink' : 'file',
          size: stats.size,
          modifyTime: stats.mtimeMs,
        };
      } catch (err) {
        return { name, type: 'file', size: 0, modifyTime: 0 };
      }
    });
    return { success: true, files };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('local:exists', (_, filePath: string) => {
  return fs.existsSync(filePath);
});

ipcMain.handle('local:mkdir', (_, dirPath: string) => {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('local:writeFile', (_, filePath: string, content: string) => {
  try {
    fs.writeFileSync(filePath, content);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('local:chmod', (_, filePath: string, mode: number) => {
  try {
    fs.chmodSync(filePath, mode);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('local:stat', (_, filePath: string) => {
  try {
    const stats = fs.statSync(filePath);
    return {
      success: true,
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile(),
      size: stats.size,
      modifyTime: stats.mtimeMs,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('local:rm', (_, filePath: string, recursive = false) => {
  try {
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      fs.rmSync(filePath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(filePath);
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('local:rename', (_, oldPath: string, newPath: string) => {
  try {
    fs.renameSync(oldPath, newPath);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('local:copyFile', (_, srcPath: string, destPath: string) => {
  try {
    fs.copyFileSync(srcPath, destPath);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

// Copy directory recursively
ipcMain.handle('local:copyDir', (_, srcPath: string, destPath: string) => {
  try {
    const copyDirRecursive = (src: string, dest: string) => {
      // Create destination directory
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }

      const entries = fs.readdirSync(src, { withFileTypes: true });
      for (const entry of entries) {
        const srcEntry = path.join(src, entry.name);
        const destEntry = path.join(dest, entry.name);

        if (entry.isDirectory()) {
          copyDirRecursive(srcEntry, destEntry);
        } else {
          fs.copyFileSync(srcEntry, destEntry);
        }
      }
    };

    copyDirRecursive(srcPath, destPath);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
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

// Reset window focus (refocus webContents to fix input responsiveness)
// Uses sendInputEvent to release any stuck modifier keys without blurring the window
ipcMain.handle('window:resetFocus', async () => {
  if (mainWindow) {
    const wc = mainWindow.webContents;
    
    // Send keyUp events for all modifier keys to release any stuck state
    // This is more reliable than blur/focus which minimizes the window
    const modifiers: Array<'Control' | 'Shift' | 'Alt' | 'Meta'> = ['Control', 'Shift', 'Alt', 'Meta'];
    for (const mod of modifiers) {
      try {
        wc.sendInputEvent({ type: 'keyUp', keyCode: mod });
      } catch (e) {
        // Ignore errors
      }
    }
    
    // Send Escape key to clear any focus traps
    try {
      wc.sendInputEvent({ type: 'keyDown', keyCode: 'Escape' });
      wc.sendInputEvent({ type: 'keyUp', keyCode: 'Escape' });
    } catch (e) {
      // Ignore errors
    }
    
    // Refocus webContents
    wc.focus();
    
    // Send a message to renderer
    wc.send('window:focusReset');
  }
});

// Dialog handler for file selection
ipcMain.handle('dialog:openFile', async (event, options) => {
  // Ensure 'All Files' is always first option for files without extension
  const filters = options.filters || [{ name: 'All Files', extensions: ['*'] }];
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: options.title || 'Select File',
    filters: filters,
    properties: ['openFile', 'showHiddenFiles'],
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
    
    // Helper to setup event forwarding
    const setupEventForwarding = (connectionId: string, emitter: any) => {
      const dataHandler = (data: string | Buffer) => {
        if (event.sender && !event.sender.isDestroyed()) {
          event.sender.send('ssh:shellData', connectionId, data);
        }
        // Track bytes received (download) for session monitor
        const bytes = typeof data === 'string' ? Buffer.byteLength(data, 'utf8') : data.length;
        sessionMonitor.recordBytesReceived(connectionId, bytes);
      };
      
      const closeHandler = () => {
        if (event.sender && !event.sender.isDestroyed()) {
          event.sender.send('ssh:shellClose', connectionId);
        }
        // Mark session as disconnected
        sessionMonitor.markDisconnected(connectionId);
      };
      
      emitter.on('data', dataHandler);
      emitter.on('close', closeHandler);
    };
    
    // Try connecting without legacy algorithms first
    try {
      const { connectionId, emitter } = await nativeSSH.connectAndCreateShell({ ...config, useLegacyAlgorithms: false });
      setupEventForwarding(connectionId, emitter);
      
      // Also connect SSH2 in background for execute commands (OS info, etc)
      sshManager.connect(config).then(() => {
        console.log('[Main] SSH2 connected in background for:', connectionId);
      }).catch(err => {
        console.log('[Main] SSH2 background connect failed:', err.message);
      });
      
      // Start session monitoring (uses TCP ping, doesn't need SSH2)
      sessionMonitor.startMonitoring(connectionId);
      
      return { success: true, connectionId };
    } catch (firstError: any) {
      // Check if error is related to algorithms/key types - retry with legacy mode
      const errMsg = firstError.message?.toLowerCase() || '';
      const isAlgorithmError = errMsg.includes('bad key types') || 
                              errMsg.includes('no matching') ||
                              errMsg.includes('algorithm') ||
                              errMsg.includes('kex') ||
                              errMsg.includes('cipher') ||
                              errMsg.includes('unable to negotiate');
      
      if (isAlgorithmError) {
        console.log('[Main] Algorithm error detected, retrying with legacy algorithms...');
        console.log('[Main] Original error:', firstError.message);
        
        // Retry with legacy algorithms enabled
        const { connectionId, emitter } = await nativeSSH.connectAndCreateShell({ ...config, useLegacyAlgorithms: true });
        setupEventForwarding(connectionId, emitter);
        
        // Also connect SSH2 in background
        sshManager.connect(config).then(() => {
          console.log('[Main] SSH2 connected in background for:', connectionId);
        }).catch(err => {
          console.log('[Main] SSH2 background connect failed:', err.message);
        });
        
        // Start session monitoring (uses TCP ping, doesn't need SSH2)
        sessionMonitor.startMonitoring(connectionId);
        
        return { success: true, connectionId };
      }
      
      // Not an algorithm error, rethrow
      throw firstError;
    }
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

ipcMain.handle('ssh:closeShell', async (event, connectionId) => {
  try {
    nativeSSH.disconnect(connectionId);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ssh:disconnect', async (event, connectionId) => {
  try {
    // Stop session monitoring
    sessionMonitor.stopMonitoring(connectionId);
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

// Streaming execute - sends output line by line via event
ipcMain.handle('ssh:executeStream', async (event, connectionId, command, streamId) => {
  try {
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
    
    const result = await sshManager.executeCommandStream(connectionId, command, (data, isError) => {
      // Send each chunk of data to renderer
      event.sender.send('ssh:streamData', streamId, data, isError);
    });
    
    return { success: result.success, exitCode: result.exitCode };
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
    // Track bytes sent (upload) for session monitor
    const bytes = typeof data === 'string' ? Buffer.byteLength(data, 'utf8') : data.length;
    sessionMonitor.recordBytesSent(connectionId, bytes);
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

// ============================================================================
// SESSION MONITOR IPC HANDLERS
// ============================================================================

// Get monitor data for a specific session
ipcMain.handle('session-monitor:getData', async (event, connectionId: string) => {
  return sessionMonitor.getSessionData(connectionId);
});

// Get monitor data for all sessions
ipcMain.handle('session-monitor:getAllData', async () => {
  return sessionMonitor.getAllSessionsData();
});

// Enable/disable session monitoring
ipcMain.handle('session-monitor:setEnabled', async (event, enabled: boolean) => {
  sessionMonitor.setEnabled(enabled);
  appSettings.set('sessionMonitorEnabled', enabled);
  return { success: true };
});

// Check if monitoring is enabled
ipcMain.handle('session-monitor:isEnabled', async () => {
  return appSettings.get('sessionMonitorEnabled');
});

// Terminal font settings
ipcMain.handle('settings:getTerminalFont', async () => {
  return appSettings.get('terminalFont');
});

ipcMain.handle('settings:setTerminalFont', async (event, fontFamily: string) => {
  appSettings.set('terminalFont', fontFamily);
  return { success: true };
});

// App Lock settings
ipcMain.handle('settings:getAppLockSettings', async () => {
  return {
    enabled: appSettings.get('appLockEnabled'),
    method: appSettings.get('appLockMethod'),
    timeout: appSettings.get('appLockTimeout'),
    hasCredential: !!appSettings.get('appLockHash'),
  };
});

ipcMain.handle('settings:setAppLockEnabled', async (event, enabled: boolean) => {
  appSettings.set('appLockEnabled', enabled);
  return { success: true };
});

ipcMain.handle('settings:setAppLockMethod', async (event, method: string) => {
  appSettings.set('appLockMethod', method as any);
  // Clear credential when switching to blur mode
  if (method === 'blur' || method === 'none') {
    appSettings.clearCredential();
  }
  return { success: true };
});

ipcMain.handle('settings:setAppLockTimeout', async (event, timeout: number) => {
  appSettings.set('appLockTimeout', timeout);
  return { success: true };
});

ipcMain.handle('settings:setAppLockCredential', async (event, credential: string) => {
  appSettings.setCredential(credential);
  return { success: true };
});

ipcMain.handle('settings:verifyAppLockCredential', async (event, credential: string) => {
  return appSettings.verifyCredential(credential);
});

ipcMain.handle('settings:clearAppLockCredential', async () => {
  appSettings.clearCredential();
  return { success: true };
});

// Forward session monitor updates to renderer
sessionMonitor.on('update', (data: SessionMonitorData) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('session-monitor:update', data);
  }
});

sessionMonitor.on('session-closed', (connectionId: string) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('session-monitor:closed', connectionId);
  }
});

// ============================================================================

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

ipcMain.handle('sftp:stat', async (event, connectionId, remotePath) => {
  try {
    console.log('[Main] sftp:stat', connectionId, remotePath);
    const stats = await sftpManager.stat(connectionId, remotePath);
    return { success: true, stats };
  } catch (error: any) {
    console.error('[Main] sftp:stat error:', error.message);
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

ipcMain.handle('sftp:downloadFolder', async (event, connectionId, remotePath, localPath) => {
  try {
    console.log('[Main] sftp:downloadFolder', connectionId, remotePath, '->', localPath);
    await sftpManager.downloadFolder(connectionId, remotePath, localPath);
    console.log('[Main] sftp:downloadFolder success');
    return { success: true };
  } catch (error: any) {
    console.error('[Main] sftp:downloadFolder error:', error.message);
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

ipcMain.handle('sftp:uploadFolder', async (event, connectionId, localPath, remotePath) => {
  try {
    console.log('[Main] sftp:uploadFolder', connectionId, localPath, '->', remotePath);
    await sftpManager.uploadFolder(connectionId, localPath, remotePath);
    console.log('[Main] sftp:uploadFolder success');
    return { success: true };
  } catch (error: any) {
    console.error('[Main] sftp:uploadFolder error:', error.message);
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

// DNS resolution handler
const dnsLookup = promisify(dns.lookup);
ipcMain.handle('dns:resolve', async (event, hostname: string) => {
  try {
    // Try to resolve hostname to IP
    const result = await dnsLookup(hostname, { family: 0 }); // 0 = IPv4 or IPv6
    return { success: true, ip: result.address, family: result.family };
  } catch (error: any) {
    // If resolution fails, return the original hostname
    // (might be already an IP or invalid hostname)
    console.log('[DNS] Failed to resolve', hostname, ':', error.message);
    return { success: false, hostname, error: error.message };
  }
});

// IP Info lookup handler - resolve hostname and get IP info from ipinfo.io
ipcMain.handle('lookup-ip-info', async (_, hostnameOrIp: string) => {
  try {
    // First, resolve hostname to IP if needed
    let ip = hostnameOrIp;
    const isIP = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostnameOrIp) || hostnameOrIp.includes(':'); // IPv4 or IPv6
    
    if (!isIP) {
      try {
        const dnsResult = await dnsLookup(hostnameOrIp, { family: 4 }); // Prefer IPv4
        ip = dnsResult.address;
      } catch (e) {
        console.log('[IPInfo] DNS resolution failed for', hostnameOrIp);
        // Continue with original hostname
      }
    }
    
    // Fetch IP info from ipinfo.io
    return new Promise((resolve) => {
      const req = https.get(`https://ipinfo.io/${ip}/json`, { timeout: 5000 }, (res) => {
        let data = '';
        res.on('data', (chunk: string) => data += chunk);
        res.on('end', () => {
          try {
            const info = JSON.parse(data);
            resolve({
              success: true,
              ip: info.ip || ip,
              org: info.org || '',
              city: info.city || '',
              region: info.region || '',
              country: info.country || '',
            });
          } catch (e) {
            resolve({ success: true, ip, org: '' });
          }
        });
      });
      
      req.on('error', (err: any) => {
        console.log('[IPInfo] Request failed:', err.message);
        resolve({ success: true, ip, org: '' });
      });
      
      req.on('timeout', () => {
        req.destroy();
        resolve({ success: true, ip, org: '' });
      });
    });
  } catch (error: any) {
    console.error('[IPInfo] Error:', error);
    return { success: false, ip: hostnameOrIp, org: '', error: error.message };
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

ipcMain.handle('servers:reorder', async (event, servers) => {
  try {
    serverStore.reorderServers(servers);
    return { success: true };
  } catch (error: any) {
    console.error('[Main] servers:reorder error:', error.message);
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
// Check RDP dependencies (Linux only)
ipcMain.handle('rdp:checkDeps', async () => {
  try {
    const deps = rdpManager.checkDependencies();
    return { success: true, deps };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// Install RDP dependencies with streaming output
ipcMain.handle('rdp:installDeps', async (event, password: string) => {
  try {
    const deps = rdpManager.checkDependencies();
    
    if (deps.xfreerdp3 && deps.xdotool) {
      return { success: true, message: 'All dependencies already installed' };
    }

    if (!password) {
      return { success: false, error: 'Password is required' };
    }

    return new Promise((resolve) => {
      rdpManager.installDependencies(
        deps,
        password,
        (data: string) => {
          // Stream data to renderer
          if (event.sender && !event.sender.isDestroyed()) {
            event.sender.send('rdp:installOutput', data);
          }
        },
        (success: boolean, error?: string) => {
          resolve({ success, error });
        }
      );
    });
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

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
      console.log(`[Main] RDP connect event received for ${connectionId}`);
      if (event.sender && !event.sender.isDestroyed()) {
        console.log(`[Main] Sending rdp:connect to renderer`);
        event.sender.send('rdp:connect', connectionId);
      } else {
        console.log(`[Main] Cannot send rdp:connect - sender destroyed`);
      }
    });

    emitter.on('close', () => {
      console.log(`[Main] RDP close event received for ${connectionId}`);
      if (event.sender && !event.sender.isDestroyed()) {
        console.log(`[Main] Sending rdp:close to renderer`);
        event.sender.send('rdp:close', connectionId);
      }
    });

    emitter.on('error', (err: Error) => {
      console.log(`[Main] RDP error event received for ${connectionId}:`, err.message);
      if (event.sender && !event.sender.isDestroyed()) {
        console.log(`[Main] Sending rdp:error to renderer`);
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
  console.log(`[Main] Forwarding WSS message to renderer: ${connectionId}`);
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
    // connect() is now async and waits for connection result
    const result = await wssManager.connect(connectionId, config);
    return result;
  } catch (error: any) {
    console.error('[Main] wss:connect error:', error);
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
    console.error('[Main] wss:disconnect error:', error);
    // Always return success for disconnect - we don't want UI to show error
    // The connection is effectively closed even if there was an error
    return { success: true };
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
    
    // Use home directory as default, not desktop
    const homePath = app.getPath('home');
    const defaultPath = path.join(homePath, defaultName);
    
    const result = await dialog.showSaveDialog(mainWindow!, {
      title: 'Save Backup File',
      defaultPath: defaultPath,
      filters: [
        { name: 'Marix Backup', extensions: ['marix'] },
      ],
      properties: ['showOverwriteConfirmation', 'createDirectory'],
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

    // Get Snippets
    const snippetsJson = await mainWindow?.webContents.executeJavaScript('localStorage.getItem("command_snippets")');
    const snippets = snippetsJson ? JSON.parse(snippetsJson) : [];

    // Create encrypted backup
    const result = await backupService.createBackupContent(
      password,
      servers,
      tagColors,
      cloudflareToken,
      sshKeys,
      totpEntries,
      portForwards,
      snippets
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

      // Restore SSH keys
      let sshKeyCount = 0;
      if (result.data.sshKeys && result.data.sshKeys.length > 0) {
        const importResult = await sshKeyService.importKeysFromBackup(result.data.sshKeys);
        sshKeyCount = importResult.imported;
      }

      return {
        success: true,
        serverCount: result.data.servers.length,
        sshKeyCount,
        metadata: downloadResult.metadata,
        totpEntries: result.data.totpEntries,
        portForwards: result.data.portForwards,
        snippets: result.data.snippets
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

ipcMain.handle('github:uploadBackup', async (event, password: string, totpEntries?: any[], portForwards?: any[], snippets?: any[]) => {
  // Validate password first (same as local backup)
  const validation = backupService.validatePassword(password);
  if (!validation.valid) {
    return { success: false, error: validation.errors.join('\n') };
  }
  
  const servers = serverStore.getAllServers();
  const tagColors = serverStore.getTagColors();
  const cloudflareToken = cloudflareService.getToken() || undefined;
  const sshKeys = sshKeyService.exportAllKeysForBackup();
  
  // Create encrypted backup content (including 2FA, port forwards and snippets)
  const backupResult = await backupService.createBackupContent(password, servers, tagColors, cloudflareToken, sshKeys, totpEntries, portForwards, snippets);
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
    portForwards: restoreResult.data.portForwards,
    snippets: restoreResult.data.snippets
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

ipcMain.handle('gitlab:uploadBackup', async (event, password: string, totpEntries?: any[], portForwards?: any[], snippets?: any[]) => {
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
      portForwards,
      snippets
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
      portForwards: restoreResult.data.portForwards,
      snippets: restoreResult.data.snippets
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

ipcMain.handle('box:uploadBackup', async (event, password: string, totpEntries?: any[], portForwards?: any[], snippets?: any[]) => {
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
      portForwards,
      snippets
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
      portForwards: restoreResult.data.portForwards,
      snippets: restoreResult.data.snippets
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

// ==================== OneDrive OAuth Handlers ====================

ipcMain.handle('onedrive:startOAuth', async () => {
  try {
    const tokens = await OneDriveOAuthService.startOAuthFlow(mainWindow || undefined);
    OneDriveOAuthService.saveTokens(tokens);
    return { success: true };
  } catch (error: any) {
    console.error('[OneDrive OAuth] Error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('onedrive:hasToken', async () => {
  const accessToken = await OneDriveOAuthService.getValidAccessToken();
  return { hasToken: !!accessToken };
});

ipcMain.handle('onedrive:logout', async () => {
  try {
    OneDriveOAuthService.deleteTokens();
    return { success: true };
  } catch (error: any) {
    console.error('[OneDrive] Logout error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('onedrive:getUser', async () => {
  try {
    const accessToken = await OneDriveOAuthService.getValidAccessToken();
    if (!accessToken) {
      return { success: false, error: 'Not authenticated' };
    }
    const user = await OneDriveApiService.getCurrentUser(accessToken);
    return { success: true, user };
  } catch (error: any) {
    console.error('[OneDrive] Get user error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('onedrive:uploadBackup', async (event, password: string, totpEntries?: any[], portForwards?: any[], snippets?: any[]) => {
  try {
    // Validate password
    const validation = backupService.validatePassword(password);
    if (!validation.valid) {
      return { success: false, error: validation.errors.join('\n') };
    }
    
    // Get access token
    const accessToken = await OneDriveOAuthService.getValidAccessToken();
    if (!accessToken) {
      return { success: false, error: 'Not authenticated with OneDrive. Please connect first.' };
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
      portForwards,
      snippets
    );
    
    if (!backupResult.success || !backupResult.content) {
      return { success: false, error: backupResult.error };
    }
    
    // Upload to OneDrive
    await OneDriveApiService.uploadBackup(accessToken, backupResult.content);
    
    return { success: true };
  } catch (error: any) {
    console.error('[OneDrive] Upload backup error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('onedrive:downloadBackup', async (event, password: string) => {
  try {
    // Get access token
    const accessToken = await OneDriveOAuthService.getValidAccessToken();
    if (!accessToken) {
      return { success: false, error: 'Not authenticated with OneDrive. Please connect first.' };
    }
    
    // Download from OneDrive
    const encryptedContent = await OneDriveApiService.downloadBackup(accessToken);
    
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
      portForwards: restoreResult.data.portForwards,
      snippets: restoreResult.data.snippets
    };
  } catch (error: any) {
    console.error('[OneDrive] Download backup error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('onedrive:checkBackup', async () => {
  try {
    const accessToken = await OneDriveOAuthService.getValidAccessToken();
    if (!accessToken) {
      return { exists: false };
    }
    
    const exists = await OneDriveApiService.backupExists(accessToken);
    if (!exists) {
      return { exists: false };
    }
    
    const metadata = await OneDriveApiService.getBackupMetadata(accessToken);
    return { exists: true, metadata };
  } catch (error: any) {
    console.error('[OneDrive] Check backup error:', error);
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

// ============================================================================
// BUILD INFO - Get build metadata for transparency
// ============================================================================
ipcMain.handle('app:getBuildInfo', async () => {
  return {
    ...buildInfo,
    version: app.getVersion(),
    electronVersion: process.versions.electron,
    chromeVersion: process.versions.chrome,
    v8Version: process.versions.v8,
  };
});

// Focus window handler - used to restore focus after closing sessions
ipcMain.handle('app:focusWindow', async () => {
  if (mainWindow) {
    // Focus the window first
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
    // Then focus webContents to ensure renderer gets focus
    mainWindow.webContents.focus();
    return true;
  }
  return false;
});

// Known Hosts handlers
// Fast check - if host is already known and trusted, return 'match' immediately without network call
ipcMain.handle('knownhosts:check', async (event, host: string, port: number) => {
  // First check if host is already in known_hosts (instant, no network)
  const storedHost = knownHostsService.getStoredFingerprint(host, port);
  
  if (storedHost) {
    // Host is known - return match status immediately for fast connection
    // The actual fingerprint verification happens during SSH handshake
    console.log(`[KnownHosts] Host ${host}:${port} already known, skipping ssh-keyscan`);
    return {
      status: 'match',
      keyType: storedHost.keyType,
      fingerprint: storedHost.fingerprint,
      fullKey: storedHost.fullKey,
    };
  }
  
  // Host not known - need to fetch fingerprint (slower, requires network)
  console.log(`[KnownHosts] Host ${host}:${port} not known, fetching fingerprint...`);
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
  console.log('[sshkey:getPrivate] Request for key ID:', id);
  const privateKey = sshKeyService.getPrivateKey(id);
  console.log('[sshkey:getPrivate] Result:', privateKey ? 'Found (' + privateKey.length + ' chars)' : 'Not found');
  return privateKey;
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
      properties: ['openFile', 'showHiddenFiles'],
      filters: [
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
const UPDATE_REPO = 'marixdev/marix';

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
        
        console.log('[Update] Fetching:', path);
        
        https.get(options, (res: any) => {
          let data = '';
          res.on('data', (chunk: string) => data += chunk);
          res.on('end', () => {
            try {
              if (res.statusCode === 200) {
                const result = JSON.parse(data);
                if (isRelease) {
                  console.log('[Update] Latest release:', result.tag_name);
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
                    console.log('[Update] Latest tag:', latestTag.name);
                    resolve({
                      success: true,
                      latestVersion: latestTag.name?.replace('v', '') || latestTag.ref?.split('/').pop()?.replace('v', ''),
                      releaseUrl: `https://github.com/${UPDATE_REPO}/releases/tag/${latestTag.name}`,
                      publishedAt: null,
                      releaseNotes: null
                    });
                  } else {
                    resolve({ success: false, error: 'No releases or tags found' });
                  }
                }
              } else if (res.statusCode === 404 && isRelease) {
                // No releases found, try tags
                console.log('[Update] No releases found, trying tags...');
                tryFetch(`/repos/${UPDATE_REPO}/tags`, false);
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
      tryFetch(`/repos/${UPDATE_REPO}/releases/latest`, true);
    });
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// Open URL in browser
ipcMain.handle('app:openUrl', async (event, url: string) => {
  console.log('[App] Opening URL:', url);
  const { shell } = require('electron');
  try {
    await shell.openExternal(url);
    console.log('[App] URL opened successfully');
    return { success: true };
  } catch (err: any) {
    console.error('[App] Failed to open URL:', err);
    return { success: false, error: err.message };
  }
});

// ==================== LAN Sharing ====================

// Start LAN sharing service
ipcMain.handle('lan-share:start', async () => {
  try {
    await lanSharingService.start();
    // Also start file transfer service
    await lanFileTransferService.start();
    console.log('[LANShare] Services started (sharing + file transfer)');
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
    lanFileTransferService.stop();
    console.log('[LANShare] Services stopped');
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
