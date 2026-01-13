import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

// Supported languages
export type Language = 
  | 'en' | 'vi' | 'id' | 'zh' | 'ko' 
  | 'ja' | 'fr' | 'de' | 'es' | 'th' 
  | 'ms' | 'ru' | 'fil' | 'pt';

export interface LanguageInfo {
  code: Language;
  name: string;
  nativeName: string;
  flag: string;
}

export const LANGUAGES: LanguageInfo[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'th', name: 'Thai', nativeName: 'ภาษาไทย', flag: '🇹🇭' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', flag: '🇲🇾' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'fil', name: 'Filipino', nativeName: 'Filipino', flag: '🇵🇭' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷' },
];

// Translation keys type
export interface Translations {
  // App
  appName: string;
  
  // Menu items
  hosts: string;
  settings: string;
  cloudflareDns: string;
  whoisLookup: string;
  lookup: string;
  
  // Server list
  addServer: string;
  addNewHost: string;
  editServer: string;
  deleteServer: string;
  connect: string;
  disconnect: string;
  noServers: string;
  searchServers: string;
  quickConnect: string;
  noMatchingHosts: string;
  tryDifferentSearch: string;
  noHostsConfigured: string;
  clickNewHostToStart: string;
  noMatchingServers: string;
  clearSearch: string;
  
  // Server form
  serverName: string;
  hostName: string;
  displayName: string;
  hostIp: string;
  address: string;
  port: string;
  username: string;
  password: string;
  protocol: string;
  authType: string;
  privateKey: string;
  passphrase: string;
  domain: string;
  wssUrl: string;
  tags: string;
  osIcon: string;
  operatingSystem: string;
  connectionType: string;
  save: string;
  cancel: string;
  create: string;
  update: string;
  
  // Protocols
  protocolSsh: string;
  protocolFtp: string;
  protocolFtps: string;
  protocolRdp: string;
  protocolWss: string;
  
  // Auth types
  authPassword: string;
  authKey: string;
  
  // Sessions
  terminal: string;
  sftp: string;
  rdp: string;
  closeTab: string;
  newTab: string;
  localTerminal: string;
  
  // SFTP
  localFiles: string;
  remoteFiles: string;
  upload: string;
  download: string;
  refresh: string;
  newFolder: string;
  newFile: string;
  delete: string;
  rename: string;
  back: string;
  forward: string;
  parent: string;
  home: string;
  chmod: string;
  closeMenu: string;
  
  // Settings
  appearance: string;
  themeMode: string;
  terminalTheme: string;
  darkMode: string;
  lightMode: string;
  switchDarkLight: string;
  defaultTerminalTheme: string;
  language: string;
  backup: string;
  restore: string;
  createBackup: string;
  restoreBackup: string;
  backupRestore: string;
  localBackup: string;
  exportToFile: string;
  importFromFile: string;
  backupDescription: string;
  
  // Backup
  backupPassword: string;
  confirmPassword: string;
  passwordRequired: string;
  passwordMismatch: string;
  backupSuccess: string;
  restoreSuccess: string;
  backupError: string;
  
  // Cloudflare
  cfApiToken: string;
  cfApiTokenDesc: string;
  cfAddToken: string;
  cfSelectZone: string;
  cfNoZones: string;
  cfAddRecord: string;
  cfEditRecord: string;
  cfDeleteRecord: string;
  cfRecordType: string;
  cfRecordName: string;
  cfRecordContent: string;
  cfProxied: string;
  cfTtl: string;
  
  // WHOIS
  whoisEnterDomain: string;
  whoisLookupBtn: string;
  whoisLoading: string;
  whoisNoResult: string;
  
  // Network Tools
  ntDnsLookup: string;
  ntPing: string;
  ntPortCheck: string;
  ntReverseDns: string;
  ntEnterHost: string;
  ntEnterPort: string;
  ntExecute: string;
  ntLoading: string;
  ntHistory: string;
  ntClearHistory: string;
  
  // Common
  loading: string;
  error: string;
  success: string;
  confirm: string;
  close: string;
  yes: string;
  no: string;
  ok: string;
  search: string;
  filter: string;
  all: string;
  none: string;
  copy: string;
  paste: string;
  optional: string;
  
  // Theme toggle
  switchToLightMode: string;
  switchToDarkMode: string;
  
  // About
  about: string;
  version: string;
  platform: string;
  
  // Tags
  addTag: string;
  editTag: string;
  deleteTag: string;
  tagColor: string;
  noTags: string;
  searchTags: string;
  
  // Connection
  connecting: string;
  connected: string;
  disconnected: string;
  connectionFailed: string;
  reconnect: string;
  
  // File operations
  fileSize: string;
  fileDate: string;
  fileName: string;
  fileType: string;
  permissions: string;
  owner: string;
  
