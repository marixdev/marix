# Changelog

All notable changes to Marix SSH Client will be documented in this file.

## [1.0.9] - 2026-01-20

### Added
- **Database Server Management**: Connect and manage database servers directly from the sidebar
  - **MySQL/MariaDB**: Full query editor, table browser, results viewer
  - **PostgreSQL**: Query execution with results grid
  - **MongoDB**: Document browser and query interface
  - **Redis**: Key-value browser and command interface
  - **SQLite**: Local database file support
  - Database servers appear in sidebar alongside SSH servers
  - Query editor with syntax highlighting
  - Export query results to CSV/JSON
  - Connection pooling and session management

- **Command Snippets**: Unified system combining reusable command templates with keyboard shortcuts
  - Save frequently-used commands for quick access
  - Assign hotkeys (`Ctrl+Shift+Key` or `Cmd+Shift+Key`) for instant execution
  - Organize by category (System, Docker, Git, Network, Database, Custom)
  - Scope-based visibility: Global, per-host, or per-group
  - Snippets Panel in terminal sidebar for quick command insertion
  - Search and filter snippets by name, command, or tags
  - Migrates existing Custom Hotkeys automatically (from v1.0.6)

- **macOS RDP Support**: Remote Desktop connections now work on macOS using Microsoft Remote Desktop
  - Automatically creates `.rdp` configuration file with server settings
  - Opens connection via Microsoft Remote Desktop app
  - Supports custom port, username, and fullscreen options
  - Requires [Microsoft Remote Desktop](https://apps.apple.com/app/microsoft-remote-desktop/id1295203466) from Mac App Store

- **Linux RDP Auto-Install**: Automatic dependency detection and installation for RDP on Linux
  - Checks for `xfreerdp3` (FreeRDP client) and `xdotool` (window automation)
  - Auto-detects Linux distribution (Debian/Ubuntu, Fedora/RHEL, Arch)
  - One-click installation with realtime terminal output
  - Uses `pkexec` for secure GUI-based password authentication
  - Supported package managers:
    - **Debian/Ubuntu**: `apt install freerdp3-x11 xdotool`
    - **Fedora/RHEL**: `dnf install freerdp xdotool`
    - **Arch**: `pacman -S freerdp xdotool`

## [1.0.8] - 2026-01-19

### Added
- **Source Installer - Dynamic Version Fetching**: Framework versions are now fetched from official sources in real-time
  - **Laravel**: Fetches versions 11+ dynamically from GitHub Releases API, versions 8-10 from static data
  - **WordPress**: Fetches versions 6.x+ from GitHub Tags API, versions 4.x-5.x from static data
  - **Symfony**: Fetches versions from `symfony.com/releases.json`
  - **CodeIgniter 3/4**: Fetches versions from GitHub Releases API
  - **Node.js Frameworks**: Fetches versions from npm registry
    - Express.js, NestJS, Fastify, Vue.js, Nuxt.js, React, Next.js, TypeScript
  - Sub-version selection: After selecting major version, fetch and display available patch versions
  - Loading spinners during version fetching
  - "Latest" option highlighted as recommended
  - **Static data fallback**: Complete version history for Laravel 8-10 and WordPress 4.x-5.x stored locally for instant access

- **Source Installer - Multi-language Support**: UI text now fully localized
  - Added 35+ new translation keys for Source Installer
  - Translated: Back, Continue, Loading, Change, Install Location, Create Subfolder, Project Name, Database Configuration, Dependencies Check, Install Status, etc.
  - Supports all 14 languages (English, Vietnamese, Chinese, Japanese, Korean, French, German, Spanish, Portuguese, Russian, Thai, Malay, Indonesian, Filipino)

- **Source Installer - Realtime Installation Progress**: Installation output now streams in realtime
  - Uses PTY mode for proper terminal output with ANSI colors
  - XTermLogViewer component renders ANSI escape codes correctly
  - No more waiting for command to complete - see progress as it happens
  - Streaming via IPC events (`ssh:executeStream` + `ssh:streamData`)

- **Source Installer - Official Framework Icons**: Replaced emoji icons with official SVG logos
  - Laravel (red flame logo)
  - WordPress (blue W logo)
  - Symfony (black logo)
  - CodeIgniter (flame logo)
  - Express.js, NestJS, Fastify
  - Vue.js, Nuxt.js
  - React, Next.js
  - TypeScript

- **SFTP Compress/Extract Feature**: Right-click context menu now supports archive operations
  - **Compress folders/files to**:
    - `.zip` (using `zip` command)
    - `.tar.gz` (using `tar -czvf`)
    - `.tar` (using `tar -cvf`)
  - **Extract archives** ("Extract Here" option):
    - `.zip` (unzip)
    - `.tar`, `.tar.gz`, `.tgz` (tar)
    - `.tar.bz2`, `.tbz2` (tar + bzip2)
    - `.tar.xz`, `.txz` (tar + xz)
    - `.gz`, `.bz2`, `.xz` (gunzip, bunzip2, unxz)
    - `.7z` (7z)
    - `.rar` (unrar)

### Fixed
- **Keyboard Stuck Issue**: Fixed issue where keyboard keys (spacebar, capitals, numpad) would stop working after extended use
  - Added automatic keyboard state reset when window regains focus
  - Added visibility change handler to reset modifier keys when returning to app
  - Fixed xterm key event handler to only block keydown events, allowing keyup events to pass through normally
  - This prevents Ctrl, Shift, Alt, and Meta keys from getting "stuck" in pressed state

- **Laravel 8/9/10 Installation Error**: Fixed "Could not find package laravel/laravel with version v10.50.0" error
  - Root cause: Was using `laravel/framework` versions instead of `laravel/laravel` package versions
  - Solution: Updated `legacy-versions.json` with correct Packagist versions for `laravel/laravel`
  - Laravel 10: 10.3.3, 10.3.2, ..., 10.0.0 (25 versions)
  - Laravel 9: 9.5.2, 9.5.1, ..., 9.0.0 (33 versions)
  - Laravel 8: 8.6.12, 8.6.11, ..., 8.0.0 (49 versions)

- **Composer Root User Permission**: Fixed "Composer plugins disabled when running as root" warning
  - Added `COMPOSER_ALLOW_SUPERUSER=1` prefix to all composer commands


## [1.0.7] - 2026-01-18

### Security Improvements (Major)
- **Auto-Tuned KDF** (Best Practice):
  - KDF now automatically calibrates to take ~1 second on user's machine
  - Target time: 800-1200ms (adapts to both weak and strong machines)
  - Parameters (memory, iterations) are auto-tuned at first run and cached
  - Calibration runs in background on app start for optimal UX
  - Parameters stored with encrypted data (v2.2) for cross-machine decryption
  - Eliminates need to guess "standard" parameters - each machine uses optimal settings
  - Minimum security floor: 64MB memory, 2 iterations (above OWASP 47MB recommendation)
  - **Backward compatible**: Legacy backups (v2.0) use fixed defaults for correct decryption

- **OS-Level Credential Encryption** (safeStorage):
  - All sensitive data (passwords, private keys, passphrases, API tokens) now encrypted using OS keychain
  - macOS: Uses Keychain
  - Windows: Uses DPAPI (Data Protection API)
  - Linux: Uses libsecret (GNOME Keyring, KWallet, etc.)
  - Credentials are tied to the device - copying `config.json` to another machine won't expose passwords
  - Automatic migration: existing plaintext passwords are encrypted on first launch
  - Cloudflare API tokens now encrypted using safeStorage

### Changed
- **Custom WHOIS Implementation**: Replaced `whois` npm module with custom implementation
  - Built-in WHOIS server list for 400+ TLDs (no external dependencies)
  - Direct TCP socket queries to WHOIS servers (port 43)
  - Automatic referral following for .com, .net domains
  - Google Registry TLDs (.dev, .app, .page, .new, .google, .youtube, .zip, etc.) now use Google RDAP API
  - **IANA Bootstrap Registry**: Automatically fetches RDAP servers from IANA for all supported TLDs
  - **Registrar RDAP Follow**: Follows referrals to registrar RDAP servers (like namerdap.systems) for detailed info
  - RDAP responses formatted as readable text instead of raw JSON
  - Separated WHOIS servers into dedicated file (`whois-servers.ts`) for maintainability
  - Grouped TLDs by provider (Donuts, Afilias, Verisign, etc.) for cleaner code
  - Bootstrap registry cached for 24 hours to minimize IANA requests

### Fixed
- **Backup Restore Compatibility**: Fixed potential issue where restoring legacy backups (v2.0) on different machines could fail
  - Legacy backups now use fixed KDF defaults (64MB, 3 iterations) instead of auto-tuned values
  - New backups (v2.2) store all KDF parameters for guaranteed cross-machine compatibility

- **macOS Title Bar**: Fixed title bar overlapping with system traffic light buttons (close, minimize, maximize)
  - Added 70px left padding on macOS to accommodate native window controls
  - Title bar now displays correctly without overlapping system buttons

### Technical
- New `SecureStorage` service for centralized encryption/decryption
- Automatic migration system for existing unencrypted credentials
- `ServerStore` now encrypts `password`, `privateKey`, and `passphrase` fields
- `CloudflareService` encrypts API tokens before storing
- Encryption prefix `enc:` used to identify already-encrypted values
- Migration flag prevents re-encrypting already encrypted data
- `WhoisService` rewritten with custom TCP socket client
- `NetworkToolsService.whoisLookup()` now delegates to `WhoisService`
- Removed `whois` npm dependency

## [1.0.6] - 2026-01-17

### Added
- **Custom Hotkeys**: New feature for creating keyboard shortcuts to execute SSH commands
  - Access from sidebar menu (below 2FA)
  - Create custom shortcuts with `Ctrl+Shift+[key]` format
  - Commands are automatically typed and executed in SSH terminal
  - Manage hotkeys: Add, Edit, Delete
  - Optional description for each hotkey
  - Stored locally for privacy
  - Supports all single characters (A-Z, 0-9)
  - Full localization support (14 languages)

### Fixed
- **Private Key Display**: Fixed issue where private keys were not displaying when clicking on SSH keys in Key Manager
  - Properly clears previous state before loading new key
  - Added console logging for debugging
  - Private key now displays correctly in textarea
- **Edit Server Key Auto-Save**: When editing a server and switching from password to key authentication, the key is now automatically saved
  - Same duplicate detection as when adding new servers
  - Server is automatically linked to saved key
  - Works seamlessly when changing authentication method
- **Duplicate Server Detection**: Automatically detects and warns when adding duplicate servers
  - **DNS Resolution**: Resolves hostnames to IP addresses before comparing
  - Detects duplicates even with different domains pointing to same IP
  - Example: `domain.com` and `subdomain.domain.com` both resolving to `99.99.99.99` will be detected as duplicate
  - Checks for identical IP + port + username + protocol combination
  - Shows confirmation dialog with existing server details (including resolved IP)
  - Allows user to proceed or cancel duplicate addition
  - Prevents accidental duplicate server entries

### Also Added
- **SSH Key File Support**: Full support for SSH keys without file extensions
  - Supports keys generated by `ssh-keygen` (typically no extension)
  - "All Files" filter is now default/first option in file dialogs
  - Works in: SSH Key Manager (import), Add Server (select key), Edit Server (select key)
  - Example supported formats: `id_rsa`, `id_ed25519`, `mykey` (no extension), `.pem`, `.key`, `.ppk`
- **SSH Key Auto-Save**: Private keys pasted or selected when adding servers are now automatically saved to SSH Key Manager
  - Keys are checked for duplicates before saving
  - Server is automatically linked to saved key via `sshKeyId`
  - Prevents key loss and improves key management

### Added
- **Private Key Display**: SSH Key Manager now shows both private and public keys when viewing key details
  - Private key displayed in dedicated textarea with copy button
  - Public key shown above private key
  - Both keys easily copyable to clipboard
- **Passphrase Detection**: Keys protected with passphrases are now detected and indicated
  - Displays "***" when passphrase is detected
  - Shows warning message: "This key is protected with a passphrase"
  - Detects both OpenSSH and PEM format encrypted keys

### Changed
- **Key Display Order**: When viewing SSH keys, now shows: Type → Fingerprint → Created → Passphrase (if any) → Public Key → Private Key
- **Enhanced Key Management**: All keys in SSH Key Manager now display complete information

## [1.0.5] - 2026-01-16

### Added
- **Comprehensive English User Guide**: 1,300+ lines step-by-step documentation covering all features
  - 17 detailed sections with visual diagrams
  - Step-by-step instructions for every feature
  - Tables showing all form fields and options
  - Troubleshooting guides for common issues
  - Keyboard shortcuts reference
  - Tips and best practices
- **Keyboard Shortcuts**: Global keyboard shortcuts for common actions
  - `Ctrl/⌘+K`: Quick Connect
  - `Ctrl/⌘+Shift+A`: Add New Host
  - `Ctrl/⌘+Shift+T`: Open Local Terminal
  - `Ctrl/⌘+Shift+L`: Toggle LAN Discovery
  - `Ctrl/⌘+Shift+O`: Toggle Terminal/SFTP view
- **Direct SFTP Connect**: Right-click SSH server → "SFTP" to open file browser directly without terminal

### Changed
- **Backup Provider Names**: Changed "Box" to "Box.net" across all 14 languages for clarity

### Technical
- Updated all locale files (14 languages) to use "Box.net" instead of "Box"
- Added `onConnectSFTP` prop to ServerList component
- Implemented `handleConnectSFTP` function in App.tsx
- Added context menu item "SFTP" for SSH protocol servers only

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
- **macOS Window Dragging**: Fixed window unable to be moved on macOS
  - Added `trafficLightPosition` configuration for proper window controls placement
  - Enabled `titleBarOverlay` for better window frame handling
  - Configured proper drag region in title bar with `-webkit-app-region: drag`
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
