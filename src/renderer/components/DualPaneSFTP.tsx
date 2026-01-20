import React, { useState, useEffect, useRef } from 'react';
import { ipcRenderer } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import FileEditor from './FileEditor';
import SourceInstaller from './SourceInstaller';
import { useLanguage } from '../contexts/LanguageContext';

interface FileInfo {
  name: string;
  type: 'file' | 'directory' | 'symlink';
  size: number;
  modifyTime: number;
  permissions?: number;
}

interface Props {
  connectionId: string;
  server: {
    host: string;
    port: number;
    username: string;
    password?: string;
    protocol?: 'ssh' | 'ftp' | 'ftps' | 'rdp' | 'wss' | 'mysql' | 'postgresql' | 'mongodb' | 'redis' | 'sqlite';
  };
  initialLocalPath?: string;
  initialRemotePath?: string;
  onPathChange?: (localPath: string, remotePath: string) => void;
  onSftpConnected?: () => void;
}

// Custom dialog types
interface DialogState {
  type: 'prompt' | 'confirm' | null;
  title: string;
  message: string;
  defaultValue?: string;
  resolve?: (value: string | boolean | null) => void;
}

// Track SFTP connections globally
const sftpConnections = new Map<string, boolean>();

const DualPaneSFTP: React.FC<Props> = ({ connectionId, server, initialLocalPath, initialRemotePath, onPathChange, onSftpConnected }) => {
  const { t } = useLanguage();
  
  // Local state - use initial values if provided
  const [localPath, setLocalPath] = useState(initialLocalPath || os.homedir());
  const [localFiles, setLocalFiles] = useState<FileInfo[]>([]);
  const [localHistory, setLocalHistory] = useState<string[]>([initialLocalPath || os.homedir()]);
  const [localHistoryIndex, setLocalHistoryIndex] = useState(0);
  const [localSearch, setLocalSearch] = useState('');
  
  // Remote state - use initial values if provided
  const [remotePath, setRemotePath] = useState(initialRemotePath || '/');
  const [remoteFiles, setRemoteFiles] = useState<FileInfo[]>([]);
  const [remoteHistory, setRemoteHistory] = useState<string[]>([initialRemotePath || '/']);
  const [remoteHistoryIndex, setRemoteHistoryIndex] = useState(0);
  const [remoteSearch, setRemoteSearch] = useState('');
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [connected, setConnected] = useState(sftpConnections.get(connectionId) || false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLocal, setSelectedLocal] = useState<string | null>(null);
  const [selectedRemote, setSelectedRemote] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; type: 'local' | 'remote'; file: FileInfo | null } | null>(null);
  
  // Drag & drop state
  const [localDragOver, setLocalDragOver] = useState(false);
  const [remoteDragOver, setRemoteDragOver] = useState(false);
  const [draggingFile, setDraggingFile] = useState<{ name: string; from: 'local' | 'remote' } | null>(null);

  // Dialog state
  const [dialog, setDialog] = useState<DialogState>({ type: null, title: '', message: '' });
  const [dialogInput, setDialogInput] = useState('');
  const dialogInputRef = useRef<HTMLInputElement>(null);

  // File editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<{ name: string; path: string } | null>(null);

  // Source installer state
  const [sourceInstallerOpen, setSourceInstallerOpen] = useState(false);
  const [sourceInstallerPath, setSourceInstallerPath] = useState('');

  // Delete progress state
  const [deleteProgress, setDeleteProgress] = useState<{ deleting: boolean; currentItem: string; count: number } | null>(null);

  // Custom prompt function
  const showPrompt = (title: string, message: string, defaultValue = ''): Promise<string | null> => {
    return new Promise((resolve) => {
      setDialogInput(defaultValue);
      setDialog({ type: 'prompt', title, message, defaultValue, resolve: resolve as any });
      setTimeout(() => dialogInputRef.current?.focus(), 100);
    });
  };

  // Custom confirm function
  const showConfirm = (title: string, message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialog({ type: 'confirm', title, message, resolve: resolve as any });
    });
  };

  const closeDialog = (result: string | boolean | null) => {
    if (dialog.resolve) {
      dialog.resolve(result);
    }
    setDialog({ type: null, title: '', message: '' });
    setDialogInput('');
  };

  // Check if file is editable (text-based)
  const isEditable = (filename: string): boolean => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const editableExts = [
      'js', 'jsx', 'ts', 'tsx', 'py', 'rb', 'php', 'java', 'c', 'cpp', 'h', 'hpp',
      'cs', 'go', 'rs', 'swift', 'kt', 'scala', 'lua', 'r', 'pl', 'ex', 'exs', 'erl',
      'html', 'htm', 'css', 'scss', 'sass', 'less', 'vue', 'svelte',
      'json', 'jsonc', 'yml', 'yaml', 'toml', 'ini', 'conf', 'cfg', 'env',
      'xml', 'svg', 'plist',
      'sh', 'bash', 'zsh', 'fish', 'ps1', 'bat', 'cmd',
      'md', 'markdown', 'txt', 'log', 'rst', 'tex',
      'sql', 'csv', 'tsv',
      'dockerfile',
    ];
    const lowerName = filename.toLowerCase();
    if (lowerName === 'dockerfile' || lowerName === 'makefile' || 
        lowerName === 'caddyfile' || lowerName === 'vagrantfile' ||
        lowerName.startsWith('.env') || lowerName.startsWith('.git') ||
        lowerName.endsWith('rc') || lowerName.endsWith('ignore')) {
      return true;
    }
    return editableExts.includes(ext);
  };

  // Open remote file in editor
  const openRemoteFile = (name: string) => {
    const fullPath = remotePath === '/' ? `/${name}` : `${remotePath}/${name}`;
    console.log('[DualPaneSFTP] Opening file for edit:', name, fullPath);
    setEditingFile({ name, path: fullPath });
    setEditorOpen(true);
  };

  // Check if using FTP protocol
  const isFTP = server.protocol === 'ftp' || server.protocol === 'ftps';
  const ftpPrefix = isFTP ? 'ftp' : 'sftp';

  // Connect SFTP/FTP
  useEffect(() => {
    const connectRemote = async () => {
      // Always try to reconnect when component mounts
      // Clear any stale connection state first
      sftpConnections.delete(connectionId);
      setConnected(false);
      
      // For FTP, the connection is already established in App.tsx
      if (isFTP) {
        sftpConnections.set(connectionId, true);
        setConnected(true);
        loadRemoteFiles('/');
        if (onSftpConnected) {
          onSftpConnected();
        }
        return;
      }
      
      setLoading(true);
      setError(null);
      try {
        const result = await ipcRenderer.invoke('sftp:connect', connectionId, {
          host: server.host,
          port: server.port,
          username: server.username,
          password: server.password,
        });
        
        if (result.success) {
          sftpConnections.set(connectionId, true);
          setConnected(true);
          loadRemoteFiles('/');
          if (onSftpConnected) {
            onSftpConnected();
          }
        } else {
          setError(result.error || 'SFTP connection failed');
        }
      } catch (err: any) {
        setError(err.message);
      }
      setLoading(false);
    };
    
    connectRemote();
    
    // Cleanup on unmount
    return () => {
      sftpConnections.delete(connectionId);
    };
  }, [connectionId]);

  // Load local files
  useEffect(() => {
    loadLocalFiles(localPath);
  }, [localPath]);

  // Load remote files
  useEffect(() => {
    if (connected) {
      loadRemoteFiles(remotePath);
    }
  }, [remotePath, connected]);

  // Notify parent when paths change
  useEffect(() => {
    if (onPathChange) {
      onPathChange(localPath, remotePath);
    }
  }, [localPath, remotePath]);

  // Close context menu on click
  useEffect(() => {
    const closeContextMenu = () => setContextMenu(null);
    window.addEventListener('click', closeContextMenu);
    return () => window.removeEventListener('click', closeContextMenu);
  }, []);

  const loadLocalFiles = (p: string) => {
    setLocalLoading(true);
    try {
      const items = fs.readdirSync(p);
      const fileInfos: FileInfo[] = items.map(name => {
        try {
          const fullPath = path.join(p, name);
          const stats = fs.statSync(fullPath);
          return {
            name,
            type: stats.isDirectory() ? 'directory' : stats.isSymbolicLink() ? 'symlink' : 'file',
            size: stats.size,
            modifyTime: stats.mtimeMs,
            permissions: stats.mode,
          };
        } catch {
          return { name, type: 'file' as const, size: 0, modifyTime: 0, permissions: 0 };
        }
      });
      
      setLocalFiles(fileInfos.sort((a, b) => {
        if (a.type === 'directory' && b.type !== 'directory') return -1;
        if (a.type !== 'directory' && b.type === 'directory') return 1;
        return a.name.localeCompare(b.name);
      }));
    } catch (err: any) {
      console.error('Error loading local files:', err);
      setLocalFiles([]);
    }
    setLocalLoading(false);
  };

  const loadRemoteFiles = async (p: string) => {
    setLoading(true);
    try {
      const listCmd = isFTP ? 'ftp:list' : 'sftp:list';
      const result = await ipcRenderer.invoke(listCmd, connectionId, p);
      if (result.success) {
        setRemoteFiles(result.files.sort((a: FileInfo, b: FileInfo) => {
          if (a.type === 'directory' && b.type !== 'directory') return -1;
          if (a.type !== 'directory' && b.type === 'directory') return 1;
          return a.name.localeCompare(b.name);
        }));
        setError(null);
      } else {
        if (!isFTP && (result.error?.includes('not connected') || result.error?.includes('No SFTP'))) {
          sftpConnections.delete(connectionId);
          setConnected(false);
          
          const reconnectResult = await ipcRenderer.invoke('sftp:connect', connectionId, {
            host: server.host,
            port: server.port,
            username: server.username,
            password: server.password,
          });
          
          if (reconnectResult.success) {
            sftpConnections.set(connectionId, true);
            setConnected(true);
            const retryResult = await ipcRenderer.invoke('sftp:list', connectionId, p);
            if (retryResult.success) {
              setRemoteFiles(retryResult.files.sort((a: FileInfo, b: FileInfo) => {
                if (a.type === 'directory' && b.type !== 'directory') return -1;
                if (a.type !== 'directory' && b.type === 'directory') return 1;
                return a.name.localeCompare(b.name);
              }));
              setError(null);
            }
          } else {
            setError('Reconnect failed: ' + reconnectResult.error);
          }
        } else {
          setError(result.error);
        }
      }
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  // Navigation functions
  const navigateLocal = (newPath: string) => {
    setLocalPath(newPath);
    const newHistory = localHistory.slice(0, localHistoryIndex + 1);
    newHistory.push(newPath);
    setLocalHistory(newHistory);
    setLocalHistoryIndex(newHistory.length - 1);
  };

  const navigateRemote = (newPath: string) => {
    setRemotePath(newPath);
    const newHistory = remoteHistory.slice(0, remoteHistoryIndex + 1);
    newHistory.push(newPath);
    setRemoteHistory(newHistory);
    setRemoteHistoryIndex(newHistory.length - 1);
  };

  const localGoUp = () => {
    const parentPath = path.dirname(localPath);
    if (parentPath !== localPath) {
      navigateLocal(parentPath);
    }
  };

  const remoteGoUp = () => {
    if (remotePath !== '/') {
      const parts = remotePath.split('/').filter(Boolean);
      parts.pop();
      navigateRemote(parts.length > 0 ? '/' + parts.join('/') : '/');
    }
  };

  const localGoHome = () => navigateLocal(os.homedir());
  const remoteGoHome = () => navigateRemote('/');

  const localBack = () => {
    if (localHistoryIndex > 0) {
      setLocalHistoryIndex(localHistoryIndex - 1);
      setLocalPath(localHistory[localHistoryIndex - 1]);
    }
  };

  const localForward = () => {
    if (localHistoryIndex < localHistory.length - 1) {
      setLocalHistoryIndex(localHistoryIndex + 1);
      setLocalPath(localHistory[localHistoryIndex + 1]);
    }
  };

  const remoteBack = () => {
    if (remoteHistoryIndex > 0) {
      setRemoteHistoryIndex(remoteHistoryIndex - 1);
      setRemotePath(remoteHistory[remoteHistoryIndex - 1]);
    }
  };

  const remoteForward = () => {
    if (remoteHistoryIndex < remoteHistory.length - 1) {
      setRemoteHistoryIndex(remoteHistoryIndex + 1);
      setRemotePath(remoteHistory[remoteHistoryIndex + 1]);
    }
  };

  // File operations
  const downloadFile = async (name: string) => {
    const remoteFilePath = remotePath === '/' ? `/${name}` : `${remotePath}/${name}`;
    const localFilePath = path.join(localPath, name);
    
    // Check if file exists locally
    if (fs.existsSync(localFilePath)) {
      const overwrite = await showConfirm('Overwrite File?', `File "${name}" already exists in local folder.\n\nDo you want to overwrite it?`);
      if (!overwrite) {
        return;
      }
    }
    
    try {
      const downloadCmd = isFTP ? 'ftp:download' : 'sftp:download';
      console.log(`[${ftpPrefix.toUpperCase()}] Downloading:`, remoteFilePath, '->', localFilePath);
      const result = await ipcRenderer.invoke(downloadCmd, connectionId, remoteFilePath, localFilePath);
      if (result.success) {
        console.log(`[${ftpPrefix.toUpperCase()}] Download success`);
        loadLocalFiles(localPath);
      } else {
        console.error(`[${ftpPrefix.toUpperCase()}] Download failed:`, result.error);
        alert('Download failed: ' + result.error);
      }
    } catch (err: any) {
      console.error(`[${ftpPrefix.toUpperCase()}] Download error:`, err);
      alert('Error: ' + err.message);
    }
  };

  const uploadFile = async (name: string) => {
    const localFilePath = path.join(localPath, name);
    const remoteFilePath = remotePath === '/' ? `/${name}` : `${remotePath}/${name}`;
    
    // Check if file exists on remote
    const existingFile = remoteFiles.find(f => f.name === name);
    if (existingFile) {
      const overwrite = await showConfirm('Overwrite File?', `File "${name}" already exists on remote server.\n\nDo you want to overwrite it?`);
      if (!overwrite) {
        return;
      }
    }
    
    try {
      const uploadCmd = isFTP ? 'ftp:upload' : 'sftp:upload';
      console.log(`[${ftpPrefix.toUpperCase()}] Uploading:`, localFilePath, '->', remoteFilePath);
      const result = await ipcRenderer.invoke(uploadCmd, connectionId, localFilePath, remoteFilePath);
      if (result.success) {
        console.log(`[${ftpPrefix.toUpperCase()}] Upload success`);
        loadRemoteFiles(remotePath);
      } else {
        console.error(`[${ftpPrefix.toUpperCase()}] Upload failed:`, result.error);
        alert('Upload failed: ' + result.error);
      }
    } catch (err: any) {
      console.error(`[${ftpPrefix.toUpperCase()}] Upload error:`, err);
      alert('Error: ' + err.message);
    }
  };


  const createLocalFolder = async () => {
    const name = await showPrompt('New Folder', 'Enter folder name:');
    if (name) {
      try {
        fs.mkdirSync(path.join(localPath, name));
        loadLocalFiles(localPath);
      } catch (err: any) {
        console.error('[SFTP] Create local folder error:', err);
      }
    }
  };

  const createRemoteFolder = async () => {
    const name = await showPrompt('New Folder', 'Enter folder name:');
    if (name && name.trim()) {
      const remoteFolderPath = remotePath === '/' ? `/${name.trim()}` : `${remotePath}/${name.trim()}`;
      console.log(`[${ftpPrefix.toUpperCase()}] Creating remote folder:`, remoteFolderPath);
      try {
        const mkdirCmd = isFTP ? 'ftp:mkdir' : 'sftp:mkdir';
        const result = await ipcRenderer.invoke(mkdirCmd, connectionId, remoteFolderPath);
        console.log(`[${ftpPrefix.toUpperCase()}] mkdir result:`, result);
        if (result.success) {
          loadRemoteFiles(remotePath);
        } else {
          alert('Failed to create folder: ' + result.error);
        }
      } catch (err: any) {
        console.error(`[${ftpPrefix.toUpperCase()}] mkdir error:`, err);
        alert('Error: ' + err.message);
      }
    }
  };

  const createLocalFile = async () => {
    const name = await showPrompt('New File', 'Enter file name:');
    if (name) {
      try {
        fs.writeFileSync(path.join(localPath, name), '');
        loadLocalFiles(localPath);
      } catch (err: any) {
        console.error('[SFTP] Create local file error:', err);
      }
    }
  };

  const createRemoteFile = async () => {
    const name = await showPrompt('New File', 'Enter file name:');
    if (name && name.trim()) {
      const remoteFilePath = remotePath === '/' ? `/${name.trim()}` : `${remotePath}/${name.trim()}`;
      console.log(`[${ftpPrefix.toUpperCase()}] Creating remote file:`, remoteFilePath);
      try {
        const writeCmd = isFTP ? 'ftp:writeFile' : 'sftp:writeFile';
        const result = await ipcRenderer.invoke(writeCmd, connectionId, remoteFilePath, '');
        console.log(`[${ftpPrefix.toUpperCase()}] writeFile result:`, result);
        if (result.success) {
          loadRemoteFiles(remotePath);
        } else {
          alert('Failed to create file: ' + result.error);
        }
      } catch (err: any) {
        console.error(`[${ftpPrefix.toUpperCase()}] writeFile error:`, err);
        alert('Error: ' + err.message);
      }
    }
  };

  const chmodLocal = async (fileName: string) => {
    const mode = await showPrompt('Change Permissions', 'Enter permissions (e.g., 755, 644):');
    if (mode && /^[0-7]{3,4}$/.test(mode)) {
      try {
        const filePath = path.join(localPath, fileName);
        fs.chmodSync(filePath, parseInt(mode, 8));
        loadLocalFiles(localPath);
      } catch (err: any) {
        console.error('[SFTP] chmod local error:', err);
      }
    } else if (mode) {
      console.error('[SFTP] Invalid permission format:', mode);
    }
  };

  const chmodRemote = async (fileName: string) => {
    const mode = await showPrompt('Change Permissions', 'Enter permissions (e.g., 755, 644):');
    if (mode && /^[0-7]{3,4}$/.test(mode)) {
      const remoteFilePath = remotePath === '/' ? `/${fileName}` : `${remotePath}/${fileName}`;
      const modeInt = parseInt(mode, 8);
      console.log('[SFTP] chmod:', remoteFilePath, 'mode:', mode, 'int:', modeInt);
      try {
        const result = await ipcRenderer.invoke('sftp:chmod', connectionId, remoteFilePath, modeInt);
        console.log('[SFTP] chmod result:', result);
        if (result.success) {
          loadRemoteFiles(remotePath);
        } else {
          alert('Failed to change permissions: ' + result.error);
        }
      } catch (err: any) {
        console.error('[SFTP] chmod error:', err);
        alert('Error: ' + err.message);
      }
    } else if (mode) {
      alert('Invalid permission format. Use octal format like 755 or 644.');
    }
  };

  const deleteLocal = async (fileName: string) => {
    const confirmed = await showConfirm('Delete', `Delete "${fileName}"?`);
    if (confirmed) {
      try {
        const filePath = path.join(localPath, fileName);
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
          fs.rmSync(filePath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(filePath);
        }
        loadLocalFiles(localPath);
        setSelectedLocal(null);
      } catch (err: any) {
        alert('Failed to delete: ' + err.message);
      }
    }
  };

  // Listen for delete progress events
  useEffect(() => {
    const handleDeleteProgress = (_event: any, data: { connectionId: string; path: string; type: 'file' | 'directory'; count: number }) => {
      if (data.connectionId === connectionId) {
        setDeleteProgress({
          deleting: true,
          currentItem: data.path,
          count: data.count,
        });
      }
    };

    ipcRenderer.on('sftp:delete-progress', handleDeleteProgress);
    return () => {
      ipcRenderer.removeListener('sftp:delete-progress', handleDeleteProgress);
    };
  }, [connectionId]);

  const deleteRemote = async (fileName: string) => {
    const confirmed = await showConfirm('Delete', `Delete "${fileName}"?`);
    if (confirmed) {
      const remoteFilePath = remotePath === '/' ? `/${fileName}` : `${remotePath}/${fileName}`;
      try {
        setDeleteProgress({ deleting: true, currentItem: remoteFilePath, count: 0 });
        const deleteCmd = isFTP ? 'ftp:delete' : 'sftp:delete';
        const result = await ipcRenderer.invoke(deleteCmd, connectionId, remoteFilePath);
        setDeleteProgress(null);
        if (result.success) {
          loadRemoteFiles(remotePath);
          setSelectedRemote(null);
        } else {
          alert('Failed to delete: ' + result.error);
        }
      } catch (err: any) {
        setDeleteProgress(null);
        alert('Error: ' + err.message);
      }
    }
  };

  const renameLocal = async (fileName: string) => {
    const newName = await showPrompt(t('rename') || 'Rename', `${t('enterNewName') || 'Enter new name for'} "${fileName}":`, fileName);
    if (newName && newName !== fileName) {
      try {
        const oldPath = path.join(localPath, fileName);
        const newPath = path.join(localPath, newName);
        fs.renameSync(oldPath, newPath);
        loadLocalFiles(localPath);
        setSelectedLocal(newName);
      } catch (err: any) {
        alert('Failed to rename: ' + err.message);
      }
    }
  };

  const renameRemote = async (fileName: string) => {
    const newName = await showPrompt(t('rename') || 'Rename', `${t('enterNewName') || 'Enter new name for'} "${fileName}":`, fileName);
    if (newName && newName !== fileName) {
      const oldFilePath = remotePath === '/' ? `/${fileName}` : `${remotePath}/${fileName}`;
      const newFilePath = remotePath === '/' ? `/${newName}` : `${remotePath}/${newName}`;
      try {
        const renameCmd = isFTP ? 'ftp:rename' : 'sftp:rename';
        const result = await ipcRenderer.invoke(renameCmd, connectionId, oldFilePath, newFilePath);
        if (result.success) {
          loadRemoteFiles(remotePath);
          setSelectedRemote(newName);
        } else {
          alert('Failed to rename: ' + result.error);
        }
      } catch (err: any) {
        alert('Error: ' + err.message);
      }
    }
  };

  // Compress file/folder to archive (remote)
  const compressRemote = async (fileName: string, format: 'zip' | 'tar.gz' | 'tar') => {
    const filePath = remotePath === '/' ? `/${fileName}` : `${remotePath}/${fileName}`;
    const archiveName = format === 'zip' ? `${fileName}.zip` : 
                        format === 'tar.gz' ? `${fileName}.tar.gz` : `${fileName}.tar`;
    const archivePath = remotePath === '/' ? `/${archiveName}` : `${remotePath}/${archiveName}`;
    
    try {
      setLoading(true);
      let cmd: string;
      if (format === 'zip') {
        cmd = `cd "${remotePath}" && zip -r "${archiveName}" "${fileName}"`;
      } else if (format === 'tar.gz') {
        cmd = `cd "${remotePath}" && tar -czvf "${archiveName}" "${fileName}"`;
      } else {
        cmd = `cd "${remotePath}" && tar -cvf "${archiveName}" "${fileName}"`;
      }
      
      const result = await ipcRenderer.invoke('ssh:execute', connectionId, cmd);
      if (result.success) {
        loadRemoteFiles(remotePath);
      } else {
        alert(`Failed to compress: ${result.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Extract archive (remote)
  const extractRemote = async (fileName: string) => {
    const filePath = remotePath === '/' ? `/${fileName}` : `${remotePath}/${fileName}`;
    
    // Determine extraction command based on file extension
    const lowerName = fileName.toLowerCase();
    let cmd: string;
    
    if (lowerName.endsWith('.zip')) {
      cmd = `cd "${remotePath}" && unzip -o "${fileName}"`;
    } else if (lowerName.endsWith('.tar.gz') || lowerName.endsWith('.tgz')) {
      cmd = `cd "${remotePath}" && tar -xzvf "${fileName}"`;
    } else if (lowerName.endsWith('.tar.bz2') || lowerName.endsWith('.tbz2')) {
      cmd = `cd "${remotePath}" && tar -xjvf "${fileName}"`;
    } else if (lowerName.endsWith('.tar.xz') || lowerName.endsWith('.txz')) {
      cmd = `cd "${remotePath}" && tar -xJvf "${fileName}"`;
    } else if (lowerName.endsWith('.tar')) {
      cmd = `cd "${remotePath}" && tar -xvf "${fileName}"`;
    } else if (lowerName.endsWith('.gz')) {
      cmd = `cd "${remotePath}" && gunzip -k "${fileName}"`;
    } else if (lowerName.endsWith('.bz2')) {
      cmd = `cd "${remotePath}" && bunzip2 -k "${fileName}"`;
    } else if (lowerName.endsWith('.xz')) {
      cmd = `cd "${remotePath}" && unxz -k "${fileName}"`;
    } else if (lowerName.endsWith('.7z')) {
      cmd = `cd "${remotePath}" && 7z x "${fileName}"`;
    } else if (lowerName.endsWith('.rar')) {
      cmd = `cd "${remotePath}" && unrar x "${fileName}"`;
    } else {
      alert('Unsupported archive format');
      return;
    }
    
    try {
      setLoading(true);
      const result = await ipcRenderer.invoke('ssh:execute', connectionId, cmd);
      if (result.success) {
        loadRemoteFiles(remotePath);
      } else {
        alert(`Failed to extract: ${result.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Check if file is an archive
  const isArchive = (fileName: string): boolean => {
    const lowerName = fileName.toLowerCase();
    return lowerName.endsWith('.zip') || 
           lowerName.endsWith('.tar') ||
           lowerName.endsWith('.tar.gz') || 
           lowerName.endsWith('.tgz') ||
           lowerName.endsWith('.tar.bz2') || 
           lowerName.endsWith('.tbz2') ||
           lowerName.endsWith('.tar.xz') || 
           lowerName.endsWith('.txz') ||
           lowerName.endsWith('.gz') ||
           lowerName.endsWith('.bz2') ||
           lowerName.endsWith('.xz') ||
           lowerName.endsWith('.7z') ||
           lowerName.endsWith('.rar');
  };

  const handleContextMenu = (e: React.MouseEvent, type: 'local' | 'remote', file: FileInfo | null) => {
    e.preventDefault();
    e.stopPropagation();
    if (file) {
      if (type === 'local') {
        setSelectedLocal(file.name);
      } else {
        setSelectedRemote(file.name);
      }
    }
    
    // Calculate position with boundary checking
    const menuHeight = 350; // Approximate menu height (more items now)
    const menuWidth = 200; // Approximate menu width
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;
    
    let x = e.clientX;
    let y = e.clientY;
    
    // Adjust if menu would go off bottom of screen
    if (y + menuHeight > windowHeight - 50) { // 50px buffer for footer
      y = windowHeight - menuHeight - 50;
    }
    
    // Adjust if menu would go off right side of screen
    if (x + menuWidth > windowWidth) {
      x = windowWidth - menuWidth - 10;
    }
    
    setContextMenu({ x, y, type, file });
  };

  // Drag & drop handlers
  const handleDragStart = (e: React.DragEvent, fileName: string, from: 'local' | 'remote') => {
    setDraggingFile({ name: fileName, from });
    e.dataTransfer.setData('text/plain', fileName);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragEnd = () => {
    setDraggingFile(null);
    setLocalDragOver(false);
    setRemoteDragOver(false);
  };

  const handleLocalDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Accept drops from remote pane or external files
    if (draggingFile?.from === 'remote' || e.dataTransfer.types.includes('Files')) {
      e.dataTransfer.dropEffect = 'copy';
      setLocalDragOver(true);
    }
  };

  const handleRemoteDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Accept drops from local pane only (for now)
    if (draggingFile?.from === 'local') {
      e.dataTransfer.dropEffect = 'copy';
      setRemoteDragOver(true);
    }
  };

  const handleLocalDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setLocalDragOver(false);
  };

  const handleRemoteDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setRemoteDragOver(false);
  };

  const handleLocalDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLocalDragOver(false);
    
    // Handle drop from remote pane
    if (draggingFile?.from === 'remote') {
      await downloadFile(draggingFile.name);
    }
    // Handle external file drop (from OS file manager)
    else if (e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      for (const file of files) {
        const destPath = path.join(localPath, file.name);
        try {
          // In Electron, File object has path property (not in standard web)
          const srcPath = (file as any).path as string;
          if (srcPath && srcPath !== destPath) {
            fs.copyFileSync(srcPath, destPath);
          }
        } catch (err: any) {
          alert(`Failed to copy ${file.name}: ${err.message}`);
        }
      }
      loadLocalFiles(localPath);
    }
    
    setDraggingFile(null);
  };

  const handleRemoteDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setRemoteDragOver(false);
    
    // Handle drop from local pane
    if (draggingFile?.from === 'local') {
      await uploadFile(draggingFile.name);
    }
    
    setDraggingFile(null);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '-';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatPermissions = (mode?: number) => {
    if (!mode) return '---';
    // Extract permission bits (last 9 bits)
    const perms = mode & 0o777;
    const octal = perms.toString(8).padStart(3, '0');
    return octal;
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    const now = new Date();
    const isThisYear = date.getFullYear() === now.getFullYear();
    
    const month = date.toLocaleString('en', { month: 'short' });
    const day = date.getDate().toString().padStart(2, ' ');
    
    if (isThisYear) {
      const hours = date.getHours().toString().padStart(2, '0');
      const mins = date.getMinutes().toString().padStart(2, '0');
      return `${month} ${day} ${hours}:${mins}`;
    } else {
      return `${month} ${day} ${date.getFullYear()}`;
    }
  };

  const filterFiles = (files: FileInfo[], search: string) => {
    if (!search) return files;
    return files.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));
  };

  // Icons
  const RefreshIcon = () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );

  const DownloadIcon = () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
    </svg>
  );

  const UploadIcon = () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  );

  const ChmodIcon = () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );

  const FolderPlusIcon = () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    </svg>
  );

  const FilePlusIcon = () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );

  if (!connected && loading) {
    return (
      <div className="h-full flex items-center justify-center bg-navy-900">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-gray-400">{t('sftpConnecting')}</p>
        </div>
      </div>
    );
  }

  if (error && !connected) {
    return (
      <div className="h-full flex items-center justify-center bg-navy-900">
        <div className="text-center p-4">
          <div className="text-red-400 mb-2">⚠️ {t('sftpConnectionFailed')}</div>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-navy-900 relative">
      {/* Dual pane */}
      <div className="flex-1 flex overflow-hidden">
        {/* Local pane */}
        <div className="flex-1 flex flex-col border-r border-navy-700">
          {/* Local toolbar */}
          <div className="bg-navy-800 border-b border-navy-700 p-2">
            <div className="flex items-center gap-1 mb-2">
              <span className="text-xs text-teal-400 font-medium mr-2">{t('sftpLocal')}</span>
              <button onClick={localBack} disabled={localHistoryIndex === 0} className="p-1.5 hover:bg-navy-700 rounded disabled:opacity-30 transition text-gray-400" title={t('back')}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <button onClick={localForward} disabled={localHistoryIndex === localHistory.length - 1} className="p-1.5 hover:bg-navy-700 rounded disabled:opacity-30 transition text-gray-400" title={t('forward')}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
              <button onClick={localGoUp} className="p-1.5 hover:bg-navy-700 rounded transition text-gray-400" title={t('parent')}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
              </button>
              <button onClick={localGoHome} className="p-1.5 hover:bg-navy-700 rounded transition text-gray-400" title={t('home')}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
              </button>
              <div className="w-px h-4 bg-navy-600 mx-1"></div>
              <button onClick={() => loadLocalFiles(localPath)} className="p-1.5 hover:bg-navy-700 rounded transition text-gray-400" title={t('refresh')}><RefreshIcon /></button>
              <button onClick={() => selectedLocal && uploadFile(selectedLocal)} disabled={!selectedLocal} className="p-1.5 hover:bg-navy-700 rounded disabled:opacity-30 transition text-gray-400" title={t('upload')}><UploadIcon /></button>
              <button onClick={() => selectedLocal && chmodLocal(selectedLocal)} disabled={!selectedLocal} className="p-1.5 hover:bg-navy-700 rounded disabled:opacity-30 transition text-gray-400" title={t('chmod')}><ChmodIcon /></button>
              <div className="w-px h-4 bg-navy-600 mx-1"></div>
              <button onClick={createLocalFolder} className="p-1.5 hover:bg-navy-700 rounded transition text-gray-400" title={t('newFolder')}><FolderPlusIcon /></button>
              <button onClick={createLocalFile} className="p-1.5 hover:bg-navy-700 rounded transition text-gray-400" title={t('newFile')}><FilePlusIcon /></button>
            </div>
            <div className="flex items-center gap-2">
              <input type="text" value={localPath} onChange={(e) => navigateLocal(e.target.value)} className="flex-1 px-2 py-1 bg-navy-900 text-white text-xs font-mono rounded border border-navy-700 focus:outline-none focus:border-teal-500" />
              <input type="text" placeholder={`${t('search')}...`} value={localSearch} onChange={(e) => setLocalSearch(e.target.value)} className="w-24 px-2 py-1 bg-navy-900 text-white text-xs rounded border border-navy-700 focus:outline-none focus:border-teal-500" />
            </div>
          </div>

          {/* Local files */}
          {/* Local files - with drag & drop */}
          <div 
            className={`flex-1 overflow-auto relative transition-colors ${localDragOver ? 'bg-teal-900/30 ring-2 ring-teal-500 ring-inset' : ''}`}
            onContextMenu={(e) => handleContextMenu(e, 'local', null)}
            onDragOver={handleLocalDragOver}
            onDragLeave={handleLocalDragLeave}
            onDrop={handleLocalDrop}
          >
            {localDragOver && (
              <div className="absolute inset-0 flex items-center justify-center bg-teal-900/20 pointer-events-none z-10">
                <div className="text-teal-400 text-sm font-medium">{t('sftpDropToDownload')}</div>
              </div>
            )}
            <table className="w-full text-xs">
              <thead className="bg-navy-800 sticky top-0 border-b border-navy-700">
                <tr className="text-left text-gray-500">
                  <th className="p-2 font-medium">{t('sftpName')}</th>
                  <th className="p-2 font-medium w-16">{t('sftpSize')}</th>
                  <th className="p-2 font-medium w-16">{t('sftpPerms')}</th>
                  <th className="p-2 font-medium w-28">{t('sftpModified')}</th>
                </tr>
              </thead>
              <tbody>
                {filterFiles(localFiles, localSearch).map((file, i) => (
                  <tr
                    key={i}
                    className={`border-t border-navy-800 hover:bg-navy-800 transition cursor-pointer ${selectedLocal === file.name ? 'bg-navy-700' : ''}`}
                    onClick={() => setSelectedLocal(file.name)}
                    onContextMenu={(e) => handleContextMenu(e, 'local', file)}
                    draggable={file.type === 'file'}
                    onDragStart={(e) => handleDragStart(e, file.name, 'local')}
                    onDragEnd={handleDragEnd}
                    onDoubleClick={() => {
                      if (file.type === 'directory') {
                        navigateLocal(path.join(localPath, file.name));
                        setSelectedLocal(null);
                      }
                    }}
                  >
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        {file.type === 'directory' ? (
                          <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" /></svg>
                        ) : file.type === 'symlink' ? (
                          <svg className="w-4 h-4 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                        ) : (
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                        )}
                        <span className="text-white truncate">{file.name}</span>
                      </div>
                    </td>
                    <td className="p-2 text-gray-500">{file.type === 'file' ? formatSize(file.size) : '-'}</td>
                    <td className="p-2 text-gray-500 font-mono">{formatPermissions(file.permissions)}</td>
                    <td className="p-2 text-gray-500">{formatDate(file.modifyTime)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {localLoading && <div className="text-center py-4 text-gray-500 text-xs">{t('loading')}...</div>}
          </div>
          <div className="bg-navy-800 border-t border-navy-700 px-2 py-1 text-xs text-gray-500">
            {localFiles.length} {t('sftpItems')}
          </div>
        </div>

        {/* Remote pane */}
        <div className="flex-1 flex flex-col">
          {/* Remote toolbar */}
          <div className="bg-navy-800 border-b border-navy-700 p-2">
            <div className="flex items-center gap-1 mb-2">
              <span className="text-xs text-purple-400 font-medium mr-2">{t('sftpRemote')}</span>
              <button onClick={remoteBack} disabled={remoteHistoryIndex === 0} className="p-1.5 hover:bg-navy-700 rounded disabled:opacity-30 transition text-gray-400" title={t('back')}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <button onClick={remoteForward} disabled={remoteHistoryIndex === remoteHistory.length - 1} className="p-1.5 hover:bg-navy-700 rounded disabled:opacity-30 transition text-gray-400" title={t('forward')}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
              <button onClick={remoteGoUp} disabled={remotePath === '/'} className="p-1.5 hover:bg-navy-700 rounded disabled:opacity-30 transition text-gray-400" title={t('parent')}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
              </button>
              <button onClick={remoteGoHome} className="p-1.5 hover:bg-navy-700 rounded transition text-gray-400" title={t('home')}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
              </button>
              <div className="w-px h-4 bg-navy-600 mx-1"></div>
              <button onClick={() => loadRemoteFiles(remotePath)} className="p-1.5 hover:bg-navy-700 rounded transition text-gray-400" title={t('refresh')}><RefreshIcon /></button>
              <button onClick={() => selectedRemote && downloadFile(selectedRemote)} disabled={!selectedRemote} className="p-1.5 hover:bg-navy-700 rounded disabled:opacity-30 transition text-gray-400" title={t('download')}><DownloadIcon /></button>
              <button onClick={() => selectedRemote && chmodRemote(selectedRemote)} disabled={!selectedRemote} className="p-1.5 hover:bg-navy-700 rounded disabled:opacity-30 transition text-gray-400" title={t('chmod')}><ChmodIcon /></button>
              <div className="w-px h-4 bg-navy-600 mx-1"></div>
              <button onClick={createRemoteFolder} className="p-1.5 hover:bg-navy-700 rounded transition text-gray-400" title={t('newFolder')}><FolderPlusIcon /></button>
              <button onClick={createRemoteFile} className="p-1.5 hover:bg-navy-700 rounded transition text-gray-400" title={t('newFile')}><FilePlusIcon /></button>
            </div>
            <div className="flex items-center gap-2">
              <input type="text" value={remotePath} onChange={(e) => navigateRemote(e.target.value)} className="flex-1 px-2 py-1 bg-navy-900 text-white text-xs font-mono rounded border border-navy-700 focus:outline-none focus:border-purple-500" />
              <input type="text" placeholder={`${t('search')}...`} value={remoteSearch} onChange={(e) => setRemoteSearch(e.target.value)} className="w-24 px-2 py-1 bg-navy-900 text-white text-xs rounded border border-navy-700 focus:outline-none focus:border-purple-500" />
            </div>
          </div>

          {/* Remote files - with drag & drop */}
          <div 
            className={`flex-1 overflow-auto relative transition-colors ${remoteDragOver ? 'bg-purple-900/30 ring-2 ring-purple-500 ring-inset' : ''}`}
            onContextMenu={(e) => handleContextMenu(e, 'remote', null)}
            onDragOver={handleRemoteDragOver}
            onDragLeave={handleRemoteDragLeave}
            onDrop={handleRemoteDrop}
          >
            {remoteDragOver && (
              <div className="absolute inset-0 flex items-center justify-center bg-purple-900/20 pointer-events-none z-10">
                <div className="text-purple-400 text-sm font-medium">{t('sftpDropToUpload')}</div>
              </div>
            )}
            {loading ? (
              <div className="flex items-center justify-center h-full"><div className="text-sm text-gray-500">{t('loading')}...</div></div>
            ) : (
              <table className="w-full text-xs">
                <thead className="bg-navy-800 sticky top-0 border-b border-navy-700">
                  <tr className="text-left text-gray-500">
                    <th className="p-2 font-medium">{t('sftpName')}</th>
                    <th className="p-2 font-medium w-16">{t('sftpSize')}</th>
                    <th className="p-2 font-medium w-16">{t('sftpPerms')}</th>
                    <th className="p-2 font-medium w-28">{t('sftpModified')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filterFiles(remoteFiles, remoteSearch).map((file, i) => (
                    <tr
                      key={i}
                      className={`border-t border-navy-800 hover:bg-navy-800 transition cursor-pointer ${selectedRemote === file.name ? 'bg-navy-700' : ''}`}
                      onClick={() => setSelectedRemote(file.name)}
                      onContextMenu={(e) => handleContextMenu(e, 'remote', file)}
                      draggable={file.type === 'file'}
                      onDragStart={(e) => handleDragStart(e, file.name, 'remote')}
                      onDragEnd={handleDragEnd}
                      onDoubleClick={() => {
                        if (file.type === 'directory') {
                          navigateRemote(remotePath === '/' ? `/${file.name}` : `${remotePath}/${file.name}`);
                          setSelectedRemote(null);
                        } else if (file.type === 'file' && isEditable(file.name)) {
                          openRemoteFile(file.name);
                        }
                      }}
                    >
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          {file.type === 'directory' ? (
                            <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" /></svg>
                          ) : file.type === 'symlink' ? (
                            <svg className="w-4 h-4 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                          ) : (
                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                          )}
                          <span className="text-white truncate">{file.name}</span>
                          {file.type === 'file' && isEditable(file.name) && (
                            <span className="text-xs text-teal-500 opacity-60">✎</span>
                          )}
                        </div>
                      </td>
                      <td className="p-2 text-gray-500">{file.type === 'file' ? formatSize(file.size) : '-'}</td>
                      <td className="p-2 text-gray-500 font-mono">{formatPermissions(file.permissions)}</td>
                      <td className="p-2 text-gray-500">{formatDate(file.modifyTime)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="bg-navy-800 border-t border-navy-700 px-2 py-1 text-xs text-gray-500 flex items-center justify-between">
            <span>{remoteFiles.length} {t('sftpItems')}</span>
            {deleteProgress && deleteProgress.deleting && (
              <div className="flex items-center gap-2 text-red-400">
                <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
                  <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" opacity="0.75" />
                </svg>
                <span className="font-medium">Deleting... ({deleteProgress.count})</span>
                <span className="text-gray-500 truncate max-w-[200px]" title={deleteProgress.currentItem}>
                  {deleteProgress.currentItem.split('/').pop()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-navy-800 border border-navy-600 rounded-lg shadow-2xl py-1 z-50 min-w-[180px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.type === 'local' ? (
            <>
              {contextMenu.file ? (
                <>
                  {contextMenu.file.type === 'directory' && (
                    <MenuItem icon="folder" onClick={() => { navigateLocal(path.join(localPath, contextMenu.file!.name)); setContextMenu(null); }}>{t('sftpOpen')}</MenuItem>
                  )}
                  {contextMenu.file.type === 'file' && (
                    <MenuItem icon="upload" onClick={() => { uploadFile(contextMenu.file!.name); setContextMenu(null); }}>{t('sftpUploadToRemote')}</MenuItem>
                  )}
                  <MenuItem icon="chmod" onClick={() => { chmodLocal(contextMenu.file!.name); setContextMenu(null); }}>{t('sftpChangePermissions')}</MenuItem>
                  <MenuItem icon="rename" onClick={() => { renameLocal(contextMenu.file!.name); setContextMenu(null); }}>{t('rename')}</MenuItem>
                  <div className="border-t border-navy-600 my-1"></div>
                  <MenuItem icon="delete" danger onClick={() => { deleteLocal(contextMenu.file!.name); setContextMenu(null); }}>{t('delete')}</MenuItem>
                </>
              ) : (
                <>
                  <MenuItem icon="folder-plus" onClick={() => { createLocalFolder(); setContextMenu(null); }}>{t('newFolder')}</MenuItem>
                  <MenuItem icon="file-plus" onClick={() => { createLocalFile(); setContextMenu(null); }}>{t('newFolder').replace('Folder', 'File')}</MenuItem>
                  <div className="border-t border-navy-600 my-1"></div>
                  <MenuItem icon="refresh" onClick={() => { loadLocalFiles(localPath); setContextMenu(null); }}>{t('refresh')}</MenuItem>
                </>
              )}
            </>
          ) : (
            <>
              {contextMenu.file ? (
                <>
                  {contextMenu.file.type === 'directory' && (
                    <>
                      <MenuItem icon="folder" onClick={() => { navigateRemote(remotePath === '/' ? `/${contextMenu.file!.name}` : `${remotePath}/${contextMenu.file!.name}`); setContextMenu(null); }}>{t('sftpOpen')}</MenuItem>
                      <MenuItem icon="package" onClick={() => { 
                        const targetDir = remotePath === '/' ? `/${contextMenu.file!.name}` : `${remotePath}/${contextMenu.file!.name}`;
                        setSourceInstallerPath(targetDir);
                        setSourceInstallerOpen(true);
                        setContextMenu(null);
                      }}>{t('sftpInstallSource')}</MenuItem>
                      <div className="border-t border-navy-600 my-1"></div>
                      <div className="px-3 py-1 text-xs text-gray-500 uppercase tracking-wide">Compress</div>
                      <MenuItem icon="compress" onClick={() => { compressRemote(contextMenu.file!.name, 'zip'); setContextMenu(null); }}>Compress to .zip</MenuItem>
                      <MenuItem icon="compress" onClick={() => { compressRemote(contextMenu.file!.name, 'tar.gz'); setContextMenu(null); }}>Compress to .tar.gz</MenuItem>
                      <MenuItem icon="compress" onClick={() => { compressRemote(contextMenu.file!.name, 'tar'); setContextMenu(null); }}>Compress to .tar</MenuItem>
                    </>
                  )}
                  {contextMenu.file.type === 'file' && (
                    <>
                      <MenuItem icon="download" onClick={() => { downloadFile(contextMenu.file!.name); setContextMenu(null); }}>{t('sftpDownloadToLocal')}</MenuItem>
                      {isEditable(contextMenu.file.name) && (
                        <MenuItem icon="edit" onClick={() => { openRemoteFile(contextMenu.file!.name); setContextMenu(null); }}>{t('sftpEditFile')}</MenuItem>
                      )}
                      {isArchive(contextMenu.file.name) && (
                        <>
                          <div className="border-t border-navy-600 my-1"></div>
                          <MenuItem icon="extract" onClick={() => { extractRemote(contextMenu.file!.name); setContextMenu(null); }}>Extract Here</MenuItem>
                        </>
                      )}
                      {!isArchive(contextMenu.file.name) && (
                        <>
                          <div className="border-t border-navy-600 my-1"></div>
                          <div className="px-3 py-1 text-xs text-gray-500 uppercase tracking-wide">Compress</div>
                          <MenuItem icon="compress" onClick={() => { compressRemote(contextMenu.file!.name, 'zip'); setContextMenu(null); }}>Compress to .zip</MenuItem>
                          <MenuItem icon="compress" onClick={() => { compressRemote(contextMenu.file!.name, 'tar.gz'); setContextMenu(null); }}>Compress to .tar.gz</MenuItem>
                        </>
                      )}
                    </>
                  )}
                  <div className="border-t border-navy-600 my-1"></div>
                  <MenuItem icon="chmod" onClick={() => { chmodRemote(contextMenu.file!.name); setContextMenu(null); }}>{t('sftpChangePermissions')}</MenuItem>
                  <MenuItem icon="rename" onClick={() => { renameRemote(contextMenu.file!.name); setContextMenu(null); }}>{t('rename')}</MenuItem>
                  <div className="border-t border-navy-600 my-1"></div>
                  <MenuItem icon="delete" danger onClick={() => { deleteRemote(contextMenu.file!.name); setContextMenu(null); }}>{t('delete')}</MenuItem>
                </>
              ) : (
                <>
                  <MenuItem icon="folder-plus" onClick={() => { createRemoteFolder(); setContextMenu(null); }}>{t('newFolder')}</MenuItem>
                  <MenuItem icon="file-plus" onClick={() => { createRemoteFile(); setContextMenu(null); }}>{t('newFolder').replace('Folder', 'File')}</MenuItem>
                  <MenuItem icon="package" onClick={() => { 
                    setSourceInstallerPath(remotePath);
                    setSourceInstallerOpen(true);
                    setContextMenu(null);
                  }}>{t('sftpInstallSource')}</MenuItem>
                  <div className="border-t border-navy-600 my-1"></div>
                  <MenuItem icon="refresh" onClick={() => { loadRemoteFiles(remotePath); setContextMenu(null); }}>{t('refresh')}</MenuItem>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* Custom Dialog Modal */}
      {dialog.type && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => closeDialog(dialog.type === 'confirm' ? false : null)}>
          <div className="bg-navy-800 rounded-lg shadow-xl border border-navy-600 p-4 min-w-[300px] max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-white font-medium mb-2">{dialog.title}</h3>
            <p className="text-gray-400 text-sm mb-4 whitespace-pre-wrap">{dialog.message}</p>
            
            {dialog.type === 'prompt' && (
              <input
                ref={dialogInputRef}
                type="text"
                value={dialogInput}
                onChange={(e) => setDialogInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') closeDialog(dialogInput);
                  if (e.key === 'Escape') closeDialog(null);
                }}
                className="w-full px-3 py-2 bg-navy-900 text-white rounded border border-navy-600 focus:outline-none focus:border-teal-500 mb-4"
                autoFocus
              />
            )}
            
            <div className="flex justify-end gap-2">
              <button
                onClick={() => closeDialog(dialog.type === 'confirm' ? false : null)}
                className="px-4 py-2 text-gray-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={() => closeDialog(dialog.type === 'confirm' ? true : dialogInput)}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded transition"
              >
                {dialog.type === 'confirm' ? 'Confirm' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Editor Modal */}
      {editingFile && (
        <FileEditor
          isOpen={editorOpen}
          onClose={() => {
            setEditorOpen(false);
            setEditingFile(null);
          }}
          connectionId={connectionId}
          remotePath={editingFile.path}
          fileName={editingFile.name}
          isFTP={isFTP}
          onSave={() => {
            loadRemoteFiles(remotePath);
          }}
        />
      )}

      {/* Source Installer Modal */}
      <SourceInstaller
        isOpen={sourceInstallerOpen}
        onClose={() => setSourceInstallerOpen(false)}
        connectionId={connectionId}
        targetPath={sourceInstallerPath}
        onInstallComplete={() => {
          loadRemoteFiles(remotePath);
        }}
      />
    </div>
  );
};

// Menu Item Component
const MenuItem: React.FC<{ icon: string; onClick: () => void; danger?: boolean; children: React.ReactNode }> = ({ icon, onClick, danger, children }) => {
  const iconMap: Record<string, React.ReactNode> = {
    'folder': <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>,
    'upload': <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>,
    'download': <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" /></svg>,
    'chmod': <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>,
    'delete': <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
    'folder-plus': <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>,
    'file-plus': <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    'refresh': <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>,
    'edit': <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
    'rename': <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>,
    'package': <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
    'compress': <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12M8 12h.01M12 12h.01M16 12h.01" /></svg>,
    'extract': <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>,
  };

  return (
    <button
      onClick={onClick}
      className={`w-full px-3 py-2 text-left text-sm hover:bg-navy-700 flex items-center gap-3 ${danger ? 'text-red-400' : 'text-white'}`}
    >
      {iconMap[icon]}
      {children}
    </button>
  );
};

export default React.memo(DualPaneSFTP);