  // Confirmation dialogs
  confirmDelete: string;
  confirmDisconnect: string;
  confirmOverwrite: string;
  
  // Errors
  errorConnection: string;
  errorAuth: string;
  errorTimeout: string;
  errorNotFound: string;
  errorPermission: string;
  connectionTimedOut: string;
  requestTimedOut: string;

  // Sidebar
  hideSidebar: string;
  showSidebar: string;
  
  // AddServerModal
  importRdpFile: string;
  selectKeyFile: string;
  keyLoaded: string;
  orPasteBelow: string;
  selectFromKeychain: string;
  selectKeyFromKeychain: string;
  orSelectFile: string;
  orPasteManually: string;
  
  // GitHub Backup
  githubBackup: string;
  githubBackupDesc: string;
  connectWithGithub: string;
  githubConnecting: string;
  githubDisconnect: string;
  githubEnterCode: string;
  githubWaiting: string;
  githubOpenManually: string;
  encryptionPassword: string;
  enterPasswordEncrypt: string;
  pushBackup: string;
  pullBackup: string;
  uploading: string;
  downloading: string;
  backupRepo: string;
  backupUploadedSuccessfully: string;
  backupUploadFailed: string;
  backupDownloadFailed: string;
  restoreSuccessWithCount: string;
  confirmPasswordPlaceholder: string;
  
  // Cloudflare DNS
  selectDomain: string;
  selectDomainPlaceholder: string;
  refreshZones: string;
  addRecord: string;
  loadingRecords: string;
  noRecords: string;
  edit: string;
  proxied: string;
  dnsOnly: string;
  configureApiToken: string;
  apiTokenDesc: string;
  goToSettings: string;
  type: string;
  name: string;
  content: string;
  ttl: string;
  proxy: string;
  actions: string;
  
  // WHOIS
  whoisTitle: string;
  whoisPlaceholder: string;
  lookupBtn: string;
  lookingUp: string;
  registrar: string;
  created: string;
  expires: string;
  updated: string;
  nameServers: string;
  status: string;
  rawWhois: string;
  
  // Network Tools
  selectTool: string;
  run: string;
  running: string;
  toolARecord: string;
  toolARecordDesc: string;
  toolAAAARecord: string;
  toolAAAARecordDesc: string;
  toolMXLookup: string;
  toolMXLookupDesc: string;
  toolTXTRecord: string;
  toolTXTRecordDesc: string;
  toolSPFCheck: string;
  toolSPFCheckDesc: string;
  toolCNAMELookup: string;
  toolCNAMELookupDesc: string;
  toolNSLookup: string;
  toolNSLookupDesc: string;
  toolSOARecord: string;
  toolSOARecordDesc: string;
  toolPTRLookup: string;
  toolPTRLookupDesc: string;
  toolPing: string;
  toolPingDesc: string;
  toolTraceroute: string;
  toolTracerouteDesc: string;
  toolTCPPort: string;
  toolTCPPortDesc: string;
  toolHTTPCheck: string;
  toolHTTPCheckDesc: string;
  toolHTTPSCheck: string;
  toolHTTPSCheckDesc: string;
  toolSMTPTest: string;
  toolSMTPTestDesc: string;
  toolBlacklist: string;
  toolBlacklistDesc: string;
  toolDNSCheck: string;
  toolDNSCheckDesc: string;
  toolIPInfo: string;
  toolIPInfoDesc: string;
  
  // SFTP Panel
  sftpLocal: string;
  sftpRemote: string;
  sftpName: string;
  sftpSize: string;
  sftpPerms: string;
  sftpModified: string;
  sftpItems: string;
  sftpEditFile: string;
  sftpOpen: string;
  sftpUploadToRemote: string;
  sftpDownloadToLocal: string;
  sftpChangePermissions: string;
  sftpConnecting: string;
  sftpConnectionFailed: string;
  sftpDropToDownload: string;
  sftpDropToUpload: string;
  
  // WebSocket
  wssTypeMessage: string;
  wssAutoScroll: string;
  wssNoMessages: string;
  wssConnectionError: string;
  wssSent: string;
  wssReceived: string;
  wssMessages: string;
  wssSend: string;
  
  // RDP
  rdpConnected: string;
  rdpConnecting: string;
  rdpSessionActive: string;
  rdpSessionDesc: string;
  rdpSessionEnded: string;
  rdpSessionClosedDesc: string;
  rdpConnectionError: string;
  rdpFailedConnect: string;
  
  // Common Ports
  commonPorts: string;
  clickToSelectPort: string;
  
