# Changelog

All notable changes to Marix SSH Client will be documented in this file.

## [1.0.4] - 2026-01-16

### Added
- **Google Drive Backup**: Zero-knowledge cloud backup with OAuth2 authentication
  - End-to-end encryption with Argon2id + AES-256-GCM
  - OAuth 2.0 flow with local callback server (no manual code entry)
  - Upload encrypted backups to "Marix Backups" folder
  - Automatic folder creation and management
  - User info display (name, email) in connection status
  - Last backup timestamp display
  - Disconnect option to remove stored tokens
  - [Setup Guide](docs/GOOGLE_DRIVE_SETUP.md) with detailed Google Cloud Console configuration
  - Translations added for all 14 supported languages

### Fixed
- **Quick Connect**: Fixed icon display to show protocol icons (SSH/RDP/FTP/FTPS/WSS) matching server list
- **Session Tabs**: Updated to show protocol icons with colored backgrounds
- **WSS Modal**: Fixed broken icon by using inline SVG instead of missing image file
- **Backup Restore**: Fixed double file selection prompt - now only asks once
- **Google Drive Service**: Fixed credential loading from multiple paths for better portability
- **Webpack Build**: Increased memory limit to 4GB to prevent out-of-memory errors

### Technical
- Added `googleapis` package for Google Drive API v3
- Implemented `GoogleDriveService` with OAuth2 client management
- Created `OAuth2CallbackServer` for handling browser authentication callbacks
- Added 11 IPC handlers for Google Drive operations
- Updated BackupModal UI with new Google Drive tab (between Local and GitHub)
- Integrated with existing backup encryption system (BackupService)
- Professional OAuth callback pages with dark theme matching app design

## [1.0.3] - 2026-01-14
=======
## [1.0.3] - 2026-01-15
>>>>>>> 1aa9b9516fd53e0c267846048d7a50be26b4a0d3

### Added
- **LAN File Transfer**: Send files directly to devices on local network
  - **Sender flow**: Select files → Display 6-digit code → Wait for receiver to connect
  - **Receiver flow**: Enter sender's code → Auto-find sender via UDP → Select save folder → Receive files
  - TCP-based reliable transfer (port 45679) with 64KB chunks
  - Real-time transfer progress with speed display
  - Support multiple files and folders
  - Cancel transfer anytime

- **LAN Server Sharing**: Share server configurations across local network devices
  - **Sender flow**: Select servers → Display 6-digit code → Select peer device → Send encrypted data
  - **Receiver flow**: Receive notification → Enter sender's code to decrypt → Import servers
  - UDP broadcast device discovery (port 45678)
  - AES-256-CBC encryption with scrypt key derivation
  - Option to include/exclude passwords and private keys
  - Real-time peer discovery and status updates
  - Auto-cleanup stale devices (30s timeout)

### Translations
- Added 20+ translation keys for LAN File Transfer in all 13 languages:
  - `lanFileTransfer`, `sendFiles`, `receiveFiles`, `send`, `receive`
  - `selectFilesToSend`, `selectFiles`, `selectFolder`, `yourPairingCode`
  - `shareWithReceiver`, `waitingForReceiver`, `startSending`, `enterSenderCode`
  - `enterCodeToFind`, `findSender`, `searchingSender`, `senderFound`
  - `receiveFrom`, `startReceiving`, `transferProgress`, `transferCompleted`
  - `transferFailed`, `transferCancelled`, `transferDirectly`, `noSenderFound`

- Added 11 translation keys for LAN Server Sharing in all 13 languages:
  - `lanShare`, `thisDevice`, `serversToShare`, `noServersSelected`
  - `lanShareSecurity`, `pairingCode`, `pairingCodeDesc`
  - `availableDevices`, `noDevicesFound`, `shareOnLAN`, `selectServersToShare`

### Fixed
- Fixed session ID mismatch between sender and receiver during file transfer
- Fixed file count display showing 0 on receiver side
- Fixed Vietnamese locale JSON syntax error (missing closing brace)

---

## [1.0.2] - 2026-01-14

