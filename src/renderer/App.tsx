import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { version as APP_VERSION } from '../../package.json';

const { ipcRenderer } = window.electron;
import ServerList from './components/ServerList';
import XTermTerminal from './components/XTermTerminal';
import DualPaneSFTP from './components/DualPaneSFTP';
import RDPViewer from './components/RDPViewer';
import RDPDepsInstaller from './components/RDPDepsInstaller';
import WSSViewer from './components/WSSViewer';
import DatabaseClient from './components/DatabaseClient';
import AddServerModal from './components/AddServerModal';
import ThemeSelector from './components/ThemeSelector';
import LanguageSelector from './components/LanguageSelector';
import SSHFingerprintModal from './components/SSHFingerprintModal';
import SSHKeyManager from './components/SSHKeyManager';
import LANShareModal from './components/LANShareModal';
import LANFileTransferPage from './components/LANFileTransferPage';
import PairCodePopup from './components/PairCodePopup';
import KnownHostsPage from './components/KnownHostsPage';
import TwoFactorPage from './components/TwoFactorPage';
import SnippetPage from './components/SnippetPage';
import PortForwardingPage from './components/PortForwardingPage';
import SessionMonitorIndicator from './components/SessionMonitorIndicator';
import LockScreen from './components/LockScreen';
import { BackupModal } from './components/BackupModal';
import { useTerminalContext } from './contexts/TerminalContext';
import { useLanguage } from './contexts/LanguageContext';

// Semver comparison helper: returns true if v1 > v2
const isNewerVersion = (v1: string, v2: string): boolean => {
  const parts1 = v1.replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
  const parts2 = v2.replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return true;
    if (p1 < p2) return false;
  }
  return false;
};

export interface Server {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  password?: string;
  icon?: string;  // OS icon name: ubuntu, debian, centos, windows, etc.
  protocol?: 'ssh' | 'ftp' | 'ftps' | 'rdp' | 'wss' | 'mysql' | 'postgresql' | 'mongodb' | 'redis' | 'sqlite';
  authType?: 'password' | 'key';
  privateKey?: string;
  passphrase?: string;
  domain?: string;  // Windows domain for RDP
  wssUrl?: string;  // WebSocket URL for WSS connections
  tags?: string[];  // Tags for organizing servers
  sshKeyId?: string;  // ID of SSH key in keychain (if using key from SSH Key Manager)
  knockEnabled?: boolean;  // Enable port knocking
  knockSequence?: number[];  // Port sequence for knocking (e.g., [7000, 8000, 9000])
  // Database-specific fields
  database?: string;  // Database name to connect to
  sslEnabled?: boolean;  // Use SSL for database connection
  sslCa?: string;  // SSL CA certificate
  sslCert?: string;  // SSL client certificate
  sslKey?: string;  // SSL client key
  mongoUri?: string;  // MongoDB connection URI (alternative to host/port)
  sqliteFile?: string;  // Path to SQLite file (for remote SQLite via SSH)
  notes?: string;  // User notes for this server (sticky note feature)
}

export interface Session {
  id: string;
  server: Server;
  connectionId: string;
  type: 'terminal' | 'sftp' | 'rdp' | 'wss' | 'database';
  theme?: string;
  sftpPaths?: {
    localPath: string;
    remotePath: string;
  };
  osInfo?: {
    os: string;
    ip: string;
    provider: string;
  };
  dbInfo?: {
    version: string;
    ip: string;
    provider: string;
  };
  wssStatus?: 'connecting' | 'connected' | 'disconnected' | 'error';
  wssError?: string;
}