  // Known Hosts Manager
  knownHosts: string;
  manageKnownHosts: string;
  searchHostnameIpFingerprint: string;
  allKeyTypes: string;
  allStatus: string;
  importFromHost: string;
  trusted: string;
  untrusted: string;
  hostsCount: string;
  noKnownHosts: string;
  remove: string;
  removeHost: string;
  confirmRemoveHost: string;
  hostRemoved: string;
  importHostPlaceholder: string;
  importHostDesc: string;
  
  // SSH Fingerprint Modal
  verifyingHost: string;
  verifyingFingerprint: string;
  newHostDetected: string;
  newHostMessage: string;
  hostKeyChanged: string;
  hostKeyChangedWarning: string;
  previousFingerprint: string;
  newFingerprint: string;
  keyType: string;
  fingerprint: string;
  reject: string;
  acceptAndConnect: string;
  acceptNewKey: string;
  skipVerification: string;
  fingerprintError: string;
  couldNotVerify: string;
  retryVerification: string;
  
  // SSH Key Manager
  sshKeyManager: string;
  selectKeyToUse: string;
  manageYourSSHKeys: string;
  generateKey: string;
  importKey: string;
  noSSHKeysYet: string;
  generateOrImportKey: string;
  generateNewKey: string;
  keyName: string;
  recommended: string;
  leaveEmptyForNoPassphrase: string;
  comment: string;
  generating: string;
  generate: string;
  importExistingKey: string;
  importing: string;
  import: string;
  select: string;
  createdAt: string;
  publicKey: string;
  copyToClipboard: string;
  copiedToClipboard: string;
  copyPublicKeyToServer: string;
  selectKeyToViewDetails: string;
  pleaseEnterKeyName: string;
  pleaseEnterKeyNameAndPrivateKey: string;
  failedToGenerateKey: string;
  failedToImportKey: string;
  confirmDeleteKey: string;
  exportKey: string;
  exportPublicKeyOnly: string;
  exportBothKeys: string;
  publicKeyOnly: string;
  bothKeys: string;
  keyExportedSuccessfully: string;
  publicKeyExportedSuccessfully: string;
  failedToExportKey: string;
  browseFile: string;
  
  // Web Check (consolidated HTTP/HTTPS)
  toolWebCheck: string;
  toolWebCheckDesc: string;
  toolWhois: string;
  toolWhoisDesc: string;
  
  // Tools Menu
  tools: string;
  toolProxyCheck: string;
  proxyCheckDesc: string;
  toolPortListener: string;
  portListenerDesc: string;
  
  // SMTP Test
  smtpTestDesc: string;
  smtpServer: string;
  encryption: string;
  quickPorts: string;
  useAuthentication: string;
  fromEmail: string;
  toEmail: string;
  testSMTP: string;
  testing: string;
  smtpTestSuccess: string;
  responseTime: string;
  testEmailSent: string;
  
  // Proxy Check
  proxyType: string;
  proxyServer: string;
  testUrl: string;
  checkProxy: string;
  checking: string;
  proxyWorking: string;
  externalIp: string;
  statusCode: string;
  
  // Port Listener
  scanPorts: string;
  scanning: string;
  searchPortProcess: string;
  lastScan: string;
  process: string;
  clickScanToStart: string;
  
  // Cloudflare Modal
  addDnsRecord: string;
  editDnsRecord: string;
  recordType: string;
  recordName: string;
  recordContent: string;
  ipv4Address: string;
  ipv6Address: string;
  target: string;
  mailServer: string;
  nameserver: string;
  value: string;
  priority: string;
  weight: string;
  service: string;
  auto: string;
  minute: string;
  minutes: string;
  hour: string;
  hours: string;
  day: string;
  proxyThroughCloudflare: string;
  enableCdnSecurity: string;
  commentOptional: string;
  addNote: string;
  saving: string;
  saveChanges: string;
  lowerPriorityHigher: string;
  rootOrSubdomain: string;
  
  // Lookup Results
  successStatus: string;
  failedStatus: string;
  recentLookups: string;
  clear: string;
  allDnsResponding: string;
  someDnsNotResponding: string;
  ipClean: string;
  listedOnBlacklist: string;
  checkedBlacklists: string;
  sslCertificate: string;
  valid: string;
  validYes: string;
  validNo: string;
  validFrom: string;
  validTo: string;
  subject: string;
  issuer: string;
  connectedStatus: string;
  failedConnectStatus: string;
  banner: string;
  key: string;
  keys: string;
  keychain: string;
  
  noHostsMatchSearch: string;
  connectToServerToAddKnownHosts: string;
  
  // Cloudflare Token
  tokenConfigured: string;
  tokenSavedEncrypted: string;
  confirmRemoveToken: string;
  enterCloudflareToken: string;
  verifying: string;
  saveToken: string;
  getApiTokenFrom: string;
  
  // Server IP selection for Cloudflare DNS
  selectFromServerList: string;
  selectServer: string;
  manualEntry: string;
  resolving: string;
  noIpFound: string;
  