### Added
- **Box.net Cloud Backup**: New cloud backup option with OAuth authentication
  - OAuth PKCE flow for secure authentication
  - Encrypted backup storage on Box.net
  - Upload/download backup files
  - Integration with existing backup modal (4th tab)
  - Password-protected with Argon2id encryption

- **Port Knocking Security**: Advanced SSH security feature
  - TCP SYN packet sequence for pre-authentication
  - Configurable knock sequence (3+ ports)
  - Random sequence generator (7000-9999 range)
  - Auto-knock before SSH connection
  - Server-side setup guide modal
  - Comprehensive documentation included

- **Port Knocking Setup Guide Modal**: Interactive in-app guide
  - Security benefits explanation
  - Step-by-step server configuration
  - iptables/firewalld setup instructions
  - Best practices and warnings
  - Supports all 13 languages

### Changed
- Improved Port Knocking translations for better clarity
  - Vietnamese: Changed "Gõ cửa Port" to "Port Knocking" (technical term)
  - Chinese: Changed "端口敲门" to "端口敲击" (more standard)
  - Russian: Changed "Стук в порт" to "Port Knocking" (international term)
  - Thai: Improved technical accuracy
  - Portuguese, Spanish, French, German: Enhanced descriptions

- Enhanced "Learn More" button behavior
  - Opens modal directly without validation alerts
  - Added type="button" to prevent form submission
  - Improved user experience

### Fixed
- Fixed "Learn More" button triggering port validation before opening guide
- Fixed Chinese translation JSON syntax error (quote escaping)

### Translations
- Added 60+ translation keys for Port Knocking Guide in all 13 languages:
  - English, Vietnamese, Chinese, Japanese, Korean
  - Thai, Indonesian, Malay, Filipino
  - Portuguese, Spanish, French, German, Russian

### Security
- Port Knocking provides additional security layer before SSH authentication
- Zero-knowledge encryption for Box.net backups (Argon2id)
- Stealth mode: SSH port hidden from port scanners

---

## [1.0.1] - 2026-01-13

### Added
- **2FA/TOTP Generator**: New built-in two-factor authentication code generator
  - Add/edit/delete TOTP entries with custom icons
  - Bulk import support (one secret per line)
  - Auto-generate 6-digit codes with 30-second refresh
  - Visual countdown timer
  - One-click copy to clipboard
  - Persistent storage in localStorage

- **Port Forwarding**: SSH tunnel port forwarding feature
  - Local Forward (-L): Access remote services through local port
  - Remote Forward (-R): Expose local service to remote server
  - Dynamic SOCKS (-D): Create SOCKS5 proxy through SSH tunnel
  - Real-time stats (bytes transferred, connections)
  - Start/Stop individual forwards
  - Auto-save configurations

- **Enhanced Backup System**: Now includes 2FA and Port Forward data
  - Local backup supports TOTP entries and port forward configs
  - GitHub backup supports TOTP entries and port forward configs
  - Restore automatically imports all data

### Changed
- Updated backup data version to 2.1.0
- Improved button text visibility in Light mode
  - Tools menu buttons (SMTP Test, Proxy Check, Port Listener)
  - SMTP quick port buttons
  - Proxy quick port buttons (HTTP, 8080, Squid, SOCKS)
  - Port Listener protocol buttons (ALL, TCP, UDP)
  - Port Forward add button
  - Known Hosts import button

### Fixed
- Fixed button text color not being white in Light mode for selected/active states

### Translations
- Added translations for 2FA and Port Forwarding features in all 13 languages:
  - English, Vietnamese, German, Spanish, French, Japanese, Korean
  - Chinese, Russian, Portuguese, Thai, Indonesian, Malay, Filipino

---

## [1.0.0] - 2026-01-10

### Added
- Initial release of Marix SSH Client
- Multi-server management with color-coded tags
- SSH terminal with xterm.js
- SFTP file explorer with drag & drop
- Windows RDP (Remote Desktop) support
- Cloudflare DNS management
- WHOIS lookup tool
- Network tools (DNS, Ping, Traceroute, Port Check, etc.)
- SSH Key Manager (generate, import, export)
- Known Hosts management with fingerprint verification
- Encrypted backup/restore with Argon2id
- GitHub backup sync
- Dark/Light theme support
- Multi-language support (13 languages)
- IP-based automatic language detection