const App: React.FC = () => {
  const [servers, setServers] = useState<Server[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingServer, setEditingServer] = useState<Server | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentTheme, setCurrentTheme] = useState('Dracula');
  const [appTheme, setAppTheme] = useState<'dark' | 'light'>('dark');
  const [activeMenu, setActiveMenu] = useState<'hosts' | 'settings' | 'cloudflare' | 'nettools' | 'tools' | 'sshkeys' | 'knownhosts' | 'twofactor' | 'snippets' | 'portforward' | 'about' | 'sendfiles'>('hosts');
  const [activeTag, setActiveTag] = useState<string | null>(null);  // Filter by tag
  const [tagSearch, setTagSearch] = useState('');  // Search tags
  const [tagColors, setTagColors] = useState<{ [key: string]: string }>({});  // Tag colors
  const [tagMenuOpen, setTagMenuOpen] = useState<string | null>(null);  // Which tag has menu open
  const [searchQuery, setSearchQuery] = useState('');  // Global search
  const [quickConnectOpen, setQuickConnectOpen] = useState(false);  // Quick connect dropdown
  const [quickConnectSearch, setQuickConnectSearch] = useState('');  // Quick connect search
  const [backupModalOpen, setBackupModalOpen] = useState<'create' | 'restore' | null>(null);  // Backup modal
  const [backupMethod, setBackupMethod] = useState<'local' | 'gdrive' | 'github' | 'gitlab' | 'box'>('local');  // Backup method
  const [backupPassword, setBackupPassword] = useState('');  // Backup password
  const [backupConfirmPassword, setBackupConfirmPassword] = useState('');  // Confirm password
  const [backupError, setBackupError] = useState<string | null>(null);  // Backup error
  const [backupLoading, setBackupLoading] = useState(false);  // Backup loading
  const [backupSuccess, setBackupSuccess] = useState<string | null>(null);  // Success message
  
  // GitLab backup state
  const [gitlabConnected, setGitlabConnected] = useState(false);
  const [gitlabConnecting, setGitlabConnecting] = useState(false);
  const [gitlabBackupInfo, setGitlabBackupInfo] = useState<{ exists: boolean; metadata?: any } | null>(null);
  
  // Box backup state
  const [boxConnected, setBoxConnected] = useState(false);
  const [boxConnecting, setBoxConnecting] = useState(false);
  const [boxBackupInfo, setBoxBackupInfo] = useState<{ exists: boolean; metadata?: any } | null>(null);
  
  // Google Drive backup states
  const [gdriveConnected, setGdriveConnected] = useState(false);
  const [gdriveConnecting, setGdriveConnecting] = useState(false);
  const [gdriveBackupInfo, setGdriveBackupInfo] = useState<{ exists: boolean; metadata?: any } | null>(null);
  const [gdriveUser, setGdriveUser] = useState<{ displayName: string; emailAddress: string; photoLink?: string } | null>(null);
  
  // Cloudflare state
  const [cfHasToken, setCfHasToken] = useState(false);
  const [cfZones, setCfZones] = useState<any[]>([]);
  const [cfSelectedZone, setCfSelectedZone] = useState<string | null>(null);
  const [cfRecords, setCfRecords] = useState<any[]>([]);
  const [cfLoading, setCfLoading] = useState(false);
  const [cfError, setCfError] = useState<string | null>(null);
  const [cfRecordModal, setCfRecordModal] = useState<{ mode: 'create' | 'edit'; record?: any } | null>(null);
  
  // WHOIS state
  const [whoisDomain, setWhoisDomain] = useState('');
  const [whoisResult, setWhoisResult] = useState<any | null>(null);
  const [whoisLoading, setWhoisLoading] = useState(false);
  const [whoisError, setWhoisError] = useState<string | null>(null);
  
  // Network Tools state
  const [ntSelectedTool, setNtSelectedTool] = useState<string>('a');
  const [ntInput, setNtInput] = useState('');
  const [ntPort, setNtPort] = useState<number>(80);
  const [ntResult, setNtResult] = useState<any | null>(null);
  const [ntLoading, setNtLoading] = useState(false);
  const [ntError, setNtError] = useState<string | null>(null);
  const [ntHistory, setNtHistory] = useState<any[]>([]);
  
  // Tools Menu state
  const [toolsSelectedTool, setToolsSelectedTool] = useState<string>('smtp');
  // SMTP Testing state
  const [smtpServer, setSmtpServer] = useState('');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpEncryption, setSmtpEncryption] = useState<'starttls' | 'ssl'>('starttls');
  const [smtpUseAuth, setSmtpUseAuth] = useState(true);
  const [smtpUsername, setSmtpUsername] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpFromEmail, setSmtpFromEmail] = useState('');
  const [smtpToEmail, setSmtpToEmail] = useState('');
  const [smtpLoading, setSmtpLoading] = useState(false);
  const [smtpResult, setSmtpResult] = useState<any>(null);
  const [smtpError, setSmtpError] = useState<string | null>(null);
  // Proxy Check state
  const [proxyType, setProxyType] = useState<'http' | 'socks4' | 'socks5'>('http');
  const [proxyServer, setProxyServer] = useState('');
  const [proxyPort, setProxyPort] = useState(8080);
  const [proxyUsername, setProxyUsername] = useState('');
  const [proxyPassword, setProxyPassword] = useState('');
  const [proxyTestUrl, setProxyTestUrl] = useState('https://marix.dev');
  const [proxyLoading, setProxyLoading] = useState(false);
  const [proxyResult, setProxyResult] = useState<any>(null);
  const [proxyError, setProxyError] = useState<string | null>(null);
  // Port Listener state
  const [portListenerData, setPortListenerData] = useState<any[]>([]);
  const [portListenerLoading, setPortListenerLoading] = useState(false);
  const [portListenerFilter, setPortListenerFilter] = useState('');
  const [portListenerProtocol, setPortListenerProtocol] = useState<'all' | 'tcp' | 'udp'>('all');
  const [portListenerLastScan, setPortListenerLastScan] = useState<Date | null>(null);
  
  // Update check state
  const [updateInfo, setUpdateInfo] = useState<{
    checking: boolean;
    latestVersion?: string;
    releaseUrl?: string;
    publishedAt?: string;
    releaseNotes?: string;
    error?: string;
    hasUpdate?: boolean;
  }>({ checking: false });
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);
  const APP_AUTHOR = 'Đạt Vũ (Marix)';
  const GITHUB_REPO = 'https://github.com/marixdev/marix';
  
  // Build info state
  const [buildInfo, setBuildInfo] = useState<{
    commitSha?: string;
    commitShort?: string;
    branch?: string;
    buildTime?: string;
    runId?: string;
    repository?: string;
    electronVersion?: string;
    chromeVersion?: string;
    nodeVersion?: string;
  } | null>(null);
  
  // SSH Fingerprint Modal state
  const [fingerprintModal, setFingerprintModal] = useState<{
    server: Server;
    onProceed: () => void;
  } | null>(null);
  
  // SSH Key Manager state
  const [showSSHKeyManager, setShowSSHKeyManager] = useState(false);
  
  // LAN Share Modal state
  const [showLANShareModal, setShowLANShareModal] = useState(false);
  const [selectedServerIdsForShare, setSelectedServerIdsForShare] = useState<string[]>([]);
  const [lanShareMode, setLanShareMode] = useState<'send' | 'receive'>('send'); // send or receive mode
  const [lanDiscoveryEnabled, setLanDiscoveryEnabled] = useState(false); // LAN discovery toggle
  const [pendingIncomingShare, setPendingIncomingShare] = useState<any>(null); // Store incoming share for modal
  const [showServerSelectionModal, setShowServerSelectionModal] = useState(false); // Server selection before share
  const [showPairCodePopup, setShowPairCodePopup] = useState(false); // Inline popup for entering pair code
  const [lanPeers, setLanPeers] = useState<{id: string; name: string; address: string; port: number}[]>([]); // LAN discovered peers
  
  // Connecting state (for UI feedback)
  const [connectingServerId, setConnectingServerId] = useState<string | null>(null);
  
  // Tab drag state
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);
  
  // RDP connecting overlay state
  const [rdpConnecting, setRdpConnecting] = useState<{ server: Server; status: 'connecting' | 'error'; error?: string } | null>(null);
  
  // RDP dependency installer state (Linux only)
  const [showRDPDepsInstaller, setShowRDPDepsInstaller] = useState(false);
  const [pendingRDPServer, setPendingRDPServer] = useState<Server | null>(null);
  const [rdpInstallSessionId, setRdpInstallSessionId] = useState<string | null>(null);
  
  // Sticky Note state
  const [showNotePopup, setShowNotePopup] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const noteDebounceRef = React.useRef<NodeJS.Timeout | null>(null);
  
  // GitHub OAuth state
  const [githubUser, setGithubUser] = useState<{ login: string; avatar_url: string; name: string } | null>(null);
  const [githubRepoName, setGithubRepoName] = useState('');
  const [githubRepos, setGithubRepos] = useState<{ name: string; full_name: string; private: boolean }[]>([]);
  const [githubDeviceCode, setGithubDeviceCode] = useState<{ user_code: string; verification_uri: string; device_code: string; interval: number } | null>(null);
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubPolling, setGithubPolling] = useState(false);
  
  // Session Monitor state
  const [sessionMonitorEnabled, setSessionMonitorEnabled] = useState(true);
  
  // Command Recall state (default disabled - user enables in Settings)
  const [commandRecallEnabled, setCommandRecallEnabled] = useState(false);
  
  // Terminal Font state
  const [terminalFont, setTerminalFont] = useState('JetBrains Mono');
  
  // App Lock state
  const [appLockEnabled, setAppLockEnabled] = useState(false);
  const [appLockMethod, setAppLockMethod] = useState<'blur' | 'pin' | 'password'>('blur');
  const [appLockTimeout, setAppLockTimeout] = useState(5);
  const [appLockHasCredential, setAppLockHasCredential] = useState(false);
  const [isAppLocked, setIsAppLocked] = useState(false);
  const [showSetCredentialModal, setShowSetCredentialModal] = useState(false);
  const [pendingLockMethod, setPendingLockMethod] = useState<'pin' | 'password' | null>(null);
  const lastActivityRef = useRef(Date.now());
  const lockCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Available terminal fonts (monospace, Unicode support)
  const TERMINAL_FONTS = [
    { name: 'JetBrains Mono', value: 'JetBrains Mono' },
    { name: 'Fira Code', value: 'Fira Code' },
    { name: 'Cascadia Code', value: 'Cascadia Code' },
    { name: 'Source Code Pro', value: 'Source Code Pro' },
    { name: 'Ubuntu Mono', value: 'Ubuntu Mono' },
    { name: 'Roboto Mono', value: 'Roboto Mono' },
    { name: 'Inconsolata', value: 'Inconsolata' },
    { name: 'IBM Plex Mono', value: 'IBM Plex Mono' },
    { name: 'Hack', value: 'Hack' },
    { name: 'Anonymous Pro', value: 'Anonymous Pro' },
    { name: 'Consolas', value: 'Consolas' },
    { name: 'Monaco', value: 'Monaco' },
    { name: 'Menlo', value: 'Menlo' },
    { name: 'DejaVu Sans Mono', value: 'DejaVu Sans Mono' },
  ];
  
  const { destroyTerminal, applyThemeToAll, applyFontToAll } = useTerminalContext();
  const { t } = useLanguage();

  // Available lock timeout options (minutes) - must be after t() is available
  const LOCK_TIMEOUT_OPTIONS = [
    { label: '1 ' + (t('minute') || 'min'), value: 1 },
    { label: '2 ' + (t('minutes') || 'min'), value: 2 },
    { label: '5 ' + (t('minutes') || 'min'), value: 5 },
    { label: '10 ' + (t('minutes') || 'min'), value: 10 },
    { label: '15 ' + (t('minutes') || 'min'), value: 15 },
    { label: '30 ' + (t('minutes') || 'min'), value: 30 },
    { label: '60 ' + (t('minutes') || 'min'), value: 60 },
  ];

  // Available tag colors (preset + custom)
  const TAG_COLORS = [
    { name: 'Purple', value: 'purple', hex: '#9333ea' },
    { name: 'Blue', value: 'blue', hex: '#2563eb' },
    { name: 'Green', value: 'green', hex: '#16a34a' },
    { name: 'Yellow', value: 'yellow', hex: '#ca8a04' },
    { name: 'Orange', value: 'orange', hex: '#ea580c' },
    { name: 'Red', value: 'red', hex: '#dc2626' },
    { name: 'Pink', value: 'pink', hex: '#db2777' },
    { name: 'Cyan', value: 'cyan', hex: '#0891b2' },
    { name: 'Teal', value: 'teal', hex: '#0d9488' },
    { name: 'Indigo', value: 'indigo', hex: '#4f46e5' },
  ];

  // Get color for a tag (supports hex colors)
  const getTagColor = (tag: string): string => {
    const colorValue = tagColors[tag] || 'purple';
    // Check if it's a custom hex color
    if (colorValue.startsWith('#')) {
      return colorValue;
    }
    // Find preset color
    const preset = TAG_COLORS.find(c => c.value === colorValue);
    return preset?.hex || '#9333ea';
  };

  // Compute all unique tags from servers
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    servers.forEach(server => {
      server.tags?.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [servers]);

  // Filter servers by active tag and search query
  const filteredServers = useMemo(() => {
    let result = servers;
    
    // Filter by tag
    if (activeTag) {
      result = result.filter(server => server.tags?.includes(activeTag));
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(server => {
        // Search in name
        if (server.name?.toLowerCase().includes(query)) return true;
        // Search in host/IP
        if (server.host?.toLowerCase().includes(query)) return true;
        // Search in username
        if (server.username?.toLowerCase().includes(query)) return true;
        // Search in tags
        if (server.tags?.some(tag => tag.toLowerCase().includes(query))) return true;
        // Search in protocol
        if (server.protocol?.toLowerCase().includes(query)) return true;
        // Search in WSS URL
        if (server.wssUrl?.toLowerCase().includes(query)) return true;
        return false;
      });
    }
    
    return result;
  }, [servers, activeTag, searchQuery]);

  const activeSession = sessions.find(s => s.id === activeSessionId);

  // Apply app theme to body
  useEffect(() => {
    if (appTheme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [appTheme]);

  // Window close confirmation when there are active sessions
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Only show warning if there are active sessions
      if (sessions.length > 0) {
        // Standard way to show confirmation dialog
        e.preventDefault();
        // Chrome requires returnValue to be set
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [sessions.length]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K for Quick Connect
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setQuickConnectOpen(true);
      }
      // Ctrl/Cmd + Shift + L for LAN Discovery toggle
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        setLanDiscoveryEnabled(prev => !prev);
      }
      // Ctrl/Cmd + Shift + O for Terminal/SFTP switch
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'O') {
        e.preventDefault();
        if (activeSession && activeSession.server.id !== 'local' && (activeSession.server.protocol === 'ssh' || !activeSession.server.protocol)) {
          toggleSessionType();
        }
      }
      // Ctrl/Cmd + Shift + A for Add New Host
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        setEditingServer(null);
        setShowModal(true);
      }
      // Ctrl/Cmd + Shift + T for Local Terminal
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        openLocalTerminal();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSession]);

  // Listen for navigateToSnippets event from Command Recall
  useEffect(() => {
    const handleNavigateToSnippets = () => {
      setActiveMenu('snippets');
      setActiveSessionId(null);
    };

    window.addEventListener('navigateToSnippets', handleNavigateToSnippets);
    return () => window.removeEventListener('navigateToSnippets', handleNavigateToSnippets);
  }, []);

  // Fix keyboard stuck issue - reset keyboard state when window regains focus
  // This prevents modifier keys from being "stuck" after extended use
  useEffect(() => {
    const resetKeyboardState = () => {
      // Dispatch key up events for all modifier keys to reset their state
      const modifierKeys = ['Control', 'Shift', 'Alt', 'Meta'];
      modifierKeys.forEach(key => {
        window.dispatchEvent(new KeyboardEvent('keyup', { 
          key, 
          code: key === 'Control' ? 'ControlLeft' : key === 'Shift' ? 'ShiftLeft' : key === 'Alt' ? 'AltLeft' : 'MetaLeft',
          bubbles: true 
        }));
      });
      console.log('[App] Keyboard state reset on focus');
    };

    // Reset when window gains focus (user returns to app)
    window.addEventListener('focus', resetKeyboardState);
    
    // Also reset when visibility changes (tab becomes visible again)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        resetKeyboardState();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', resetKeyboardState);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Start/stop LAN discovery service based on toggle
  useEffect(() => {
    if (lanDiscoveryEnabled) {
      console.log('[App] Starting LAN discovery service...');
      ipcRenderer.invoke('lan-share:start').then(result => {
        if (result.success) {
          console.log('[App] LAN discovery service started');
        } else {
          console.error('[App] Failed to start LAN discovery:', result.error);
        }
      });
    } else {
      console.log('[App] Stopping LAN discovery service...');
      ipcRenderer.invoke('lan-share:stop');
    }
  }, [lanDiscoveryEnabled]);

  // Global LAN Share listener - show pair code popup when receiving share
  useEffect(() => {
    const handleIncomingShare = (_: any, data: any) => {
      console.log('[App] Incoming share detected:', data);
      
      // Only process if LAN discovery is enabled
      if (!lanDiscoveryEnabled) {
        console.log('[App] LAN discovery disabled, ignoring incoming share');
        return;
      }
      
      // Store the incoming share data and show pair code popup
      setPendingIncomingShare(data);
      setShowPairCodePopup(true);
      
      // Show system notification
      new Notification('Marix - Incoming Share', {
        body: `${data.from} wants to share servers with you. Enter pairing code to import.`,
        icon: 'icon/icon.png'
      });
    };

    ipcRenderer.on('lan-share:share-received', handleIncomingShare);

    return () => {
      ipcRenderer.removeListener('lan-share:share-received', handleIncomingShare);
    };
  }, [lanDiscoveryEnabled]); // Re-register when toggle changes

  // Listen for LAN peer discovery
  useEffect(() => {
    const handlePeerFound = (_: any, peer: any) => {
      console.log('[App] Peer found:', peer);
      setLanPeers(prev => {
        const exists = prev.find(p => p.id === peer.id);
        if (exists) return prev;
        return [...prev, peer];
      });
    };

    const handlePeerLost = (_: any, peerId: string) => {
      console.log('[App] Peer lost:', peerId);
      setLanPeers(prev => prev.filter(p => p.id !== peerId));
    };

    ipcRenderer.on('lan-share:peer-found', handlePeerFound);
    ipcRenderer.on('lan-share:peer-lost', handlePeerLost);

    // Get initial peers
    if (lanDiscoveryEnabled) {
      ipcRenderer.invoke('lan-share:getPeers').then(peers => {
        setLanPeers(peers);
      });
    }

    return () => {
      ipcRenderer.removeListener('lan-share:peer-found', handlePeerFound);
      ipcRenderer.removeListener('lan-share:peer-lost', handlePeerLost);
    };
  }, [lanDiscoveryEnabled]);

  // Listen for main menu commands
  useEffect(() => {
    const handleSendFiles = () => {
      setActiveSessionId(null);
      setActiveMenu('sendfiles');
    };
    ipcRenderer.on('menu:send-files', handleSendFiles);
    return () => {
      ipcRenderer.removeListener('menu:send-files', handleSendFiles);
    };
  }, []);

  // Send close dialog translations to main process when language changes
  useEffect(() => {
    (window as any).electron.ipcRenderer.send('app:setCloseDialogTranslations', {
      title: t('activeConnections'),
      message: t('youHaveActiveConnections'),
      detail: t('closeConnectionsConfirm'),
      closeButton: t('closeAllAndExit'),
      cancelButton: t('cancel')
    });
  }, [t]);

  // Check GitLab/Box/Google Drive connection when backup modal opens
  useEffect(() => {
    if (backupModalOpen && backupMethod === 'gitlab') {
      checkGitLabConnection();
    } else if (backupModalOpen && backupMethod === 'box') {
      checkBoxConnection();
    } else if (backupModalOpen && backupMethod === 'gdrive') {
      checkGoogleDriveConnection();
    }
  }, [backupModalOpen, backupMethod]);

  const checkGitLabConnection = async () => {
    try {
      const result = await ipcRenderer.invoke('gitlab:hasToken');
      setGitlabConnected(result.hasToken);
      
      if (result.hasToken) {
        // Check if backup exists
        const backupCheck = await ipcRenderer.invoke('gitlab:checkBackup');
        setGitlabBackupInfo(backupCheck);
      }
    } catch (err) {
      console.error('Failed to check GitLab connection:', err);
      setGitlabConnected(false);
    }
  };

  const checkBoxConnection = async () => {
    try {
      const result = await ipcRenderer.invoke('box:hasToken');
      setBoxConnected(result.hasToken);
      
      if (result.hasToken) {
        // Check if backup exists
        const backupCheck = await ipcRenderer.invoke('box:checkBackup');
        setBoxBackupInfo(backupCheck);
      }
    } catch (err) {
      console.error('Failed to check Box connection:', err);
      setBoxConnected(false);
    }
  };

  // Load servers from storage
  const loadServers = async () => {
    try {
      const result = await ipcRenderer.invoke('servers:getAll');
      if (result.success && result.servers) {
        setServers(result.servers);
        console.log('[App] Loaded', result.servers.length, 'servers from storage');
      }
    } catch (err) {
      console.error('[App] Failed to load servers:', err);
    }
  };

  // Toggle app theme
  const toggleAppTheme = () => {
    setAppTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Handle theme change - apply to all terminals
  const handleThemeChange = (themeName: string) => {
    setCurrentTheme(themeName);
    applyThemeToAll(themeName);
  };

  // Backup functions
  const handleCreateBackup = async () => {
    if (!backupPassword) {
      setBackupError('Please enter a password');
      return;
    }
    
    // Validate password strength
    const validation = await ipcRenderer.invoke('backup:validatePassword', backupPassword);
    if (!validation.valid) {
      setBackupError(validation.errors.join('\n'));
      return;
    }
    
    if (backupPassword !== backupConfirmPassword) {
      setBackupError('Passwords do not match');
      return;
    }

    setBackupLoading(true);
    setBackupError(null);

    try {
      // Ask for save location
      const locationResult = await ipcRenderer.invoke('backup:selectSaveLocation');
      if (!locationResult.success) {
        if (!locationResult.canceled) {
          setBackupError(locationResult.error || 'Failed to select location');
        }
        setBackupLoading(false);
        return;
      }

      // Prepare backup data
      const cloudflareToken = await ipcRenderer.invoke('cloudflare:getToken');
      const sshKeys = await ipcRenderer.invoke('sshkey:exportAll');
      
      // Get 2FA, Port Forward and Snippets data from localStorage
      const totpEntriesStr = localStorage.getItem('totp_entries');
      const portForwardsStr = localStorage.getItem('port_forwards');
      const snippetsStr = localStorage.getItem('command_snippets');
      const totpEntries = totpEntriesStr ? JSON.parse(totpEntriesStr) : undefined;
      const portForwards = portForwardsStr ? JSON.parse(portForwardsStr) : undefined;
      const snippets = snippetsStr ? JSON.parse(snippetsStr) : undefined;
      
      const backupData = {
        version: '2.2',
        timestamp: Date.now(),
        servers: servers,
        tagColors: tagColors,
        settings: {
          currentTheme,
          appTheme,
        },
        cloudflareToken: cloudflareToken || undefined,
        sshKeys: sshKeys || undefined,
        totpEntries: totpEntries || undefined,
        portForwards: portForwards || undefined,
        snippets: snippets || undefined,
      };

      const result = await ipcRenderer.invoke('backup:create', backupData, backupPassword, locationResult.filePath);
      
      if (result.success) {
        setBackupSuccess(`Backup created successfully!\n${result.path}`);
        setBackupPassword('');
        setBackupConfirmPassword('');
        setTimeout(() => {
          setBackupModalOpen(null);
          setBackupSuccess(null);
        }, 2000);
      } else {
        setBackupError(result.error || 'Failed to create backup');
      }
    } catch (err: any) {
      setBackupError(err.message);
    }
    setBackupLoading(false);
  };

  const handleRestoreBackup = async () => {
    if (!backupPassword) {
      setBackupError('Please enter the backup password');
      return;
    }

    setBackupLoading(true);
    setBackupError(null);

    try {
      // Use the already selected file from BackupModal
      const selectedFile = (window as any).selectedBackupFile;
      if (!selectedFile) {
        setBackupError('Please select a backup file first');
        setBackupLoading(false);
        return;
      }

      const result = await ipcRenderer.invoke('backup:restore', selectedFile, backupPassword);
      
      if (result.success && result.data) {
        // Restore servers
        if (result.data.servers && Array.isArray(result.data.servers)) {
          // Replace all servers
          setServers(result.data.servers);
          // Save to storage using importAll
          await ipcRenderer.invoke('servers:importAll', result.data.servers);
        }
        
        // Restore tag colors
        if (result.data.tagColors) {
          setTagColors(result.data.tagColors);
          await ipcRenderer.invoke('tags:saveColors', result.data.tagColors);
        }
        
        // Restore settings
        if (result.data.settings) {
          if (result.data.settings.currentTheme) {
            setCurrentTheme(result.data.settings.currentTheme);
          }
          if (result.data.settings.appTheme) {
            setAppTheme(result.data.settings.appTheme);
          }
        }
        
        // Restore Cloudflare token if present
        if (result.data.cloudflareToken) {
          await ipcRenderer.invoke('cloudflare:setToken', result.data.cloudflareToken);
          setCfHasToken(true);
        }
        
        // Restore SSH keys if present
        let sshKeyCount = 0;
        if (result.data.sshKeys && result.data.sshKeys.length > 0) {
          const importResult = await ipcRenderer.invoke('sshkey:importFromBackup', result.data.sshKeys);
          sshKeyCount = importResult?.imported || 0;
        }
        
        // Restore 2FA TOTP entries if present
        let totpCount = 0;
        if (result.data.totpEntries && result.data.totpEntries.length > 0) {
          localStorage.setItem('totp_entries', JSON.stringify(result.data.totpEntries));
          totpCount = result.data.totpEntries.length;
        }
        
        // Restore Port Forwards if present
        let portForwardCount = 0;
        if (result.data.portForwards && result.data.portForwards.length > 0) {
          localStorage.setItem('port_forwards', JSON.stringify(result.data.portForwards));
          portForwardCount = result.data.portForwards.length;
        }
        
        // Restore Snippets if present
        let snippetCount = 0;
        if (result.data.snippets && result.data.snippets.length > 0) {
          localStorage.setItem('command_snippets', JSON.stringify(result.data.snippets));
          snippetCount = result.data.snippets.length;
        }
        
        const serverCount = result.data.servers?.length || 0;
        let successMessage = `Backup restored successfully!\n${serverCount} servers`;
        if (sshKeyCount > 0) successMessage += `, ${sshKeyCount} SSH keys`;
        if (totpCount > 0) successMessage += `, ${totpCount} 2FA entries`;
        if (portForwardCount > 0) successMessage += `, ${portForwardCount} port forwards`;
        if (snippetCount > 0) successMessage += `, ${snippetCount} snippets`;
        successMessage += ' imported.';
        
        setBackupSuccess(successMessage);
        setBackupPassword('');
        setTimeout(() => {
          setBackupModalOpen(null);
          setBackupSuccess(null);
        }, 2000);
      } else {
        setBackupError(result.error || 'Failed to restore backup');
      }
    } catch (err: any) {
      setBackupError(err.message);
    }
    setBackupLoading(false);
  };

  const closeBackupModal = () => {
    setBackupModalOpen(null);
    setBackupPassword('');
    setBackupConfirmPassword('');
    setBackupError(null);
    setBackupSuccess(null);
    setBackupMethod('local');
  };

  // GitLab backup functions
  const handleGitLabConnect = async () => {
    setGitlabConnecting(true);
    setBackupError(null);
    try {
      const result = await ipcRenderer.invoke('gitlab:startOAuth');
      if (result.success) {
        setGitlabConnected(true);
        await checkGitLabConnection();
      } else {
        // If OAuth flow fails or times out, prompt for manual code
        if (result.error?.includes('timed out')) {
          const url = prompt(
            'GitLab OAuth\n\n' +
            'If the browser redirected to a URL starting with "marix://oauth/gitlab?code=...",\n' +
            'please paste the FULL URL here:\n\n' +
            '(Or just paste the code if you can extract it)'
          );
          
          if (url) {
            // Try to extract code from URL or use as-is
            let code = url;
            if (url.includes('marix://oauth/gitlab?code=')) {
              const match = url.match(/code=([^&]+)/);
              if (match) code = match[1];
            }
            
            // Submit the code
            const codeResult = await ipcRenderer.invoke('gitlab:submitCode', code);
            if (codeResult.success) {
              setGitlabConnected(true);
              await checkGitLabConnection();
            } else {
              setBackupError('Invalid code or code submission failed');
            }
          }
        } else {
          setBackupError(result.error || 'Failed to connect to GitLab');
        }
      }
    } catch (err: any) {
      setBackupError(err.message || 'Failed to connect to GitLab');
    }
    setGitlabConnecting(false);
  };

  const handleGitLabDisconnect = async () => {
    try {
      await ipcRenderer.invoke('gitlab:logout');
      setGitlabConnected(false);
      setGitlabBackupInfo(null);
    } catch (err: any) {
      setBackupError(err.message);
    }
  };

  const handleGitLabBackup = async () => {
    if (!backupPassword) {
      setBackupError('Please enter a password');
      return;
    }
    
    // Validate password strength
    const validation = await ipcRenderer.invoke('backup:validatePassword', backupPassword);
    if (!validation.valid) {
      setBackupError(validation.errors.join('\n'));
      return;
    }
    
    if (backupPassword !== backupConfirmPassword) {
      setBackupError('Passwords do not match');
      return;
    }

    setBackupLoading(true);
    setBackupError(null);

    try {
      // Get TOTP entries, port forwards and snippets to include in backup
      const totpEntriesStr = localStorage.getItem('totp_entries');
      const totpEntries = totpEntriesStr ? JSON.parse(totpEntriesStr) : [];
      
      const portForwardsStr = localStorage.getItem('port_forwards');
      const portForwards = portForwardsStr ? JSON.parse(portForwardsStr) : [];

      const snippetsStr = localStorage.getItem('command_snippets');
      const snippets = snippetsStr ? JSON.parse(snippetsStr) : [];

      const result = await ipcRenderer.invoke('gitlab:uploadBackup', backupPassword, totpEntries, portForwards, snippets);
      
      if (result.success) {
        setBackupSuccess('Backup uploaded to GitLab successfully!');
        setBackupPassword('');
        setBackupConfirmPassword('');
        await checkGitLabConnection(); // Refresh backup info
        setTimeout(() => {
          setBackupModalOpen(null);
          setBackupSuccess(null);
        }, 2000);
      } else {
        setBackupError(result.error || 'Failed to upload backup');
      }
    } catch (err: any) {
      setBackupError(err.message);
    }
    setBackupLoading(false);
  };

  const handleGitLabRestore = async () => {
    if (!backupPassword) {
      setBackupError('Please enter a password');
      return;
    }

    setBackupLoading(true);
    setBackupError(null);

    try {
      const result = await ipcRenderer.invoke('gitlab:downloadBackup', backupPassword);
      
      if (result.success) {
        // Reload servers and tags
        await loadServers();
        
        // Restore 2FA TOTP entries if present
        let totpCount = 0;
        if (result.totpEntries && result.totpEntries.length > 0) {
          localStorage.setItem('totp_entries', JSON.stringify(result.totpEntries));
          totpCount = result.totpEntries.length;
        }
        
        // Restore Port Forwards if present
        let portForwardCount = 0;
        if (result.portForwards && result.portForwards.length > 0) {
          localStorage.setItem('port_forwards', JSON.stringify(result.portForwards));
          portForwardCount = result.portForwards.length;
        }
        
        // Restore Snippets if present
        let snippetCount = 0;
        if (result.snippets && result.snippets.length > 0) {
          localStorage.setItem('command_snippets', JSON.stringify(result.snippets));
          snippetCount = result.snippets.length;
        }
        
        const serverCount = result.serverCount || 0;
        const sshKeyCount = result.sshKeyCount || 0;
        
        let successMessage = `Backup restored from GitLab!\n${serverCount} servers`;
        if (sshKeyCount > 0) successMessage += `, ${sshKeyCount} SSH keys`;
        if (totpCount > 0) successMessage += `, ${totpCount} 2FA entries`;
        if (portForwardCount > 0) successMessage += `, ${portForwardCount} port forwards`;
        if (snippetCount > 0) successMessage += `, ${snippetCount} snippets`;
        successMessage += ' imported.';
        
        setBackupSuccess(successMessage);
        setBackupPassword('');
        setTimeout(() => {
          setBackupModalOpen(null);
          setBackupSuccess(null);
        }, 2000);
      } else {
        setBackupError(result.error || 'Failed to restore backup from GitLab');
      }
    } catch (err: any) {
      setBackupError(err.message);
    }
    setBackupLoading(false);
  };

  // Box OAuth functions
  const handleBoxConnect = async () => {
    setBoxConnecting(true);
    setBackupError(null);
    try {
      const result = await ipcRenderer.invoke('box:startOAuth');
      if (result.success) {
        setBoxConnected(true);
        await checkBoxConnection();
      } else {
        // If OAuth flow fails or times out, prompt for manual code
        if (result.error?.includes('timed out')) {
          const url = prompt(
            'Box OAuth\n\n' +
            'If the browser redirected to a URL starting with "marix://oauth/box?code=...",\n' +
            'please paste the FULL URL here:\n\n' +
            '(Or just paste the code if you can extract it)'
          );
          
          if (url) {
            // Try to extract code from URL or use as-is
            let code = url;
            if (url.includes('marix://oauth/box?code=') || url.includes('code=')) {
              const match = url.match(/code=([^&]+)/);
              if (match) code = match[1];
            }
            
            // Submit the code
            const codeResult = await ipcRenderer.invoke('box:submitCode', code);
            if (codeResult.success) {
              setBoxConnected(true);
              await checkBoxConnection();
            } else {
              setBackupError('Invalid code or code submission failed');
            }
          }
        } else {
          setBackupError(result.error || 'Failed to connect to Box');
        }
      }
    } catch (err: any) {
      setBackupError(err.message || 'Failed to connect to Box');
    }
    setBoxConnecting(false);
  };

  const handleBoxDisconnect = async () => {
    try {
      await ipcRenderer.invoke('box:logout');
      setBoxConnected(false);
      setBoxBackupInfo(null);
    } catch (err: any) {
      setBackupError(err.message);
    }
  };

  const handleBoxBackup = async () => {
    if (!backupPassword) {
      setBackupError('Please enter a password');
      return;
    }
    
    // Validate password strength
    const validation = await ipcRenderer.invoke('backup:validatePassword', backupPassword);
    if (!validation.valid) {
      setBackupError(validation.errors.join('\n'));
      return;
    }
    
    if (backupPassword !== backupConfirmPassword) {
      setBackupError('Passwords do not match');
      return;
    }

    setBackupLoading(true);
    setBackupError(null);

    try {
      // Get TOTP entries, port forwards and snippets to include in backup
      const totpEntriesStr = localStorage.getItem('totp_entries');
      const totpEntries = totpEntriesStr ? JSON.parse(totpEntriesStr) : [];
      
      const portForwardsStr = localStorage.getItem('port_forwards');
      const portForwards = portForwardsStr ? JSON.parse(portForwardsStr) : [];

      const snippetsStr = localStorage.getItem('command_snippets');
      const snippets = snippetsStr ? JSON.parse(snippetsStr) : [];

      const result = await ipcRenderer.invoke('box:uploadBackup', backupPassword, totpEntries, portForwards, snippets);
      
      if (result.success) {
        setBackupSuccess('Backup uploaded to Box successfully!');
        setBackupPassword('');
        setBackupConfirmPassword('');
        await checkBoxConnection(); // Refresh backup info
        setTimeout(() => {
          setBackupModalOpen(null);
          setBackupSuccess(null);
        }, 2000);
      } else {
        setBackupError(result.error || 'Failed to upload backup');
      }
    } catch (err: any) {
      setBackupError(err.message);
    }
    setBackupLoading(false);
  };

  const handleBoxRestore = async () => {
    if (!backupPassword) {
      setBackupError('Please enter a password');
      return;
    }

    setBackupLoading(true);
    setBackupError(null);

    try {
      const result = await ipcRenderer.invoke('box:downloadBackup', backupPassword);
      
      if (result.success) {
        // Reload servers and tags
        await loadServers();
        
        // Restore 2FA TOTP entries if present
        let totpCount = 0;
        if (result.totpEntries && result.totpEntries.length > 0) {
          localStorage.setItem('totp_entries', JSON.stringify(result.totpEntries));
          totpCount = result.totpEntries.length;
        }
        
        // Restore Port Forwards if present
        let portForwardCount = 0;
        if (result.portForwards && result.portForwards.length > 0) {
          localStorage.setItem('port_forwards', JSON.stringify(result.portForwards));
          portForwardCount = result.portForwards.length;
        }
        
        // Restore Snippets if present
        let snippetCount = 0;
        if (result.snippets && result.snippets.length > 0) {
          localStorage.setItem('command_snippets', JSON.stringify(result.snippets));
          snippetCount = result.snippets.length;
        }
        
        const serverCount = result.serverCount || 0;
        const sshKeyCount = result.sshKeyCount || 0;
        
        let successMessage = `Backup restored from Box!\n${serverCount} servers`;
        if (sshKeyCount > 0) successMessage += `, ${sshKeyCount} SSH keys`;
        if (totpCount > 0) successMessage += `, ${totpCount} 2FA entries`;
        if (portForwardCount > 0) successMessage += `, ${portForwardCount} port forwards`;
        if (snippetCount > 0) successMessage += `, ${snippetCount} snippets`;
        successMessage += ' imported.';
        
        setBackupSuccess(successMessage);
        setBackupPassword('');
        setTimeout(() => {
          setBackupModalOpen(null);
          setBackupSuccess(null);
        }, 2000);
      } else {
        setBackupError(result.error || 'Failed to restore backup from Box');
      }
    } catch (err: any) {
      setBackupError(err.message);
    }
    setBackupLoading(false);
  };

  // ==================== Google Drive Backup Handlers ====================
  
  const checkGoogleDriveConnection = async () => {
    try {
      const authResult = await ipcRenderer.invoke('gdrive:isAuthenticated');
      if (authResult.success && authResult.authenticated) {
        setGdriveConnected(true);
        
        // Get user info
        const userResult = await ipcRenderer.invoke('gdrive:getUserInfo');
        if (userResult.success && userResult.data) {
          setGdriveUser({
            displayName: userResult.data.displayName,
            emailAddress: userResult.data.emailAddress,
            photoLink: userResult.data.photoLink
          });
        }
        
        // Check if backup exists
        const backupCheck = await ipcRenderer.invoke('gdrive:checkBackup');
        setGdriveBackupInfo(backupCheck);
      } else {
        setGdriveConnected(false);
        setGdriveUser(null);
        setGdriveBackupInfo(null);
      }
    } catch (error) {
      console.error('[App] Error checking Google Drive connection:', error);
      setGdriveConnected(false);
    }
  };

  const handleGoogleDriveConnect = async () => {
    setGdriveConnecting(true);
    setBackupError(null);
    
    try {
      const result = await ipcRenderer.invoke('gdrive:startAuth');
      
      if (result.success) {
        setGdriveConnected(true);
        await checkGoogleDriveConnection();
        setBackupSuccess('Successfully connected to Google Drive!');
      } else {
        setBackupError(result.error || 'Failed to connect to Google Drive');
      }
    } catch (error: any) {
      setBackupError(error.message || 'Error connecting to Google Drive');
    } finally {
      setGdriveConnecting(false);
    }
  };

  const handleGoogleDriveDisconnect = async () => {
    try {
      await ipcRenderer.invoke('gdrive:disconnect');
      setGdriveConnected(false);
      setGdriveUser(null);
      setGdriveBackupInfo(null);
      setBackupSuccess('Disconnected from Google Drive');
    } catch (error: any) {
      setBackupError(error.message);
    }
  };

  const handleGoogleDriveBackup = async () => {
    if (!backupPassword) {
      setBackupError('Please enter a backup password');
      return;
    }

    if (backupPassword !== backupConfirmPassword) {
      setBackupError('Passwords do not match');
      return;
    }

    setBackupLoading(true);
    setBackupError(null);
    setBackupSuccess(null);

    try {
      const result = await ipcRenderer.invoke('gdrive:createBackup', backupPassword);
      
      if (result.success) {
        setBackupSuccess(`Backup uploaded to Google Drive successfully! (${result.serverCount} servers)`);
        setBackupPassword('');
        setBackupConfirmPassword('');
        
        // Refresh backup info
        await checkGoogleDriveConnection();
      } else {
        setBackupError(result.error || 'Failed to upload backup to Google Drive');
      }
    } catch (error: any) {
      setBackupError(error.message);
    } finally {
      setBackupLoading(false);
    }
  };

  const handleGoogleDriveRestore = async () => {
    if (!backupPassword) {
      setBackupError('Please enter the backup password');
      return;
    }

    setBackupLoading(true);
    setBackupError(null);

    try {
      const result = await ipcRenderer.invoke('gdrive:restoreBackup', backupPassword);
      
      if (result.success && result.data) {
        // Restore servers
        if (result.data.servers && Array.isArray(result.data.servers)) {
          setServers(result.data.servers);
          await ipcRenderer.invoke('servers:importAll', result.data.servers);
        }
        
        // Restore tag colors
        if (result.data.tagColors) {
          setTagColors(result.data.tagColors);
          await ipcRenderer.invoke('tags:saveColors', result.data.tagColors);
        }
        
        // Restore settings
        if (result.data.settings) {
          if (result.data.settings.currentTheme) {
            setCurrentTheme(result.data.settings.currentTheme);
          }
          if (result.data.settings.appTheme) {
            setAppTheme(result.data.settings.appTheme);
          }
        }
        
        // Restore Cloudflare token
        if (result.data.cloudflareToken) {
          await ipcRenderer.invoke('cloudflare:setToken', result.data.cloudflareToken);
          setCfHasToken(true);
        }
        
        // Restore SSH keys
        let sshKeyCount = 0;
        if (result.data.sshKeys && result.data.sshKeys.length > 0) {
          const importResult = await ipcRenderer.invoke('sshkey:importFromBackup', result.data.sshKeys);
          sshKeyCount = importResult?.imported || 0;
        }
        
        // Restore 2FA TOTP
        let totpCount = 0;
        if (result.data.totpEntries && result.data.totpEntries.length > 0) {
          localStorage.setItem('totp_entries', JSON.stringify(result.data.totpEntries));
          totpCount = result.data.totpEntries.length;
        }
        
        // Restore Port Forwards
        let portForwardCount = 0;
        if (result.data.portForwards && result.data.portForwards.length > 0) {
          localStorage.setItem('port_forwards', JSON.stringify(result.data.portForwards));
          portForwardCount = result.data.portForwards.length;
        }
        
        // Restore Snippets
        let snippetCount = 0;
        if (result.data.snippets && result.data.snippets.length > 0) {
          localStorage.setItem('command_snippets', JSON.stringify(result.data.snippets));
          snippetCount = result.data.snippets.length;
        }
        
        const serverCount = result.data.servers?.length || 0;
        let successMessage = `Backup restored from Google Drive successfully!\n${serverCount} servers`;
        if (sshKeyCount > 0) successMessage += `, ${sshKeyCount} SSH keys`;
        if (totpCount > 0) successMessage += `, ${totpCount} 2FA entries`;
        if (portForwardCount > 0) successMessage += `, ${portForwardCount} port forwards`;
        if (snippetCount > 0) successMessage += `, ${snippetCount} snippets`;
        
        setBackupSuccess(successMessage);
        setBackupPassword('');
        
        // Reload servers
        await loadServers();
        
        setTimeout(() => {
          setBackupModalOpen(null);
        }, 2000);
      } else {
        setBackupError(result.error || 'Failed to restore backup from Google Drive');
      }
    } catch (error: any) {
      setBackupError(error.message);
    } finally {
      setBackupLoading(false);
    }
  };

  // GitHub OAuth functions
  const handleGitHubLogin = async () => {
    setGithubLoading(true);
    try {
      const result = await ipcRenderer.invoke('github:requestDeviceCode');
      if (result.success && result.data) {
        setGithubDeviceCode({
          user_code: result.data.user_code,
          verification_uri: result.data.verification_uri,
          device_code: result.data.device_code,
          interval: result.data.interval
        });
        // Open GitHub authorization page
        await ipcRenderer.invoke('github:openAuthUrl', result.data.verification_uri);
        // Start polling
        setGithubPolling(true);
        const tokenResult = await ipcRenderer.invoke('github:pollForToken', result.data.device_code, result.data.interval);
        setGithubPolling(false);
        setGithubDeviceCode(null);
        
        if (tokenResult.success) {
          // Verify and get user info
          const verifyResult = await ipcRenderer.invoke('github:verifyToken');
          if (verifyResult.valid && verifyResult.user) {
            setGithubUser(verifyResult.user);
            // Create backup repo
            const repoResult = await ipcRenderer.invoke('github:createBackupRepo', 'marix-backup');
            if (repoResult.success && repoResult.fullName) {
              setGithubRepoName(repoResult.fullName);
            }
          }
        } else {
          alert(tokenResult.error || 'Failed to authenticate');
        }
      } else {
        alert(result.error || 'Failed to get device code');
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
    setGithubLoading(false);
  };

  const handleGitHubLogout = async () => {
    await ipcRenderer.invoke('github:logout');
    setGithubUser(null);
    setGithubRepoName('');
    setGithubRepos([]);
  };

  const handleGitHubUpload = async () => {
    if (!backupPassword) {
      setBackupError(t('enterPasswordEncrypt'));
      return;
    }
    
    // Validate password strength
    const validation = await ipcRenderer.invoke('backup:validatePassword', backupPassword);
    if (!validation.valid) {
      setBackupError(validation.errors.join('\n'));
      return;
    }
    
    if (backupPassword !== backupConfirmPassword) {
      setBackupError(t('passwordMismatch'));
      return;
    }
    
    setGithubLoading(true);
    setBackupError(null);
    try {
      // Get 2FA, Port Forward and Snippets data from localStorage
      const totpEntriesStr = localStorage.getItem('totp_entries');
      const portForwardsStr = localStorage.getItem('port_forwards');
      const snippetsStr = localStorage.getItem('command_snippets');
      const totpEntries = totpEntriesStr ? JSON.parse(totpEntriesStr) : undefined;
      const portForwards = portForwardsStr ? JSON.parse(portForwardsStr) : undefined;
      const snippets = snippetsStr ? JSON.parse(snippetsStr) : undefined;
      
      const result = await ipcRenderer.invoke('github:uploadBackup', backupPassword, totpEntries, portForwards, snippets);
      if (result.success) {
        setBackupSuccess(t('backupUploadedSuccessfully'));
        setBackupPassword('');
        setBackupConfirmPassword('');
        setTimeout(() => {
          setBackupSuccess(null);
        }, 3000);
      } else {
        setBackupError(result.error || t('backupUploadFailed'));
      }
    } catch (err: any) {
      setBackupError(err.message);
    }
    setGithubLoading(false);
  };

  const handleGitHubDownload = async () => {
    if (!backupPassword) {
      setBackupError(t('enterPasswordEncrypt'));
      return;
    }
    setGithubLoading(true);
    setBackupError(null);
    try {
      const result = await ipcRenderer.invoke('github:downloadBackup', backupPassword);
      if (result.success) {
        // Reload servers
        const serversResult = await ipcRenderer.invoke('servers:getAll');
        if (serversResult.success && serversResult.servers) {
          setServers(serversResult.servers);
        }
        const tagColorsResult = await ipcRenderer.invoke('tags:getColors');
        if (tagColorsResult.success && tagColorsResult.tagColors) {
          setTagColors(tagColorsResult.tagColors);
        }
        
        // Restore 2FA entries if present
        if (result.totpEntries && result.totpEntries.length > 0) {
          localStorage.setItem('totp_entries', JSON.stringify(result.totpEntries));
        }
        
        // Restore Port Forwards if present
        if (result.portForwards && result.portForwards.length > 0) {
          localStorage.setItem('port_forwards', JSON.stringify(result.portForwards));
        }
        
        // Restore Snippets if present
        if (result.snippets && result.snippets.length > 0) {
          localStorage.setItem('command_snippets', JSON.stringify(result.snippets));
        }
        
        setBackupSuccess(t('restoreSuccessWithCount').replace('{count}', result.serverCount?.toString() || '0'));
        setBackupPassword('');
        setBackupConfirmPassword('');
        setTimeout(() => {
          setBackupSuccess(null);
        }, 3000);
      } else {
        setBackupError(result.error || t('backupDownloadFailed'));
      }
    } catch (err: any) {
      setBackupError(err.message);
    }
    setGithubLoading(false);
  };

  // Load servers from storage on startup
  useEffect(() => {
    const loadServers = async () => {
      try {
        const result = await ipcRenderer.invoke('servers:getAll');
        if (result.success && result.servers) {
          setServers(result.servers);
          console.log('[App] Loaded', result.servers.length, 'servers from storage');
        }
      } catch (err) {
        console.error('[App] Failed to load servers:', err);
      }
    };
    
    const loadTagColors = async () => {
      try {
        const result = await ipcRenderer.invoke('tags:getColors');
        if (result.success && result.tagColors) {
          setTagColors(result.tagColors);
        }
      } catch (err) {
        console.error('[App] Failed to load tag colors:', err);
      }
    };
    
    const loadGitHubAuth = async () => {
      try {
        const hasToken = await ipcRenderer.invoke('github:hasToken');
        if (hasToken) {
          const result = await ipcRenderer.invoke('github:verifyToken');
          if (result.valid && result.user) {
            setGithubUser(result.user);
            // Load saved repo name
            const repoName = await ipcRenderer.invoke('github:getRepoName');
            if (repoName) {
              setGithubRepoName(repoName);
            }
          }
        }
      } catch (err) {
        console.error('[App] Failed to check GitHub auth:', err);
      }
    };
    
    loadServers();
    loadTagColors();
    loadGitHubAuth();
    
    // Load session monitor setting
    const loadSessionMonitorSetting = async () => {
      try {
        const enabled = await ipcRenderer.invoke('session-monitor:isEnabled');
        setSessionMonitorEnabled(enabled);
      } catch (err) {
        console.error('[App] Failed to load session monitor setting:', err);
      }
    };
    loadSessionMonitorSetting();
    
    // Load command recall setting (from localStorage)
    const loadCommandRecallSetting = () => {
      try {
        const settings = localStorage.getItem('app_settings');
        if (settings) {
          const parsed = JSON.parse(settings);
          // Default to false - user must explicitly enable
          setCommandRecallEnabled(parsed.enableCommandRecall === true);
        } else {
          setCommandRecallEnabled(false); // Default disabled
        }
      } catch (err) {
        console.error('[App] Failed to load command recall setting:', err);
        setCommandRecallEnabled(false); // Default disabled on error
      }
    };
    loadCommandRecallSetting();
    
    // Load terminal font setting
    const loadTerminalFontSetting = async () => {
      try {
        const font = await ipcRenderer.invoke('settings:getTerminalFont');
        if (font) {
          setTerminalFont(font);
        }
      } catch (err) {
        console.error('[App] Failed to load terminal font setting:', err);
      }
    };
    loadTerminalFontSetting();
    
    // Load app lock settings
    const loadAppLockSettings = async () => {
      try {
        const settings = await ipcRenderer.invoke('settings:getAppLockSettings');
        if (settings) {
          setAppLockEnabled(settings.enabled);
          setAppLockMethod(settings.method || 'blur');
          setAppLockTimeout(settings.timeout || 5);
          setAppLockHasCredential(settings.hasCredential);
        }
      } catch (err) {
        console.error('[App] Failed to load app lock settings:', err);
      }
    };
    loadAppLockSettings();
    
    // Load build info
    const loadBuildInfo = async () => {
      try {
        const info = await ipcRenderer.invoke('app:getBuildInfo');
        setBuildInfo(info);
        console.log('[App] Build info loaded:', info.commitShort || 'dev');
      } catch (err) {
        console.error('[App] Failed to load build info:', err);
      }
    };
    loadBuildInfo();
    
    // Auto-check for updates on startup
    const checkForUpdatesAuto = async () => {
      try {
        console.log('[App] Auto-update check starting...');
        const result = await ipcRenderer.invoke('app:checkForUpdates');
        console.log('[App] Update check result:', result);
        
        if (result.success && result.latestVersion) {
          // Use semver comparison instead of string comparison
          const hasUpdate = isNewerVersion(result.latestVersion, APP_VERSION);
          
          console.log('[App] Version check:', result.latestVersion, 'vs', APP_VERSION, '-> hasUpdate:', hasUpdate);
          
          if (hasUpdate) {
            console.log('[App] New version available:', result.latestVersion);
            setUpdateInfo({
              checking: false,
              latestVersion: result.latestVersion,
              releaseUrl: result.releaseUrl,
              publishedAt: result.publishedAt,
              releaseNotes: result.releaseNotes,
              hasUpdate: true
            });
            setShowUpdateNotification(true);
          } else {
            console.log('[App] Already on latest version');
          }
        }
      } catch (err) {
        console.error('[App] Auto-update check failed:', err);
      }
    };
    
    // Check after a short delay to not block startup
    setTimeout(checkForUpdatesAuto, 3000);
  }, []);

  // Handle tag color change
  const handleTagColorChange = async (tagName: string, color: string) => {
    try {
      await ipcRenderer.invoke('tags:setColor', tagName, color);
      setTagColors(prev => ({ ...prev, [tagName]: color }));
      setTagMenuOpen(null);
    } catch (err) {
      console.error('[App] Failed to set tag color:', err);
    }
  };

  // Toggle session monitor
  const toggleSessionMonitor = async () => {
    try {
      const newValue = !sessionMonitorEnabled;
      await ipcRenderer.invoke('session-monitor:setEnabled', newValue);
      setSessionMonitorEnabled(newValue);
    } catch (err) {
      console.error('[App] Failed to toggle session monitor:', err);
    }
  };

  // Toggle command recall
  const toggleCommandRecall = () => {
    const newValue = !commandRecallEnabled;
    // Save to localStorage (commandRecallStore handles this)
    try {
      const settings = localStorage.getItem('app_settings');
      const parsed = settings ? JSON.parse(settings) : {};
      parsed.enableCommandRecall = newValue;
      localStorage.setItem('app_settings', JSON.stringify(parsed));
      setCommandRecallEnabled(newValue);
    } catch (err) {
      console.error('[App] Failed to toggle command recall:', err);
    }
  };

  // Change terminal font
  const handleTerminalFontChange = async (fontFamily: string) => {
    try {
      await ipcRenderer.invoke('settings:setTerminalFont', fontFamily);
      setTerminalFont(fontFamily);
      applyFontToAll(fontFamily);
    } catch (err) {
      console.error('[App] Failed to change terminal font:', err);
    }
  };

  // ==================== App Lock Functions ====================
  
  // Reset activity timer
  const resetActivityTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  // Activity tracking effect
  useEffect(() => {
    if (!appLockEnabled) {
      // Clear interval if lock is disabled
      if (lockCheckIntervalRef.current) {
        clearInterval(lockCheckIntervalRef.current);
        lockCheckIntervalRef.current = null;
      }
      return;
    }

    // Track user activity
    const handleActivity = () => {
      resetActivityTimer();
    };

    // Listen to various user activities
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('mousedown', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('scroll', handleActivity, true);
    window.addEventListener('touchstart', handleActivity);

    // Check for inactivity periodically
    lockCheckIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - lastActivityRef.current) / 1000 / 60; // minutes
      
      if (elapsed >= appLockTimeout && !isAppLocked) {
        setIsAppLocked(true);
      }
    }, 10000); // Check every 10 seconds

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('mousedown', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('scroll', handleActivity, true);
      window.removeEventListener('touchstart', handleActivity);
      
      if (lockCheckIntervalRef.current) {
        clearInterval(lockCheckIntervalRef.current);
      }
    };
  }, [appLockEnabled, appLockTimeout, isAppLocked, resetActivityTimer]);

  // Handle app lock toggle
  const handleAppLockToggle = async () => {
    const newEnabled = !appLockEnabled;
    try {
      await ipcRenderer.invoke('settings:setAppLockEnabled', newEnabled);
      setAppLockEnabled(newEnabled);
      if (!newEnabled) {
        setIsAppLocked(false);
      }
    } catch (err) {
      console.error('[App] Failed to toggle app lock:', err);
    }
  };

  // Handle lock method change
  const handleAppLockMethodChange = async (method: 'blur' | 'pin' | 'password') => {
    // If switching to pin or password, need to set credential first
    if ((method === 'pin' || method === 'password') && !appLockHasCredential) {
      setPendingLockMethod(method);
      setShowSetCredentialModal(true);
      return;
    }
    
    try {
      await ipcRenderer.invoke('settings:setAppLockMethod', method);
      setAppLockMethod(method);
    } catch (err) {
      console.error('[App] Failed to set lock method:', err);
    }
  };

  // Handle lock timeout change
  const handleAppLockTimeoutChange = async (timeout: number) => {
    try {
      await ipcRenderer.invoke('settings:setAppLockTimeout', timeout);
      setAppLockTimeout(timeout);
    } catch (err) {
      console.error('[App] Failed to set lock timeout:', err);
    }
  };

  // Handle unlock
  const handleUnlock = () => {
    setIsAppLocked(false);
    resetActivityTimer();
  };

  // Handle set credential
  const handleSetCredential = async (credential: string) => {
    try {
      await ipcRenderer.invoke('settings:setAppLockCredential', credential);
      setAppLockHasCredential(true);
      
      if (pendingLockMethod) {
        await ipcRenderer.invoke('settings:setAppLockMethod', pendingLockMethod);
        setAppLockMethod(pendingLockMethod);
        setPendingLockMethod(null);
      }
      
      setShowSetCredentialModal(false);
    } catch (err) {
      console.error('[App] Failed to set credential:', err);
    }
  };

  // Handle clear credential
  const handleClearCredential = async () => {
    try {
      await ipcRenderer.invoke('settings:clearAppLockCredential');
      setAppLockHasCredential(false);
      // Switch to blur method when credential is cleared
      await ipcRenderer.invoke('settings:setAppLockMethod', 'blur');
      setAppLockMethod('blur');
    } catch (err) {
      console.error('[App] Failed to clear credential:', err);
    }
  };

  // Handle tag delete
  const handleTagDelete = async (tagName: string) => {
    if (!confirm(`Delete tag "${tagName}"? This will remove it from all servers.`)) {
      return;
    }
    try {
      const result = await ipcRenderer.invoke('tags:delete', tagName);
      if (result.success && result.servers) {
        setServers(result.servers);
        // Also remove from local tagColors
        setTagColors(prev => {
          const newColors = { ...prev };
          delete newColors[tagName];
          return newColors;
        });
        // Clear active tag if deleted
        if (activeTag === tagName) {
          setActiveTag(null);
        }
      }
      setTagMenuOpen(null);
    } catch (err) {
      console.error('[App] Failed to delete tag:', err);
    }
  };

  // ==================== Cloudflare Functions ====================
  
  // Check if Cloudflare token exists
  const checkCloudflareToken = async () => {
    const hasToken = await ipcRenderer.invoke('cloudflare:hasToken');
    setCfHasToken(hasToken);
    return hasToken;
  };

  // Load Cloudflare zones
  const loadCloudflareZones = async () => {
    setCfLoading(true);
    setCfError(null);
    try {
      const result = await ipcRenderer.invoke('cloudflare:listZones');
      if (result.success) {
        setCfZones(result.zones || []);
        // Auto-select first zone if available
        if (result.zones?.length > 0 && !cfSelectedZone) {
          setCfSelectedZone(result.zones[0].id);
        }
      } else {
        setCfError(result.error || 'Failed to load zones');
      }
    } catch (err: any) {
      setCfError(err.message);
    } finally {
      setCfLoading(false);
    }
  };

  // Load DNS records for selected zone
  const loadCloudflareRecords = async (zoneId: string) => {
    setCfLoading(true);
    setCfError(null);
    try {
      const result = await ipcRenderer.invoke('cloudflare:listDNSRecords', zoneId);
      if (result.success) {
        setCfRecords(result.records || []);
      } else {
        setCfError(result.error || 'Failed to load records');
      }
    } catch (err: any) {
      setCfError(err.message);
    } finally {
      setCfLoading(false);
    }
  };

  // Create DNS record
  const createCloudflareRecord = async (data: { 
    type: string; name: string; content: string; ttl: number; proxied: boolean; comment?: string;
    priority?: number; srvData?: { service: string; proto: string; name: string; priority: number; weight: number; port: number; target: string };
  }) => {
    if (!cfSelectedZone) return;
    setCfLoading(true);
    try {
      const result = await ipcRenderer.invoke('cloudflare:createDNSRecord', cfSelectedZone, data.type, data.name, data.content, data.ttl, data.proxied, data.comment, data.priority, data.srvData);
      if (result.success) {
        await loadCloudflareRecords(cfSelectedZone);
        setCfRecordModal(null);
      } else {
        setCfError(result.error || 'Failed to create record');
      }
    } catch (err: any) {
      setCfError(err.message);
    } finally {
      setCfLoading(false);
    }
  };

  // Update DNS record
  const updateCloudflareRecord = async (recordId: string, data: { 
    type: string; name: string; content: string; ttl: number; proxied: boolean; comment?: string;
    priority?: number; srvData?: { service: string; proto: string; name: string; priority: number; weight: number; port: number; target: string };
  }) => {
    if (!cfSelectedZone) return;
    setCfLoading(true);
    try {
      const result = await ipcRenderer.invoke('cloudflare:updateDNSRecord', cfSelectedZone, recordId, data.type, data.name, data.content, data.ttl, data.proxied, data.comment, data.priority, data.srvData);
      if (result.success) {
        await loadCloudflareRecords(cfSelectedZone);
        setCfRecordModal(null);
      } else {
        setCfError(result.error || 'Failed to update record');
      }
    } catch (err: any) {
      setCfError(err.message);
    } finally {
      setCfLoading(false);
    }
  };

  // Delete DNS record
  const deleteCloudflareRecord = async (recordId: string) => {
    if (!cfSelectedZone || !confirm('Delete this DNS record?')) return;
    setCfLoading(true);
    try {
      const result = await ipcRenderer.invoke('cloudflare:deleteDNSRecord', cfSelectedZone, recordId);
      if (result.success) {
        await loadCloudflareRecords(cfSelectedZone);
      } else {
        setCfError(result.error || 'Failed to delete record');
      }
    } catch (err: any) {
      setCfError(err.message);
    } finally {
      setCfLoading(false);
    }
  };

  // ==================== WHOIS Functions ====================
  
  const performWhoisLookup = async () => {
    if (!whoisDomain.trim()) return;
    setWhoisLoading(true);
    setWhoisError(null);
    setWhoisResult(null);
    try {
      const result = await ipcRenderer.invoke('whois:lookup', whoisDomain.trim());
      if (result.success) {
        setWhoisResult(result.result);
      } else {
        setWhoisError(result.error || 'Lookup failed');
      }
    } catch (err: any) {
      setWhoisError(err.message);
    } finally {
      setWhoisLoading(false);
    }
  };

  // ==================== Network Tools Functions ====================
  
  const NETWORK_TOOLS = [
    { id: 'a', nameKey: 'toolARecord', descKey: 'toolARecordDesc', placeholder: 'example.com', icon: 'A' },
    { id: 'aaaa', nameKey: 'toolAAAARecord', descKey: 'toolAAAARecordDesc', placeholder: 'example.com', icon: '6' },
    { id: 'mx', nameKey: 'toolMXLookup', descKey: 'toolMXLookupDesc', placeholder: 'example.com', icon: 'MX' },
    { id: 'txt', nameKey: 'toolTXTRecord', descKey: 'toolTXTRecordDesc', placeholder: 'example.com', icon: 'T' },
    { id: 'spf', nameKey: 'toolSPFCheck', descKey: 'toolSPFCheckDesc', placeholder: 'example.com', icon: 'SPF' },
    { id: 'cname', nameKey: 'toolCNAMELookup', descKey: 'toolCNAMELookupDesc', placeholder: 'www.example.com', icon: 'CN' },
    { id: 'ns', nameKey: 'toolNSLookup', descKey: 'toolNSLookupDesc', placeholder: 'example.com', icon: 'NS' },
    { id: 'soa', nameKey: 'toolSOARecord', descKey: 'toolSOARecordDesc', placeholder: 'example.com', icon: 'SOA' },
    { id: 'ptr', nameKey: 'toolPTRLookup', descKey: 'toolPTRLookupDesc', placeholder: '8.8.8.8', icon: 'PTR' },
    { id: 'ping', nameKey: 'toolPing', descKey: 'toolPingDesc', placeholder: 'example.com or IP', icon: '◉' },
    { id: 'trace', nameKey: 'toolTraceroute', descKey: 'toolTracerouteDesc', placeholder: 'example.com or IP', icon: '→' },
    { id: 'tcp', nameKey: 'toolTCPPort', descKey: 'toolTCPPortDesc', placeholder: 'example.com', icon: 'TCP', hasPort: true },
    { id: 'webcheck', nameKey: 'toolWebCheck', descKey: 'toolWebCheckDesc', placeholder: 'example.com', icon: 'WEB' },
    { id: 'blacklist', nameKey: 'toolBlacklist', descKey: 'toolBlacklistDesc', placeholder: '1.2.3.4', icon: '⚠' },
    { id: 'dns', nameKey: 'toolDNSCheck', descKey: 'toolDNSCheckDesc', placeholder: 'example.com', icon: 'DNS' },
    { id: 'arin', nameKey: 'toolIPInfo', descKey: 'toolIPInfoDesc', placeholder: '8.8.8.8', icon: 'IP' },
    { id: 'whois', nameKey: 'toolWhois', descKey: 'toolWhoisDesc', placeholder: 'example.com', icon: 'W' },
  ];

  // Tools Menu Items
  const TOOLS_MENU = [
    { id: 'smtp', nameKey: 'toolSMTPTest', icon: '✉' },
    { id: 'proxy', nameKey: 'toolProxyCheck', icon: '○' },
    { id: 'portlistener', nameKey: 'toolPortListener', icon: '(·)' },
  ];

  const COMMON_PORTS = [
    { port: 22, name: 'SSH' },
    { port: 80, name: 'HTTP' },
    { port: 443, name: 'HTTPS' },
    { port: 3306, name: 'MySQL' },
    { port: 5432, name: 'PostgreSQL' },
    { port: 6379, name: 'Redis' },
    { port: 27017, name: 'MongoDB' },
    { port: 3000, name: 'Dev Server' },
  ];

  const runNetworkTool = async () => {
    if (!ntInput.trim()) return;
    setNtLoading(true);
    setNtError(null);
    setNtResult(null);
    try {
      let result;
      const tool = ntSelectedTool;
      const target = ntInput.trim();
      
      if (tool === 'tcp') {
        result = await ipcRenderer.invoke('networktools:tcp', target, ntPort);
      } else if (tool === 'smtp') {
        result = await ipcRenderer.invoke('networktools:smtp', target, ntPort || 25);
      } else if (tool === 'webcheck') {
        result = await ipcRenderer.invoke('networktools:webcheck', target);
      } else if (tool === 'whois') {
        result = await ipcRenderer.invoke('networktools:whois', target);
      } else {
        result = await ipcRenderer.invoke(`networktools:${tool}`, target);
      }
      
      setNtResult(result);
      // Add to history
      setNtHistory(prev => [result, ...prev.slice(0, 19)]);
    } catch (err: any) {
      setNtError(err.message);
    } finally {
      setNtLoading(false);
    }
  };

  // Effect to check Cloudflare token and load zones when menu changes
  useEffect(() => {
    if (activeMenu === 'cloudflare') {
      checkCloudflareToken().then((hasToken) => {
        if (hasToken) {
          loadCloudflareZones();
        }
      });
    }
  }, [activeMenu]);

  // Effect to load records when zone changes
  useEffect(() => {
    if (cfSelectedZone && activeMenu === 'cloudflare') {
      loadCloudflareRecords(cfSelectedZone);
    }
  }, [cfSelectedZone]);

  // Open local terminal with optional command to execute
  const openLocalTerminal = async (initialCommand?: string, forRDPInstall?: Server) => {
    try {
      const result = await ipcRenderer.invoke('local:createShell', 80, 24);
      
      if (!result.success) {
        alert('Failed to open local terminal:\n\n' + (result.error || 'Unknown error'));
        return;
      }

      // Detect local OS info
      const osInfo = await ipcRenderer.invoke('local:getOsInfo');
      const systemInfo = await ipcRenderer.invoke('system:getUserInfo');

      const sessionId = `local-${Date.now()}`;
      const localSession: Session = {
        id: sessionId,
        server: {
          id: 'local',
          name: forRDPInstall ? 'Installing RDP Dependencies...' : 'Local Terminal',
          host: 'localhost',
          port: 0,
          username: systemInfo?.username || 'user',
          protocol: 'ssh',
        },
        connectionId: result.connectionId,
        type: 'terminal',
        theme: currentTheme,
        osInfo: osInfo || undefined,
      };

      setSessions([...sessions, localSession]);
      setActiveSessionId(localSession.id);
      setSidebarOpen(false);
      console.log('[App] Local Terminal session created:', localSession.id);

      // If this is for RDP install, track the session and pending server
      if (forRDPInstall) {
        setRdpInstallSessionId(sessionId);
        setPendingRDPServer(forRDPInstall);
      }

      // If initial command provided, write it to the terminal after a short delay
      if (initialCommand) {
        setTimeout(() => {
          // Add newline to auto-execute the command
          ipcRenderer.invoke('ssh:writeShell', result.connectionId, initialCommand + '\n');
        }, 500);
      }
    } catch (err: any) {
      alert('Error opening local terminal: ' + err.message);
    }
  };

  // Poll for RDP dependencies after install session is created
  useEffect(() => {
    if (!rdpInstallSessionId || !pendingRDPServer) return;

    console.log('[App] Starting RDP deps poll for session:', rdpInstallSessionId);
    
    const pollInterval = setInterval(async () => {
      try {
        const result = await ipcRenderer.invoke('rdp:checkDeps');
        if (result.success && result.deps.xfreerdp3 && result.deps.xdotool) {
          console.log('[App] RDP deps installed! Auto-connecting...');
          
          // Clear interval
          clearInterval(pollInterval);
          
          // Close the install terminal session
          const installSession = sessions.find(s => s.id === rdpInstallSessionId);
          if (installSession) {
            try {
              await ipcRenderer.invoke('ssh:closeShell', installSession.connectionId);
            } catch (e) {
              // Ignore close errors
            }
            setSessions(prev => prev.filter(s => s.id !== rdpInstallSessionId));
          }
          
          // Store server before clearing state
          const serverToConnect = pendingRDPServer;
          
          // Clear install state
          setRdpInstallSessionId(null);
          setPendingRDPServer(null);
          
          // Connect to RDP
          setTimeout(() => {
            connectToRDP(serverToConnect);
          }, 300);
        }
      } catch (err) {
        console.error('[App] Error checking RDP deps:', err);
      }
    }, 2000); // Check every 2 seconds

    return () => {
      clearInterval(pollInterval);
    };
  }, [rdpInstallSessionId, pendingRDPServer, sessions]);

  // Helper function to parse FreeRDP error messages into user-friendly text
  const parseRDPError = (rawError: string): string => {
    const lowerError = rawError.toLowerCase();
    
    if (lowerError.includes('errconnect_connect_failed') || lowerError.includes('failed to connect')) {
      return `${t('rdpErrorUnableConnect')}\n• ${t('rdpErrorCheckAddress')}\n• ${t('rdpErrorCheckOnline')}\n• ${t('rdpErrorCheckFirewall')}`;
    }
    if (lowerError.includes('authentication failure') || lowerError.includes('logon failure')) {
      return t('rdpErrorAuthFailed');
    }
    if (lowerError.includes('nego_connect') || lowerError.includes('failed to negotiate')) {
      return t('rdpErrorNegoFailed');
    }
    if (lowerError.includes('timeout') || lowerError.includes('timed out')) {
      return t('rdpErrorTimeout');
    }
    if (lowerError.includes('dns') || lowerError.includes('name resolution')) {
      return t('rdpErrorDns');
    }
    if (lowerError.includes('certificate') || lowerError.includes('tls')) {
      return t('rdpErrorCertificate');
    }
    if (lowerError.includes('connection closed') || lowerError.includes('reset by peer')) {
      return t('rdpErrorClosed');
    }
    
    // Return simplified version for other errors
    return t('rdpErrorGeneric');
  };

  // RDP connection function (used by handleConnect and after deps install)
  const connectToRDP = async (server: Server) => {
    // Check if already connected to this server
    const existingSession = sessions.find(s => s.server.id === server.id);
    if (existingSession) {
      setActiveSessionId(existingSession.id);
      setSidebarOpen(false);
      setConnectingServerId(null);
      return;
    }

    const connectionId = `rdp-${server.username}@${server.host}:${server.port}`;
    
    // Show connecting overlay
    setRdpConnecting({ server, status: 'connecting' });
    console.log('[App] Starting RDP connection...');
    
    const result = await ipcRenderer.invoke('rdp:connect', connectionId, {
      host: server.host,
      port: server.port || 3389,
      username: server.username,
      password: server.password,
      domain: server.domain,
      screen: { width: 1280, height: 720 },
    });

    console.log('[App] RDP invoke result:', result);

    if (!result.success) {
      setConnectingServerId(null);
      setRdpConnecting({ server, status: 'error', error: parseRDPError(result.error || 'Unknown error') });
      return;
    }

    console.log('[App] RDP process started, waiting for connection confirmation...');

    // Wait for connect/error event from main process
    return new Promise<void>((resolve) => {
      let resolved = false;
      
      const cleanup = () => {
        ipcRenderer.removeListener('rdp:connect', onConnect);
        ipcRenderer.removeListener('rdp:error', onError);
        ipcRenderer.removeListener('rdp:close', onClose);
      };
      
      const onConnect = (connId: string) => {
        console.log('[App] Received rdp:connect event:', connId, 'expected:', connectionId);
        if (connId === connectionId && !resolved) {
          resolved = true;
          console.log('[App] RDP connected successfully!');
          
          // Create session
          const rdpSession: Session = {
            id: `rdp-${Date.now()}`,
            server,
            connectionId,
            type: 'rdp',
            theme: currentTheme,
          };
          
          setSessions(prev => [...prev, rdpSession]);
          setActiveSessionId(rdpSession.id);
          setSidebarOpen(false);
          setConnectingServerId(null);
          setRdpConnecting(null); // Close overlay
          
          console.log('[App] RDP Session created:', rdpSession.id);
          
          // Keep close listener to remove session when xfreerdp closes
          ipcRenderer.removeListener('rdp:connect', onConnect);
          ipcRenderer.removeListener('rdp:error', onError);
          // Keep onClose listener active
          resolve();
        }
      };
      
      const onError = (connId: string, errorMsg: string) => {
        console.log('[App] Received rdp:error event:', connId, errorMsg);
        if (connId === connectionId && !resolved) {
          resolved = true;
          console.log('[App] RDP error:', errorMsg);
          
          setConnectingServerId(null);
          setRdpConnecting({ server, status: 'error', error: parseRDPError(errorMsg) });
          
          cleanup();
          resolve();
        }
      };
      
      const onClose = (connId: string) => {
        console.log('[App] Received rdp:close event:', connId);
        if (connId === connectionId) {
          console.log('[App] RDP closed:', connId);
          
          if (!resolved) {
            // Closed before connected - treat as error
            resolved = true;
            setConnectingServerId(null);
            setRdpConnecting({ server, status: 'error', error: 'Connection closed unexpectedly' });
            cleanup();
            resolve();
          } else {
            // Closed after connected - remove session and go back to server list
            console.log('[App] Removing RDP session and resetting view');
            setSessions(prev => {
              const newSessions = prev.filter(s => s.connectionId !== connectionId);
              // If no sessions left, activeSessionId will be null
              if (newSessions.length === 0) {
                setActiveSessionId(null);
                setSidebarOpen(true);
              } else {
                // Switch to last session
                setActiveSessionId(newSessions[newSessions.length - 1].id);
              }
              return newSessions;
            });
            ipcRenderer.removeListener('rdp:close', onClose);
          }
        }
      };
      
      ipcRenderer.on('rdp:connect', onConnect);
      ipcRenderer.on('rdp:error', onError);
      ipcRenderer.on('rdp:close', onClose);
    });
  };

  const handleConnect = async (server: Server) => {
    try {
      // Check if already connected to this server
      const existingSession = sessions.find(s => s.server.id === server.id);
      if (existingSession) {
        // Just switch to existing session
        setActiveSessionId(existingSession.id);
        setSidebarOpen(false);  // Auto-hide sidebar
        return;
      }

      // Check if already connecting to this server (prevent double-click race condition)
      if (connectingServerId === server.id) {
        console.log('[App] Already connecting to server:', server.name);
        return;
      }

      const protocol = server.protocol || 'ssh';

      // Validate inputs (WSS doesn't need host/username)
      if (protocol !== 'wss' && (!server.host || !server.username)) {
        alert('Host and username are required');
        return;
      }
      
      // Set connecting state for UI feedback
      setConnectingServerId(server.id);
      
      // For SSH connections, check fingerprint first
      if (protocol === 'ssh') {
        const fingerprintResult = await ipcRenderer.invoke('knownhosts:check', server.host, server.port || 22);
        
        if (fingerprintResult.status === 'unknown' || fingerprintResult.status === 'changed') {
          // Show fingerprint modal and wait for user decision
          setFingerprintModal({
            server,
            onProceed: () => {
              setFingerprintModal(null);
              // Continue with connection after user accepts
              performSSHConnect(server);
            },
          });
          return;
        }
        // If status is 'match', continue directly
        await performSSHConnect(server);
        return;
      }

      console.log('[App] Connecting to:', server.host || server.wssUrl, 'via', protocol);

      // Handle FTP/FTPS connections
      if (protocol === 'ftp' || protocol === 'ftps') {
        const connectionId = `${server.username}@${server.host}:${server.port}`;
        const result = await ipcRenderer.invoke('ftp:connect', connectionId, {
          host: server.host,
          port: server.port,
          username: server.username,
          password: server.password,
          protocol: protocol,
        });

        if (!result.success) {
          setConnectingServerId(null);
          alert('FTP Connection failed:\n\n' + (result.error || 'Unknown error'));
          return;
        }

        // FTP only has SFTP-like file browser, no terminal
        const ftpSession: Session = {
          id: `ftp-${Date.now()}`,
          server,
          connectionId,
          type: 'sftp',  // Show file browser
          theme: currentTheme,
        };

        setSessions([...sessions, ftpSession]);
        setActiveSessionId(ftpSession.id);
        setSidebarOpen(false);  // Auto-hide sidebar
        setConnectingServerId(null);
        console.log('[App] FTP Session created:', ftpSession.id);
        return;
      }

      // Handle RDP connections (Windows Remote Desktop)
      if (protocol === 'rdp') {
        console.log('[App] handleConnect: RDP protocol detected');
        // On Linux, check for dependencies first
        const isLinux = navigator.userAgent.toLowerCase().includes('linux');
        console.log('[App] handleConnect: isLinux =', isLinux);
        if (isLinux) {
          console.log('[App] handleConnect: Checking RDP deps...');
          const depsResult = await ipcRenderer.invoke('rdp:checkDeps');
          console.log('[App] handleConnect: depsResult =', depsResult);
          if (depsResult.success && depsResult.deps) {
            if (!depsResult.deps.xfreerdp3 || !depsResult.deps.xdotool) {
              // Show dependency installer
              console.log('[App] handleConnect: Missing deps, showing installer');
              setPendingRDPServer(server);
              setShowRDPDepsInstaller(true);
              setConnectingServerId(null);
              return;
            }
          }
        }
        
        console.log('[App] handleConnect: Calling connectToRDP...');
        await connectToRDP(server);
        return;
      }

      // Handle WSS (WebSocket Secure) connections
      if (protocol === 'wss') {
        const wssUrl = server.wssUrl || `wss://${server.host}:${server.port}/`;
        const connectionId = `wss-${Date.now()}`;
        const result = await ipcRenderer.invoke('wss:connect', connectionId, {
          url: wssUrl,
        });

        // Always open panel - show error state if connection failed
        const wssSession: Session = {
          id: connectionId,
          server: { ...server, wssUrl },
          connectionId,
          type: 'wss',
          theme: currentTheme,
          wssStatus: result.success ? 'connected' : 'error',
          wssError: result.success ? undefined : (result.error || 'Connection failed'),
        };

        setSessions([...sessions, wssSession]);
        setActiveSessionId(wssSession.id);
        setSidebarOpen(false);  // Auto-hide sidebar
        setConnectingServerId(null);
        console.log('[App] WSS Session created:', wssSession.id, 'status:', result.success ? 'connected' : 'error');
        return;
      }

      // Handle database connections
      if (['mysql', 'postgresql', 'mongodb', 'redis', 'sqlite'].includes(protocol)) {
        const connectionId = `db-${server.id}-${Date.now()}`;
        
        const dbSession: Session = {
          id: connectionId,
          server,
          connectionId,
          type: 'database',
          theme: currentTheme,
        };

        setSessions([...sessions, dbSession]);
        setActiveSessionId(dbSession.id);
        setSidebarOpen(false);  // Auto-hide sidebar
        setConnectingServerId(null);
        console.log('[App] Database Session created:', dbSession.id);
        return;
      }

      // SSH connection is handled in performSSHConnect now
      // This code block should not be reached for SSH
      console.warn('[App] Unexpected protocol:', protocol);
    } catch (err: any) {
      console.error('[App] Connection error:', err);
      setConnectingServerId(null);
      alert('Error: ' + (err.message || 'Unknown error'));
    }
  };
  
  // Separate function for SSH connection (called after fingerprint verification)
  // Handle connect to SFTP directly (for SSH servers)
  const handleConnectSFTP = async (server: Server) => {
    try {
      // Check if already connected to this server
      const existingSession = sessions.find(s => s.server.id === server.id);
      if (existingSession) {
        // Switch to existing session and change to SFTP mode
        setActiveSessionId(existingSession.id);
        setSessions(sessions.map(s => 
          s.id === existingSession.id ? { ...s, type: 'sftp' } : s
        ));
        setSidebarOpen(false);
        return;
      }

      // Check if already connecting to this server (prevent double-click race condition)
      if (connectingServerId === server.id) {
        console.log('[App] Already connecting to server:', server.name);
        return;
      }

      // Only SSH supports direct SFTP
      const protocol = server.protocol || 'ssh';
      if (protocol !== 'ssh') {
        alert('Direct SFTP connection is only supported for SSH servers');
        return;
      }

      setConnectingServerId(server.id);

      // Check fingerprint first
      const fingerprintResult = await ipcRenderer.invoke('knownhosts:check', server.host, server.port || 22);
      
      if (fingerprintResult.status === 'unknown' || fingerprintResult.status === 'changed') {
        setFingerprintModal({
          server,
          onProceed: () => {
            setFingerprintModal(null);
            performSSHConnectSFTP(server);
          },
        });
        return;
      }
      
      await performSSHConnectSFTP(server);
    } catch (err: any) {
      setConnectingServerId(null);
      alert('Error: ' + err.message);
    }
  };

  // Perform SSH connection and open SFTP directly
  const performSSHConnectSFTP = async (server: Server) => {
    try {
      // Double-check for existing session (in case of race condition)
      const existingSession = sessions.find(s => s.server.id === server.id);
      if (existingSession) {
        setActiveSessionId(existingSession.id);
        setSessions(sessions.map(s => 
          s.id === existingSession.id ? { ...s, type: 'sftp' } : s
        ));
        setSidebarOpen(false);
        setConnectingServerId(null);
        return;
      }

      console.log('[App] Performing SSH connection (SFTP mode) to:', server.host);
      
      const result = await ipcRenderer.invoke('ssh:connect', {
        host: server.host,
        port: server.port,
        username: server.username,
        password: server.password,
        privateKey: server.privateKey,
        passphrase: server.passphrase,
        authType: server.authType || 'password',
      });

      if (!result.success) {
        let errorMsg = result.error || 'Unknown error';
        if (errorMsg.includes('ENOTFOUND')) {
          errorMsg = `Cannot resolve hostname: ${server.host}`;
        } else if (errorMsg.includes('ETIMEDOUT')) {
          errorMsg = `Connection timed out to ${server.host}:${server.port}`;
        } else if (errorMsg.includes('ECONNREFUSED')) {
          errorMsg = `Connection refused by ${server.host}:${server.port}`;
        } else if (errorMsg.includes('authentication')) {
          errorMsg = `Authentication failed`;
        }
        setConnectingServerId(null);
        alert('Connection failed:\n\n' + errorMsg);
        return;
      }

      // Create session with SFTP mode directly
      const sftpSession: Session = {
        id: `term-${Date.now()}`,
        server,
        connectionId: result.connectionId,
        type: 'sftp',  // Open SFTP directly
        theme: currentTheme,
      };

      setSessions(prev => [...prev, sftpSession]);
      setActiveSessionId(sftpSession.id);
      setSidebarOpen(false);
      setConnectingServerId(null);
      
      console.log('[App] SFTP Session created:', sftpSession.id);
      fetchOsInfo(sftpSession.id, result.connectionId);
    } catch (err: any) {
      console.error('[App] SSH SFTP Connection error:', err);
      setConnectingServerId(null);
      alert('Error: ' + (err.message || 'Unknown error'));
    }
  };

  const performSSHConnect = async (server: Server) => {
    try {
      // Double-check for existing session (in case of race condition)
      const existingSession = sessions.find(s => s.server.id === server.id);
      if (existingSession) {
        setActiveSessionId(existingSession.id);
        setSidebarOpen(false);
        setConnectingServerId(null);
        return;
      }

      console.log('[App] Performing SSH connection to:', server.host);
      
      // SSH connection
      const result = await ipcRenderer.invoke('ssh:connect', {
        host: server.host,
        port: server.port,
        username: server.username,
        password: server.password,
        privateKey: server.privateKey,
        passphrase: server.passphrase,
        authType: server.authType || 'password',
      });

      console.log('[App] Connection result:', result);

      if (!result.success) {
        // Better error message
        let errorMsg = result.error || 'Unknown error';
        
        if (errorMsg.includes('ENOTFOUND')) {
          errorMsg = `Cannot resolve hostname: ${server.host}\nPlease check the hostname is correct.`;
        } else if (errorMsg.includes('ETIMEDOUT')) {
          errorMsg = `Connection timed out to ${server.host}:${server.port}\nPlease check the host is reachable.`;
        } else if (errorMsg.includes('ECONNREFUSED')) {
          errorMsg = `Connection refused by ${server.host}:${server.port}\nPlease check SSH service is running.`;
        } else if (errorMsg.includes('authentication')) {
          errorMsg = `Authentication failed\nPlease check your credentials.`;
        }
        
        setConnectingServerId(null);
        alert('Connection failed:\n\n' + errorMsg);
        return;
      }

      // Don't connect SFTP here - will connect on-demand when user clicks SFTP tab

      const terminalSession: Session = {
        id: `term-${Date.now()}`,
        server,
        connectionId: result.connectionId,
        type: 'terminal',
        theme: currentTheme,
      };

      setSessions(prev => [...prev, terminalSession]);
      setActiveSessionId(terminalSession.id);
      setSidebarOpen(false);  // Auto-hide sidebar
      setConnectingServerId(null);
      
      console.log('[App] Session created:', terminalSession.id);

      // Fetch OS info (SSH2 connects in background, will retry if not ready)
      fetchOsInfo(terminalSession.id, result.connectionId);
    } catch (err: any) {
      console.error('[App] SSH Connection error:', err);
      setConnectingServerId(null);
      alert('Error: ' + (err.message || 'Unknown error'));
    }
  };

  const handleAddServer = async (data: Omit<Server, 'id'>) => {
    // Resolve hostname to IP for accurate duplicate detection
    let resolvedIP = data.host;
    try {
      const dnsResult = await ipcRenderer.invoke('dns:resolve', data.host);
      if (dnsResult.success && dnsResult.ip) {
        resolvedIP = dnsResult.ip;
        console.log('[App] Resolved', data.host, '→', resolvedIP);
      }
    } catch (err) {
      console.log('[App] DNS resolution failed for', data.host, ', using hostname as-is');
    }
    
    // Check for duplicate server
    // Compare resolved IPs instead of hostnames to catch domain/subdomain duplicates
    const duplicates = await Promise.all(
      servers.map(async (s) => {
        let existingIP = s.host;
        try {
          const dnsResult = await ipcRenderer.invoke('dns:resolve', s.host);
          if (dnsResult.success && dnsResult.ip) {
            existingIP = dnsResult.ip;
          }
        } catch (err) {
          // Keep original hostname if resolution fails
        }
        
        return {
          server: s,
          resolvedIP: existingIP,
          isDuplicate: 
            existingIP === resolvedIP && 
            s.port === data.port && 
            s.username === data.username &&
            s.protocol === data.protocol
        };
      })
    );
    
    const duplicate = duplicates.find(d => d.isDuplicate);
    
    if (duplicate) {
      const s = duplicate.server;
      const ipInfo = duplicate.resolvedIP !== s.host ? ` (${duplicate.resolvedIP})` : '';
      
      const confirmOverwrite = confirm(
        `${t('serverAlreadyExists')}\n\n` +
        `${t('serverName')}: ${s.name}\n` +
        `${t('hostIp')}: ${s.host}${ipInfo}:${s.port}\n` +
        `${t('username')}: ${s.username}\n` +
        `${t('protocol')}: ${s.protocol?.toUpperCase()}\n\n` +
        t('continueAddingDuplicate')
      );
      
      if (!confirmOverwrite) {
        return; // User cancelled, don't add
      }
    }
    
    try {
      // Save to storage
      const result = await ipcRenderer.invoke('servers:add', data);
      if (result.success && result.server) {
        setServers([...servers, result.server]);
        console.log('[App] Server saved:', result.server.name);
      }
    } catch (err) {
      console.error('[App] Failed to save server:', err);
      // Fallback to local state
      const newServer: Server = { ...data, id: Date.now().toString() };
      setServers([...servers, newServer]);
    }
    setShowModal(false);
    setEditingServer(null);
  };

  const handleEditServer = (server: Server) => {
    setEditingServer(server);
    setShowModal(true);
  };

  const handleSaveServer = async (data: Server) => {
    if (data.id) {
      // Update existing server
      
      // Auto-save private key to SSH Key Manager if switching to key auth
      if (data.authType === 'key' && data.privateKey && !data.sshKeyId) {
        try {
          // Check if this key is already in the keychain
          const allKeys = await ipcRenderer.invoke('sshkey:list');
          let keyAlreadyExists = false;
          
          for (const key of allKeys) {
            const existingPrivateKey = await ipcRenderer.invoke('sshkey:getPrivate', key.id);
            if (existingPrivateKey && existingPrivateKey.trim() === data.privateKey.trim()) {
              keyAlreadyExists = true;
              data.sshKeyId = key.id; // Link to existing key
              break;
            }
          }
          
          // If key doesn't exist, import it
          if (!keyAlreadyExists) {
            const keyName = `${data.name || data.host}-key-${Date.now()}`;
            const result = await ipcRenderer.invoke('sshkey:import', keyName, data.privateKey, `Imported from ${data.name || data.host}`);
            
            if (result.success && result.key) {
              data.sshKeyId = result.key.id;
              console.log('[App] Auto-saved private key to keychain:', result.key.id);
            }
          }
        } catch (err) {
          console.error('[App] Failed to auto-save key:', err);
          // Continue anyway - key will still work for this server
        }
      }
      
      try {
        const result = await ipcRenderer.invoke('servers:update', data);
        if (result.success) {
          setServers(servers.map(s => s.id === data.id ? data : s));
          console.log('[App] Server updated:', data.name);
        }
      } catch (err) {
        console.error('[App] Failed to update server:', err);
        // Fallback to local state
        setServers(servers.map(s => s.id === data.id ? data : s));
      }
    } else {
      // Add new server
      await handleAddServer(data);
      return;
    }
    setShowModal(false);
    setEditingServer(null);
  };

  const handleDeleteServer = async (id: string) => {
    try {
      await ipcRenderer.invoke('servers:delete', id);
      setServers(servers.filter(s => s.id !== id));
      console.log('[App] Server deleted:', id);
    } catch (err) {
      console.error('[App] Failed to delete server:', err);
    }
  };

  const handleCloseSession = async (id: string, skipConfirm = false) => {
    const session = sessions.find(s => s.id === id);
    if (!session) return;
    
    // Ask for confirmation before closing (unless skipped)
    if (!skipConfirm) {
      const confirmed = window.confirm(
        t('confirmCloseSession') || `Close connection to "${session.server.name}"?`
      );
      if (!confirmed) return;
    }
    
    const protocol = session.server.protocol || 'ssh';
    
    if (protocol === 'ftp' || protocol === 'ftps') {
      // Disconnect FTP
      await ipcRenderer.invoke('ftp:disconnect', session.connectionId);
    } else if (protocol === 'wss') {
      // Disconnect WebSocket - no need to destroy terminal
      await ipcRenderer.invoke('wss:disconnect', session.connectionId);
    } else if (['mysql', 'postgresql', 'mongodb', 'redis', 'sqlite'].includes(protocol)) {
      // Disconnect database - handled by DatabaseClient component
      await ipcRenderer.invoke('db:disconnect', session.connectionId);
    } else {
      // SSH/RDP - Destroy terminal instance
      destroyTerminal(session.connectionId);
      await ipcRenderer.invoke('ssh:disconnect', session.connectionId);
    }
    
    const newSessions = sessions.filter(s => s.id !== id);
    setSessions(newSessions);
    if (activeSessionId === id) {
      setActiveSessionId(newSessions[0]?.id || null);
    }
    
    // When all sessions are closed, open the sidebar and go to hosts menu
    if (newSessions.length === 0) {
      setSidebarOpen(true);
      setActiveMenu('hosts');
    }
  };

  const toggleSessionType = () => {
    if (!activeSession) return;
    const newType = activeSession.type === 'terminal' ? 'sftp' : 'terminal';
    setSessions(sessions.map(s => 
      s.id === activeSessionId ? { ...s, type: newType } : s
    ));
  };

  // Fetch OS info from remote server (called when SFTP connects)
  const fetchOsInfo = async (sessionId: string, connectionId: string) => {
    try {
      console.log('[App] Fetching OS info for:', connectionId);
      
      // Execute commands to get OS info
      const osResult = await ipcRenderer.invoke('ssh:execute', connectionId, 
        'cat /etc/os-release 2>/dev/null | grep -E "^PRETTY_NAME" | head -1 | cut -d= -f2 | tr -d \'"\' || uname -s');
      const ipResult = await ipcRenderer.invoke('ssh:execute', connectionId, 
        'hostname -I 2>/dev/null | awk "{print \\$1}" || curl -s ifconfig.me 2>/dev/null || echo ""');
      
      // Try to detect provider
      let provider = '';
      const providerResult = await ipcRenderer.invoke('ssh:execute', connectionId,
        'cat /sys/devices/virtual/dmi/id/sys_vendor 2>/dev/null || cat /sys/class/dmi/id/sys_vendor 2>/dev/null || echo ""');
      
      if (providerResult.success && providerResult.output) {
        const vendorLower = providerResult.output.trim().toLowerCase();
        if (vendorLower.includes('digitalocean')) provider = 'DigitalOcean';
        else if (vendorLower.includes('amazon') || vendorLower.includes('aws')) provider = 'AWS';
        else if (vendorLower.includes('google')) provider = 'Google Cloud';
        else if (vendorLower.includes('microsoft') || vendorLower.includes('azure')) provider = 'Azure';
        else if (vendorLower.includes('vultr')) provider = 'Vultr';
        else if (vendorLower.includes('linode') || vendorLower.includes('akamai')) provider = 'Linode';
        else if (vendorLower.includes('hetzner')) provider = 'Hetzner';
        else if (vendorLower.includes('ovh')) provider = 'OVH';
      }

      // Get session to use server host as fallback IP
      const session = sessions.find(s => s.id === sessionId);
      const osInfo = {
        os: osResult.success && osResult.output?.trim() ? osResult.output.trim() : 'Linux',
        ip: ipResult.success && ipResult.output?.trim() ? ipResult.output.trim().split('\n')[0] : (session?.server.host || ''),
        provider: provider,
      };

      console.log('[App] OS Info fetched:', osInfo);

      setSessions(prev => prev.map(s => 
        s.id === sessionId ? { ...s, osInfo } : s
      ));
    } catch (err) {
      console.error('[App] Failed to fetch OS info:', err);
    }
  };

  // Called when SFTP successfully connects
  const handleSftpConnected = (sessionId: string, connectionId: string) => {
    console.log('[App] SFTP connected, fetching OS info...');
    const session = sessions.find(s => s.id === sessionId);
    if (session && !session.osInfo) {
      fetchOsInfo(sessionId, connectionId);
    }
  };

  const updateSftpPaths = (sessionId: string, localPath: string, remotePath: string) => {
    setSessions(sessions.map(s => 
      s.id === sessionId ? { ...s, sftpPaths: { localPath, remotePath } } : s
    ));
  };

  // Detect macOS for traffic light buttons padding
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  return (
    <div className="flex flex-col h-screen bg-navy-900 text-gray-100">
      {/* Lock Screen */}
      {isAppLocked && (
        <LockScreen
          method={appLockMethod}
          onUnlock={handleUnlock}
          appTheme={appTheme}
        />
      )}
      
      {/* Set Credential Modal */}
      {showSetCredentialModal && (
        <SetCredentialModal
          method={pendingLockMethod || 'pin'}
          onSave={handleSetCredential}
          onCancel={() => {
            setShowSetCredentialModal(false);
            setPendingLockMethod(null);
          }}
          appTheme={appTheme}
          t={t}
        />
      )}
      
      {/* Custom Title Bar with Tabs */}
      <div className="bg-navy-800 border-b border-navy-700 flex items-center h-10 select-none" style={{ WebkitAppRegion: 'drag' } as any}>
        {/* macOS traffic light buttons spacing */}
        {isMac && <div className="w-[70px] h-full flex-shrink-0" />}
        {/* Sidebar toggle + App name - not draggable */}
        <div className="flex items-center h-full" style={{ WebkitAppRegion: 'no-drag' } as any}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-10 h-full flex items-center justify-center hover:bg-navy-700 transition text-gray-400 hover:text-white"
            title={sidebarOpen ? t('hideSidebar') : t('showSidebar')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2 px-3 border-r border-navy-700 h-full">
            <button
              onClick={() => {
                setActiveMenu('about');
                setActiveSessionId(null);
                setShowUpdateNotification(false);
              }}
              className="flex items-center gap-2 hover:opacity-80 transition relative"
              title={showUpdateNotification ? t('updateAvailable') : t('about')}
            >
              <svg className="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-semibold text-white">Marix</span>
              {showUpdateNotification && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              )}
            </button>
          </div>
        </div>
        
        {/* Tabs - not draggable for window, but draggable for reordering */}
        <div className="flex items-center h-full overflow-x-auto" style={{ WebkitAppRegion: 'no-drag' } as any}>
          {sessions.map(session => {
            const protocol = session.server.protocol || 'ssh';
            const protocolConfig = {
              ssh: { color: '#10b981', bgColor: 'bg-emerald-500/10' },
              rdp: { color: '#3b82f6', bgColor: 'bg-blue-500/10' },
              ftp: { color: '#f59e0b', bgColor: 'bg-amber-500/10' },
              ftps: { color: '#f97316', bgColor: 'bg-orange-500/10' },
              wss: { color: '#8b5cf6', bgColor: 'bg-violet-500/10' },
              mysql: { color: '#00758f', bgColor: '' },
              postgresql: { color: '#336791', bgColor: '' },
              mongodb: { color: '#47a248', bgColor: '' },
              redis: { color: '#dc382d', bgColor: '' },
              sqlite: { color: '#003b57', bgColor: '' }
            };
            const config = protocolConfig[protocol as keyof typeof protocolConfig] || { color: '#6b7280', bgColor: 'bg-gray-500/10' };
            const isDatabase = ['mysql', 'postgresql', 'mongodb', 'redis', 'sqlite'].includes(protocol);
            
            return (
              <div
                key={session.id}
                draggable
                onDragStart={(e) => {
                  setDraggedTabId(session.id);
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', session.id);
                  setTimeout(() => (e.target as HTMLElement).classList.add('opacity-50'), 0);
                }}
                onDragEnd={(e) => {
                  setDraggedTabId(null);
                  setDragOverTabId(null);
                  (e.target as HTMLElement).classList.remove('opacity-50');
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (draggedTabId && draggedTabId !== session.id) {
                    setDragOverTabId(session.id);
                  }
                }}
                onDragLeave={() => setDragOverTabId(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  if (!draggedTabId || draggedTabId === session.id) {
                    setDragOverTabId(null);
                    return;
                  }
                  const newSessions = [...sessions];
                  const draggedIndex = newSessions.findIndex(s => s.id === draggedTabId);
                  const targetIndex = newSessions.findIndex(s => s.id === session.id);
                  const [dragged] = newSessions.splice(draggedIndex, 1);
                  newSessions.splice(targetIndex, 0, dragged);
                  setSessions(newSessions);
                  setDragOverTabId(null);
                }}
                onClick={() => setActiveSessionId(session.id)}
                className={`group flex items-center gap-2 px-3 h-full border-r cursor-pointer transition text-xs ${
                  dragOverTabId === session.id
                    ? 'border-teal-400 border-l-2 bg-teal-500/10'
                    : 'border-navy-700'
                } ${
                  session.id === activeSessionId
                    ? 'bg-navy-900 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-navy-700'
                }`}
              >
                {/* Protocol icon matching ServerList */}
                {isDatabase ? (
                  /* Database icons - unified cylinder icon */
                  <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5">
                      <ellipse cx="12" cy="5" rx="9" ry="3"/>
                      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
                      <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/>
                    </svg>
                  </div>
                ) : (
                  /* Non-database icons - with background */
                  <div 
                    className={`w-5 h-5 rounded ${config.bgColor} flex items-center justify-center flex-shrink-0`}
                    style={{ color: config.color }}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {protocol === 'ssh' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />}
                      {protocol === 'rdp' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />}
                      {protocol === 'ftp' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />}
                      {protocol === 'ftps' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />}
                      {protocol === 'wss' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />}
                    </svg>
                  </div>
                )}
                <span className="font-medium max-w-[100px] truncate">{session.server.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCloseSession(session.id);
                  }}
                  className="opacity-50 hover:opacity-100 hover:text-red-400 transition ml-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            );
          })}
          
          {/* New tab button (Quick Connect) - after tabs */}
          <button
            onClick={() => setQuickConnectOpen(true)}
            className="px-3 h-full text-gray-500 hover:text-white hover:bg-navy-700 transition flex items-center gap-1"
            title={`${t('quickConnect')} (${navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+K)`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        
        {/* Draggable spacer for macOS */}
        <div className="flex-1 h-full min-w-[50px]" style={{ WebkitAppRegion: 'drag' } as any} />

        {/* Window controls - not draggable */}
        <div className="flex items-center h-full" style={{ WebkitAppRegion: 'no-drag' } as any}>
          {/* LAN Discovery toggle - only toggle, no icon */}
          <div className="flex items-center px-2 h-full" title="LAN Discovery">
            <button
              onClick={() => setLanDiscoveryEnabled(!lanDiscoveryEnabled)}
              className={`relative w-9 h-5 rounded-full transition-colors ${lanDiscoveryEnabled ? 'bg-teal-500' : 'bg-gray-600'}`}
            >
              <div 
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-200 ${lanDiscoveryEnabled ? 'left-[18px]' : 'left-0.5'}`}
              />
            </button>
          </div>
          {/* Language selector */}
          <LanguageSelector />
          {/* Theme toggle button */}
          <button
            onClick={toggleAppTheme}
            className="w-10 h-full flex items-center justify-center hover:bg-navy-700 transition text-gray-400 hover:text-white"
            title={appTheme === 'dark' ? t('switchToLightMode') : t('switchToDarkMode')}
          >
            {appTheme === 'dark' ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
          <button
            onClick={() => ipcRenderer.invoke('window:minimize')}
            className="w-12 h-full flex items-center justify-center hover:bg-navy-700 transition text-gray-400 hover:text-white"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 10 1"><rect width="10" height="1"/></svg>
          </button>
          <button
            onClick={() => ipcRenderer.invoke('window:maximize')}
            className="w-12 h-full flex items-center justify-center hover:bg-navy-700 transition text-gray-400 hover:text-white"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 10 10"><rect x="0.5" y="0.5" width="9" height="9"/></svg>
          </button>
          <button
            onClick={() => ipcRenderer.invoke('window:close')}
            className="w-12 h-full flex items-center justify-center hover:bg-red-600 transition text-gray-400 hover:text-white"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 10 10"><path d="M1 1l8 8M9 1l-8 8"/></svg>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar with icons and labels */}
        {sidebarOpen && (
        <div className="w-48 min-w-[12rem] bg-navy-800 border-r border-navy-700 flex flex-col">
          {/* Close button - only show when in server tab */}
          {activeSessionId && (
            <div className="p-2 border-b border-navy-700">
              <button
                onClick={() => setSidebarOpen(false)}
                className="w-full px-3 py-2 rounded-lg flex items-center justify-center gap-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 hover:text-red-300 transition"
                title={t('closeMenu')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="text-sm font-medium">{t('closeMenu')}</span>
              </button>
            </div>
          )}
          {/* Menu Items */}
          <div className="flex-1 py-3 px-2 overflow-y-auto">
            <button
              onClick={() => { setActiveMenu('hosts'); setActiveSessionId(null); setActiveTag(null); }}
              className={`w-full px-3 py-2.5 rounded-lg flex items-center gap-3 mb-1 transition ${
                activeMenu === 'hosts' && !activeSessionId
                  ? 'bg-teal-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-navy-700'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
              </svg>
              <span className="text-sm font-medium">{t('hosts')}</span>
              <span className={`ml-auto text-xs font-medium px-1.5 py-0.5 rounded ${
                activeMenu === 'hosts' && !activeSessionId
                  ? 'bg-teal-500 text-white'
                  : 'bg-navy-600 text-gray-300'
              }`}>{servers.length}</span>
            </button>
            
            <div className="mt-4 pt-4 border-t border-navy-700">
              {/* Keychain (SSH Keys) */}
              <button
                onClick={() => { setActiveMenu('sshkeys'); setActiveSessionId(null); }}
                className={`w-full px-3 py-2.5 rounded-lg flex items-center gap-3 mb-1 transition ${
                  activeMenu === 'sshkeys' && !activeSessionId
                    ? 'bg-teal-600 !text-white'
                    : appTheme === 'light' ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100' : 'text-gray-400 hover:text-white hover:bg-navy-700'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                <span className="text-sm font-medium">{t('keychain')}</span>
              </button>
              
              {/* Known Hosts */}
              <button
                onClick={() => { setActiveMenu('knownhosts'); setActiveSessionId(null); }}
                className={`w-full px-3 py-2.5 rounded-lg flex items-center gap-3 mb-1 transition ${
                  activeMenu === 'knownhosts' && !activeSessionId
                    ? 'bg-green-600 !text-white'
                    : appTheme === 'light' ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100' : 'text-gray-400 hover:text-white hover:bg-navy-700'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="text-sm font-medium">{t('knownHosts')}</span>
              </button>
              
              {/* Port Forwarding */}
              <button
                onClick={() => { setActiveMenu('portforward'); setActiveSessionId(null); }}
                className={`w-full px-3 py-2.5 rounded-lg flex items-center gap-3 mb-1 transition ${
                  activeMenu === 'portforward' && !activeSessionId
                    ? 'bg-cyan-600 !text-white'
                    : appTheme === 'light' ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100' : 'text-gray-400 hover:text-white hover:bg-navy-700'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                <span className="text-sm font-medium">{t('portForwarding') || 'Port Forward'}</span>
              </button>
              
              {/* Send Files via LAN */}
              <button
                onClick={() => { setActiveMenu('sendfiles'); setActiveSessionId(null); }}
                className={`w-full px-3 py-2.5 rounded-lg flex items-center gap-3 mb-1 transition ${
                  activeMenu === 'sendfiles' && !activeSessionId
                    ? 'bg-cyan-600 !text-white'
                    : appTheme === 'light' ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100' : 'text-gray-400 hover:text-white hover:bg-navy-700'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span className="text-sm font-medium">{t('sendFiles') || 'Send Files'}</span>
              </button>
              
              {/* Tools */}
              <button
                onClick={() => { setActiveMenu('tools'); setActiveSessionId(null); }}
                className={`w-full px-3 py-2.5 rounded-lg flex items-center gap-3 mb-1 transition ${
                  activeMenu === 'tools' && !activeSessionId
                    ? 'bg-green-600 !text-white'
                    : appTheme === 'light' ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100' : 'text-gray-400 hover:text-white hover:bg-navy-700'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-sm font-medium">{t('tools')}</span>
              </button>
              
              {/* Lookup */}
              <button
                onClick={() => { setActiveMenu('nettools'); setActiveSessionId(null); }}
                className={`w-full px-3 py-2.5 rounded-lg flex items-center gap-3 mb-1 transition ${
                  activeMenu === 'nettools' && !activeSessionId
                    ? 'bg-purple-600 !text-white'
                    : appTheme === 'light' ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100' : 'text-gray-400 hover:text-white hover:bg-navy-700'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
                <span className="text-sm font-medium">{t('lookup')}</span>
              </button>
              
              {/* Cloudflare DNS */}
              <button
                onClick={() => { setActiveMenu('cloudflare'); setActiveSessionId(null); }}
                className={`w-full px-3 py-2.5 rounded-lg flex items-center gap-3 mb-1 transition ${
                  activeMenu === 'cloudflare' && !activeSessionId
                    ? 'bg-orange-600 !text-white'
                    : appTheme === 'light' ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100' : 'text-gray-400 hover:text-white hover:bg-navy-700'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
                <span className="text-sm font-medium">Cloudflare</span>
              </button>
              
              {/* 2FA Authenticator */}
              <button
                onClick={() => { setActiveMenu('twofactor'); setActiveSessionId(null); }}
                className={`w-full px-3 py-2.5 rounded-lg flex items-center gap-3 mb-1 transition ${
                  activeMenu === 'twofactor' && !activeSessionId
                    ? 'bg-purple-600 !text-white'
                    : appTheme === 'light' ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100' : 'text-gray-400 hover:text-white hover:bg-navy-700'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="text-sm font-medium">{t('twoFactorAuth') || '2FA'}</span>
              </button>
              
              {/* Command Snippets */}
              <button
                onClick={() => { setActiveMenu('snippets'); setActiveSessionId(null); }}
                className={`w-full px-3 py-2.5 rounded-lg flex items-center gap-3 mb-1 transition ${
                  activeMenu === 'snippets' && !activeSessionId
                    ? 'bg-indigo-600 !text-white'
                    : appTheme === 'light' ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100' : 'text-gray-400 hover:text-white hover:bg-navy-700'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                <span className="text-sm font-medium">{t('snippets') || 'Snippets'}</span>
              </button>
            </div>
          </div>
          
          {/* Settings at bottom */}
          <div className={`p-2 border-t ${appTheme === 'light' ? 'border-gray-200' : 'border-navy-700'}`}>
            <button
              onClick={() => { setActiveMenu('settings'); setActiveSessionId(null); }}
              className={`w-full px-3 py-2.5 rounded-lg flex items-center gap-3 transition ${
                activeMenu === 'settings' && !activeSessionId
                  ? 'bg-gray-600 !text-white'
                  : appTheme === 'light' ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100' : 'text-gray-400 hover:text-white hover:bg-navy-700'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm font-medium">{t('settings')}</span>
            </button>
          </div>
        </div>
        )}

        {/* Main area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Content */}
          <div className="flex-1 overflow-hidden bg-navy-900">
          
          {/* Hosts View - Using new ServerList component */}
          {!activeSessionId && activeMenu === 'hosts' && (
            <div className="h-full flex flex-col">
              {/* Header with controls */}
              <div className="flex-shrink-0 p-4 border-b border-navy-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold text-white">{t('hosts')}</h2>
                    <span className="text-sm text-gray-500">({filteredServers.length} servers)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openLocalTerminal()}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition shadow-sm flex items-center gap-2 ${appTheme === 'light' ? 'bg-gray-200 hover:bg-gray-300 text-gray-700' : 'bg-navy-700 hover:bg-navy-600 text-white'}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {t('localTerminal')}
                    </button>
                    <button
                      onClick={() => { setEditingServer(null); setShowModal(true); }}
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-700 !text-white text-sm font-medium rounded-lg transition shadow-sm flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      {t('addNewHost')}
                    </button>
                  </div>
                </div>
                
                {/* Tags Filter */}
                {allTags.length > 0 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    <button
                      onClick={() => setActiveTag(null)}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition ${
                        !activeTag
                          ? 'bg-teal-600 text-white'
                          : 'bg-navy-700 text-gray-400 hover:bg-navy-600 hover:text-white'
                      }`}
                    >
                      {t('all')} ({servers.length})
                    </button>
                    {allTags.map(tag => {
                      const count = servers.filter(s => s.tags?.includes(tag)).length;
                      const isActive = activeTag === tag;
                      const tagColor = getTagColor(tag);
                      return (
                        <button
                          key={tag}
                          onClick={() => setActiveTag(isActive ? null : tag)}
                          style={isActive ? { backgroundColor: tagColor } : {}}
                          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition flex items-center gap-1.5 ${
                            isActive ? 'text-white' : 'bg-navy-700 text-gray-400 hover:bg-navy-600 hover:text-white'
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tagColor }} />
                          {tag}
                          <span className={`text-xs ${isActive ? 'opacity-70' : 'text-gray-500'}`}>({count})</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              
              {/* Server List */}
              <div className="flex-1 overflow-hidden">
                <ServerList
                  servers={filteredServers}
                  onConnect={handleConnect}
                  onConnectSFTP={handleConnectSFTP}
                  onEdit={handleEditServer}
                  onDelete={handleDeleteServer}
                  onShareOnLAN={(serverIds) => {
                    // Pre-select the server(s) and open selection modal
                    setSelectedServerIdsForShare(serverIds);
                    setShowServerSelectionModal(true);
                  }}
                  selectedServerIds={selectedServerIdsForShare}
                  onSelectionChange={setSelectedServerIdsForShare}
                  onReorder={async (reorderedServers) => {
                    // Update local state immediately
                    setServers(reorderedServers);
                    // Persist to storage
                    try {
                      await ipcRenderer.invoke('servers:reorder', reorderedServers);
                    } catch (err) {
                      console.error('Failed to save server order:', err);
                    }
                  }}
                  onAddNew={() => { setEditingServer(null); setShowModal(true); }}
                  onQuickConnect={() => setQuickConnectOpen(true)}
                />
              </div>
            </div>
          )}
          
          {/* Settings View */}
          {!activeSessionId && activeMenu === 'settings' && (
            <div className="h-full overflow-y-auto p-4 sm:p-6">
              <h2 className={`text-lg sm:text-xl font-semibold mb-4 sm:mb-6 ${appTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>{t('settings')}</h2>
              
              <div className="max-w-2xl space-y-4 sm:space-y-6">
                {/* Appearance */}
                <div className={`rounded-xl p-4 sm:p-5 ${appTheme === 'light' ? 'bg-white border border-gray-200 shadow-sm' : 'bg-navy-800 border border-navy-700'}`}>
                  <h3 className={`text-sm font-medium mb-3 sm:mb-4 ${appTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>{t('appearance')}</h3>
                  
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                      <div>
                        <p className={`text-sm ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>{t('themeMode')}</p>
                        <p className={`text-xs ${appTheme === 'light' ? 'text-gray-500' : 'text-gray-500'}`}>{t('switchDarkLight')}</p>
                      </div>
                      <button
                        onClick={toggleAppTheme}
                        className={`relative w-12 h-6 rounded-full transition ${
                          appTheme === 'light' ? 'bg-teal-600' : 'bg-navy-600'
                        }`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          appTheme === 'light' ? 'translate-x-7' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                      <div>
                        <p className={`text-sm ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>{t('terminalTheme')}</p>
                        <p className={`text-xs ${appTheme === 'light' ? 'text-gray-500' : 'text-gray-500'}`}>{t('defaultTerminalTheme')}</p>
                      </div>
                      <ThemeSelector
                        currentTheme={currentTheme}
                        onThemeChange={handleThemeChange}
                        direction="down"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Session Monitor */}
                <div className={`rounded-xl p-4 sm:p-5 ${appTheme === 'light' ? 'bg-white border border-gray-200 shadow-sm' : 'bg-navy-800 border border-navy-700'}`}>
                  <h3 className={`text-sm font-medium mb-3 sm:mb-4 flex items-center gap-2 ${appTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    {t('sessionMonitor') || 'Session Monitor'}
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                      <div>
                        <p className={`text-sm ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>{t('sessionMonitorEnabled') || 'Enable Session Monitor'}</p>
                        <p className={`text-xs ${appTheme === 'light' ? 'text-gray-500' : 'text-gray-500'}`}>{t('sessionMonitorDesc') || 'Monitor SSH connection latency and health in real-time'}</p>
                      </div>
                      <button
                        onClick={toggleSessionMonitor}
                        className={`relative w-12 h-6 rounded-full transition ${
                          sessionMonitorEnabled ? 'bg-green-600' : appTheme === 'light' ? 'bg-gray-300' : 'bg-navy-600'
                        }`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          sessionMonitorEnabled ? 'translate-x-7' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Command Recall */}
                <div className={`rounded-xl p-4 sm:p-5 ${appTheme === 'light' ? 'bg-white border border-gray-200 shadow-sm' : 'bg-navy-800 border border-navy-700'}`}>
                  <h3 className={`text-sm font-medium mb-3 sm:mb-4 flex items-center gap-2 ${appTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                    <svg className="w-4 h-4 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {t('commandRecall')}
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                      <div>
                        <p className={`text-sm ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>{t('commandRecallEnabled')}</p>
                        <p className={`text-xs ${appTheme === 'light' ? 'text-gray-500' : 'text-gray-500'}`}>{t('commandRecallDesc')}</p>
                      </div>
                      <button
                        onClick={toggleCommandRecall}
                        className={`relative w-12 h-6 rounded-full transition ${
                          commandRecallEnabled ? 'bg-cyan-600' : appTheme === 'light' ? 'bg-gray-300' : 'bg-navy-600'
                        }`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          commandRecallEnabled ? 'translate-x-7' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                    
                    {/* Security notice */}
                    <div className={`p-3 rounded-lg text-xs ${appTheme === 'light' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-amber-900/20 text-amber-400 border border-amber-800/50'}`}>
                      <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>{t('commandRecallSecurityNote')}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Terminal Font */}
                <div className={`rounded-xl p-4 sm:p-5 ${appTheme === 'light' ? 'bg-white border border-gray-200 shadow-sm' : 'bg-navy-800 border border-navy-700'}`}>
                  <h3 className={`text-sm font-medium mb-3 sm:mb-4 flex items-center gap-2 ${appTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                    <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" />
                    </svg>
                    {t('terminalFont') || 'Terminal Font'}
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                      <div>
                        <p className={`text-sm ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>{t('terminalFontFamily') || 'Font Family'}</p>
                        <p className={`text-xs ${appTheme === 'light' ? 'text-gray-500' : 'text-gray-500'}`}>{t('terminalFontDesc') || 'Monospace font for terminal (Unicode support)'}</p>
                      </div>
                      <select
                        value={terminalFont}
                        onChange={(e) => handleTerminalFontChange(e.target.value)}
                        className={`px-3 py-2 rounded-lg text-sm min-w-[180px] ${
                          appTheme === 'light' 
                            ? 'bg-gray-100 border border-gray-200 text-gray-700' 
                            : 'bg-navy-700 border border-navy-600 text-gray-200'
                        }`}
                        style={{ fontFamily: `"${terminalFont}", monospace` }}
                      >
                        {TERMINAL_FONTS.map(font => (
                          <option key={font.value} value={font.value} style={{ fontFamily: `"${font.value}", monospace` }}>
                            {font.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Font preview */}
                    <div className={`rounded-lg p-3 font-mono text-sm ${
                      appTheme === 'light' ? 'bg-gray-100 text-gray-800' : 'bg-navy-900 text-gray-200'
                    }`} style={{ fontFamily: `"${terminalFont}", monospace` }}>
                      <div>$ echo "Hello World! 你好世界 Xin chào 🚀"</div>
                      <div className="text-green-500">ABCDEFGabcdefg 0123456789 !@#$%^&*()</div>
                      <div className="text-yellow-500">→ ← ↑ ↓ ● ○ ■ □ ▶ ◀ ★ ☆ ✓ ✗</div>
                    </div>
                  </div>
                </div>
                
                {/* App Lock */}
                <div className={`rounded-xl p-4 sm:p-5 ${appTheme === 'light' ? 'bg-white border border-gray-200 shadow-sm' : 'bg-navy-800 border border-navy-700'}`}>
                  <h3 className={`text-sm font-medium mb-3 sm:mb-4 flex items-center gap-2 ${appTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    {t('appLock') || 'App Lock'}
                  </h3>
                  <p className={`text-xs mb-4 ${appTheme === 'light' ? 'text-gray-500' : 'text-gray-500'}`}>
                    {t('appLockDesc') || 'Lock app after inactivity to protect your connections'}
                  </p>
                  
                  <div className="space-y-4">
                    {/* Enable/Disable */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                      <div>
                        <p className={`text-sm ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>{t('appLockEnable') || 'Enable App Lock'}</p>
                      </div>
                      <button
                        onClick={handleAppLockToggle}
                        className={`relative w-12 h-6 rounded-full transition ${
                          appLockEnabled ? 'bg-red-600' : appTheme === 'light' ? 'bg-gray-300' : 'bg-navy-600'
                        }`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          appLockEnabled ? 'translate-x-7' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                    
                    {appLockEnabled && (
                      <>
                        {/* Lock Method */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                          <div>
                            <p className={`text-sm ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>{t('appLockMethod') || 'Lock Method'}</p>
                          </div>
                          <select
                            value={appLockMethod}
                            onChange={(e) => handleAppLockMethodChange(e.target.value as 'blur' | 'pin' | 'password')}
                            className={`px-3 py-2 rounded-lg text-sm min-w-[160px] ${
                              appTheme === 'light' 
                                ? 'bg-gray-100 border border-gray-200 text-gray-700' 
                                : 'bg-navy-700 border border-navy-600 text-gray-200'
                            }`}
                          >
                            <option value="blur">{t('appLockMethodBlur') || '🔳 Blur (Click to unlock)'}</option>
                            <option value="pin">{t('appLockMethodPin') || '🔢 PIN Code'}</option>
                            <option value="password">{t('appLockMethodPassword') || '🔑 Password'}</option>
                          </select>
                        </div>
                        
                        {/* Timeout */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                          <div>
                            <p className={`text-sm ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>{t('appLockTimeout') || 'Lock after'}</p>
                          </div>
                          <select
                            value={appLockTimeout}
                            onChange={(e) => handleAppLockTimeoutChange(parseInt(e.target.value))}
                            className={`px-3 py-2 rounded-lg text-sm min-w-[120px] ${
                              appTheme === 'light' 
                                ? 'bg-gray-100 border border-gray-200 text-gray-700' 
                                : 'bg-navy-700 border border-navy-600 text-gray-200'
                            }`}
                          >
                            {LOCK_TIMEOUT_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                        
                        {/* Change/Set Credential */}
                        {(appLockMethod === 'pin' || appLockMethod === 'password') && (
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 pt-2 border-t border-navy-600">
                            <div>
                              <p className={`text-sm ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                                {appLockMethod === 'pin' ? (t('appLockPinCode') || 'PIN Code') : (t('password') || 'Password')}
                              </p>
                              <p className={`text-xs ${appTheme === 'light' ? 'text-gray-500' : 'text-gray-500'}`}>
                                {appLockHasCredential 
                                  ? (t('appLockCredentialSet') || 'Credential is set') 
                                  : (t('appLockCredentialNotSet') || 'Not set')
                                }
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setPendingLockMethod(appLockMethod as 'pin' | 'password');
                                  setShowSetCredentialModal(true);
                                }}
                                className={`px-3 py-1.5 rounded-lg text-sm transition ${
                                  appTheme === 'light' 
                                    ? 'bg-blue-100 hover:bg-blue-200 text-blue-700' 
                                    : 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-400'
                                }`}
                              >
                                {appLockHasCredential ? (t('change') || 'Change') : (t('set') || 'Set')}
                              </button>
                              {appLockHasCredential && (
                                <button
                                  onClick={handleClearCredential}
                                  className={`px-3 py-1.5 rounded-lg text-sm transition ${
                                    appTheme === 'light' 
                                      ? 'bg-red-100 hover:bg-red-200 text-red-700' 
                                      : 'bg-red-600/20 hover:bg-red-600/30 text-red-400'
                                  }`}
                                >
                                  {t('clear') || 'Clear'}
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Test Lock */}
                        <div className="pt-2">
                          <button
                            onClick={() => setIsAppLocked(true)}
                            className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition ${
                              appTheme === 'light' 
                                ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' 
                                : 'bg-navy-700 hover:bg-navy-600 text-gray-300'
                            }`}
                          >
                            🔒 {t('appLockTestNow') || 'Test Lock Now'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Cloudflare API Token */}
                <div className={`rounded-xl p-4 sm:p-5 ${appTheme === 'light' ? 'bg-white border border-gray-200 shadow-sm' : 'bg-navy-800 border border-navy-700'}`}>
                  <h3 className={`text-sm font-medium mb-3 sm:mb-4 flex items-center gap-2 ${appTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                    <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                    </svg>
                    {t('cfApiToken')}
                  </h3>
                  <p className={`text-xs mb-4 ${appTheme === 'light' ? 'text-gray-500' : 'text-gray-500'}`}>
                    {t('cfApiTokenDesc')}
                  </p>
                  
                  <div className="space-y-3">
                    <CloudflareTokenInput 
                      appTheme={appTheme}
                      t={t}
                      onTokenSaved={() => setCfHasToken(true)}
                      onTokenRemoved={() => { setCfHasToken(false); setCfZones([]); setCfRecords([]); }}
                    />
                  </div>
                </div>
                
                {/* Backup & Restore */}
                <div className={`rounded-xl p-4 sm:p-5 ${appTheme === 'light' ? 'bg-white border border-gray-200 shadow-sm' : 'bg-navy-800 border border-navy-700'}`}>
                  <h3 className={`text-sm font-medium mb-3 sm:mb-4 flex items-center gap-2 ${appTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                    <svg className="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    {t('backupRestore')}
                  </h3>
                  <p className={`text-xs mb-3 sm:mb-4 ${appTheme === 'light' ? 'text-gray-500' : 'text-gray-500'}`}>
                    {t('backupDescription')}
                  </p>
                  
                  {/* Backup & Restore Section */}
                  <div className={`mb-4 pb-4 ${appTheme === 'light' ? 'border-b border-gray-200' : 'border-b border-navy-700'}`}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Create Backup */}
                      <button
                        onClick={() => setBackupModalOpen('create')}
                        className={`flex items-center gap-3 p-3 rounded-lg transition group ${appTheme === 'light' ? 'bg-gray-50 hover:bg-gray-100 border border-gray-200' : 'bg-navy-900 hover:bg-navy-700'}`}
                      >
                        <div className="p-2 bg-teal-500/20 rounded-lg group-hover:bg-teal-500/30 transition">
                          <svg className="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                          </svg>
                        </div>
                        <div className="text-left">
                          <p className={`text-sm ${appTheme === 'light' ? 'text-gray-800' : 'text-gray-200'}`}>{t('createBackup')}</p>
                          <p className={`text-xs ${appTheme === 'light' ? 'text-gray-500' : 'text-gray-500'}`}>{t('exportToFile')}</p>
                        </div>
                      </button>
                      
                      {/* Restore Backup */}
                      <button
                        onClick={() => setBackupModalOpen('restore')}
                        className={`flex items-center gap-3 p-3 rounded-lg transition group ${appTheme === 'light' ? 'bg-gray-50 hover:bg-gray-100 border border-gray-200' : 'bg-navy-900 hover:bg-navy-700'}`}
                      >
                        <div className="p-2 bg-purple-500/20 rounded-lg group-hover:bg-purple-500/30 transition">
                          <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </div>
                        <div className="text-left">
                          <p className={`text-sm ${appTheme === 'light' ? 'text-gray-800' : 'text-gray-200'}`}>{t('restoreBackup')}</p>
                          <p className={`text-xs ${appTheme === 'light' ? 'text-gray-500' : 'text-gray-500'}`}>{t('importFromFile')}</p>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Cloudflare DNS View */}
          {!activeSessionId && activeMenu === 'cloudflare' && (
            <div className="h-full overflow-y-auto p-6">
              <h2 className={`text-xl font-semibold mb-6 flex items-center gap-3 ${appTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
                {t('cloudflareDns')}
              </h2>
              
              {!cfHasToken ? (
                /* No token - Show setup prompt */
                <div className="max-w-xl mx-auto">
                  <div className={`rounded-xl p-8 text-center ${appTheme === 'light' ? 'bg-white border border-gray-200 shadow-sm' : 'bg-navy-800 border border-navy-700'}`}>
                    <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                    </div>
                    <h3 className={`text-lg font-medium mb-2 ${appTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>{t('configureApiToken')}</h3>
                    <p className={`text-sm mb-6 ${appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                      {t('apiTokenDesc')}
                    </p>
                    <button
                      onClick={() => setActiveMenu('settings')}
                      className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 !text-white rounded-lg font-medium transition"
                    >
                      {t('goToSettings')}
                    </button>
                  </div>
                </div>
              ) : (
                /* Has token - Show DNS management */
                <div className="max-w-6xl">
                  {cfError && (
                    <div className="bg-red-500/20 border border-red-500/50 rounded-lg px-4 py-3 mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-red-600 text-sm">{cfError}</span>
                      <button onClick={() => setCfError(null)} className="ml-auto text-red-500 hover:text-red-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                  
                  {/* Zone Selector */}
                  <div className={`rounded-xl p-4 mb-4 ${appTheme === 'light' ? 'bg-white border border-gray-200 shadow-sm' : 'bg-navy-800 border border-navy-700'}`}>
                    <div className="flex items-center gap-4">
                      <label className={`text-sm ${appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>{t('selectDomain')}</label>
                      <select
                        value={cfSelectedZone || ''}
                        onChange={(e) => setCfSelectedZone(e.target.value)}
                        className={`flex-1 max-w-md px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500 ${appTheme === 'light' ? 'bg-gray-50 border border-gray-300 text-gray-900' : 'bg-navy-900 border border-navy-600 text-white'}`}
                        disabled={cfLoading}
                      >
                        <option value="">{t('selectDomainPlaceholder')}</option>
                        {cfZones.map(zone => (
                          <option key={zone.id} value={zone.id}>{zone.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => loadCloudflareZones()}
                        disabled={cfLoading}
                        className={`p-2 rounded-lg transition disabled:opacity-50 ${appTheme === 'light' ? 'hover:bg-gray-100 text-gray-500 hover:text-gray-700' : 'hover:bg-navy-700 text-gray-400 hover:text-white'}`}
                        title={t('refreshZones')}
                      >
                        <svg className={`w-5 h-5 ${cfLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                      {cfSelectedZone && (
                        <button
                          onClick={() => setCfRecordModal({ mode: 'create' })}
                          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 !text-white rounded-lg text-sm font-medium transition flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          {t('addRecord')}
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* DNS Records Table */}
                  {cfSelectedZone && (
                    <div className={`rounded-xl overflow-hidden ${appTheme === 'light' ? 'bg-white border border-gray-200 shadow-sm' : 'bg-navy-800 border border-navy-700'}`}>
                      <table className="w-full text-sm">
                        <thead className={appTheme === 'light' ? 'bg-gray-50 border-b border-gray-200' : 'bg-navy-700'}>
                          <tr>
                            <th className={`text-left px-4 py-3 font-medium ${appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>{t('type')}</th>
                            <th className={`text-left px-4 py-3 font-medium ${appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>{t('name')}</th>
                            <th className={`text-left px-4 py-3 font-medium ${appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>{t('content')}</th>
                            <th className={`text-left px-4 py-3 font-medium ${appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>{t('ttl')}</th>
                            <th className={`text-left px-4 py-3 font-medium ${appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>{t('proxy')}</th>
                            <th className={`text-right px-4 py-3 font-medium ${appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>{t('actions')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cfRecords.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                {cfLoading ? t('loadingRecords') : t('noRecords')}
                              </td>
                            </tr>
                          ) : cfRecords.map(record => (
                            <tr key={record.id} className={`${appTheme === 'light' ? 'border-t border-gray-100 hover:bg-gray-50' : 'border-t border-navy-700 hover:bg-navy-700/50'}`}>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  record.type === 'A' ? 'bg-green-500/20 text-green-600' :
                                  record.type === 'AAAA' ? 'bg-blue-500/20 text-blue-600' :
                                  record.type === 'CNAME' ? 'bg-purple-500/20 text-purple-600' :
                                  record.type === 'MX' ? 'bg-yellow-500/20 text-yellow-600' :
                                  record.type === 'TXT' ? 'bg-gray-500/20 text-gray-600' :
                                  appTheme === 'light' ? 'bg-gray-100 text-gray-700' : 'bg-navy-600 text-gray-300'
                                }`}>
                                  {record.type}
                                </span>
                              </td>
                              <td className={`px-4 py-3 font-mono text-xs ${appTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>{record.name}</td>
                              <td className={`px-4 py-3 font-mono text-xs max-w-xs truncate ${appTheme === 'light' ? 'text-gray-600' : 'text-gray-300'}`} title={record.content}>
                                {record.content}
                              </td>
                              <td className={`px-4 py-3 ${appTheme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                                {record.ttl === 1 ? 'Auto' : `${record.ttl}s`}
                              </td>
                              <td className="px-4 py-3">
                                {record.proxiable ? (
                                  <span className={`px-2 py-1 rounded text-xs ${
                                    record.proxied ? 'bg-orange-500/20 text-orange-600' : 'bg-gray-500/20 text-gray-500'
                                  }`}>
                                    {record.proxied ? t('proxied') : t('dnsOnly')}
                                  </span>
                                ) : (
                                  <span className="text-gray-500 text-xs">N/A</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => setCfRecordModal({ mode: 'edit', record })}
                                  className={`p-1.5 rounded transition ${appTheme === 'light' ? 'hover:bg-gray-100 text-gray-500 hover:text-gray-700' : 'hover:bg-navy-600 text-gray-400 hover:text-white'}`}
                                  title="Edit"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => deleteCloudflareRecord(record.id)}
                                  className="p-1.5 hover:bg-red-500/20 rounded transition text-gray-400 hover:text-red-500 ml-1"
                                  title="Delete"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Network Tools View */}
          {activeMenu === 'nettools' && !activeSessionId && (
            <div className={`h-full flex ${appTheme === 'light' ? 'bg-gray-50' : ''}`}>
              {/* Vertical Tool Sidebar */}
              <div className={`w-48 flex-shrink-0 overflow-y-auto border-r ${appTheme === 'light' ? 'bg-white border-gray-200' : 'bg-navy-800 border-navy-700'}`}>
                <div className="p-3">
                  <p className={`text-xs font-medium mb-2 px-2 ${appTheme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>{t('selectTool')}</p>
                  <div className="space-y-1">
                    {NETWORK_TOOLS.map(tool => (
                      <button
                        key={tool.id}
                        onClick={() => { setNtSelectedTool(tool.id); setNtResult(null); setNtError(null); }}
                        className={`w-full px-3 py-2 rounded-lg text-left transition flex items-center gap-2 ${
                          ntSelectedTool === tool.id
                            ? 'bg-purple-600 !text-white'
                            : appTheme === 'light'
                              ? 'text-gray-700 hover:bg-gray-100'
                              : 'text-gray-300 hover:bg-navy-700'
                        }`}
                      >
                        <span className="w-8 text-center font-bold text-xs">{tool.icon}</span>
                        <span className="text-sm truncate">{t(tool.nameKey as any)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Main Content */}
              <div className="flex-1 overflow-auto p-6">
                <div className="max-w-6xl mx-auto">
                  <div className="flex items-center gap-3 mb-6">
                    <div className={`p-2 rounded-lg ${appTheme === 'light' ? 'bg-purple-100' : 'bg-purple-600/20'}`}>
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                      </svg>
                    </div>
                    <div>
                      <h1 className={`text-xl font-bold ${appTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                        {t(NETWORK_TOOLS.find(t => t.id === ntSelectedTool)?.nameKey as any)}
                      </h1>
                      <p className={`text-sm ${appTheme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                        {t(NETWORK_TOOLS.find(t => t.id === ntSelectedTool)?.descKey as any)}
                      </p>
                    </div>
                  </div>
                
                  {/* Input Section */}
                  <div className={`rounded-xl p-5 mb-6 ${appTheme === 'light' ? 'bg-white border border-gray-200 shadow-sm' : 'bg-navy-800 border border-navy-700'}`}>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={ntInput}
                        onChange={(e) => setNtInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && runNetworkTool()}
                        placeholder={NETWORK_TOOLS.find(t => t.id === ntSelectedTool)?.placeholder}
                        className={`flex-1 px-4 py-2.5 rounded-lg focus:outline-none focus:border-purple-500 ${appTheme === 'light' ? 'bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400' : 'bg-navy-900 border border-navy-600 text-white placeholder-gray-500'}`}
                      />
                      {NETWORK_TOOLS.find(t => t.id === ntSelectedTool)?.hasPort && (
                        <input
                          type="number"
                          value={ntPort}
                          onChange={(e) => setNtPort(Number(e.target.value))}
                          placeholder={t('port')}
                          min={1}
                          max={65535}
                          className={`w-24 px-3 py-2.5 rounded-lg focus:outline-none focus:border-purple-500 ${appTheme === 'light' ? 'bg-gray-50 border border-gray-300 text-gray-900' : 'bg-navy-900 border border-navy-600 text-white'}`}
                        />
                      )}
                      <button
                        onClick={runNetworkTool}
                        disabled={ntLoading || !ntInput.trim()}
                        className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed !text-white rounded-lg font-medium transition flex items-center gap-2"
                      >
                        {ntLoading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            {t('running')}
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            {t('run')}
                          </>
                        )}
                      </button>
                    </div>
                    
                    {/* Common Ports - only show for TCP */}
                    {ntSelectedTool === 'tcp' && (
                      <div className="mt-4 pt-4 border-t border-navy-700">
                        <p className={`text-xs mb-2 ${appTheme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>{t('commonPorts')}</p>
                        <div className="flex flex-wrap gap-2">
                          {COMMON_PORTS.map(p => (
                            <button
                              key={p.port}
                              onClick={() => setNtPort(p.port)}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap ${
                                ntPort === p.port
                                  ? 'bg-purple-600 text-white'
                                  : appTheme === 'light'
                                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                                    : 'bg-navy-900 text-gray-300 hover:bg-navy-700 border border-navy-600'
                              }`}
                            >
                              {p.name} ({p.port})
                            </button>
                          ))}
                        </div>
                        <p className={`text-xs mt-2 ${appTheme === 'light' ? 'text-gray-400' : 'text-gray-500'}`}>{t('clickToSelectPort')}</p>
                      </div>
                    )}
                  </div>
                
                {/* Error */}
                {ntError && (
                  <div className="bg-red-500/20 border border-red-500/50 rounded-lg px-4 py-3 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-red-600 text-sm">{ntError}</span>
                  </div>
                )}
                
                {/* Result */}
                {ntResult && (
                  <div className={`rounded-xl overflow-hidden ${appTheme === 'light' ? 'bg-white border border-gray-200 shadow-sm' : 'bg-navy-800 border border-navy-700'}`}>
                    <div className={`px-4 py-3 flex items-center justify-between ${appTheme === 'light' ? 'border-b border-gray-200 bg-gray-50' : 'border-b border-navy-700 bg-navy-750'}`}>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${ntResult.success ? 'bg-green-500/20 text-green-600' : 'bg-red-500/20 text-red-500'}`}>
                          {ntResult.success ? t('successStatus') : t('failedStatus')}
                        </span>
                        <span className={`text-sm font-medium ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-200'}`}>
                          {ntResult.tool.toUpperCase()} - {ntResult.target}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(ntResult.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="p-4">
                      {ntResult.error ? (
                        <p className="text-red-500 text-sm">
                          {ntResult.error === 'Connection timed out' ? t('connectionTimedOut') :
                           ntResult.error === 'Request timed out' ? t('requestTimedOut') :
                           ntResult.error === 'Connection failed' ? t('connectionFailed') :
                           ntResult.error}
                        </p>
                      ) : (
                        <div className={`text-sm ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                          {/* Render based on tool type */}
                          {(ntResult.tool === 'a' || ntResult.tool === 'aaaa' || ntResult.tool === 'ns' || ntResult.tool === 'cname') && Array.isArray(ntResult.data) && (
                            <div className="space-y-1">
                              {ntResult.data.map((item: string, i: number) => (
                                <div key={i} className={`px-3 py-2 rounded font-mono text-sm ${appTheme === 'light' ? 'bg-gray-50' : 'bg-navy-900'}`}>
                                  {item}
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {ntResult.tool === 'mx' && Array.isArray(ntResult.data) && (
                            <div className="space-y-2">
                              {ntResult.data.map((mx: any, i: number) => (
                                <div key={i} className={`px-3 py-2 rounded flex items-center justify-between ${appTheme === 'light' ? 'bg-gray-50' : 'bg-navy-900'}`}>
                                  <span className="font-mono">{mx.exchange}</span>
                                  <span className="text-xs text-gray-500">Priority: {mx.priority}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {(ntResult.tool === 'txt' || ntResult.tool === 'spf') && Array.isArray(ntResult.data) && (
                            <div className="space-y-2">
                              {ntResult.data.map((txt: string, i: number) => (
                                <div key={i} className={`px-3 py-2 rounded font-mono text-xs break-all ${appTheme === 'light' ? 'bg-gray-50' : 'bg-navy-900'}`}>
                                  {txt}
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {ntResult.tool === 'ptr' && Array.isArray(ntResult.data) && (
                            <div className="space-y-1">
                              {ntResult.data.map((ptr: string, i: number) => (
                                <div key={i} className={`px-3 py-2 rounded font-mono ${appTheme === 'light' ? 'bg-gray-50' : 'bg-navy-900'}`}>
                                  {ptr}
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {ntResult.tool === 'soa' && ntResult.data && (
                            <div className={`p-3 rounded space-y-2 font-mono text-xs ${appTheme === 'light' ? 'bg-gray-50' : 'bg-navy-900'}`}>
                              <div>Primary NS: <span className="text-purple-500">{ntResult.data.nsname}</span></div>
                              <div>Admin: <span className="text-purple-500">{ntResult.data.hostmaster}</span></div>
                              <div>Serial: <span className="text-purple-500">{ntResult.data.serial}</span></div>
                              <div>Refresh: {ntResult.data.refresh}s | Retry: {ntResult.data.retry}s | Expire: {ntResult.data.expire}s | TTL: {ntResult.data.minttl}s</div>
                            </div>
                          )}
                          
                          {(ntResult.tool === 'ping' || ntResult.tool === 'trace') && (
                            <pre className={`p-3 rounded font-mono text-xs whitespace-pre-wrap max-h-80 overflow-y-auto ${appTheme === 'light' ? 'bg-gray-50' : 'bg-navy-900'}`}>
                              {ntResult.data}
                            </pre>
                          )}
                          
                          {(ntResult.tool === 'tcp' || ntResult.tool === 'smtp') && ntResult.data && (
                            <div className={`p-3 rounded space-y-2 ${appTheme === 'light' ? 'bg-gray-50' : 'bg-navy-900'}`}>
                              <div className="flex items-center gap-2">
                                <span className={`w-3 h-3 rounded-full ${ntResult.data.connected ? 'bg-green-500' : 'bg-red-500'}`} />
                                <span>{ntResult.data.connected ? t('connectedStatus') : t('failedConnectStatus')}</span>
                                {ntResult.data.latency && <span className="text-gray-500">({ntResult.data.latency})</span>}
                              </div>
                              {ntResult.data.banner && (
                                <div className="font-mono text-xs text-gray-500 mt-2">
                                  {t('banner')}: {ntResult.data.banner}
                                </div>
                              )}
                            </div>
                          )}
                          
                          {(ntResult.tool === 'http' || ntResult.tool === 'https') && ntResult.data && (
                            <div className={`p-3 rounded space-y-2 ${appTheme === 'light' ? 'bg-gray-50' : 'bg-navy-900'}`}>
                              <div className="flex items-center gap-3">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                  ntResult.data.statusCode < 300 ? 'bg-green-500/20 text-green-600' :
                                  ntResult.data.statusCode < 400 ? 'bg-yellow-500/20 text-yellow-600' :
                                  'bg-red-500/20 text-red-500'
                                }`}>
                                  {ntResult.data.statusCode} {ntResult.data.statusMessage}
                                </span>
                                <span className="text-gray-500 text-sm">{ntResult.data.latency}</span>
                              </div>
                              {ntResult.tool === 'https' && ntResult.data.ssl && (
                                <div className="mt-3 pt-3 border-t border-gray-700">
                                  <p className="text-xs text-gray-500 mb-2">{t('sslCertificate')}</p>
                                  <div className="text-xs space-y-1">
                                    <div>{t('valid')}: <span className={ntResult.data.ssl.valid ? 'text-green-500' : 'text-red-500'}>{ntResult.data.ssl.valid ? t('validYes') : t('validNo')}</span></div>
                                    {ntResult.data.ssl.subject && <div>{t('subject')}: {ntResult.data.ssl.subject.CN}</div>}
                                    {ntResult.data.ssl.issuer && <div>{t('issuer')}: {ntResult.data.ssl.issuer.O}</div>}
                                    <div>{t('validFrom')}: {ntResult.data.ssl.validFrom}</div>
                                    <div>{t('validTo')}: {ntResult.data.ssl.validTo}</div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {ntResult.tool === 'blacklist' && ntResult.data && (
                            <div>
                              <div className={`p-3 rounded mb-3 flex items-center gap-3 ${ntResult.data.clean ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                                <span className={`text-2xl ${ntResult.data.clean ? 'text-green-500' : 'text-red-500'}`}>
                                  {ntResult.data.clean ? '✓' : '⚠'}
                                </span>
                                <div>
                                  <p className={`font-medium ${ntResult.data.clean ? 'text-green-600' : 'text-red-500'}`}>
                                    {ntResult.data.clean ? t('ipClean') : t('listedOnBlacklist').replace('{count}', ntResult.data.listedOn)}
                                  </p>
                                  <p className="text-xs text-gray-500">{t('checkedBlacklists').replace('{count}', ntResult.data.totalChecked)}</p>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                {ntResult.data.results.map((r: any, i: number) => (
                                  <div key={i} className={`px-2 py-1 rounded flex items-center gap-2 ${appTheme === 'light' ? 'bg-gray-50' : 'bg-navy-900'}`}>
                                    <span className={`w-2 h-2 rounded-full ${r.listed ? 'bg-red-500' : 'bg-green-500'}`} />
                                    <span className="truncate">{r.server}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {ntResult.tool === 'dns' && ntResult.data && (
                            <div>
                              <div className={`p-3 rounded mb-3 ${ntResult.data.allResponding ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
                                <p className={`font-medium ${ntResult.data.allResponding ? 'text-green-600' : 'text-yellow-600'}`}>
                                  {ntResult.data.allResponding ? t('allDnsResponding') : t('someDnsNotResponding')}
                                </p>
                              </div>
                              <div className="space-y-2">
                                {ntResult.data.nameservers.map((ns: any, i: number) => (
                                  <div key={i} className={`px-3 py-2 rounded flex items-center justify-between ${appTheme === 'light' ? 'bg-gray-50' : 'bg-navy-900'}`}>
                                    <div className="flex items-center gap-2">
                                      <span className={`w-2 h-2 rounded-full ${ns.responding ? 'bg-green-500' : 'bg-red-500'}`} />
                                      <span className="font-mono">{ns.ns}</span>
                                    </div>
                                    {ns.ip && <span className="text-xs text-gray-500">{ns.ip} - {ns.latency}</span>}
                                    {ns.error && <span className="text-xs text-red-500">{ns.error}</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {ntResult.tool === 'arin' && ntResult.data && (
                            <div className={`p-3 rounded space-y-2 ${appTheme === 'light' ? 'bg-gray-50' : 'bg-navy-900'}`}>
                              {ntResult.data.status === 'success' ? (
                                <>
                                  <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div><span className="text-gray-500">IP:</span> {ntResult.data.query}</div>
                                    <div><span className="text-gray-500">Country:</span> {ntResult.data.country} ({ntResult.data.countryCode})</div>
                                    <div><span className="text-gray-500">Region:</span> {ntResult.data.regionName}</div>
                                    <div><span className="text-gray-500">City:</span> {ntResult.data.city}</div>
                                    <div><span className="text-gray-500">ISP:</span> {ntResult.data.isp}</div>
                                    <div><span className="text-gray-500">Org:</span> {ntResult.data.org}</div>
                                    <div><span className="text-gray-500">AS:</span> {ntResult.data.as}</div>
                                    <div><span className="text-gray-500">Timezone:</span> {ntResult.data.timezone}</div>
                                  </div>
                                </>
                              ) : (
                                <p className="text-red-500">{ntResult.data.message}</p>
                              )}
                            </div>
                          )}
                          
                          {ntResult.tool === 'whois' && ntResult.data && (
                            <div className={`p-3 rounded space-y-3 ${appTheme === 'light' ? 'bg-gray-50' : 'bg-navy-900'}`}>
                              {ntResult.data.registrar && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                  {ntResult.data.domain && <div><span className="text-gray-500">{t('domain')}:</span> <span className="font-mono">{ntResult.data.domain}</span></div>}
                                  {ntResult.data.registrar && <div><span className="text-gray-500">{t('registrar')}:</span> {ntResult.data.registrar}</div>}
                                  {ntResult.data.creationDate && <div><span className="text-gray-500">{t('created')}:</span> {ntResult.data.creationDate}</div>}
                                  {ntResult.data.expirationDate && <div><span className="text-gray-500">{t('expires')}:</span> {ntResult.data.expirationDate}</div>}
                                  {ntResult.data.updatedDate && <div><span className="text-gray-500">{t('updated')}:</span> {ntResult.data.updatedDate}</div>}
                                  {ntResult.data.status && <div className="col-span-full"><span className="text-gray-500">{t('status')}:</span> {Array.isArray(ntResult.data.status) ? ntResult.data.status.join(', ') : ntResult.data.status}</div>}
                                </div>
                              )}
                              {ntResult.data.nameServers && ntResult.data.nameServers.length > 0 && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-2">{t('nameServers')}</p>
                                  <div className="flex flex-wrap gap-2">
                                    {ntResult.data.nameServers.map((ns: string, i: number) => (
                                      <span key={i} className={`px-2 py-1 rounded text-xs font-mono ${appTheme === 'light' ? 'bg-gray-200' : 'bg-navy-800'}`}>{ns}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {ntResult.data.rawData && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-2">{t('rawWhois')}</p>
                                  <pre className={`p-3 rounded font-mono text-xs whitespace-pre-wrap max-h-60 overflow-y-auto ${appTheme === 'light' ? 'bg-gray-100' : 'bg-navy-950'}`}>
                                    {ntResult.data.rawData}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* History */}
                {ntHistory.length > 0 && (
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className={`text-sm font-medium ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                        {t('recentLookups')}
                      </h3>
                      <button
                        onClick={() => setNtHistory([])}
                        className="text-xs text-gray-500 hover:text-red-500"
                      >
                        {t('clear')}
                      </button>
                    </div>
                    <div className="space-y-2">
                      {ntHistory.slice(0, 5).map((item, i) => (
                        <div
                          key={i}
                          onClick={() => { setNtSelectedTool(item.tool); setNtInput(item.target); setNtResult(item); }}
                          className={`p-3 rounded-lg cursor-pointer transition ${appTheme === 'light' ? 'bg-white border border-gray-200 hover:border-purple-300' : 'bg-navy-800 border border-navy-700 hover:border-purple-500'}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${item.success ? 'bg-green-500/20 text-green-600' : 'bg-red-500/20 text-red-500'}`}>
                                {item.tool.toUpperCase()}
                              </span>
                              <span className={`text-sm ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>{item.target}</span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {new Date(item.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                </div>
              </div>
            </div>
          )}

          {/* Tools Page - SMTP Test, Proxy Check, Port Listener */}
          {activeMenu === 'tools' && !activeSessionId && (
            <div className="h-full overflow-y-auto p-6">
              <h2 className={`text-xl font-semibold mb-6 flex items-center gap-3 ${appTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {t('tools')}
              </h2>
              
              <div className="flex gap-6 max-w-7xl">
                {/* Left Sidebar - Tool Selection */}
                <div className={`w-48 flex-shrink-0 rounded-xl ${appTheme === 'light' ? 'bg-white border border-gray-200 shadow-sm' : 'bg-navy-800 border border-navy-700'} p-3`}>
                  <div className="space-y-1">
                    {TOOLS_MENU.map(tool => (
                      <button
                        key={tool.id}
                        onClick={() => setToolsSelectedTool(tool.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition ${
                          toolsSelectedTool === tool.id
                            ? 'bg-green-600 !text-white'
                            : appTheme === 'light'
                              ? 'text-gray-700 hover:bg-gray-100'
                              : 'text-gray-300 hover:bg-navy-700'
                        }`}
                      >
                        <span className="text-lg">{tool.icon}</span>
                        <span className="text-sm font-medium">{t(tool.nameKey as any)}</span>
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Right Content - Tool Interface */}
                <div className="flex-1 min-w-0">
                  {/* SMTP Testing Tool */}
                  {toolsSelectedTool === 'smtp' && (
                    <div className={`rounded-xl ${appTheme === 'light' ? 'bg-white border border-gray-200 shadow-sm' : 'bg-navy-800 border border-navy-700'} p-6`}>
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center text-green-500 text-xl">
                          ✉
                        </div>
                        <div>
                          <h3 className={`text-lg font-medium ${appTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>{t('toolSMTPTest')}</h3>
                          <p className={`text-sm ${appTheme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>{t('smtpTestDesc')}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left Column - Server Settings */}
                        <div className="space-y-4">
                          <div>
                            <label className={`block text-sm font-medium mb-1.5 ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>{t('smtpServer')}</label>
                            <input
                              type="text"
                              value={smtpServer}
                              onChange={(e) => setSmtpServer(e.target.value)}
                              placeholder="smtp.example.com"
                              className={`w-full px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${appTheme === 'light' ? 'bg-gray-50 border border-gray-300 text-gray-900' : 'bg-navy-900 border border-navy-600 text-white'}`}
                            />
                          </div>
                          
                          <div className="flex gap-4">
                            <div className="flex-1">
                              <label className={`block text-sm font-medium mb-1.5 ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>{t('port')}</label>
                              <input
                                type="number"
                                value={smtpPort}
                                onChange={(e) => setSmtpPort(Number(e.target.value))}
                                placeholder="587"
                                min={1}
                                max={65535}
                                className={`w-full px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${appTheme === 'light' ? 'bg-gray-50 border border-gray-300 text-gray-900' : 'bg-navy-900 border border-navy-600 text-white'}`}
                              />
                            </div>
                            <div className="flex-1">
                              <label className={`block text-sm font-medium mb-1.5 ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>{t('encryption')}</label>
                              <select
                                value={smtpEncryption}
                                onChange={(e) => setSmtpEncryption(e.target.value as 'starttls' | 'ssl')}
                                className={`w-full px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${appTheme === 'light' ? 'bg-gray-50 border border-gray-300 text-gray-900' : 'bg-navy-900 border border-navy-600 text-white'}`}
                              >
                                <option value="starttls">STARTTLS</option>
                                <option value="ssl">SSL/TLS</option>
                              </select>
                            </div>
                          </div>
                          
                          {/* Quick Ports */}
                          <div>
                            <label className={`block text-xs mb-2 ${appTheme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>{t('quickPorts')}</label>
                            <div className="flex flex-wrap gap-2">
                              {[
                                { port: 25, name: 'SMTP' },
                                { port: 465, name: 'SMTPS' },
                                { port: 587, name: 'Submission' },
                                { port: 2525, name: 'Alt' },
                              ].map(p => (
                                <button
                                  key={p.port}
                                  onClick={() => {
                                    setSmtpPort(p.port);
                                    if (p.port === 465) setSmtpEncryption('ssl');
                                    else setSmtpEncryption('starttls');
                                  }}
                                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                                    smtpPort === p.port
                                      ? 'bg-green-600 !text-white'
                                      : appTheme === 'light'
                                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                                        : 'bg-navy-900 text-gray-300 hover:bg-navy-700 border border-navy-600'
                                  }`}
                                >
                                  {p.name} ({p.port})
                                </button>
                              ))}
                            </div>
                          </div>
                          
                          {/* Authentication Toggle */}
                          <div className="flex items-center gap-3 pt-2">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={smtpUseAuth}
                                onChange={(e) => setSmtpUseAuth(e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
                            </label>
                            <span className={`text-sm ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>{t('useAuthentication')}</span>
                          </div>
                          
                          {smtpUseAuth && (
                            <div className="space-y-3 pl-1 border-l-2 border-green-500/30 ml-1">
                              <div className="pl-4">
                                <label className={`block text-sm font-medium mb-1.5 ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>{t('username')}</label>
                                <input
                                  type="text"
                                  value={smtpUsername}
                                  onChange={(e) => setSmtpUsername(e.target.value)}
                                  placeholder="user@example.com"
                                  className={`w-full px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${appTheme === 'light' ? 'bg-gray-50 border border-gray-300 text-gray-900' : 'bg-navy-900 border border-navy-600 text-white'}`}
                                />
                              </div>
                              <div className="pl-4">
                                <label className={`block text-sm font-medium mb-1.5 ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>{t('password')}</label>
                                <input
                                  type="password"
                                  value={smtpPassword}
                                  onChange={(e) => setSmtpPassword(e.target.value)}
                                  placeholder="••••••••"
                                  className={`w-full px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${appTheme === 'light' ? 'bg-gray-50 border border-gray-300 text-gray-900' : 'bg-navy-900 border border-navy-600 text-white'}`}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Right Column - Email Settings */}
                        <div className="space-y-4">
                          <div>
                            <label className={`block text-sm font-medium mb-1.5 ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>{t('fromEmail')}</label>
                            <input
                              type="email"
                              value={smtpFromEmail}
                              onChange={(e) => setSmtpFromEmail(e.target.value)}
                              placeholder="sender@example.com"
                              className={`w-full px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${appTheme === 'light' ? 'bg-gray-50 border border-gray-300 text-gray-900' : 'bg-navy-900 border border-navy-600 text-white'}`}
                            />
                          </div>
                          <div>
                            <label className={`block text-sm font-medium mb-1.5 ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>{t('toEmail')}</label>
                            <input
                              type="email"
                              value={smtpToEmail}
                              onChange={(e) => setSmtpToEmail(e.target.value)}
                              placeholder="recipient@example.com"
                              className={`w-full px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${appTheme === 'light' ? 'bg-gray-50 border border-gray-300 text-gray-900' : 'bg-navy-900 border border-navy-600 text-white'}`}
                            />
                          </div>
                          
                          <button
                            onClick={async () => {
                              if (!smtpServer.trim()) return;
                              setSmtpLoading(true);
                              setSmtpError(null);
                              setSmtpResult(null);
                              try {
                                const result = await ipcRenderer.invoke('tools:smtpTest', {
                                  server: smtpServer.trim(),
                                  port: smtpPort,
                                  encryption: smtpEncryption,
                                  useAuth: smtpUseAuth,
                                  username: smtpUsername,
                                  password: smtpPassword,
                                  fromEmail: smtpFromEmail,
                                  toEmail: smtpToEmail,
                                });
                                if (result.success) {
                                  setSmtpResult(result);
                                } else {
                                  setSmtpError(result.error || 'SMTP test failed');
                                }
                              } catch (err: any) {
                                setSmtpError(err.message);
                              } finally {
                                setSmtpLoading(false);
                              }
                            }}
                            disabled={smtpLoading || !smtpServer.trim()}
                            className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed !text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
                          >
                            {smtpLoading ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                {t('testing')}
                              </>
                            ) : (
                              <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                {t('testSMTP')}
                              </>
                            )}
                          </button>
                          
                          {/* Result/Error Display */}
                          {smtpError && (
                            <div className="bg-red-500/20 border border-red-500/50 rounded-lg px-4 py-3 flex items-start gap-2">
                              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-red-600 text-sm">
                                {smtpError === 'Connection timed out' ? t('connectionTimedOut') :
                                 smtpError === 'Request timed out' ? t('requestTimedOut') :
                                 smtpError === 'Connection failed' ? t('connectionFailed') :
                                 smtpError}
                              </span>
                            </div>
                          )}
                          
                          {smtpResult && (
                            <div className={`rounded-lg overflow-hidden ${appTheme === 'light' ? 'bg-gray-50 border border-gray-200' : 'bg-navy-900 border border-navy-600'}`}>
                              <div className={`px-4 py-2 flex items-center gap-2 ${appTheme === 'light' ? 'bg-green-50 border-b border-gray-200' : 'bg-green-900/20 border-b border-navy-600'}`}>
                                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="text-green-600 font-medium text-sm">{t('smtpTestSuccess')}</span>
                              </div>
                              <div className="p-4 space-y-2 text-sm">
                                {smtpResult.banner && (
                                  <div className={appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}>
                                    <span className="font-medium">Banner:</span> {smtpResult.banner}
                                  </div>
                                )}
                                {smtpResult.greeting && (
                                  <div className={appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}>
                                    <span className="font-medium">Greeting:</span> {smtpResult.greeting}
                                  </div>
                                )}
                                {smtpResult.responseTime && (
                                  <div className={appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}>
                                    <span className="font-medium">{t('responseTime')}:</span> {smtpResult.responseTime}ms
                                  </div>
                                )}
                                {smtpResult.emailSent && (
                                  <div className="text-green-600">
                                    <span className="font-medium">✓</span> {t('testEmailSent')}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Proxy Check Tool */}
                  {toolsSelectedTool === 'proxy' && (
                    <div className={`rounded-xl ${appTheme === 'light' ? 'bg-white border border-gray-200 shadow-sm' : 'bg-navy-800 border border-navy-700'} p-6`}>
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-500 text-xl">
                          ○
                        </div>
                        <div>
                          <h3 className={`text-lg font-medium ${appTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>{t('toolProxyCheck')}</h3>
                          <p className={`text-sm ${appTheme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>{t('proxyCheckDesc')}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <label className={`block text-sm font-medium mb-1.5 ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>{t('proxyType')}</label>
                            <select
                              value={proxyType}
                              onChange={(e) => setProxyType(e.target.value as 'http' | 'socks4' | 'socks5')}
                              className={`w-full px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${appTheme === 'light' ? 'bg-gray-50 border border-gray-300 text-gray-900' : 'bg-navy-900 border border-navy-600 text-white'}`}
                            >
                              <option value="http">HTTP / HTTPS</option>
                              <option value="socks4">SOCKS4</option>
                              <option value="socks5">SOCKS5</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className={`block text-sm font-medium mb-1.5 ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>{t('proxyServer')}</label>
                            <input
                              type="text"
                              value={proxyServer}
                              onChange={(e) => setProxyServer(e.target.value)}
                              placeholder="proxy.example.com"
                              className={`w-full px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${appTheme === 'light' ? 'bg-gray-50 border border-gray-300 text-gray-900' : 'bg-navy-900 border border-navy-600 text-white'}`}
                            />
                          </div>
                          
                          <div>
                            <label className={`block text-sm font-medium mb-1.5 ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>{t('port')}</label>
                            <div className="flex gap-2">
                              <input
                                type="number"
                                value={proxyPort}
                                onChange={(e) => setProxyPort(Number(e.target.value))}
                                placeholder="8080"
                                min={1}
                                max={65535}
                                className={`flex-1 px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${appTheme === 'light' ? 'bg-gray-50 border border-gray-300 text-gray-900' : 'bg-navy-900 border border-navy-600 text-white'}`}
                              />
                            </div>
                            {/* Quick Ports */}
                            <div className="flex flex-wrap gap-2 mt-2">
                              {[
                                { port: 80, name: 'HTTP' },
                                { port: 8080, name: '8080' },
                                { port: 3128, name: 'Squid' },
                                { port: 1080, name: 'SOCKS' },
                              ].map(p => (
                                <button
                                  key={p.port}
                                  onClick={() => setProxyPort(p.port)}
                                  className={`px-2 py-1 rounded text-xs font-medium transition ${
                                    proxyPort === p.port
                                      ? 'bg-blue-600 !text-white'
                                      : appTheme === 'light'
                                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        : 'bg-navy-900 text-gray-300 hover:bg-navy-700'
                                  }`}
                                >
                                  {p.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <div>
                            <label className={`block text-sm font-medium mb-1.5 ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>{t('username')} ({t('optional')})</label>
                            <input
                              type="text"
                              value={proxyUsername}
                              onChange={(e) => setProxyUsername(e.target.value)}
                              placeholder="username"
                              className={`w-full px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${appTheme === 'light' ? 'bg-gray-50 border border-gray-300 text-gray-900' : 'bg-navy-900 border border-navy-600 text-white'}`}
                            />
                          </div>
                          
                          <div>
                            <label className={`block text-sm font-medium mb-1.5 ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>{t('password')} ({t('optional')})</label>
                            <input
                              type="password"
                              value={proxyPassword}
                              onChange={(e) => setProxyPassword(e.target.value)}
                              placeholder="••••••••"
                              className={`w-full px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${appTheme === 'light' ? 'bg-gray-50 border border-gray-300 text-gray-900' : 'bg-navy-900 border border-navy-600 text-white'}`}
                            />
                          </div>
                          
                          <div>
                            <label className={`block text-sm font-medium mb-1.5 ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>{t('testUrl')}</label>
                            <input
                              type="text"
                              value={proxyTestUrl}
                              onChange={(e) => setProxyTestUrl(e.target.value)}
                              placeholder="https://arix.my"
                              className={`w-full px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${appTheme === 'light' ? 'bg-gray-50 border border-gray-300 text-gray-900' : 'bg-navy-900 border border-navy-600 text-white'}`}
                            />
                          </div>
                          
                          <button
                            onClick={async () => {
                              if (!proxyServer.trim()) return;
                              setProxyLoading(true);
                              setProxyError(null);
                              setProxyResult(null);
                              try {
                                const result = await ipcRenderer.invoke('tools:proxyCheck', {
                                  type: proxyType,
                                  server: proxyServer.trim(),
                                  port: proxyPort,
                                  username: proxyUsername || undefined,
                                  password: proxyPassword || undefined,
                                  testUrl: proxyTestUrl,
                                });
                                if (result.success) {
                                  setProxyResult(result);
                                } else {
                                  setProxyError(result.error || 'Proxy check failed');
                                }
                              } catch (err: any) {
                                setProxyError(err.message);
                              } finally {
                                setProxyLoading(false);
                              }
                            }}
                            disabled={proxyLoading || !proxyServer.trim()}
                            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed !text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
                          >
                            {proxyLoading ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                {t('checking')}
                              </>
                            ) : (
                              <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                </svg>
                                {t('checkProxy')}
                              </>
                            )}
                          </button>
                          
                          {/* Result/Error Display */}
                          {proxyError && (
                            <div className="bg-red-500/20 border border-red-500/50 rounded-lg px-4 py-3 flex items-start gap-2">
                              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-red-600 text-sm">
                                {proxyError === 'Connection timed out' ? t('connectionTimedOut') :
                                 proxyError === 'Request timed out' ? t('requestTimedOut') :
                                 proxyError === 'Connection failed' ? t('connectionFailed') :
                                 proxyError}
                              </span>
                            </div>
                          )}
                          
                          {proxyResult && (
                            <div className={`rounded-lg overflow-hidden ${appTheme === 'light' ? 'bg-gray-50 border border-gray-200' : 'bg-navy-900 border border-navy-600'}`}>
                              <div className={`px-4 py-2 flex items-center gap-2 ${appTheme === 'light' ? 'bg-green-50 border-b border-gray-200' : 'bg-green-900/20 border-b border-navy-600'}`}>
                                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="text-green-600 font-medium text-sm">{t('proxyWorking')}</span>
                              </div>
                              <div className="p-4 space-y-2 text-sm">
                                {proxyResult.responseTime && (
                                  <div className={appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}>
                                    <span className="font-medium">{t('responseTime')}:</span> {proxyResult.responseTime}ms
                                  </div>
                                )}
                                {proxyResult.ip && (
                                  <div className={appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}>
                                    <span className="font-medium">{t('externalIp')}:</span> {proxyResult.ip}
                                  </div>
                                )}
                                {proxyResult.statusCode && (
                                  <div className={appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}>
                                    <span className="font-medium">{t('statusCode')}:</span> {proxyResult.statusCode}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Port Listener Tool */}
                  {toolsSelectedTool === 'portlistener' && (
                    <div className={`rounded-xl ${appTheme === 'light' ? 'bg-white border border-gray-200 shadow-sm' : 'bg-navy-800 border border-navy-700'} p-6`}>
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center text-orange-500 text-xl">
                            (·)
                          </div>
                          <div>
                            <h3 className={`text-lg font-medium ${appTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>{t('toolPortListener')}</h3>
                            <p className={`text-sm ${appTheme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>{t('portListenerDesc')}</p>
                          </div>
                        </div>
                        
                        <button
                          onClick={async () => {
                            setPortListenerLoading(true);
                            try {
                              const result = await ipcRenderer.invoke('tools:portListener');
                              if (result.success) {
                                setPortListenerData(result.data || []);
                                setPortListenerLastScan(new Date());
                              }
                            } catch (err: any) {
                              console.error('Port listener error:', err);
                            } finally {
                              setPortListenerLoading(false);
                            }
                          }}
                          disabled={portListenerLoading}
                          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 !text-white rounded-lg font-medium transition flex items-center gap-2"
                        >
                          {portListenerLoading ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              {t('scanning')}
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              {t('scanPorts')}
                            </>
                          )}
                        </button>
                      </div>
                      
                      {/* Filters */}
                      <div className="flex flex-wrap items-center gap-4 mb-4">
                        <input
                          type="text"
                          value={portListenerFilter}
                          onChange={(e) => setPortListenerFilter(e.target.value)}
                          placeholder={t('searchPortProcess')}
                          className={`flex-1 min-w-[200px] px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${appTheme === 'light' ? 'bg-gray-50 border border-gray-300 text-gray-900' : 'bg-navy-900 border border-navy-600 text-white'}`}
                        />
                        <div className="flex gap-2">
                          {(['all', 'tcp', 'udp'] as const).map(proto => (
                            <button
                              key={proto}
                              onClick={() => setPortListenerProtocol(proto)}
                              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                                portListenerProtocol === proto
                                  ? 'bg-orange-600 !text-white'
                                  : appTheme === 'light'
                                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    : 'bg-navy-900 text-gray-300 hover:bg-navy-700'
                              }`}
                            >
                              {proto.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      {portListenerLastScan && (
                        <p className={`text-xs mb-3 ${appTheme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                          {t('lastScan')}: {portListenerLastScan.toLocaleTimeString()}
                        </p>
                      )}
                      
                      {/* Results Table */}
                      {portListenerData.length > 0 ? (
                        <div className={`rounded-lg overflow-hidden ${appTheme === 'light' ? 'border border-gray-200' : 'border border-navy-600'}`}>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className={appTheme === 'light' ? 'bg-gray-100' : 'bg-navy-900'}>
                                <tr>
                                  <th className={`px-4 py-3 text-left font-medium ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>{t('protocol')}</th>
                                  <th className={`px-4 py-3 text-left font-medium ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>{t('address')}</th>
                                  <th className={`px-4 py-3 text-left font-medium ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>{t('port')}</th>
                                  <th className={`px-4 py-3 text-left font-medium ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>{t('process')}</th>
                                  <th className={`px-4 py-3 text-left font-medium ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>PID</th>
                                </tr>
                              </thead>
                              <tbody className={`divide-y ${appTheme === 'light' ? 'divide-gray-200' : 'divide-navy-700'}`}>
                                {portListenerData
                                  .filter(item => {
                                    const matchesFilter = !portListenerFilter || 
                                      item.port?.toString().includes(portListenerFilter) ||
                                      item.process?.toLowerCase().includes(portListenerFilter.toLowerCase()) ||
                                      item.address?.includes(portListenerFilter);
                                    const matchesProtocol = portListenerProtocol === 'all' || 
                                      item.protocol?.toLowerCase() === portListenerProtocol;
                                    return matchesFilter && matchesProtocol;
                                  })
                                  .map((item, i) => (
                                    <tr key={i} className={appTheme === 'light' ? 'hover:bg-gray-50' : 'hover:bg-navy-750'}>
                                      <td className="px-4 py-2.5">
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                          item.protocol?.toLowerCase() === 'tcp'
                                            ? 'bg-blue-500/20 text-blue-600'
                                            : 'bg-purple-500/20 text-purple-600'
                                        }`}>
                                          {item.protocol}
                                        </span>
                                      </td>
                                      <td className={`px-4 py-2.5 font-mono ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>{item.address}</td>
                                      <td className={`px-4 py-2.5 font-mono ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>{item.port}</td>
                                      <td className={`px-4 py-2.5 ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>{item.process || '-'}</td>
                                      <td className={`px-4 py-2.5 font-mono text-xs ${appTheme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>{item.pid || '-'}</td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <div className={`text-center py-12 rounded-lg ${appTheme === 'light' ? 'bg-gray-50' : 'bg-navy-900'}`}>
                          <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                          </svg>
                          <p className={`${appTheme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>{t('clickScanToStart')}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Send Files Page */}
          {activeMenu === 'sendfiles' && !activeSessionId && (
            <LANFileTransferPage peers={lanPeers} appTheme={appTheme} />
          )}

          {/* SSH Keys Page */}
          {activeMenu === 'sshkeys' && !activeSessionId && (
            <SSHKeyManager 
              onClose={() => setActiveMenu('hosts')} 
              inline={true}
              appTheme={appTheme}
            />
          )}

          {/* Known Hosts Page */}
          {activeMenu === 'knownhosts' && !activeSessionId && (
            <KnownHostsPage appTheme={appTheme} />
          )}

          {/* Port Forwarding Page */}
          {activeMenu === 'portforward' && !activeSessionId && (
            <PortForwardingPage appTheme={appTheme} servers={servers} />
          )}

          {/* 2FA Authenticator Page */}
          {activeMenu === 'twofactor' && !activeSessionId && (
            <TwoFactorPage appTheme={appTheme} />
          )}

          {/* Command Snippets Page */}
          {activeMenu === 'snippets' && !activeSessionId && (
            <SnippetPage appTheme={appTheme} />
          )}

          {/* About Page */}
          {activeMenu === 'about' && !activeSessionId && (
            <div className={`h-full overflow-auto ${appTheme === 'light' ? 'bg-gray-50' : 'bg-navy-900'}`}>
              <div className="max-w-4xl mx-auto p-8">
                {/* Header */}
                <div className="text-center mb-8">
                  <img 
                    src="./icon/i.png" 
                    alt="Marix" 
                    className="w-24 h-24 mx-auto mb-4 rounded-2xl shadow-lg"
                  />
                  <h1 className={`text-3xl font-bold mb-2 ${appTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>Marix</h1>
                  <p className={`text-lg ${appTheme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>{t('appTagline') || 'Modern SSH/SFTP/RDP Client'}</p>
                </div>

                {/* Version & Update */}
                <div className={`rounded-xl p-6 mb-6 ${appTheme === 'light' ? 'bg-white border border-gray-200' : 'bg-navy-800 border border-navy-700'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className={`text-sm ${appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>{t('version')}</span>
                      <span className={`px-3 py-1 rounded-lg font-mono font-bold ${appTheme === 'light' ? 'bg-teal-100 text-teal-700' : 'bg-teal-500/20 text-teal-400'}`}>v{APP_VERSION}</span>
                      {updateInfo.hasUpdate && (
                        <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded-full animate-pulse">
                          {t('updateAvailable') || 'Update available'}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={async () => {
                        setUpdateInfo({ checking: true });
                        try {
                          const result = await ipcRenderer.invoke('app:checkForUpdates');
                          if (result.success) {
                            // Use semver comparison instead of string comparison
                            const hasUpdate = result.latestVersion && isNewerVersion(result.latestVersion, APP_VERSION);
                            setUpdateInfo({
                              checking: false,
                              latestVersion: result.latestVersion,
                              releaseUrl: result.releaseUrl,
                              publishedAt: result.publishedAt,
                              releaseNotes: result.releaseNotes,
                              hasUpdate
                            });
                            // Update cache
                            localStorage.setItem('last_update_check', Date.now().toString());
                          } else {
                            setUpdateInfo({ checking: false, error: result.error });
                          }
                        } catch (err: any) {
                          setUpdateInfo({ checking: false, error: err.message });
                        }
                      }}
                      disabled={updateInfo.checking}
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 !text-white rounded-lg text-sm font-medium transition flex items-center gap-2"
                    >
                      {updateInfo.checking ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          {t('checking') || 'Checking...'}
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          {t('checkForUpdates') || 'Check Updates'}
                        </>
                      )}
                    </button>
                  </div>
                  
                  {/* Update Info */}
                  {updateInfo.latestVersion && (
                    <div className={`p-3 rounded-lg ${updateInfo.hasUpdate ? (appTheme === 'light' ? 'bg-orange-50 border border-orange-200' : 'bg-orange-500/10 border border-orange-500/30') : (appTheme === 'light' ? 'bg-green-50 border border-green-200' : 'bg-green-500/10 border border-green-500/30')}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {updateInfo.hasUpdate ? (
                            <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                          <span className={`text-sm font-medium ${updateInfo.hasUpdate ? 'text-orange-600' : 'text-green-600'}`}>
                            {updateInfo.hasUpdate ? `v${updateInfo.latestVersion} ${t('available') || 'available'}` : (t('upToDate') || 'Up to date')}
                          </span>
                        </div>
                        {updateInfo.hasUpdate && (
                          <button
                            onClick={async () => {
                              const url = updateInfo.releaseUrl || `https://github.com/marixdev/marix/releases/latest`;
                              console.log('[Update] Opening download URL:', url);
                              try {
                                await ipcRenderer.invoke('app:openUrl', url);
                              } catch (err) {
                                console.error('[Update] Failed to open URL:', err);
                              }
                            }}
                            className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 !text-white text-sm rounded-lg transition flex items-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            {t('download') || 'Download'}
                          </button>
                        )}
                      </div>
                      
                      {/* Release Notes / Changelog */}
                      {updateInfo.releaseNotes && (
                        <div className={`mt-3 pt-3 border-t ${updateInfo.hasUpdate ? (appTheme === 'light' ? 'border-orange-200' : 'border-orange-500/30') : (appTheme === 'light' ? 'border-green-200' : 'border-green-500/30')}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <svg className={`w-4 h-4 ${updateInfo.hasUpdate ? 'text-orange-500' : 'text-green-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className={`text-xs font-semibold ${updateInfo.hasUpdate ? 'text-orange-600' : 'text-green-600'}`}>
                              {t('releaseNotes') || 'Release Notes'}
                            </span>
                          </div>
                          <div className={`text-sm leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto ${appTheme === 'light' ? 'text-gray-600' : 'text-gray-300'}`}>
                            {updateInfo.releaseNotes}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {updateInfo.error && (
                    <div className={`p-3 rounded-lg ${appTheme === 'light' ? 'bg-red-50 border border-red-200' : 'bg-red-500/10 border border-red-500/30'}`}>
                      <p className="text-sm text-red-500">{updateInfo.error}</p>
                    </div>
                  )}
                </div>

                {/* What's New in Current Version */}
                <div className={`rounded-xl p-6 mb-6 ${appTheme === 'light' ? 'bg-white border border-gray-200' : 'bg-navy-800 border border-navy-700'}`}>
                  <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${appTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                    <svg className="w-5 h-5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                    {t('whatsNew') || "What's New"} - v{APP_VERSION}
                  </h2>
                  
                  <div className="space-y-4">
                    {/* SSH Session Monitor */}
                    <div className={`p-4 rounded-lg ${appTheme === 'light' ? 'bg-blue-50 border border-blue-200' : 'bg-blue-500/10 border border-blue-500/30'}`}>
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${appTheme === 'light' ? 'bg-blue-100' : 'bg-blue-500/20'}`}>
                          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className={`font-semibold mb-1 ${appTheme === 'light' ? 'text-blue-700' : 'text-blue-400'}`}>
                            {t('sessionMonitor') || 'SSH Session Monitor'}
                          </h3>
                          <p className={`text-sm ${appTheme === 'light' ? 'text-blue-600' : 'text-blue-300'}`}>
                            {t('sessionMonitorDesc') || 'Real-time latency monitoring and download/upload speed tracking in footer. Toggle in Settings.'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Terminal Font Selection */}
                    <div className={`p-4 rounded-lg ${appTheme === 'light' ? 'bg-purple-50 border border-purple-200' : 'bg-purple-500/10 border border-purple-500/30'}`}>
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${appTheme === 'light' ? 'bg-purple-100' : 'bg-purple-500/20'}`}>
                          <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" />
                          </svg>
                        </div>
                        <div>
                          <h3 className={`font-semibold mb-1 ${appTheme === 'light' ? 'text-purple-700' : 'text-purple-400'}`}>
                            {t('terminalFontSelection') || 'Terminal Font Selection'}
                          </h3>
                          <p className={`text-sm ${appTheme === 'light' ? 'text-purple-600' : 'text-purple-300'}`}>
                            {t('terminalFontDesc') || 'Choose from 14 premium monospace fonts for your terminal. Customize in Settings > Terminal Font.'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* App Lock */}
                    <div className={`p-4 rounded-lg ${appTheme === 'light' ? 'bg-red-50 border border-red-200' : 'bg-red-500/10 border border-red-500/30'}`}>
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${appTheme === 'light' ? 'bg-red-100' : 'bg-red-500/20'}`}>
                          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className={`font-semibold mb-1 ${appTheme === 'light' ? 'text-red-700' : 'text-red-400'}`}>
                            {t('appLock') || 'App Lock'}
                          </h3>
                          <p className={`text-sm ${appTheme === 'light' ? 'text-red-600' : 'text-red-300'}`}>
                            {t('appLockDesc') || 'Lock app after inactivity with PIN (4 digits), password, or blur screen. Configure timeout in Settings.'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Previous Features */}
                    <div className={`mt-4 pt-4 border-t ${appTheme === 'light' ? 'border-gray-200' : 'border-navy-700'}`}>
                      <h4 className={`text-sm font-semibold mb-3 ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                        {t('previousVersions') || 'Previous Versions'}
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {[
                          { ver: '1.0.13', feat: t('changelog1013') || 'Theme Editor, Custom Color Picker' },
                          { ver: '1.0.12', feat: t('changelog1012') || '50+ Terminal Themes, Snippet Manager' },
                          { ver: '1.0.11', feat: t('changelog1011') || 'File permissions editor, Symlink support' },
                          { ver: '1.0.10', feat: t('changelog1010') || 'Cloudflare DNS Manager, Hotkey navigation' },
                        ].map(item => (
                          <div key={item.ver} className={`p-2 rounded ${appTheme === 'light' ? 'bg-gray-50' : 'bg-navy-900'}`}>
                            <span className={`font-mono font-bold ${appTheme === 'light' ? 'text-teal-600' : 'text-teal-400'}`}>v{item.ver}</span>
                            <span className={`ml-2 ${appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>{item.feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Build Info */}
                {buildInfo && (
                  <div className={`rounded-xl p-6 mb-6 ${appTheme === 'light' ? 'bg-white border border-gray-200' : 'bg-navy-800 border border-navy-700'}`}>
                    <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${appTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                      <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                      {t('buildInfo') || 'Build Info'}
                    </h2>
                    <div className="space-y-3">
                      {/* Commit SHA */}
                      <div className="flex items-center justify-between">
                        <span className={`text-sm ${appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>{t('commitSha') || 'Commit SHA'}</span>
                        <div className="flex items-center gap-2">
                          <code className={`px-2 py-1 rounded text-xs font-mono ${appTheme === 'light' ? 'bg-gray-100 text-gray-700' : 'bg-navy-900 text-gray-300'}`}>
                            {buildInfo.commitShort || 'dev'}
                          </code>
                          {buildInfo.commitSha && buildInfo.commitSha !== 'unknown' && buildInfo.commitSha !== 'development' && (
                            <button
                              onClick={() => ipcRenderer.invoke('app:openUrl', `https://github.com/${buildInfo.repository || 'marixdev/marix'}/commit/${buildInfo.commitSha}`)}
                              className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-navy-700 transition ${appTheme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}
                              title={t('viewCommitOnGithub') || 'View commit on GitHub'}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {/* Branch */}
                      <div className="flex items-center justify-between">
                        <span className={`text-sm ${appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>{t('branch') || 'Branch'}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          buildInfo.branch === 'main' 
                            ? (appTheme === 'light' ? 'bg-green-100 text-green-700' : 'bg-green-500/20 text-green-400')
                            : (appTheme === 'light' ? 'bg-blue-100 text-blue-700' : 'bg-blue-500/20 text-blue-400')
                        }`}>
                          {buildInfo.branch || 'local'}
                        </span>
                      </div>
                      
                      {/* Build Time */}
                      {buildInfo.buildTime && (
                        <div className="flex items-center justify-between">
                          <span className={`text-sm ${appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>{t('buildTime') || 'Build Time'}</span>
                          <span className={`text-xs ${appTheme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                            {new Date(buildInfo.buildTime).toLocaleString()}
                          </span>
                        </div>
                      )}
                      
                      {/* GitHub Actions Run */}
                      {buildInfo.runId && buildInfo.runId !== 'local' && (
                        <div className="flex items-center justify-between">
                          <span className={`text-sm ${appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>{t('buildRun') || 'Build Run'}</span>
                          <button
                            onClick={() => ipcRenderer.invoke('app:openUrl', `https://github.com/${buildInfo.repository || 'marixdev/marix'}/actions/runs/${buildInfo.runId}`)}
                            className={`text-xs flex items-center gap-1 ${appTheme === 'light' ? 'text-teal-600 hover:text-teal-700' : 'text-teal-400 hover:text-teal-300'}`}
                          >
                            #{buildInfo.runId}
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </button>
                        </div>
                      )}
                      
                      {/* Runtime Info */}
                      <div className={`pt-3 mt-3 border-t ${appTheme === 'light' ? 'border-gray-200' : 'border-navy-700'}`}>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <div className={`text-xs ${appTheme === 'light' ? 'text-gray-400' : 'text-gray-500'}`}>{t('electronVersion') || 'Electron'}</div>
                            <div className={`text-xs font-mono ${appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>{buildInfo.electronVersion || 'N/A'}</div>
                          </div>
                          <div>
                            <div className={`text-xs ${appTheme === 'light' ? 'text-gray-400' : 'text-gray-500'}`}>{t('chromeVersion') || 'Chrome'}</div>
                            <div className={`text-xs font-mono ${appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>{buildInfo.chromeVersion?.split('.')[0] || 'N/A'}</div>
                          </div>
                          <div>
                            <div className={`text-xs ${appTheme === 'light' ? 'text-gray-400' : 'text-gray-500'}`}>{t('nodeVersion') || 'Node.js'}</div>
                            <div className={`text-xs font-mono ${appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>{buildInfo.nodeVersion?.replace('v', '') || 'N/A'}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Features Grid */}
                <div className={`rounded-xl p-6 mb-6 ${appTheme === 'light' ? 'bg-white border border-gray-200' : 'bg-navy-800 border border-navy-700'}`}>
                  <h2 className={`text-lg font-semibold mb-4 ${appTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>{t('features') || 'Features'}</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { key: 'featureSsh', name: 'SSH', icon: 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', color: 'teal' },
                      { key: 'featureSftp', name: 'SFTP', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z', color: 'blue' },
                      { key: 'featureFtp', name: 'FTP', icon: 'M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z', color: 'yellow' },
                      { key: 'featureRdp', name: 'RDP', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', color: 'purple' },
                      { key: 'feature2fa', name: '2FA/TOTP', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', color: 'pink' },
                      { key: 'featurePortForward', name: 'Port Forward', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4', color: 'cyan' },
                      { key: 'featureCloudflareDns', name: 'Cloudflare DNS', icon: 'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z', color: 'orange' },
                      { key: 'featureDnsWhois', name: 'DNS/WHOIS', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z', color: 'green' },
                      { key: 'featureSessionMonitor', name: 'Session Monitor', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', color: 'blue' },
                      { key: 'featureTerminalFont', name: 'Terminal Fonts', icon: 'M4 6h16M4 12h8m-8 6h16', color: 'purple' },
                      { key: 'featureAppLock', name: 'App Lock', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', color: 'red' },
                      { key: 'featureThemes', name: '50+ Themes', icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01', color: 'indigo' },
                    ].map(f => (
                      <div key={f.key} className={`p-3 rounded-lg text-center ${appTheme === 'light' ? 'bg-gray-50' : 'bg-navy-900'}`}>
                        <svg className={`w-6 h-6 mx-auto mb-2 text-${f.color}-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={f.icon} />
                        </svg>
                        <span className={`text-xs font-medium ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>{t(f.key as any) || f.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Security & Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Security */}
                  <div className={`rounded-xl p-6 ${appTheme === 'light' ? 'bg-white border border-gray-200' : 'bg-navy-800 border border-navy-700'}`}>
                    <h2 className={`text-lg font-semibold mb-3 flex items-center gap-2 ${appTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      {t('security') || 'Security'}
                    </h2>
                    <ul className={`space-y-2 text-sm ${appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                      <li className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {t('zeroKnowledge') || 'Zero-knowledge architecture'}
                      </li>
                      <li className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {t('localStorage') || 'Data stored locally only'}
                      </li>
                      <li className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {t('argon2Encryption') || 'Argon2id encrypted backups'}
                      </li>
                      <li className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {t('openSource') || 'Open source on GitHub'}
                      </li>
                    </ul>
                  </div>

                  {/* Author */}
                  <div className={`rounded-xl p-6 ${appTheme === 'light' ? 'bg-white border border-gray-200' : 'bg-navy-800 border border-navy-700'}`}>
                    <h2 className={`text-lg font-semibold mb-3 ${appTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>{t('author') || 'Author'}</h2>
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white font-bold text-xl">
                        M
                      </div>
                      <div>
                        <p className={`font-semibold ${appTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>{APP_AUTHOR}</p>
                        <p className={`text-xs mb-1 ${appTheme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>{t('authorRole') || 'Developer & Maintainer'}</p>
                        <button
                          onClick={() => ipcRenderer.invoke('app:openUrl', GITHUB_REPO)}
                          className="flex items-center gap-1 text-teal-500 hover:text-teal-400 transition text-sm"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                          </svg>
                          {t('viewOnGithub') || 'View on GitHub'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tech Stack */}
                <div className={`rounded-xl p-6 ${appTheme === 'light' ? 'bg-white border border-gray-200' : 'bg-navy-800 border border-navy-700'}`}>
                  <h2 className={`text-lg font-semibold mb-3 ${appTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>{t('techStack') || 'Technology'}</h2>
                  <div className="flex flex-wrap gap-2">
                    {['Electron', 'React', 'TypeScript', 'Tailwind CSS', 'xterm.js', 'SSH2', 'Argon2'].map(tech => (
                      <span key={tech} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${appTheme === 'light' ? 'bg-gray-100 text-gray-700' : 'bg-navy-900 text-gray-300'}`}>
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Active Sessions */}
          {sessions.map(session => (
            <div
              key={session.id}
              className="h-full"
              style={{ display: session.id === activeSessionId ? 'block' : 'none' }}
            >
              {session.type === 'terminal' ? (
                <XTermTerminal 
                  connectionId={session.connectionId}
                  theme={currentTheme}
                  server={session.server}
                  showSnippetPanel={session.server.id !== 'local'}
                />
              ) : session.type === 'rdp' ? (
                <RDPViewer
                  connectionId={session.connectionId}
                  serverName={session.server.name || session.server.host}
                  onConnect={() => console.log('[App] RDP connected:', session.connectionId)}
                  onClose={() => handleCloseSession(session.id)}
                  onError={(err) => alert('RDP Error: ' + err)}
                />
              ) : session.type === 'wss' ? (
                <WSSViewer
                  connectionId={session.connectionId}
                  serverName={session.server.name || session.server.host}
                  url={session.server.wssUrl || `wss://${session.server.host}:${session.server.port}/`}
                  theme={currentTheme}
                  initialStatus={(session as any).wssStatus || 'connected'}
                  initialError={(session as any).wssError}
                  onConnect={() => console.log('[App] WSS connected:', session.connectionId)}
                  onClose={() => handleCloseSession(session.id)}
                  onError={(err) => console.log('[App] WSS Error:', err)}
                />
              ) : session.type === 'database' ? (
                <DatabaseClient
                  server={session.server as any}
                  connectionId={session.connectionId}
                  theme={appTheme}
                  onClose={() => handleCloseSession(session.id)}
                  onDbInfo={(info) => {
                    setSessions(prev => prev.map(s => 
                      s.id === session.id ? { ...s, dbInfo: info } : s
                    ));
                  }}
                />
              ) : (
                <DualPaneSFTP 
                  connectionId={session.connectionId} 
                  server={session.server}
                  initialLocalPath={session.sftpPaths?.localPath}
                  initialRemotePath={session.sftpPaths?.remotePath}
                  onPathChange={(local, remote) => updateSftpPaths(session.id, local, remote)}
                  onSftpConnected={() => handleSftpConnected(session.id, session.connectionId)}
                />
              )}
            </div>
          ))}
        </div>

        {/* Global Footer Bar */}
        <div className={`border-t px-4 py-2 flex items-center justify-between min-w-0 ${appTheme === 'light' ? 'bg-gray-100 border-gray-200' : 'bg-navy-800 border-navy-700'}`}>
          {/* Left side */}
          <div className="flex items-center gap-4 text-xs min-w-0 overflow-hidden">
            {/* SSH Session OS Info */}
            {activeSession && activeSession.type !== 'rdp' && activeSession.type !== 'wss' && activeSession.type !== 'database' &&
             activeSession.server.protocol !== 'ftp' && activeSession.server.protocol !== 'ftps' ? (
              activeSession.osInfo ? (
                <>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <svg className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    </svg>
                    <span className={appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}>{activeSession.osInfo.os}</span>
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <svg className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    <span className={appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}>{activeSession.osInfo.ip}</span>
                  </div>
                  {activeSession.osInfo.provider && (
                    <div className="flex items-center gap-1.5 min-w-0">
                      <svg className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <span className={appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}>{activeSession.osInfo.provider}</span>
                    </div>
                  )}
                </>
              ) : (
                <span className={appTheme === 'light' ? 'text-gray-500' : 'text-gray-500'}>{t('detectingSystemInfo') || 'Detecting system info...'}</span>
              )
            ) : activeSession && activeSession.type === 'database' ? (
              /* Database Session Info */
              activeSession.dbInfo ? (
                <>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <svg className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                    </svg>
                    <span className={appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}>{activeSession.dbInfo.version}</span>
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <svg className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    <span className={appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}>{activeSession.dbInfo.ip}</span>
                  </div>
                  {activeSession.dbInfo.provider && (
                    <div className="flex items-center gap-1.5 min-w-0">
                      <svg className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <span className={appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}>{activeSession.dbInfo.provider}</span>
                    </div>
                  )}
                </>
              ) : (
                <span className={appTheme === 'light' ? 'text-gray-500' : 'text-gray-500'}>{t('detectingSystemInfo') || 'Detecting system info...'}</span>
              )
            ) : (
              /* Default: Show version and build info */
              <>
                <div className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className={appTheme === 'light' ? 'text-gray-700 font-medium' : 'text-gray-300 font-medium'}>Marix v{APP_VERSION}</span>
                </div>
                {buildInfo && (
                  <>
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                      <span className={`${appTheme === 'light' ? 'text-gray-500' : 'text-gray-500'} font-mono`}>{buildInfo.commitShort || 'dev'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className={appTheme === 'light' ? 'text-gray-500' : 'text-gray-500'}>
                        {buildInfo.buildTime ? new Date(buildInfo.buildTime).toLocaleDateString() : 'local'}
                      </span>
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* Center - Update Toast */}
          {showUpdateNotification && updateInfo.hasUpdate && (
            <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${appTheme === 'light' ? 'bg-teal-50 border border-teal-200' : 'bg-teal-500/10 border border-teal-500/30'}`}>
              <svg className="w-4 h-4 text-teal-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span className={`text-xs ${appTheme === 'light' ? 'text-teal-700' : 'text-teal-400'}`}>
                {t('newVersionAvailable') || 'New version'} <span className="font-semibold">v{updateInfo.latestVersion}</span>
              </span>
              <button
                onClick={async () => {
                  const url = updateInfo.releaseUrl || 'https://github.com/marixdev/marix/releases/latest';
                  console.log('[Update] Opening URL from toast:', url);
                  try {
                    await ipcRenderer.invoke('app:openUrl', url);
                  } catch (err) {
                    console.error('[Update] Failed to open URL:', err);
                  }
                }}
                className="px-2 py-0.5 text-xs font-medium bg-teal-500 text-white rounded hover:bg-teal-600 transition"
              >
                {t('update') || 'Update'}
              </button>
              <button
                onClick={() => setShowUpdateNotification(false)}
                className={`text-xs ${appTheme === 'light' ? 'text-gray-500 hover:text-gray-700' : 'text-gray-400 hover:text-white'} transition`}
              >
                {t('later') || 'Later'}
              </button>
              <button
                onClick={() => setShowUpdateNotification(false)}
                className={`p-0.5 ${appTheme === 'light' ? 'text-gray-400 hover:text-gray-600' : 'text-gray-500 hover:text-white'} transition`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Right side - Controls */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Session monitor indicator - show for SSH sessions */}
            {activeSession && activeSession.type === 'terminal' && activeSession.server.protocol === 'ssh' && (
              <SessionMonitorIndicator connectionId={activeSession.connectionId} />
            )}
            
            {/* Note button - show when session is active (not local terminal) */}
            {activeSession && activeSession.server.id !== 'local' && (
              <button
                onClick={() => {
                  // Load note content for current server
                  const serverNote = servers.find(s => s.id === activeSession.server.id)?.notes || '';
                  setNoteContent(serverNote);
                  setShowNotePopup(true);
                }}
                className={`flex items-center gap-1 text-xs ${
                  activeSession.server.notes 
                    ? 'text-amber-500 hover:text-amber-400' 
                    : appTheme === 'light' ? 'text-gray-500 hover:text-gray-700' : 'text-gray-500 hover:text-white'
                } transition`}
                title={t('notes')}
              >
                <svg className="w-3.5 h-3.5" fill={activeSession.server.notes ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                {t('notes')}
              </button>
            )}
            {/* Theme selector for SSH sessions */}
            {activeSession && activeSession.type !== 'rdp' && activeSession.type !== 'wss' && activeSession.type !== 'database' &&
             activeSession.server.protocol !== 'ftp' && activeSession.server.protocol !== 'ftps' && (
              <ThemeSelector
                currentTheme={currentTheme}
                onThemeChange={handleThemeChange}
              />
            )}
            {/* Terminal/SFTP switch for remote SSH sessions */}
            {activeSession && activeSession.type !== 'rdp' && activeSession.type !== 'wss' && activeSession.type !== 'database' &&
             activeSession.server.protocol !== 'ftp' && activeSession.server.protocol !== 'ftps' && activeSession.server.id !== 'local' && (
              <div className={`flex items-center rounded overflow-hidden ${appTheme === 'light' ? 'bg-gray-200' : 'bg-navy-900'}`}>
                <button
                  onClick={toggleSessionType}
                  className={`px-3 py-1 text-xs font-medium transition ${
                    activeSession.type === 'terminal'
                      ? 'bg-teal-600 text-white'
                      : appTheme === 'light' ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-300' : 'text-gray-400 hover:text-white hover:bg-navy-700'
                  }`}
                >
                  {t('terminal')}
                </button>
                <button
                  onClick={toggleSessionType}
                  className={`px-3 py-1 text-xs font-medium transition ${
                    activeSession.type === 'sftp'
                      ? 'bg-teal-600 text-white'
                      : appTheme === 'light' ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-300' : 'text-gray-400 hover:text-white hover:bg-navy-700'
                  }`}
                >
                  {t('sftp')}
                </button>
              </div>
            )}
            {/* About button when not in SSH session */}
            {(!activeSession || activeSession.type === 'rdp' || activeSession.type === 'wss' || activeSession.type === 'database' ||
              activeSession.server.protocol === 'ftp' || activeSession.server.protocol === 'ftps') && (
              <button
                onClick={() => setActiveMenu('about')}
                className={`flex items-center gap-1 text-xs ${appTheme === 'light' ? 'text-gray-500 hover:text-gray-700' : 'text-gray-500 hover:text-white'} transition`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t('about')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>

      {/* Sticky Note Popup */}
      {showNotePopup && activeSession && activeSession.server.id !== 'local' && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/30"
            onClick={() => setShowNotePopup(false)}
          />
          
          {/* Sticky Note Panel */}
          <div className={`relative w-80 max-h-96 rounded-lg shadow-2xl flex flex-col animate-in slide-in-from-bottom-4 duration-200 ${
            appTheme === 'light' ? 'bg-amber-50 border border-amber-200' : 'bg-amber-900/90 border border-amber-700'
          }`}>
            {/* Header */}
            <div className={`flex items-center justify-between px-3 py-2 border-b ${
              appTheme === 'light' ? 'border-amber-200' : 'border-amber-700'
            }`}>
              <div className="flex items-center gap-2">
                <svg className={`w-4 h-4 ${appTheme === 'light' ? 'text-amber-600' : 'text-amber-400'}`} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span className={`text-sm font-medium truncate ${appTheme === 'light' ? 'text-amber-800' : 'text-amber-100'}`}>
                  {activeSession.server.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {noteSaving && (
                  <span className={`text-xs ${appTheme === 'light' ? 'text-amber-600' : 'text-amber-400'}`}>
                    {t('noteSaving')}
                  </span>
                )}
                <button
                  onClick={() => setShowNotePopup(false)}
                  className={`p-1 rounded hover:bg-black/10 transition ${appTheme === 'light' ? 'text-amber-600' : 'text-amber-300'}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Note Content */}
            <textarea
              value={noteContent}
              onChange={(e) => {
                const newValue = e.target.value;
                setNoteContent(newValue);
                setNoteSaving(true);
                
                // Clear previous debounce timeout
                if (noteDebounceRef.current) {
                  clearTimeout(noteDebounceRef.current);
                }
                
                // Auto-save with debounce (500ms)
                noteDebounceRef.current = setTimeout(async () => {
                  const updatedServer = { ...activeSession.server, notes: newValue };
                  await ipcRenderer.invoke('servers:update', updatedServer);
                  // Update local state
                  setServers(prev => prev.map(s => s.id === activeSession.server.id ? updatedServer : s));
                  // Update session server reference
                  setSessions(prev => prev.map(sess => 
                    sess.id === activeSession.id ? { ...sess, server: updatedServer } : sess
                  ));
                  setNoteSaving(false);
                }, 500);
              }}
              placeholder={t('notePlaceholder')}
              className={`flex-1 w-full p-3 text-sm resize-none focus:outline-none ${
                appTheme === 'light' 
                  ? 'bg-transparent text-amber-900 placeholder-amber-400' 
                  : 'bg-transparent text-amber-50 placeholder-amber-500'
              }`}
              style={{ minHeight: '200px' }}
              autoFocus
            />
            
            {/* Footer */}
            <div className={`px-3 py-2 border-t text-xs ${
              appTheme === 'light' ? 'border-amber-200 text-amber-500' : 'border-amber-700 text-amber-500'
            }`}>
              {noteContent ? `${noteContent.length} chars` : t('noNotesYet')}
            </div>
          </div>
        </div>
      )}

      {/* Tag Edit Popup */}
      {tagMenuOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setTagMenuOpen(null)}
          />
          
          {/* Popup */}
          <div className="relative bg-navy-800 border border-navy-600 rounded-xl shadow-2xl p-5 min-w-[280px] animate-in fade-in zoom-in duration-150">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: getTagColor(tagMenuOpen) }}
                />
                <h3 className="text-white font-medium">Edit Tag: {tagMenuOpen}</h3>
              </div>
              <button
                onClick={() => setTagMenuOpen(null)}
                className="text-gray-400 hover:text-white transition p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Color section */}
            <div className="mb-4">
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">Choose Color</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {TAG_COLORS.map(color => {
                  const isSelected = tagColors[tagMenuOpen] === color.value || 
                    (tagColors[tagMenuOpen] === color.hex) ||
                    (!tagColors[tagMenuOpen] && color.value === 'purple');
                  return (
                    <button
                      key={color.value}
                      onClick={() => handleTagColorChange(tagMenuOpen, color.value)}
                      style={{ backgroundColor: color.hex }}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition hover:scale-110 ${
                        isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-navy-800' : ''
                      }`}
                      title={color.name}
                    >
                      {isSelected && (
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
              
              {/* Custom color picker */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500">Custom:</label>
                <input
                  type="color"
                  value={tagColors[tagMenuOpen]?.startsWith('#') ? tagColors[tagMenuOpen] : getTagColor(tagMenuOpen)}
                  onChange={(e) => handleTagColorChange(tagMenuOpen, e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                  title="Pick custom color"
                />
                <span className="text-xs text-gray-500 font-mono">
                  {tagColors[tagMenuOpen]?.startsWith('#') ? tagColors[tagMenuOpen] : getTagColor(tagMenuOpen)}
                </span>
              </div>
            </div>
            
            {/* Divider */}
            <div className="border-t border-navy-600 my-4"></div>
            
            {/* Danger zone */}
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">Danger Zone</label>
              <button
                onClick={() => handleTagDelete(tagMenuOpen)}
                className="w-full px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition flex items-center justify-center gap-2 text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Tag
              </button>
              <p className="text-xs text-gray-500 mt-2 text-center">
                This will remove the tag from all servers
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Connect Panel */}
      {quickConnectOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="flex-1 bg-black/50 backdrop-blur-sm"
            onClick={() => { setQuickConnectOpen(false); setQuickConnectSearch(''); }}
          />
          
          {/* Slide-in Panel */}
          <div className="w-full max-w-sm bg-navy-800 border-l border-navy-700 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-4 border-b border-navy-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{t('quickConnect')}</h3>
              <button
                onClick={() => { setQuickConnectOpen(false); setQuickConnectSearch(''); }}
                className="p-1.5 hover:bg-navy-700 rounded-lg transition text-gray-400 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Search */}
            <div className="p-4 border-b border-navy-700">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={quickConnectSearch}
                  onChange={(e) => setQuickConnectSearch(e.target.value)}
                  placeholder={t('searchServers')}
                  className="w-full pl-9 pr-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500"
                  autoFocus
                />
              </div>
            </div>
            
            {/* Server list */}
            <div className="flex-1 overflow-y-auto">
              {servers
                .filter(s => {
                  if (!quickConnectSearch) return true;
                  const q = quickConnectSearch.toLowerCase();
                  return s.name?.toLowerCase().includes(q) ||
                    s.host?.toLowerCase().includes(q) ||
                    s.username?.toLowerCase().includes(q) ||
                    s.tags?.some(t => t.toLowerCase().includes(q)) ||
                    s.protocol?.toLowerCase().includes(q);
                })
                .map(server => {
                  const isConnected = sessions.some(s => s.server.id === server.id);
                  const protocol = server.protocol || 'ssh';
                  // Protocol config matching ServerList
                  const protocolConfig = {
                    ssh: { color: '#10b981', bgColor: 'bg-emerald-500/10' },
                    rdp: { color: '#3b82f6', bgColor: 'bg-blue-500/10' },
                    ftp: { color: '#f59e0b', bgColor: 'bg-amber-500/10' },
                    ftps: { color: '#f97316', bgColor: 'bg-orange-500/10' },
                    wss: { color: '#8b5cf6', bgColor: 'bg-violet-500/10' },
                    mysql: { color: '#00758f', bgColor: '' },
                    postgresql: { color: '#336791', bgColor: '' },
                    mongodb: { color: '#47a248', bgColor: '' },
                    redis: { color: '#dc382d', bgColor: '' },
                    sqlite: { color: '#003b57', bgColor: '' }
                  };
                  const config = protocolConfig[protocol as keyof typeof protocolConfig] || { color: '#6b7280', bgColor: 'bg-gray-500/10' };
                  const isDatabaseProtocol = ['mysql', 'postgresql', 'mongodb', 'redis', 'sqlite'].includes(protocol);
                  
                  return (
                    <button
                      key={server.id}
                      onClick={() => {
                        handleConnect(server);
                        setQuickConnectOpen(false);
                        setQuickConnectSearch('');
                      }}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-navy-700 transition text-left border-b border-navy-700/50"
                    >
                      {/* Protocol icon matching ServerList style */}
                      {isDatabaseProtocol ? (
                        <div className="w-9 h-9 flex items-center justify-center">
                          <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5">
                            <ellipse cx="12" cy="5" rx="9" ry="3"/>
                            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
                            <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/>
                          </svg>
                        </div>
                      ) : (
                        <div 
                          className={`w-9 h-9 rounded-lg ${config.bgColor} flex items-center justify-center`}
                          style={{ color: config.color }}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {protocol === 'ssh' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />}
                            {protocol === 'rdp' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />}
                            {protocol === 'ftp' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />}
                            {protocol === 'ftps' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />}
                            {protocol === 'wss' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />}
                          </svg>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white truncate">{server.name || server.host}</span>
                          {isConnected && (
                            <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {protocol === 'wss' ? server.wssUrl : `${server.username}@${server.host}`}
                        </div>
                        {server.tags && server.tags.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {server.tags.slice(0, 2).map(tag => (
                              <span 
                                key={tag} 
                                className="text-xs px-1.5 py-0.5 rounded"
                                style={{ 
                                  backgroundColor: `${getTagColor(tag)}20`,
                                  color: getTagColor(tag)
                                }}
                              >
                                {tag}
                              </span>
                            ))}
                            {server.tags.length > 2 && (
                              <span className="text-xs text-gray-500">+{server.tags.length - 2}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                        protocol === 'ssh' ? 'bg-teal-500/20 text-teal-400' :
                        protocol === 'rdp' ? 'bg-blue-500/20 text-blue-400' :
                        protocol === 'ftp' ? 'bg-orange-500/20 text-orange-400' :
                        protocol === 'ftps' ? 'bg-amber-500/20 text-amber-400' :
                        protocol === 'wss' ? 'bg-indigo-500/20 text-indigo-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {protocol.toUpperCase()}
                      </span>
                    </button>
                  );
                })}
              
              {servers.length === 0 && (
                <div className="px-4 py-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-navy-700 flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500">No hosts yet</p>
                  <p className="text-xs text-gray-600 mt-1">Add your first host to get started</p>
                </div>
              )}
              
              {servers.length > 0 && quickConnectSearch && servers.filter(s => {
                const q = quickConnectSearch.toLowerCase();
                return s.name?.toLowerCase().includes(q) || 
                  s.host?.toLowerCase().includes(q) ||
                  s.tags?.some(t => t.toLowerCase().includes(q));
              }).length === 0 && (
                <div className="px-4 py-12 text-center">
                  <p className="text-sm text-gray-500">No matching hosts</p>
                  <p className="text-xs text-gray-600 mt-1">Try a different search term</p>
                </div>
              )}
            </div>
            
            {/* Footer with Add Host button */}
            <div className="p-4 border-t border-navy-700 bg-navy-800">
              <button
                onClick={() => {
                  setQuickConnectOpen(false);
                  setQuickConnectSearch('');
                  setEditingServer(null);
                  setShowModal(true);
                }}
                className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg transition flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t('addNewHost')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <AddServerModal
          server={editingServer}
          existingTags={allTags}
          onSave={handleSaveServer}
          onClose={() => { setShowModal(false); setEditingServer(null); }}
        />
      )}

      {/* SSH Fingerprint Modal */}
      {fingerprintModal && (
        <SSHFingerprintModal
          host={fingerprintModal.server.host}
          port={fingerprintModal.server.port || 22}
          onAccept={fingerprintModal.onProceed}
          onReject={() => {
            setFingerprintModal(null);
            setConnectingServerId(null);
          }}
          onSkip={fingerprintModal.onProceed}
        />
      )}

      {/* SSH Key Manager Modal */}
      {showSSHKeyManager && (
        <SSHKeyManager
          onClose={() => setShowSSHKeyManager(false)}
        />
      )}

      {/* LAN Share Modal */}
      {/* Server Selection Modal - Step before Share on LAN */}
      {showServerSelectionModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-2xl rounded-xl shadow-2xl border ${appTheme === 'light' ? 'bg-white border-gray-200' : 'bg-gray-900 border-gray-700'}`}>
            <div className={`p-4 border-b ${appTheme === 'light' ? 'border-gray-200' : 'border-gray-700'}`}>
              <h2 className={`text-lg font-bold ${appTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                Select Servers to Share
              </h2>
              <p className={`text-sm ${appTheme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                Choose one or more servers to share via LAN
              </p>
            </div>
            
            <div className="p-4 max-h-[400px] overflow-y-auto">
              {/* Quick select by tag */}
              {allTags.length > 0 && (
                <div className="mb-4">
                  <p className={`text-xs font-medium mb-2 ${appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>Quick select by tag:</p>
                  <div className="flex flex-wrap gap-2">
                    {allTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => {
                          const serversByTag = servers.filter(s => s.tags?.includes(tag)).map(s => s.id);
                          setSelectedServerIdsForShare(prev => [...new Set([...prev, ...serversByTag])]);
                        }}
                        className={`text-xs px-2 py-1 rounded-full border transition ${
                          appTheme === 'light' 
                            ? 'border-gray-300 text-gray-600 hover:bg-gray-100' 
                            : 'border-gray-600 text-gray-300 hover:bg-gray-800'
                        }`}
                      >
                        {tag} ({servers.filter(s => s.tags?.includes(tag)).length})
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Server list */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {servers.map(server => (
                  <button
                    key={server.id}
                    onClick={() => {
                      setSelectedServerIdsForShare(prev => 
                        prev.includes(server.id) 
                          ? prev.filter(id => id !== server.id)
                          : [...prev, server.id]
                      );
                    }}
                    className={`p-3 rounded-lg border text-left transition ${
                      selectedServerIdsForShare.includes(server.id)
                        ? 'border-teal-500 bg-teal-500/10'
                        : appTheme === 'light' 
                          ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          : 'border-gray-700 hover:border-gray-600 hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {selectedServerIdsForShare.includes(server.id) && (
                        <svg className="w-4 h-4 text-teal-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                      <span className={`font-medium text-sm ${appTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                        {server.name}
                      </span>
                    </div>
                    <p className={`text-xs mt-1 ${appTheme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                      {server.host}:{server.port}
                    </p>
                  </button>
                ))}
              </div>
            </div>
            
            <div className={`p-4 border-t flex justify-between items-center ${appTheme === 'light' ? 'border-gray-200' : 'border-gray-700'}`}>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedServerIdsForShare(servers.map(s => s.id))}
                  className={`text-xs px-3 py-1.5 rounded ${appTheme === 'light' ? 'text-teal-600 hover:bg-teal-50' : 'text-teal-400 hover:bg-teal-900/20'}`}
                >
                  Select All
                </button>
                <button
                  onClick={() => setSelectedServerIdsForShare([])}
                  className={`text-xs px-3 py-1.5 rounded ${appTheme === 'light' ? 'text-gray-600 hover:bg-gray-100' : 'text-gray-400 hover:bg-gray-800'}`}
                >
                  Clear
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowServerSelectionModal(false);
                    setSelectedServerIdsForShare([]);
                  }}
                  className={`px-4 py-2 rounded-lg ${appTheme === 'light' ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-gray-700 text-white hover:bg-gray-600'}`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowServerSelectionModal(false);
                    setLanShareMode('send');
                    setShowLANShareModal(true);
                  }}
                  disabled={selectedServerIdsForShare.length === 0}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Share ({selectedServerIdsForShare.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pair Code Popup - Inline popup for receiver */}
      {showPairCodePopup && pendingIncomingShare && (
        <PairCodePopup
          incomingShare={pendingIncomingShare}
          onClose={() => {
            setShowPairCodePopup(false);
            setPendingIncomingShare(null);
          }}
          onSuccess={() => {
            setShowPairCodePopup(false);
            setPendingIncomingShare(null);
            loadServers(); // Refresh server list
          }}
        />
      )}

      {showLANShareModal && (
        <LANShareModal
          servers={servers}
          selectedServerIds={selectedServerIdsForShare}
          mode={lanShareMode}
          onClose={() => {
            setShowLANShareModal(false);
            setLanShareMode('send');
            setSelectedServerIdsForShare([]);
            setPendingIncomingShare(null);
          }}
          onServersImported={() => {
            // Reload servers from storage
            loadServers();
          }}
          initialIncomingShare={pendingIncomingShare}
          onClearIncomingShare={() => setPendingIncomingShare(null)}
        />
      )}

      {/* Backup Modal */}
      {backupModalOpen && (
        <BackupModal
          mode={backupModalOpen}
          onClose={closeBackupModal}
          backupMethod={backupMethod}
          onMethodChange={setBackupMethod}
          password={backupPassword}
          onPasswordChange={setBackupPassword}
          confirmPassword={backupConfirmPassword}
          onConfirmPasswordChange={setBackupConfirmPassword}
          error={backupError}
          success={backupSuccess}
          loading={backupLoading}
          gitlabConnected={gitlabConnected}
          gitlabConnecting={gitlabConnecting}
          gitlabBackupInfo={gitlabBackupInfo}
          onGitLabConnect={handleGitLabConnect}
          onGitLabDisconnect={handleGitLabDisconnect}
          onLocalBackup={handleCreateBackup}
          onLocalRestore={handleRestoreBackup}
          onGitLabBackup={handleGitLabBackup}
          onGitLabRestore={handleGitLabRestore}
          githubUser={githubUser}
          githubLoading={githubLoading}
          githubPolling={githubPolling}
          githubDeviceCode={githubDeviceCode}
          onGitHubConnect={handleGitHubLogin}
          onGitHubLogout={handleGitHubLogout}
          onGitHubBackup={handleGitHubUpload}
          onGitHubRestore={handleGitHubDownload}
          gdriveConnected={gdriveConnected}
          gdriveConnecting={gdriveConnecting}
          gdriveBackupInfo={gdriveBackupInfo}
          gdriveUser={gdriveUser}
          onGDriveConnect={handleGoogleDriveConnect}
          onGDriveDisconnect={handleGoogleDriveDisconnect}
          onGDriveBackup={handleGoogleDriveBackup}
          onGDriveRestore={handleGoogleDriveRestore}
          boxConnected={boxConnected}
          boxConnecting={boxConnecting}
          boxBackupInfo={boxBackupInfo}
          onBoxConnect={handleBoxConnect}
          onBoxDisconnect={handleBoxDisconnect}
          onBoxBackup={handleBoxBackup}
          onBoxRestore={handleBoxRestore}
          t={t}
        />
      )}

      {/* RDP Connecting Overlay */}
      {rdpConnecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className={`relative w-[450px] rounded-xl shadow-2xl border overflow-hidden ${
            appTheme === 'dark' 
              ? 'bg-gray-900 border-gray-700' 
              : 'bg-white border-gray-200'
          }`}>
            {/* Header */}
            <div className={`px-6 py-4 border-b flex items-center gap-3 ${
              appTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                rdpConnecting.status === 'error' 
                  ? 'bg-red-500/20' 
                  : 'bg-blue-500/20'
              }`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`w-5 h-5 ${
                  rdpConnecting.status === 'error' ? 'text-red-400' : 'text-blue-400'
                }`}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h2 className={`text-lg font-semibold ${appTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {rdpConnecting.status === 'error' ? t('rdpConnectionError') : t('rdpConnecting')}
                </h2>
                <p className={`text-sm ${appTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  {rdpConnecting.server.name || rdpConnecting.server.host}
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {rdpConnecting.status === 'connecting' ? (
                <div className="text-center py-4">
                  <div className="animate-spin w-12 h-12 mx-auto mb-4 border-3 border-blue-500 border-t-transparent rounded-full"></div>
                  <p className={`${appTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                    {t('rdpEstablishing')}
                  </p>
                  <p className={`text-sm mt-2 ${appTheme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                    {rdpConnecting.server.host}:{rdpConnecting.server.port || 3389}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className={`p-4 rounded-lg ${
                    appTheme === 'dark' ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'
                  }`}>
                    <p className={`text-sm whitespace-pre-wrap ${
                      appTheme === 'dark' ? 'text-red-300' : 'text-red-700'
                    }`}>
                      {rdpConnecting.error}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer - only show close button on error */}
            {rdpConnecting.status === 'error' && (
              <div className={`px-6 py-4 border-t flex justify-end ${
                appTheme === 'dark' ? 'border-gray-700 bg-gray-800/30' : 'border-gray-200 bg-gray-50'
              }`}>
                <button
                  onClick={() => setRdpConnecting(null)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    appTheme === 'dark' 
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  {t('close')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RDP Dependencies Installer (Linux only) */}
      {showRDPDepsInstaller && pendingRDPServer && (
        <RDPDepsInstaller
          isOpen={showRDPDepsInstaller}
          onClose={() => {
            setShowRDPDepsInstaller(false);
            setPendingRDPServer(null);
          }}
          onOpenTerminal={(command) => {
            setShowRDPDepsInstaller(false);
            // Pass pendingRDPServer to track for auto-connect after install
            openLocalTerminal(command, pendingRDPServer);
          }}
          theme={appTheme}
        />
      )}

      {/* Cloudflare DNS Record Modal */}
      {cfRecordModal && (
        <CloudflareRecordModal
          appTheme={appTheme}
          mode={cfRecordModal.mode}
          record={cfRecordModal.record}
          zoneName={cfZones.find(z => z.id === cfSelectedZone)?.name || ''}
          loading={cfLoading}
          servers={servers}
          t={t}
          onSave={(data) => {
            if (cfRecordModal.mode === 'create') {
              createCloudflareRecord(data);
            } else if (cfRecordModal.record) {
              updateCloudflareRecord(cfRecordModal.record.id, data);
            }
          }}
          onClose={() => setCfRecordModal(null)}
        />
      )}
    </div>
  );
};

// Set Credential Modal (for PIN/Password)
const SetCredentialModal: React.FC<{
  method: 'pin' | 'password';
  onSave: (credential: string) => void;
  onCancel: () => void;
  appTheme: 'dark' | 'light';
  t: (key: any) => string;
}> = ({ method, onSave, onCancel, appTheme, t }) => {
  const [value, setValue] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const isDark = appTheme === 'dark';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (method === 'pin') {
      if (!/^\d{4}$/.test(value)) {
        setError(t('appLockPinRequirement') || 'PIN must be 4 digits');
        return;
      }
    } else {
      if (value.length < 4) {
        setError(t('appLockPasswordRequirement') || 'Password must be at least 4 characters');
        return;
      }
    }
    
    if (value !== confirm) {
      setError(t('appLockCredentialMismatch') || 'Credentials do not match');
      return;
    }
    
    onSave(value);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className={`w-96 rounded-xl shadow-2xl p-6 ${isDark ? 'bg-navy-800 border border-navy-700' : 'bg-white border border-gray-200'}`}>
        <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {method === 'pin' 
            ? (t('appLockSetPin') || 'Set PIN Code')
            : (t('appLockSetPassword') || 'Set Password')
          }
        </h3>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className={`block text-sm mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                {method === 'pin' ? (t('appLockEnterPin') || 'Enter PIN') : (t('appLockEnterPassword') || 'Enter Password')}
              </label>
              <input
                type={method === 'pin' ? 'tel' : 'password'}
                value={value}
                onChange={e => { 
                  setValue(method === 'pin' ? e.target.value.replace(/\D/g, '').slice(0, 6) : e.target.value);
                  setError('');
                }}
                maxLength={method === 'pin' ? 6 : undefined}
                placeholder={method === 'pin' ? '••••••' : '••••••••'}
                className={`w-full px-3 py-2 rounded-lg border ${
                  isDark 
                    ? 'bg-navy-700 border-navy-600 text-white placeholder-gray-500' 
                    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>
            
            <div>
              <label className={`block text-sm mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                {t('appLockConfirmCredential') || 'Confirm'}
              </label>
              <input
                type={method === 'pin' ? 'tel' : 'password'}
                value={confirm}
                onChange={e => { 
                  setConfirm(method === 'pin' ? e.target.value.replace(/\D/g, '').slice(0, 6) : e.target.value);
                  setError('');
                }}
                maxLength={method === 'pin' ? 6 : undefined}
                placeholder={method === 'pin' ? '••••••' : '••••••••'}
                className={`w-full px-3 py-2 rounded-lg border ${
                  isDark 
                    ? 'bg-navy-700 border-navy-600 text-white placeholder-gray-500' 
                    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>
            
            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}
            
            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              {method === 'pin' 
                ? (t('appLockPinHint') || 'Enter 4 digit PIN')
                : (t('appLockPasswordHint') || 'Minimum 4 characters')
              }
            </p>
          </div>
          
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onCancel}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
                isDark 
                  ? 'bg-navy-700 hover:bg-navy-600 text-gray-300' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {t('cancel') || 'Cancel'}
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
            >
              {t('save') || 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Cloudflare Token Input Component
const CloudflareTokenInput: React.FC<{
  appTheme: 'dark' | 'light';
  t: (key: any) => string;
  onTokenSaved: () => void;
  onTokenRemoved: () => void;
}> = ({ appTheme, t, onTokenSaved, onTokenRemoved }) => {
  const [token, setToken] = useState('');
  const [hasToken, setHasToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    ipcRenderer.invoke('cloudflare:hasToken').then(setHasToken);
  }, []);

  const saveToken = async () => {
    if (!token.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await ipcRenderer.invoke('cloudflare:setToken', token.trim());
      const verify = await ipcRenderer.invoke('cloudflare:verifyToken');
      if (verify.success) {
        setHasToken(true);
        setToken('');
        onTokenSaved();
      } else {
        await ipcRenderer.invoke('cloudflare:removeToken');
        setError(verify.error || 'Invalid token');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const removeToken = async () => {
    // Use setTimeout to prevent UI freeze from native confirm dialog
    setTimeout(async () => {
      if (!window.confirm(t('confirmRemoveToken'))) return;
      await ipcRenderer.invoke('cloudflare:removeToken');
      setHasToken(false);
      onTokenRemoved();
    }, 10);
  };

  return (
    <div>
      {hasToken ? (
        <div className={`flex items-center justify-between p-3 rounded-lg ${appTheme === 'light' ? 'bg-gray-50 border border-gray-200' : 'bg-navy-900'}`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className={`text-sm ${appTheme === 'light' ? 'text-gray-800' : 'text-gray-200'}`}>{t('tokenConfigured')}</p>
              <p className="text-xs text-gray-500">{t('tokenSavedEncrypted')}</p>
            </div>
          </div>
          <button
            onClick={removeToken}
            className="px-3 py-1.5 text-sm text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded transition"
          >
            {t('remove')}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative">
            <input
              type={showToken ? 'text' : 'password'}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={t('enterCloudflareToken')}
              className={`w-full px-3 py-2.5 pr-10 rounded-lg focus:outline-none focus:border-orange-500 ${appTheme === 'light' ? 'bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400' : 'bg-navy-900 border border-navy-600 text-white placeholder-gray-500'}`}
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className={`absolute right-3 top-1/2 -translate-y-1/2 ${appTheme === 'light' ? 'text-gray-400 hover:text-gray-600' : 'text-gray-500 hover:text-gray-300'}`}
            >
              {showToken ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            onClick={saveToken}
            disabled={loading || !token.trim()}
            className="w-full px-4 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed !text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t('verifying')}
              </>
            ) : (
              t('saveToken')
            )}
          </button>
          <p className="text-xs text-gray-500">
            {t('getApiTokenFrom')}{' '}
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); window.electron.shell.openExternal('https://dash.cloudflare.com/profile/api-tokens'); }}
              className="text-orange-500 hover:underline"
            >
              Cloudflare Dashboard
            </a>
          </p>
        </div>
      )}
    </div>
  );
};

// Cloudflare DNS Record Modal Component
const CloudflareRecordModal: React.FC<{
  appTheme: 'dark' | 'light';
  mode: 'create' | 'edit';
  record?: any;
  zoneName: string;
  loading: boolean;
  servers: Server[];
  t: (key: any) => string;
  onSave: (data: { 
    type: string; name: string; content: string; ttl: number; proxied: boolean; comment?: string;
    priority?: number; srvData?: { service: string; proto: string; name: string; priority: number; weight: number; port: number; target: string };
  }) => void;
  onClose: () => void;
}> = ({ appTheme, mode, record, zoneName, loading, servers, t, onSave, onClose }) => {
  const [type, setType] = useState(record?.type || 'A');
  const [name, setName] = useState(record?.name?.replace(`.${zoneName}`, '') || '');
  const [content, setContent] = useState(record?.content || '');
  const [ttl, setTtl] = useState<number>(record?.ttl || 1);
  const [proxied, setProxied] = useState(record?.proxied || false);
  const [comment, setComment] = useState(record?.comment || '');
  
  // Server selection for A/AAAA records
  const [selectedServerId, setSelectedServerId] = useState<string>('');
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [resolvedIps, setResolvedIps] = useState<{[serverId: string]: { ipv4: string[], ipv6: string[] }}>({});
  
  // MX specific
  const [priority, setPriority] = useState<number>(record?.priority || 10);
  
  // SRV specific
  const [srvService, setSrvService] = useState(record?.data?.service || '_sip');
  const [srvProto, setSrvProto] = useState(record?.data?.proto || '_tcp');
  const [srvPriority, setSrvPriority] = useState<number>(record?.data?.priority || 0);
  const [srvWeight, setSrvWeight] = useState<number>(record?.data?.weight || 0);
  const [srvPort, setSrvPort] = useState<number>(record?.data?.port || 443);
  const [srvTarget, setSrvTarget] = useState(record?.data?.target || '');

  const DNS_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV'];
  const proxyableTypes = ['A', 'AAAA', 'CNAME'];
  
  const inputClass = `w-full px-3 py-2 rounded-lg font-mono focus:outline-none focus:border-orange-500 ${appTheme === 'light' ? 'bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400' : 'bg-navy-900 border border-navy-600 text-white placeholder-gray-500'}`;
  const labelClass = `block text-sm mb-1 ${appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}`;

  // Handle server selection and resolve hostname to IP if needed
  const handleServerSelect = async (serverId: string) => {
    setSelectedServerId(serverId);
    setResolveError(null);
    
    if (!serverId) {
      return;
    }
    
    const server = servers.find(s => s.id === serverId);
    if (!server) return;
    
    // Check if we already resolved this server
    if (resolvedIps[serverId]) {
      const ips = type === 'A' ? resolvedIps[serverId].ipv4 : resolvedIps[serverId].ipv6;
      if (ips.length > 0) {
        setContent(ips[0]);
      } else {
        setResolveError(t('noIpFound'));
      }
      return;
    }
    
    setResolving(true);
    try {
      const result = await ipcRenderer.invoke('dns:resolve', server.host);
      if (result.success) {
        setResolvedIps(prev => ({
          ...prev,
          [serverId]: { ipv4: result.ipv4, ipv6: result.ipv6 }
        }));
        
        const ips = type === 'A' ? result.ipv4 : result.ipv6;
        if (ips.length > 0) {
          setContent(ips[0]);
        } else {
          setResolveError(t('noIpFound'));
        }
      } else {
        setResolveError(result.error || t('noIpFound'));
      }
    } catch (error: any) {
      setResolveError(error.message);
    }
    setResolving(false);
  };

  // When type changes between A and AAAA, update content if server is selected
  useEffect(() => {
    if (selectedServerId && resolvedIps[selectedServerId]) {
      const ips = type === 'A' ? resolvedIps[selectedServerId].ipv4 : resolvedIps[selectedServerId].ipv6;
      if (ips.length > 0) {
        setContent(ips[0]);
        setResolveError(null);
      } else {
        setResolveError(t('noIpFound'));
      }
    }
  }, [type, selectedServerId, resolvedIps]);

  const handleSave = () => {
    const data: any = { type, name: name || '@', content, ttl, proxied, comment: comment || undefined };
    
    if (type === 'MX') {
      data.priority = priority;
    }
    
    if (type === 'SRV') {
      data.srvData = {
        service: srvService,
        proto: srvProto,
        name: name || '@',
        priority: srvPriority,
        weight: srvWeight,
        port: srvPort,
        target: srvTarget,
      };
      data.content = `${srvPriority} ${srvWeight} ${srvPort} ${srvTarget}`;
    }
    
    onSave(data);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className={`rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto ${appTheme === 'light' ? 'bg-white border border-gray-200' : 'bg-navy-800 border border-navy-600'}`} onClick={(e) => e.stopPropagation()}>
        <div className={`flex items-center justify-between p-4 sm:p-5 ${appTheme === 'light' ? 'border-b border-gray-200' : 'border-b border-navy-700'}`}>
          <h2 className={`text-base sm:text-lg font-semibold ${appTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>
            {mode === 'create' ? t('addDnsRecord') : t('editDnsRecord')}
          </h2>
          <button onClick={onClose} className={`transition ${appTheme === 'light' ? 'text-gray-400 hover:text-gray-600' : 'text-gray-400 hover:text-white'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-4 sm:p-5 space-y-4">
          {/* Type */}
          <div>
            <label className={labelClass}>{t('recordType')}</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg focus:outline-none focus:border-orange-500 ${appTheme === 'light' ? 'bg-gray-50 border border-gray-300 text-gray-900' : 'bg-navy-900 border border-navy-600 text-white'}`}
            >
              {DNS_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          
          {/* SRV specific fields */}
          {type === 'SRV' ? (
            <>
              {/* Service */}
              <div>
                <label className={labelClass}>{t('service')}</label>
                <input
                  type="text"
                  value={srvService}
                  onChange={(e) => setSrvService(e.target.value)}
                  placeholder="_sip"
                  className={inputClass}
                />
              </div>
              
              {/* Protocol */}
              <div>
                <label className={labelClass}>{t('protocol')}</label>
                <select
                  value={srvProto}
                  onChange={(e) => setSrvProto(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg focus:outline-none focus:border-orange-500 ${appTheme === 'light' ? 'bg-gray-50 border border-gray-300 text-gray-900' : 'bg-navy-900 border border-navy-600 text-white'}`}
                >
                  <option value="_tcp">_tcp</option>
                  <option value="_udp">_udp</option>
                  <option value="_tls">_tls</option>
                </select>
              </div>
              
              {/* Name */}
              <div>
                <label className={labelClass}>{t('name')}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('rootOrSubdomain')}
                    className={`flex-1 ${inputClass}`}
                  />
                  <span className="text-gray-500 text-sm">.{zoneName}</span>
                </div>
              </div>
              
              {/* Priority & Weight */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>{t('priority')}</label>
                  <input
                    type="number"
                    value={srvPriority}
                    onChange={(e) => setSrvPriority(Number(e.target.value))}
                    min={0}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>{t('weight')}</label>
                  <input
                    type="number"
                    value={srvWeight}
                    onChange={(e) => setSrvWeight(Number(e.target.value))}
                    min={0}
                    className={inputClass}
                  />
                </div>
              </div>
              
              {/* Port */}
              <div>
                <label className={labelClass}>{t('port')}</label>
                <input
                  type="number"
                  value={srvPort}
                  onChange={(e) => setSrvPort(Number(e.target.value))}
                  min={1}
                  max={65535}
                  placeholder="443"
                  className={inputClass}
                />
              </div>
              
              {/* Target */}
              <div>
                <label className={labelClass}>{t('target')}</label>
                <input
                  type="text"
                  value={srvTarget}
                  onChange={(e) => setSrvTarget(e.target.value)}
                  placeholder="server.example.com"
                  className={inputClass}
                />
              </div>
            </>
          ) : (
            <>
              {/* Name - for non-SRV records */}
              <div>
                <label className={labelClass}>{t('name')}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('rootOrSubdomain')}
                    className={`flex-1 ${inputClass}`}
                  />
                  <span className="text-gray-500 text-sm">.{zoneName}</span>
                </div>
              </div>
              
              {/* Content */}
              <div>
                <label className={labelClass}>
                  {type === 'A' ? t('ipv4Address') : 
                   type === 'AAAA' ? t('ipv6Address') :
                   type === 'CNAME' ? t('target') :
                   type === 'MX' ? t('mailServer') :
                   type === 'TXT' ? t('content') :
                   type === 'NS' ? t('nameserver') : t('value')}
                </label>
                
                {/* Server selection dropdown for A/AAAA records - only SSH and RDP servers */}
                {(type === 'A' || type === 'AAAA') && servers.filter(s => s.protocol === 'ssh' || s.protocol === 'rdp').length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs text-gray-500 mb-1">{t('selectFromServerList')}</p>
                    <select
                      value={selectedServerId}
                      onChange={(e) => handleServerSelect(e.target.value)}
                      disabled={resolving}
                      className={`w-full px-3 py-2 rounded-lg focus:outline-none focus:border-orange-500 ${appTheme === 'light' ? 'bg-gray-50 border border-gray-300 text-gray-900' : 'bg-navy-900 border border-navy-600 text-white'}`}
                    >
                      <option value="">{t('selectServer')}</option>
                      {servers.filter(s => s.protocol === 'ssh' || s.protocol === 'rdp').map(server => (
                        <option key={server.id} value={server.id}>
                          {server.name} ({server.host})
                        </option>
                      ))}
                    </select>
                    {resolving && (
                      <p className="text-xs text-orange-500 mt-1 flex items-center gap-1">
                        <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                          <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        {t('resolving')}
                      </p>
                    )}
                    {resolveError && (
                      <p className="text-xs text-red-500 mt-1">{resolveError}</p>
                    )}
                    {selectedServerId && !resolving && !resolveError && (
                      <p className="text-xs text-gray-500 mt-1">{t('manualEntry')}</p>
                    )}
                  </div>
                )}
                
                <input
                  type="text"
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value);
                    if (selectedServerId) setSelectedServerId(''); // Clear server selection on manual edit
                  }}
                  placeholder={
                    type === 'A' ? '192.168.1.1' : 
                    type === 'AAAA' ? '2001:db8::ff00:42:8329' :
                    type === 'CNAME' ? 'example.com' : 
                    type === 'MX' ? 'mail.google.com' :
                    type === 'TXT' ? 'v=spf1 include:_spf.google.com ~all' :
                    type === 'NS' ? 'ns1.example.com' : ''
                  }
                  className={inputClass}
                />
              </div>
              
              {/* Priority for MX */}
              {type === 'MX' && (
                <div>
                  <label className={labelClass}>{t('priority')}</label>
                  <input
                    type="number"
                    value={priority}
                    onChange={(e) => setPriority(Number(e.target.value))}
                    min={0}
                    placeholder="10"
                    className={inputClass}
                  />
                  <p className="text-xs text-gray-500 mt-1">{t('lowerPriorityHigher')}</p>
                </div>
              )}
            </>
          )}
          
          {/* TTL */}
          <div>
            <label className={labelClass}>{t('ttl')}</label>
            <select
              value={ttl}
              onChange={(e) => setTtl(Number(e.target.value))}
              className={`w-full px-3 py-2 rounded-lg focus:outline-none focus:border-orange-500 ${appTheme === 'light' ? 'bg-gray-50 border border-gray-300 text-gray-900' : 'bg-navy-900 border border-navy-600 text-white'}`}
            >
              <option value={1}>{t('auto')}</option>
              <option value={60}>1 {t('minute')}</option>
              <option value={300}>5 {t('minutes')}</option>
              <option value={600}>10 {t('minutes')}</option>
              <option value={1800}>30 {t('minutes')}</option>
              <option value={3600}>1 {t('hour')}</option>
              <option value={7200}>2 {t('hours')}</option>
              <option value={86400}>1 {t('day')}</option>
            </select>
          </div>
          
          {/* Proxy */}
          {proxyableTypes.includes(type) && (
            <div className={`flex items-center justify-between p-3 rounded-lg ${appTheme === 'light' ? 'bg-gray-50 border border-gray-200' : 'bg-navy-900'}`}>
              <div>
                <p className={`text-sm ${appTheme === 'light' ? 'text-gray-800' : 'text-gray-200'}`}>{t('proxyThroughCloudflare')}</p>
                <p className="text-xs text-gray-500">{t('enableCdnSecurity')}</p>
              </div>
              <button
                type="button"
                onClick={() => setProxied(!proxied)}
                className={`relative w-12 h-6 rounded-full transition ${
                  proxied ? 'bg-orange-600' : appTheme === 'light' ? 'bg-gray-300' : 'bg-navy-600'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  proxied ? 'translate-x-7' : 'translate-x-1'
                }`} />
              </button>
            </div>
          )}
          
          {/* Comment */}
          <div>
            <label className={labelClass}>{t('commentOptional')}</label>
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t('addNote')}
              className={inputClass}
            />
          </div>
        </div>
        
        <div className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 p-4 sm:p-5 ${appTheme === 'light' ? 'border-t border-gray-200' : 'border-t border-navy-700'}`}>
          <button
            onClick={onClose}
            disabled={loading}
            className={`px-4 py-2 rounded-lg transition order-2 sm:order-1 ${appTheme === 'light' ? 'text-gray-600 hover:text-gray-800 hover:bg-gray-100' : 'text-gray-400 hover:text-white hover:bg-navy-700'}`}
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={loading || (type !== 'SRV' && !content) || (type === 'SRV' && !srvTarget)}
            className="px-5 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 !text-white rounded-lg font-medium transition flex items-center justify-center gap-2 order-1 sm:order-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t('saving')}
              </>
            ) : mode === 'create' ? (
              t('addRecord')
            ) : (
              t('saveChanges')
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