  // About / Info Modal
  author: string;
  appTagline: string;
  features: string;
  checkForUpdates: string;
  updateAvailable: string;
  newVersionAvailable: string;
  upToDate: string;
  releaseNotes: string;
  
  // 2FA Authenticator
  twoFactorAuth: string;
  totpDescription: string;
  noTotpEntries: string;
  addTotpEntry: string;
  addFirstEntry: string;
  addNewEntry: string;
  accountName: string;
  accountNamePlaceholder: string;
  secretKey: string;
  secretPlaceholder: string;
  bulkAdd: string;
  onePerLine: string;
  addAll: string;
  invalidSecret: string;
  invalidKey: string;
  clickToEdit: string;
  securityNote: string;
  totpSecurityInfo: string;
  add: string;
  
  // Port Forwarding
  portForwarding: string;
  portForwardingDescription: string;
  noPortForwards: string;
  addPortForwardDesc: string;
  addFirstForward: string;
  addPortForward: string;
  editPortForward: string;
  localForward: string;
  remoteForward: string;
  dynamicForward: string;
  sshServer: string;
  localHost: string;
  localPort: string;
  remoteHost: string;
  remotePort: string;
  forwardNamePlaceholder: string;
  
  // Changelog
  changelog: string;
  changelogDesc: string;
  loadChangelog: string;
  
  // About Page (additional fields)
  security: string;
  techStack: string;
  zeroKnowledge: string;
  localStorage: string;
  argon2Encryption: string;
  openSource: string;
  available: string;
  
  localForwardDesc: string;
  remoteForwardDesc: string;
  dynamicForwardDesc: string;
  portForwardingHelp: string;
  localForwardHelp: string;
  remoteForwardHelp: string;
  dynamicForwardHelp: string;
  serverNotFound: string;
  stopBeforeEdit: string;
  start: string;
  stop: string;
}

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof Translations) => string;
  translations: Translations;
  languageInfo: LanguageInfo;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Import translations
import en from '../locales/en.json';
import vi from '../locales/vi.json';
import id from '../locales/id.json';
import zh from '../locales/zh.json';
import ko from '../locales/ko.json';
import ja from '../locales/ja.json';
import fr from '../locales/fr.json';
import de from '../locales/de.json';
import es from '../locales/es.json';
import th from '../locales/th.json';
import ms from '../locales/ms.json';
import ru from '../locales/ru.json';
import fil from '../locales/fil.json';
import pt from '../locales/pt.json';

// Use type assertion to avoid strict type checking for translations
// This allows partial translations in non-English locales
const translationsMap: Record<Language, Translations> = {
  en: en as Translations,
  vi: { ...en, ...vi } as Translations,
  id: { ...en, ...id } as Translations,
  zh: { ...en, ...zh } as Translations,
  ko: { ...en, ...ko } as Translations,
  ja: { ...en, ...ja } as Translations,
  fr: { ...en, ...fr } as Translations,
  de: { ...en, ...de } as Translations,
  es: { ...en, ...es } as Translations,
  th: { ...en, ...th } as Translations,
  ms: { ...en, ...ms } as Translations,
  ru: { ...en, ...ru } as Translations,
  fil: { ...en, ...fil } as Translations,
  pt: { ...en, ...pt } as Translations
};

// Import geo language service
import { detectLanguageFromIP } from '../services/geoLanguageService';

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');

  // Load saved language on mount, with IP-based auto-detection for first-time users
  useEffect(() => {
    const savedLang = localStorage.getItem('app-language') as Language;
    if (savedLang && LANGUAGES.some(l => l.code === savedLang)) {
      // User has already set a language preference
      setLanguageState(savedLang);
    } else {
      // First-time user: try IP-based detection first, then fallback to browser language
      const detectLanguage = async () => {
        try {
          // Try IP-based detection (with caching)
          const geoLang = await detectLanguageFromIP();
          if (geoLang && LANGUAGES.some(l => l.code === geoLang)) {
            setLanguageState(geoLang);
            console.log(`[Language] Auto-detected from IP: ${geoLang}`);
            return;
          }
        } catch (error) {
          console.log('[Language] IP detection failed, using browser fallback');
        }
        
        // Fallback: Try to detect browser language
        const browserLang = navigator.language.split('-')[0] as Language;
        if (LANGUAGES.some(l => l.code === browserLang)) {
          setLanguageState(browserLang);
          console.log(`[Language] Using browser language: ${browserLang}`);
        }
      };
      
      detectLanguage();
    }
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app-language', lang);
  }, []);

  const translations = translationsMap[language];
  
  const t = useCallback((key: keyof Translations): string => {
    return translations[key] || translationsMap.en[key] || key;
  }, [translations]);

  const languageInfo = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, translations, languageInfo }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;
