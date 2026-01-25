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
  noActionsAvailable: string;
  
  // Server form
  serverName: string;
  serverAlreadyExists: string;
  continueAddingDuplicate: string;
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
  enterNewName: string;
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
  cut: string;
  paste: string;
  copied: string;
  pasted: string;
  moved: string;
  optional: string;
  
  // Theme toggle
  switchToLightMode: string;
  switchToDarkMode: string;
  
  // About
  about: string;
  version: string;
  platform: string;
  
  // Build Info
  buildInfo: string;
  commitSha: string;
  branch: string;
  buildTime: string;
  buildRun: string;
  viewCommitOnGithub: string;
  runtimeInfo: string;
  electronVersion: string;
  chromeVersion: string;
  nodeVersion: string;
  v8Version: string;
  
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
  confirmCloseSession: string;
  confirmOverwrite: string;
  
  // Close dialog (when exiting with active connections)
  activeConnections: string;
  closeAllAndExit: string;
  youHaveActiveConnections: string;
  closeConnectionsConfirm: string;
  serverAlreadyConnected: string;
  serverAlreadyConnectedMessage: string;
  
  // Server Notes (Sticky Note feature)
  notes: string;
  serverNotes: string;
  noNotesYet: string;
  notePlaceholder: string;
  noteSaved: string;
  noteSaving: string;
  
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
  sftpInstallSource: string;
  sftpCompressTo: string;
  sftpExtractHere: string;
  
  // Source Installer
  sourceInstallerTitle: string;
  sourceInstallerDesc: string;
  sourceSelectFramework: string;
  sourceSelectVersion: string;
  sourceSelectMajorVersion: string;
  sourceSelectSpecificVersion: string;
  sourceLatestRecommended: string;
  sourceLoadingVersions: string;
  sourceCouldNotFetchVersions: string;
  sourcePHPVersion: string;
  sourceCheckingPHP: string;
  sourcePHPNotDetected: string;
  sourceRequiresPHP: string;
  sourceLTS: string;
  sourceLatest: string;
  sourceContinue: string;
  sourceBack: string;
  sourceInstalling: string;
  sourceLoading: string;
  sourceChange: string;
  sourceInstallLocation: string;
  sourceInstallHere: string;
  sourceInstallHereDesc: string;
  sourceCreateSubfolder: string;
  sourceCreateSubfolderDesc: string;
  sourceProjectName: string;
  sourceWillBeCreatedAt: string;
  sourceConfigureDb: string;
  sourceDbType: string;
  sourceDbHost: string;
  sourceDbPort: string;
  sourceDbName: string;
  sourceDbUsername: string;
  sourceDbPassword: string;
  sourceDepsCheck: string;
  sourceDepsCheckDesc: string;
  sourceInstalled: string;
  sourceNotInstalled: string;
  sourceReady: string;
  sourceInstallComposer: string;
  sourceAllDepsReady: string;
  sourceInstallDepsFirst: string;
  sourceWaitSetup: string;
  sourceProjectReady: string;
  sourceChecking: string;
  sourceRecheck: string;
  sourceStartInstall: string;
  sourceDone: string;
  sourceSelectFrameworkHint: string;
  sourceSelectVersionHint: string;
  sourceConfigureHint: string;
  sourceSelectNpmVersion: string;
  sourceFetchingVersions: string;
  sourceLaravelDesc: string;
  sourceWordPressDesc: string;
  sourceSymfonyDesc: string;
  sourceCodeIgniterDesc: string;
  sourceExpressDesc: string;
  sourceNestJSDesc: string;
  sourceFastifyDesc: string;
  sourceVueDesc: string;
  sourceNuxtDesc: string;
  sourceReactDesc: string;
  sourceNextJSDesc: string;
  sourceTypeScriptDesc: string;
  
  // Database
  database: string;
  databaseServer: string;
  dbConnecting: string;
  dbConnectionFailed: string;
  dbRetry: string;
  dbSelectDatabase: string;
  dbNoTables: string;
  dbSelectDatabaseFirst: string;
  dbConnected: string;
  dbBrowser: string;
  dbQuery: string;
  dbStructure: string;
  dbRows: string;
  dbRefresh: string;
  dbNoData: string;
  dbSelectTableToView: string;
  dbPressCtrlEnter: string;
  dbClear: string;
  dbExecuting: string;
  dbExecute: string;
  dbError: string;
  dbQuerySuccess: string;
  dbRowsAffected: string;
  dbWriteQuery: string;
  dbStructureInfo: string;
  dbSelectTableForStructure: string;
  dbColumnName: string;
  dbColumnType: string;
  dbColumnNullable: string;
  dbColumnKey: string;
  dbColumnDefault: string;
  dbColumnExtra: string;
  dbNoStructure: string;
  dbColumns: string;
  dbPrimaryKeys: string;
  dbRequiredFields: string;
  dbDoubleClickToEdit: string;
  dbActions: string;
  dbEdit: string;
  dbNoPrimaryKey: string;
  dbEditRow: string;
  dbSaving: string;
  dbAddColumn: string;
  dbDeleteColumn: string;
  dbConfirmDeleteColumn: string;
  dbShowing: string;
  dbOf: string;
  dbPage: string;
  dbLoadAll: string;
  dbMysql: string;
  dbPostgresql: string;
  dbMongodb: string;
  dbRedis: string;
  dbSqlite: string;
  dbName: string;
  dbSslEnabled: string;
  dbMongoUri: string;
  dbSqliteFile: string;
  dbQueryHistory: string;
  dbClearHistory: string;
  dbCopyAsJSON: string;
  dbCopyAsCSV: string;
  dbCopyColumn: string;
  dbDeleteRow: string;
  dbConfirmDeleteRow: string;
  dbFilter: string;
  dbSelectColumn: string;
  dbFilterValue: string;
  dbAddFilter: string;
  dbApplyFilter: string;
  dbClearFilters: string;
  
  // ERD Diagram
  dbERD: string;
  erdLoading: string;
  erdZoomIn: string;
  erdZoomOut: string;
  erdResetZoom: string;
  erdFitToScreen: string;
  erdLegend: string;
  erdPrimaryKey: string;
  erdForeignKey: string;
  erdRequired: string;
  erdHelp: string;
  erdNoTables: string;
  erdSelectDatabase: string;
  
  // Import/Export Database
  dbImportExport: string;
  dbImportExportDesc: string;
  dbImport: string;
  dbImportSQLFile: string;
  dbSelectFile: string;
  dbClickToUpload: string;
  dbDropAllTables: string;
  dbDropAllTablesDesc: string;
  dbImporting: string;
  dbStartImport: string;
  dbExport: string;
  dbExportToSQL: string;
  dbIncludeDropTable: string;
  dbIncludeDropTableDesc: string;
  dbIncludeStructure: string;
  dbIncludeStructureDesc: string;
  dbIncludeData: string;
  dbIncludeDataDesc: string;
  dbSelectTables: string;
  dbAllTables: string;
  dbExporting: string;
  dbDownloadSQL: string;
  dbExportInfo: string;
  dbData: string;
  dbSearchTables: string;
  dbSmartDrop: string;
  dbSmartDropDesc: string;
  dbOperationLog: string;
  dbMoreColumns: string;
  
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
  rdpEstablishing: string;
  rdpDepsRequired: string;
  rdpDepsDetected: string;
  rdpCheckingDeps: string;
  rdpPackagesRequired: string;
  rdpXfreerdpDesc: string;
  rdpXdotoolDesc: string;
  rdpInstallCommand: string;
  rdpHowToInstall: string;
  rdpStep1: string;
  rdpStep2: string;
  rdpStep3: string;
  rdpStep4: string;
  rdpAllDepsInstalled: string;
  rdpReadyToConnect: string;
  openTerminal: string;
  rdpErrorUnableConnect: string;
  rdpErrorCheckAddress: string;
  rdpErrorCheckOnline: string;
  rdpErrorCheckFirewall: string;
  rdpErrorAuthFailed: string;
  rdpErrorNegoFailed: string;
  rdpErrorTimeout: string;
  rdpErrorDns: string;
  rdpErrorCertificate: string;
  rdpErrorClosed: string;
  rdpErrorGeneric: string;
  
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
  keyIsProtectedWithPassphrase: string;
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
  later: string;
  detectingSystemInfo: string;
  
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
  
  // Custom Hotkeys / Snippets
  customHotkeys: string;
  hotkeyDescription: string;
  addHotkey: string;
  editHotkey: string;
  addNewHotkey: string;
  hotkeyKey: string;
  hotkeyKeyHint: string;
  command: string;
  commandHint: string;
  pleaseEnterKeyAndCommand: string;
  hotkeyMustBeSingleChar: string;
  hotkeyAlreadyExists: string;
  hotkeyReserved: string;
  confirmDeleteHotkey: string;
  noHotkeysYet: string;
  clickAddHotkey: string;
  hotkeyUsage: string;
  hotkeyUsage2: string;
  hotkeyTip1: string;
  hotkeyTip2: string;
  hotkeyTip3: string;
  hotkeyMacNote: string;
  tips: string;
  hotkeyDescriptionLabel: string;
  reservedHotkeys: string;
  reservedAddNewHost: string;
  reservedCopy: string;
  reservedToggleLAN: string;
  reservedSwitchTerminalSFTP: string;
  reservedLocalTerminal: string;
  reservedPaste: string;
  
  // Command Snippets
  snippets: string;
  snippetsDescription: string;
  addSnippet: string;
  editSnippet: string;
  snippetName: string;
  snippetNameHint: string;
  snippetCommand: string;
  snippetCommandHint: string;
  snippetCategory: string;
  snippetTags: string;
  snippetTagsHint: string;
  snippetOptionalHotkey: string;
  snippetOptionalHotkeyHint: string;
  noSnippetsYet: string;
  clickAddSnippet: string;
  snippetUsage: string;
  snippetUsageTip1: string;
  snippetUsageTip2: string;
  snippetUsageTip3: string;
  snippetPanel: string;
  snippetSearch: string;
  allCategories: string;
  insertCommand: string;
  snippetClickToInsert: string;
  confirmDeleteSnippet: string;
  importSnippets: string;
  exportSnippets: string;
  importSuccess: string;
  exportSuccess: string;
  snippetShowPanel: string;
  snippetHidePanel: string;
  snippetAll: string;
  snippetNoSnippets: string;
  snippetAddFromMenu: string;
  snippetNoResults: string;
  snippetClickHint: string;
  snippetErrorName: string;
  snippetErrorCommand: string;
  snippetConfirmDelete: string;
  snippetImported: string;
  snippetImportError: string;
  commandSnippets: string;
  snippetDescription: string;
  snippetAdd: string;
  snippetAllCategories: string;
  snippetEdit: string;
  snippetSelectCategory: string;
  snippetDescriptionPlaceholder: string;
  snippetHotkey: string;
  snippetTagsPlaceholder: string;
  snippetAddFirst: string;
  snippetReservedKeys: string;
  
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
  
  // GitLab Backup
  gitlabBackup: string;
  gitlabConnect: string;
  gitlabConnected: string;
  gitlabDisconnect: string;
  gitlabConnecting: string;
  gitlabAuthPrompt: string;
  gitlabBackupTo: string;
  gitlabRestoreFrom: string;
  gitlabNoBackup: string;
  gitlabBackupExists: string;
  gitlabLastBackup: string;
  gitlabSecurityWarning: string;
  gitlabPasswordWarning: string;
  selectBackupMethod: string;
  
  // Box Backup
  boxBackup: string;
  boxConnect: string;
  boxConnected: string;
  boxDisconnect: string;
  boxConnecting: string;
  boxAuthPrompt: string;
  boxBackupTo: string;
  boxRestoreFrom: string;
  boxNoBackup: string;
  boxBackupExists: string;
  boxLastBackup: string;
  boxSecurityWarning: string;
  boxPasswordWarning: string;
  
  // Google Drive Backup
  gdriveBackup: string;
  gdriveConnect: string;
  gdriveConnected: string;
  gdriveDisconnect: string;
  gdriveConnecting: string;
  gdriveAuthPrompt: string;
  gdriveSecurityWarning: string;
  gdriveRestoreWarning: string;
  gdriveLastBackup: string;
  gdriveNotConnected: string;
  
  // OAuth Callback
  oauthSuccess: string;
  oauthSuccessMessage: string;
  oauthFailed: string;
  oauthCanClose: string;
  
  backupAndRestore: string;
  passwordRequirements: string;
  localSecurityWarning: string;
  githubSecurityWarning: string;
  
  portKnocking: string;
  portKnockingDesc: string;
  knockSequence: string;
  knockMinPorts: string;
  knockServerSetup: string;
  knockSetupDesc: string;
  generateRandom: string;
  random: string;
  ports: string;
  learnMore: string;
  
  knockGuideTitle: string;
  knockSecurityBenefits: string;
  knockStealth: string;
  knockStealthDesc: string;
  knockBrutePrevention: string;
  knockBrutePreventionDesc: string;
  knockPreAuth: string;
  knockPreAuthDesc: string;
  knockZeroDay: string;
  knockZeroDayDesc: string;
  knockPrerequisites: string;
  knockPrereq1: string;
  knockPrereq2: string;
  knockPrereq3: string;
  knockServerSetupTitle: string;
  knockStep1: string;
  knockStep2: string;
  knockStep3: string;
  knockStep4: string;
  knockStep5: string;
  knockInstallKnockd: string;
  knockConfigureKnockd: string;
  knockConfigureFirewall: string;
  knockEnableStart: string;
  knockTestConfig: string;
  knockUbuntuDebian: string;
  knockCentosRHEL: string;
  knockEditConfig: string;
  knockBasicConfig: string;
  knockIptables: string;
  knockAllowLoopback: string;
  knockAllowEstablished: string;
  knockAllowCurrentSSH: string;
  knockDropOtherSSH: string;
  knockSaveRules: string;
  knockTestDesc: string;
  knockBestPractices: string;
  knockRandomPorts: string;
  knockRandomPortsDesc: string;
  knockLongSequences: string;
  knockLongSequencesDesc: string;
  knockSetTimeout: string;
  knockSetTimeoutDesc: string;
  knockUseSSHKeys: string;
  knockUseSSHKeysDesc: string;
  knockWarnings: string;
  knockWarning1: string;
  knockWarning2: string;
  knockWarning3: string;
  knockWarning4: string;
  knockMarixIntegration: string;
  knockMarixStep1: string;
  knockMarixStep2: string;
  knockMarixStep3: string;
  knockMarixStep4: string;
  knockMarixStep5: string;
  knockMarixAutomatic: string;
  
  lanShare: string;
  thisDevice: string;
  serversToShare: string;
  noServersSelected: string;
  lanShareSecurity: string;
  pairingCode: string;
  pairingCodeDesc: string;
  availableDevices: string;
  noDevicesFound: string;
  shareOnLAN: string;
  selectServersToShare: string;
  
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
  
  // LAN File Transfer
  lanFileTransfer: string;
  transferDirectly: string;
  sendFiles: string;
  receiveFiles: string;
  selectDevice: string;
  filesToSend: string;
  selectFiles: string;
  selectFolder: string;
  digitCode: string;
  generateNewCode: string;
  shareCodeWithReceiver: string;
  send: string;
  files: string;
  incomingTransferFrom: string;
  andMore: string;
  enterPairingCodeFromSender: string;
  acceptAndSave: string;
  waitingForIncomingTransfers: string;
  makeSureLANEnabled: string;
  sending: string;
  receiving: string;
  cancelTransfer: string;
  yourDevice: string;
  incomingFileTransfer: string;
  wantsToSendFiles: string;
  transferProgress: string;
  transferCompleted: string;
  transferFailed: string;
  transferCancelled: string;
  pleaseSelectDeviceFilesCode: string;
  waitingForReceiverAccept: string;
  pleaseEnterPairingCode: string;
  failedToSelectSaveLocation: string;
  receivingFilesProgress: string;
  failedToAcceptWrongCode: string;
  transferRejected: string;
  
  // LAN File Transfer Page
  shareCodeWithReceiverDesc: string;
  prepareToSend: string;
  waitingForReceiver: string;
  tellReceiverCode: string;
  enterSenderPairingCode: string;
  askSenderForCode: string;
  searchingForSender: string;
  findSender: string;
  senderFound: string;
  howToReceiveFiles: string;
  receiveStep1: string;
  receiveStep2: string;
  receiveStep3: string;
  receiveStep4: string;
  recentTransfers: string;
  waitingForReceiverToConnect: string;
  connectedStartingTransfer: string;
  transferInProgress: string;
  foundSender: string;
  preparingFiles: string;
  enterValid6DigitCode: string;
  searchingOnNetwork: string;
  noSenderFoundWithCode: string;
  pleaseSearchFindSenderFirst: string;
  connectingToSender: string;
  
  // Session Monitor
  sessionLatency: string;
  sessionLatencyAvg: string;
  sessionStatus: string;
  sessionConnected: string;
  sessionUnstable: string;
  sessionStalled: string;
  sessionDisconnected: string;
  sessionKeepaliveFailures: string;
  sessionMonitor: string;
  sessionMonitorEnabled: string;
  sessionMonitorDesc: string;
  sessionDownload: string;
  sessionUpload: string;
  terminalFont: string;
  terminalFontFamily: string;
  terminalFontDesc: string;
  
  // Command Recall
  commandRecall: string;
  commandRecallEnabled: string;
  commandRecallDesc: string;
  commandRecallSecurityNote: string;
  commandRecallSearch: string;
  commandRecallEmpty: string;
  commandRecallEmptyHint: string;
  commandRecallNoMatch: string;
  commandRecallSaveSnippet: string;
  commandRecallNavigate: string;
  commandRecallInsert: string;
  commandRecallClose: string;
  commandRecallDelete: string;
  commandRecallClearAll: string;
  commandRecallUsed: string;
  commandRecallTimes: string;
  rightClickForOptions: string;
  
  // App Lock
  appLock: string;
  appLockDesc: string;
  appLockEnable: string;
  appLockMethod: string;
  appLockMethodBlur: string;
  appLockMethodPin: string;
  appLockMethodPassword: string;
  appLockTimeout: string;
  appLockPinCode: string;
  appLockCredentialSet: string;
  appLockCredentialNotSet: string;
  appLockTestNow: string;
  appLocked: string;
  appLockClickToContinue: string;
  appLockEnterPin: string;
  appLockEnterPassword: string;
  appLockUnlock: string;
  appLockWrongCredential: string;
  appLockPinHint: string;
  appLockPasswordHint: string;
  appLockSetPin: string;
  appLockSetPassword: string;
  appLockConfirmCredential: string;
  appLockPinRequirement: string;
  appLockPasswordRequirement: string;
  appLockCredentialMismatch: string;
  change: string;
  set: string;

  // What's New & Features
  whatsNew: string;
  terminalFontSelection: string;
  appLockInfoDesc: string;
  previousVersions: string;
  changelog1013: string;
  changelog1012: string;
  changelog1011: string;
  changelog1010: string;
  
  // Feature Grid
  featureSsh: string;
  featureSftp: string;
  featureFtp: string;
  featureRdp: string;
  feature2fa: string;
  featurePortForward: string;
  featureCloudflareDns: string;
  featureDnsWhois: string;
  featureSessionMonitor: string;
  featureTerminalFont: string;
  featureAppLock: string;
  featureThemes: string;
  
  // Author
  authorRole: string;
  viewOnGithub: string;
  
  // Properties modal
  properties: string;
  location: string;
  symbolicLink: string;
  localComputer: string;
  size: string;
  modified: string;
  accessed: string;
  source: string;
  folder: string;
  file: string;
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
